# Active Recordの基本: `has_many` / `belongs_to` を使って記事とコメント機能を実装する

## はじめに

Ruby on Railsの強力な機能の一つであるActive Recordは、データベースのテーブル同士の関係性をオブジェクト指向の形で直感的に扱うことを可能にします。その中でも特に重要なのが、`has_many`と`belongs_to`を使った「1対多」のアソシエーション（関連付け）です。

この記事では、ブログの「記事（Article）」と「コメント（Comment）」を例に、1対多のアソシエーションを実装し、Railsアプリケーションで最も基本的なデータ構造を構築する方法を学びます。

### 前提

*   `Article`モデルがすでに存在していること。（例: `rails g scaffold Article title:string content:text`で作成済み）

## 1. Commentモデルの作成

まず、コメントを保存するための`Comment`モデルを作成します。コメントは必ずどこかの記事に属するため、どの記事に属しているかを示す`article_id`という外部キーが必要です。

`references`型を使うと、外部キーカラムの作成とインデックスの追加を同時に行ってくれるので便利です。

```bash
rails generate model Comment body:text article:references
```

このコマンドは以下のファイルを生成します。

*   **`app/models/comment.rb`**: `Comment`モデルファイル。
*   **`db/migrate/xxxxxxxx_create_comments.rb`**: `comments`テーブルを作成するためのマイグレーションファイル。

生成されたマイグレーションファイルの中身を見てみましょう。

```ruby
# db/migrate/xxxxxxxx_create_comments.rb
class CreateComments < ActiveRecord::Migration[7.0]
  def change
    create_table :comments do |t|
      t.text :body
      t.references :article, null: false, foreign_key: true

      t.timestamps
    end
  end
end
```

*   **`t.references :article, ...`**: これが`article_id`という名前の`integer`型カラムを作成し、`articles`テーブルの`id`カラムへの外部キー制約を設定します。`null: false`はコメントが必ず記事に紐づくことを保証し、`foreign_key: true`はデータベースレベルでの整合性を保ちます。

マイグレーションを実行して、`comments`テーブルをデータベースに作成します。

```bash
rails db:migrate
```

## 2. アソシエーションの定義

次に、`Article`モデルと`Comment`モデルに、お互いの関係性を教えます。

*   1つの記事（Article）は、たくさんのコメント（Comment）を持つことができます → **`has_many :comments`**
*   1つのコメント（Comment）は、1つの記事（Article）に属します → **`belongs_to :article`**

それぞれのモデルファイルを以下のように編集します。

```ruby
# app/models/article.rb
class Article < ApplicationRecord
  has_many :comments, dependent: :destroy
end
```

```ruby
# app/models/comment.rb
class Comment < ApplicationRecord
  belongs_to :article
end
```

*   **`has_many :comments`**: `Article`のインスタンス（特定の記事）から、その記事に関連するすべてのコメントを`article.comments`という形で取得できるようになります。
*   **`dependent: :destroy`**: これは非常に重要なオプションです。記事が削除されたときに、その記事に紐づくすべてのコメントも一緒にデータベースから削除されるようになります。これがないと、親のいないコメントがデータベースに残り続けてしまいます。
*   **`belongs_to :article`**: `Comment`のインスタンス（特定のコメント）から、それが属する記事を`comment.article`という形で取得できるようになります。`rails g model`で`references`型を指定した場合、この行は自動で`comment.rb`に追加されています。

## 3. ルーティングの設定（ネストしたリソース）

コメントは記事に従属するリソースなので、URLもその関係性を表現するのがRESTfulな設計です。例えば、「IDが1の記事に対するコメント」は`/articles/1/comments`のようなURLで表現します。

これを実現するために、`config/routes.rb`で**ネストしたリソース**を定義します。

```ruby
# config/routes.rb
Rails.application.routes.draw do
  resources :articles do
    resources :comments
  end
  root "articles#index"
end
```

このように`resources :articles`ブロックの中に`resources :comments`を記述することで、コメント関連のURLが`/articles/:article_id/`のプレフィックスを持つようになります。

## 4. コメント機能の実装

アソシエーションとルーティングが設定できたので、実際にコメントを作成・表示する機能を実装していきましょう。

### コメント作成フォーム

記事の詳細ページ（`show.html.erb`）に、コメント投稿フォームを追加します。

```erb
<%# app/views/articles/show.html.erb %>

<h2>Comments</h2>

<%# コメント投稿フォーム %>
<%= form_with(model: [ @article, @article.comments.build ]) do |form| %>
  <p>
    <%= form.label :body %><br>
    <%= form.text_area :body %>
  </p>
  <p>
    <%= form.submit %>
  </p>
<% end %>
```

*   **`form_with(model: [ @article, @article.comments.build ])`**: ここがポイントです。`@article.comments.build`は、`@article`に紐付いた新しい`Comment`オブジェクトを作成します。配列`[@article, @article.comments.build]`を`model`に渡すことで、`form_with`はネストしたルート（`/articles/1/comments`）に`POST`リクエストを送る適切なURLを自動で生成してくれます。

### Commentsコントローラの作成

コメントを処理するための`CommentsController`を作成します。

```bash
touch app/controllers/comments_controller.rb
```

そして、以下のように`create`アクションを実装します。

```ruby
# app/controllers/comments_controller.rb
class CommentsController < ApplicationController
  def create
    @article = Article.find(params[:article_id])
    @comment = @article.comments.create(comment_params)
    redirect_to article_path(@article)
  end

  private
    def comment_params
      params.require(:comment).permit(:body)
    end
end
```

*   **`@article = Article.find(params[:article_id])`**: ネストしたルートなので、記事のIDは`params[:id]`ではなく`params[:article_id]`で渡ってきます。
*   **`@comment = @article.comments.create(comment_params)`**: `has_many`アソシエーションのおかげで、このような直感的な書き方ができます。`@article.comments`に対して`create`を呼び出すことで、自動的に`article_id`がセットされた状態で新しいコメントが作成・保存されます。
*   **`redirect_to article_path(@article)`**: コメント投稿後、元の記事詳細ページに戻ります。

### コメントの表示

最後に、投稿されたコメントを記事詳細ページに表示します。

```erb
<%# app/views/articles/show.html.erb %>

<h2>Comments</h2>
<% @article.comments.each do |comment| %>
  <p>
    <strong>Comment:</strong>
    <%= comment.body %>
  </p>
<% end %>

<%# コメント投稿フォーム (省略) %>
```

*   **`@article.comments.each do |comment|`**: `has_many`アソシエーションにより、`@article.comments`でその記事に紐づく全てのコメントを取得できます。それをループして一つずつ表示しています。

## まとめ

`has_many`と`belongs_to`を使うことで、モデル間の「1対多」の関係を簡単に表現し、操作できることを学びました。このアソシエーションは、ユーザーと投稿、商品とレビューなど、Webアプリケーションにおけるほとんどのデータ構造の基礎となります。

今回実装した機能をベースに、コメントの削除機能や編集機能に挑戦してみることで、さらに理解が深まるでしょう。
