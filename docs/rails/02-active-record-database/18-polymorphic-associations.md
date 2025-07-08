# ポリモーフィック関連を理解する: いいね機能やコメント機能を複数のモデルに対応させる方法

## はじめに

Railsアプリケーションを開発していると、「コメント」や「いいね」、「タグ付け」といった機能を、複数の異なる種類のモデル（例えば、ブログの「記事」と「写真」の両方）に実装したいという要求が頻繁に発生します。

このとき、最も素朴なアプローチは`ArticleComment`モデルと`PhotoComment`モデルのように、対象ごとに別々のモデルとテーブルを作成することですが、これではコメント機能に関するロジックが重複し、DRY原則に反してしまいます。かといって、一つの`Comment`モデルに`article_id`と`photo_id`という2つの外部キーを持たせるのも、拡張性に乏しく不格好です。

この問題をエレガントに解決するのが、Active Recordの「**ポリモーフィック関連（Polymorphic Association）**」です。ポリモーフィック（Polymorphic）とは「多様な形をとる」という意味で、その名の通り、1つのモデルが他の複数の異なるモデルに属することを可能にする強力な機能です。

## ポリモーフィック関連の実装

ここでは、「記事（`Article`）」と「イベント（`Event`）」の両方に「コメント（`Comment`）」を付けられる機能を、ポリモーフィック関連を使って実装してみましょう。

### ステップ1: ポリモーフィックなモデルの作成

まず、コメントを格納する`Comment`モデルを作成します。ここでのポイントは、特定のモデル（`article`や`event`）を直接参照するのではなく、**`commentable`** という抽象的な名前で`references`を指定し、`{polymorphic: true}`オプションを付けることです。

```bash
rails g model Comment content:text commentable:references{polymorphic}
```

このコマンドが生成するマイグレーションファイルを見てみましょう。

```ruby
# db/migrate/xxxxxxxx_create_comments.rb
class CreateComments < ActiveRecord::Migration[7.0]
  def change
    create_table :comments do |t|
      t.text :content
      t.references :commentable, polymorphic: true, null: false

      t.timestamps
    end
  end
end
```

`t.references :commentable, polymorphic: true`という行に注目してください。これは、通常の`article_id`のような単一のカラムではなく、以下の**2つのカラム**を`comments`テーブルに作成します。

1.  **`commentable_id` (integer)**: 関連先のレコードのIDを保存します。
2.  **`commentable_type` (string)**: 関連先のモデルのクラス名（`"Article"`や`"Event"`など）を文字列として保存します。

この`_id`と`_type`のペアによって、1つのコメントがどのモデルのどのレコードに属しているのかを一意に特定できるようになります。

マイグレーションを実行します。

```bash
rails db:migrate
```

### ステップ2: モデル間の関連付け

次に、各モデルファイルに関連を定義します。

**コメントされる側（親モデル）**

`Article`モデルと`Event`モデルに、多数のコメントを持つことを示す`has_many`を定義します。ここでのポイントは`as: :commentable`オプションです。

```ruby
# app/models/article.rb
class Article < ApplicationRecord
  has_many :comments, as: :commentable, dependent: :destroy
end
```

```ruby
# app/models/event.rb
class Event < ApplicationRecord
  has_many :comments, as: :commentable, dependent: :destroy
end
```

*   **`as: :commentable`**: この関連が、`commentable_id`と`commentable_type`というポリモーフィックなインターフェースを利用することを示します。

**コメントする側（子モデル）**

`Comment`モデルには、`commentable`という名前のポリモーフィックな関連に属することを`belongs_to`で定義します。ジェネレータが既にこの設定を追加してくれています。

```ruby
# app/models/comment.rb
class Comment < ApplicationRecord
  belongs_to :commentable, polymorphic: true
end
```

*   **`polymorphic: true`**: これにより、`commentable`メソッドが、`commentable_type`カラムの値に基づいて、適切なモデル（`Article`や`Event`）のインスタンスを返すようになります。

## 3. 実際の使い方

設定はこれだけです。実際にコンソールでどのように動作するか見てみましょう。

```ruby
# rails console

# 記事とイベントを作成
article = Article.create!(title: "ポリモーフィックは便利！")
event = Event.create!(name: "Rails勉強会")

# 記事にコメントを追加
comment1 = article.comments.create!(content: "本当にそうですね！")

# イベントにコメントを追加
comment2 = event.comments.create!(content: "参加します！")
```

データベースの`comments`テーブルの中身は以下のようになっています。

| id | content              | commentable_id | commentable_type | ... |
|----|----------------------|----------------|------------------|-----|
| 1  | 本当にそうですね！   | 1              | `"Article"`      | ... |
| 2  | 参加します！         | 1              | `"Event"`        | ... |

`commentable_id`は両方とも`1`ですが、`commentable_type`が異なるため、それぞれが別のオブジェクトに関連付いていることがわかります。

逆に関連をたどることも簡単です。

```ruby
comment1.commentable
#=> #<Article id: 1, title: "ポリモーフィックは便利！", ...>

comment2.commentable
#=> #<Event id: 1, name: "Rails勉強会", ...>
```

`comment.commentable`を呼び出すだけで、`Comment`モデルは`commentable_type`を見て、自動的に正しい親オブジェクトを返してくれます。

## ポリモーフィック関連の一般的なユースケース

このパターンは非常に多くの場面で応用できます。

*   **いいね機能 (`Like`)**: `User`が`Article`, `Photo`, `Comment`など、様々なものに「いいね」できる。
    *   `Like`モデル: `belongs_to :likeable, polymorphic: true`
    *   `Article`, `Photo`モデル: `has_many :likes, as: :likeable`
*   **タグ付け機能 (`Tagging`)**: `Tag`を`Article`, `Question`, `Product`など、様々なものに付けられる。
    *   `Tagging`モデル: `belongs_to :taggable, polymorphic: true`
    *   `Article`, `Product`モデル: `has_many :taggings, as: :taggable`
*   **住所録 (`Address`)**: `User`, `Company`, `Warehouse`など、様々なエンティティが住所を持つことができる。
    *   `Address`モデル: `belongs_to :addressable, polymorphic: true`
    *   `User`, `Company`モデル: `has_one :address, as: :addressable`

## まとめ

ポリモーフィック関連は、一見すると少し複雑に感じるかもしれませんが、その仕組みは「`_id`カラムと`_type`カラムのペアで関連先を管理する」というシンプルなものです。

この強力な機能を使いこなすことで、モデル間の多様な関連性をDRYかつクリーンに表現でき、アプリケーションの設計をより柔軟で拡張性の高いものにすることができます。複数のモデルに共通の振る舞いを持たせたくなったときは、ぜひポリモーフィック関連の導入を検討してみてください。
