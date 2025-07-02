# Active Recordのコールバックを理解して使いこなす

Active Recordのコールバックは、モデルオブジェクトのライフサイクルにおける特定の瞬間にロジックを差し込むための強力なフックです。これにより、オブジェクトが作成、保存、更新、削除されるといったイベントに応じて、特定のコードを自動的に実行できます。コールバックは非常に便利ですが、使い方を誤ると予期せぬバグやパフォーマンス問題を引き起こす可能性もあるため、慎重な設計が求められます。

この記事では、Active Recordコールバックの種類、具体的な使い方、そして実践で役立つベストプラクティスについて詳しく解説します。

## コールバックの概要

コールバックは、Active Recordオブジェクトのライフサイクル中にトリガーされるメソッドです。例えば、ユーザーが新規登録された後にウェルカムメールを送信する、記事が保存される前に特定の値を計算して設定するな���、様々な用途で利用されます。

### 利用可能なコールバック

コールバックは、オブジェクトの状態変化に応じて以下のカテゴリに分類されます。

#### オブジェクト作成
- `before_validation`
- `after_validation`
- `before_save`
- `around_save`
- `before_create`
- `around_create`
- `after_create`
- `after_save`
- `after_commit` / `after_rollback`

#### オブジェクト更新
- `before_validation`
- `after_validation`
- `before_save`
- `around_save`
- `before_update`
- `around_update`
- `after_update`
- `after_save`
- `after_commit` / `after_rollback`

#### オブジェクト破棄
- `before_destroy`
- `around_destroy`
- `after_destroy`
- `after_commit` / `after_rollback`

その他にも、`after_initialize`（オブジェクトがインスタンス化された直後）や`after_find`（データベースからオブジェクトが読み込まれた直後）といったコールバックも存在します。

## コールバックの登録方法

コールバックは、モデル内でマクロ風のクラスメソッドとして登録します。

```ruby
class User < ApplicationRecord
  # ユーザーが作成された後にウェルカムメールを送信
  after_create :send_welcome_email

  private

  def send_welcome_email
    UserMailer.welcome_email(self).deliver_later
  end
end
```

ブロックを渡して直接ロジックを記述することも可能です。

```ruby
class Order < ApplicationRecord
  # 保存前に合計金額を計算する
  before_save do
    self.total_price = line_items.sum(&:price)
  end
end
```

## 実践的なユースケース

### 1. データの前処理と正規化

`before_validation`コールバックは、ユーザー入力などのデータをバリデーション前に整形するのに役立ちます。

```ruby
class User < ApplicationRecord
  before_validation :normalize_email

  validates :email, presence: true, uniqueness: true

  private

  def normalize_email
    self.email = email.downcase.strip if email
  end
end
```

### 2. 関連オブジェクトの操作

`after_create`や`after_save`を使って、関連オブジェクトを操作できます。

```ruby
class Post < ApplicationRecord
  has_many :notifications, as: :notifiable

  # 公開記事が作成されたらフォロワーに通知を作成
  after_create :create_notifications_for_followers, if: :published?

  private

  def create_notifications_for_followers
    author.followers.each do |follower|
      Notification.create(user: follower, notifiable: self, message: "#{author.name}が新しい記事を投稿���ました。")
    end
  end
end
```

### 3. 外部サービスとの連携

`after_commit`コールバックは、データベースのトランザクションが正常に完了した後にのみ実行されるため、外部APIの呼び出しやバックグラウンドジョブのエンキューに最適です。これにより、データベースの状態と外部システムの状態の整合性を保ちやすくなります。

```ruby
class Article < ApplicationRecord
  # 記事が作成され、DBにコミットされた後にインデックス作成ジョブを実行
  after_commit :index_to_elasticsearch, on: :create

  private

  def index_to_elasticsearch
    IndexingJob.perform_later('index', self.id)
  end
end
```
`on: :create`を指定することで、このコールバックが作成時にのみ実行されるようにしています。同様に`on: :update`や`on: :destroy`も指定できます。

## ベストプラクティスと注意点

### 1. コールバックはシンプルに保つ
コールバック内のロジックは、そのコールバックの目的に直接関連するものだけに限定しましょう。複雑なビジネスロジックは、コールバックからサービスクラスや専用のメソッドに切り出すべきです。

### 2. ビジネスロジックのコア��入れない
コールバックは暗黙的に実行されるため、アプリケーションのコアなビジネスロジックをここに配置すると、コードの振る舞いが追いにくくなります。例えば、注文の合計金額を計算するようなロジックは、コールバックよりも専用のメソッドを定義し、コントローラーなどから明示的に呼び出す方が堅牢です。

**悪い例:**
```ruby
class Order < ApplicationRecord
  before_save :calculate_total_and_tax # 多くのロジックが隠蔽されている
end
```

**良い例:**
```ruby
# app/services/order_finalizer.rb
class OrderFinalizer
  def self.call(order)
    order.calculate_total
    order.calculate_tax
    order.save
  end
end

# app/controllers/orders_controller.rb
def create
  @order = Order.new(order_params)
  OrderFinalizer.call(@order)
  # ...
end
```

### 3. `after_commit`を賢く使う
前述の通り、外部サービス連携やバックグラウンドジョブの実行には`after_commit`が適しています。`after_save`や`after_create`の最中にトランザクションがロールバックされると、ジョブは実行されたのにデータは永続化されていない、という不整合が発生する可能性があります。

### 4. コールバックのスキッ��
テストや特定のデータ移行タスクなどで、一時的にコールバックを無効化したい場合があります。以下のメソッドが利用できます。
- `update_column`: バリデーションもコールバックも実行せずに、単一のカラムを更新します。
- `update_columns`: 複数のカラムを更新します。
- `skip_callbacks`ブロック（Rails 7.1+）: 特定のコールバックを一時的に無効化します。

```ruby
# Rails 7.1以降
user.skip_callbacks(:commit) do
  user.save
end
```

### 5. 条件付きコールバックを活用する
`:if`や`:unless`オプションを使って、特定の条件を満たす場合にのみコールバックが実行されるようにしましょう。これにより、不要な処理を避け、コードの意図を明確にできます。

```ruby
class User < ApplicationRecord
  before_save :do_something, if: :paid_user?
  after_destroy :cleanup, unless: -> { self.admin? }
end
```

## まとめ

Active Recordのコールバックは、RailsアプリケーションのコードをDRYに保ち、モデルのライフサイクルに沿ったロジックを実装するための強力なツールです。しかし、その便利さの裏には、コードの可読性や保守性を損なうリスクも潜んでいます。

���記事で紹介したベストプラクティス—「ロジックをシンプルに保つ」「ビジネスロジックのコアを入れない」「`after_commit`を賢く使う」—を念頭に置き、コールバックを適切に活用することで、より堅牢でメンテナンスしやすいアプリケーションを構築できるでしょう。
