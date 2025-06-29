# Active Recordバリデーション入門: よく使う検証とカスタムバリデーションの作り方

## はじめに

アプリケーションのデータの整合性を保つことは、堅牢なWebアプリケーションを構築する上で非常に重要です。Active Recordのバリデーション（検証）機能は、モデルのオブジェクトがデータベースに保存される前に、そのデータが特定のルール（制約）を満たしているかを確認するための仕組みです。

この記事では、Railsでよく使われる基本的なバリデーションヘルパーから、少し複雑な要件に応えるためのカスタムバリデーションまで、具体的なコード例を交えて解説します。

## なぜバリデーションが必要か？

もしバリデーションがなければ、ユーザーは空のフォームを送信したり、意図しない形式のデータを入力したりできてしまいます。これにより、以下のような問題が発生します。

*   データベースに不完全なデータや不正なデータが保存される。
*   アプリケーションが予期せぬエラーで停止する。
*   データの整合性が崩れ、バグの原因となる。

バリデーションは、こうした事態を防ぎ、データの品質を保証するための「門番」の役割を果たします。

## 1. バリデーションの基本

バリデーションはモデルファイル（`app/models/`以下）に記述します。`validates`メソッドに、検証したいカラム名と検証ルールを指定するのが基本です。

```ruby
# app/models/user.rb
class User < ApplicationRecord
  validates :name, presence: true
  validates :email, presence: true, uniqueness: true
end
```

この例では、`User`モデルを保存する際に以下の2つのルールをチェックします。

1.  `name`が存在していること (`presence: true`)
2.  `email`が存在し、かつデータベース上で一意であること (`uniqueness: true`)

### バリデーションエラーの確認

バリデーションが失敗すると、`save`や`update`メソッドは`false`を返し、データベースへの保存は行われません。そして、モデルオブジェクトの`errors`オブジェクトにエラーメッセージが格納されます。

```ruby
# rails consoleで試してみよう
user = User.new(name: "")
user.save # => false

user.valid? # => false

# エラーメッセージを確認
user.errors.full_messages
# => ["Name can't be blank", "Email can't be blank"]

user.errors.messages
# => {:name=>["can't be blank"], :email=>["can't be blank"]}
```

コントローラでは、この`errors`オブジェクトを使って、ユーザーにエラー内容をフィードバックします。

## 2. よく使われるバリデーションヘルパー

Railsには、一般的な検証シナリオに対応するための多くのヘルパーが用意されています。

### `presence`

値が`nil`や空文字列でないことを検証します。最もよく使われるヘルパーです。

```ruby
validates :name, :login, :email, presence: true
```

### `uniqueness`

値がデータベース内で一意であることを検証します。メールアドレスやユーザー名などに使われます。

```ruby
validates :email, uniqueness: true

# 大文字・小文字を区別しない一意性検証
validates :username, uniqueness: { case_sensitive: false }
```

### `length`

文字列の長さを検証します。

```ruby
validates :bio, length: { maximum: 500 }
validates :password, length: { minimum: 6 }
validates :registration_number, length: { is: 6 }
validates :username, length: { in: 3..20 }
```

### `numericality`

値が数値であることを検証します。整数のみ、特定の範囲内、などのオプションも指定できます。

```ruby
validates :points, numericality: true
validates :games_played, numericality: { only_integer: true }
validates :age, numericality: { greater_than_or_equal_to: 18 }
```

### `format`

正規表現を使って、値が特定のフォーマットに一致するかを検証します。

```ruby
# 正しいメールアドレスの形式か
validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }

# 半角英数字のみか
validates :username, format: { with: /\A[a-zA-Z0-9]+\z/ }
```

### `inclusion` / `exclusion`

値が指定されたセットに含まれる（または含まれない）ことを検証します。

```ruby
class Product < ApplicationRecord
  validates :size, inclusion: { in: %w(small medium large), message: "%<{value}> is not a valid size" }
end
```

## 3. カスタムバリデーション

標準のヘルパーでは対応できない複雑な検証を行いたい場合は、独自のバリデーションメソッドを作成します。

### `validate`メソッド

`validate`（複数形の`validates`ではない）を使い、独自の検証メソッドをシンボルで指定します。

例えば、「キャンペーン期間中は割引価格が通常価格を上回ってはいけない」というルールを考えます。

```ruby
# app/models/product.rb
class Product < ApplicationRecord
  validate :discount_price_cannot_be_greater_than_price

  private

  def discount_price_cannot_be_greater_than_price
    if price.present? && discount_price.present? && discount_price > price
      errors.add(:discount_price, "cannot be greater than the regular price")
    end
  end
end
```

*   検証メソッドは`private`にするのが慣習です。
*   検証ロジックを記述し、条件に合わない場合に`errors.add(:attribute, "message")`を呼び出してエラーを追加します。
*   `:attribute`にはエラーに関連するカラム名を、`"message"`には表示したいエラーメッセージを指定します。

### 条件付きバリデーション: `if`, `unless`

特定の条件が満たされたときにのみバリデーションを実行したい場合があります。その場合は`:if`や`:unless`オプションを使います。

```ruby
# is_premiumがtrueの場合のみ、card_numberの存在を検証
validates :card_number, presence: true, if: :is_premium?

# メソッド名をシンボルで渡す
def is_premium?
  plan == "premium"
end

# Procを使う
validates :reason, presence: true, if: Proc.new { |order| order.status == "cancelled" }
```

## まとめ

Active Recordのバリデーションは、アプリケーションのデータの品質を維持するための強力なツールです。

*   まずは`presence`, `uniqueness`, `length`などの基本的なヘルパーを使いこなしましょう。
*   `format`や`numericality`でデータの形式を整えましょう。
*   複雑なビジネスロジックには、独自の`validate`メソッドを作成して対応しましょう。
*   `:if`や`:unless`を使い、状況に応じてバリデーションを適用しましょう。

モデルに適切なバリデーションを記述することは、セキュアで信頼性の高いアプリケーション開発の基本です。積極的に活用して、データの整合性を守りましょう。
