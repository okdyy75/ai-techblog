# RSpec Mocksの高度な使い方: double, spy, stubの活用

## 概要

RSpecは、Railsコミュニティで広く使われているテストフレームワークです。その中でも`rspec-mocks`は、テスト対象のオブジェクト（SUT, System Under Test）を隔離し、外部の依存関係を模倣するための強力な機能を提供します。これにより、高速で信頼性の高いユニットテストを作成できます。

この記事では、`rspec-mocks`が提供する3つの主要なモック機能、`double`, `spy`, `stub`の違いと、それぞれの効果的な使い方を解説します。

## 1. `stub`: オブジェクトのメソッドを書き換える

`stub`（スタブ）は、既存のオブジェクトの特定のメソッドを上書きし、あらかじめ決められた値を返すように設定する機能です。外部APIへのリクエストや、実行に時間のかかる処理を模倣するのに役立ちます。

### 使用例: 外部APIのレスポンスをスタブする

`WeatherService`が外部APIと通信するクラスだとします。テスト実行時に実際にAPIを呼び出すのは避けたいので、`fetch_temperature`メソッドをスタブします。

```ruby
# app/services/weather_service.rb
class WeatherService
  def fetch_temperature(city)
    # 外部APIを呼び出す処理（例: HTTParty.get(...)）
    # ...
  end
end

# spec/services/weather_service_spec.rb
require 'rails_helper'

RSpec.describe WeatherService do
  describe "#fetch_temperature" do
    it "特定の都市の気温を返す" do
      service = WeatherService.new
      
      # allow(...).to receive(...).and_return(...)
      allow(service).to receive(:fetch_temperature).with("Tokyo").and_return(25)

      expect(service.fetch_temperature("Tokyo")).to eq(25)
    end
  end
end
```

-   `allow(object).to receive(:method)`: `object`の`method`をスタブの対象として設定します。
-   `.with(arguments)`: メソッドが特定の引数で呼び出された場合のみスタブが有効になります。
-   `.and_return(value)`: メソッドが返すべき値を指定します。

`stub`は、メソッドが呼び出されたかどうかを検証しないため、主に**状態の検証（State Verification）**、つまりメソッドの返り値を使ったテストに適しています。

## 2. `double`: 偽のオブジェクトを作成する

`double`（ダブル）は、テストダブルやモックオブジェクトとも呼ばれ、テスト専用の偽のオブジェクトを作成します。特定のクラスのインスタンスを完全に置き換えたい場合に便利です。

### 使用例: 支払いゲートウェイを模倣する

`OrderProcessor`が`PaymentGateway`に依存しているとします。`PaymentGateway`の振る舞いを`double`で模倣します。

```ruby
# app/services/order_processor.rb
class OrderProcessor
  def initialize(payment_gateway)
    @payment_gateway = payment_gateway
  end

  def process(order)
    if @payment_gateway.charge(order.amount)
      order.update(status: 'paid')
    end
  end
end

# spec/services/order_processor_spec.rb
require 'rails_helper'

RSpec.describe OrderProcessor do
  it "支払いが成功した場合に注文ステータスを更新する" do
    # "PaymentGateway"という名前のdoubleを作成
    payment_gateway_double = double("PaymentGateway")
    allow(payment_gateway_double).to receive(:charge).and_return(true)

    order = create(:order, status: 'pending') # FactoryBotを想定
    processor = OrderProcessor.new(payment_gateway_double)
    
    processor.process(order)

    expect(order.reload.status).to eq('paid')
  end
end
```

-   `double("ClassName")`: `ClassName`の役割を果たす偽のオブジェクトを作成します。名前を付けることで、エラーメッセージが分かりやすくなります。
-   `double`はデフォルトではどんなメソッドも持っていません。`allow(...)`を使って、期待するメソッドと返り値を定義する必要があります。

## 3. `spy`: メソッドの呼び出しを監視する

`spy`（スパイ）は、`double`と似ていますが、主な目的はメソッドの返り値を制御することではなく、**メソッドが呼び出されたかどうかを検証する**ことです。これを**振る舞いの検証（Behavior Verification）**と呼びます。

### 使用例: 通知メールが送信されたことを確認する

ユーザー登録時に`Notifier`クラスがメールを送信するロジックをテストします。

```ruby
# app/services/user_signup.rb
class UserSignup
  def initialize(notifier)
    @notifier = notifier
  end

  def signup(user_params)
    user = User.create(user_params)
    @notifier.welcome(user)
  end
end

# spec/services/user_signup_spec.rb
require 'rails_helper'

RSpec.describe UserSignup do
  it "ユーザー登録後にウェルカムメールを送信する" do
    # spy("Notifier") でスパイオブジェクトを作成
    notifier_spy = spy("Notifier")
    signup_service = UserSignup.new(notifier_spy)

    user_params = { name: "Test User", email: "test@example.com" }
    signup_service.signup(user_params)

    # `welcome`メソッドが呼び出されたことを検証
    expect(notifier_spy).to have_received(:welcome).with(an_instance_of(User))
  end
end
```

-   `spy("ClassName")`: `double`と同様に偽のオブジェクトを作成しますが、メソッド呼び出しを記録する能力を持ちます。
-   `expect(object).to have_received(:method)`: `object`の`method`がテスト実行中に呼び出されたかどうかを検証します。
-   `spy`は、メソッドの返り値がテストのロジックに影響を与えないが、そのメソッドが呼び出されること自体が重要である場合に最適です。

## `double` vs `verifying double`

`double`は非常に柔軟ですが、元のクラスに存在しないメソッドを定義できてしまうという欠点があります。これにより、リファクタリングで元のクラスのメソッド名が変更された場合に、テストが追随できず、壊れたテストが残り続ける可能性があります。

この問題を解決するのが`instance_double`（または`class_double`）です。

```ruby
RSpec.describe OrderProcessor do
  it "支払いが成功した場合に注文ステータスを更新する" do
    # PaymentGatewayクラスのインスタンスダブルを作成
    payment_gateway = instance_double(PaymentGateway, charge: true)

    order = create(:order)
    processor = OrderProcessor.new(payment_gateway)
    processor.process(order)

    expect(payment_gateway).to have_received(:charge).with(order.amount)
  end
end
```

-   `instance_double(ClassName, ...)`: `ClassName`に定義されているインスタンスメソッドしかスタブできません。もし`PaymentGateway`に`charge`メソッドが存在しなければ、このテストはエラーになります。
-   これにより、テストと実装の乖離を防ぎ、より信頼性の高いテストスイートを維持できます。

## まとめ

| 機能 | 目的 | 主な検証方法 | ユースケース |
| :--- | :--- | :--- | :--- |
| **`stub`** | 既存オブジェクトのメソッドの返り値を上書きする | 状態の検証 | 外部API、時間のかかる処理の模倣 |
| **`double`** | 偽のオブジェクトを作成し、振る舞いを定義する | 状態の検証 | 依存オブジェクトの完全な置き換え |
| **`spy`** | メソッドが呼び出されたかを記録・検証する | 振る舞いの検証 | コマンド（返り値が重要でない）メソッドの呼び出し確認 |
| **`instance_double`** | `double`の厳格版。実在するメソッドのみ許可 | 状態/振る舞いの検証 | リファクタリング耐性の高いテスト |

これらのツールを適切に使い分けることで、RSpecにおけるテストの意図が明確になり、保守性と信頼性が大幅に向上します。Happy testing!
