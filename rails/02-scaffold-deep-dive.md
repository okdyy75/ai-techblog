# Scaffoldは一体何をしているのか？生成されるコードを1行ずつ解説

## はじめに

Railsの`scaffold`は、開発の初期段階で非常に便利なコマンドです。モデル、ビュー、コントローラなど、Webアプリケーションの基本的な構成要素を自動で生成してくれます。しかし、その便利さゆえに「中で何が起きているかよくわからないまま使っている」という方も多いのではないでしょうか。

この記事では、`rails generate scaffold`コマンドが生成するファイルを1つずつ丁寧に読み解き、Railsアプリケーションの仕組みへの理解を深めることを目的とします。

### 前提

以下のコマンドが実行済みであるとします。

```bash
rails generate scaffold Article title:string content:text
```

## 1. `config/routes.rb` - ルーティング

`scaffold`を実行すると、まず`config/routes.rb`に以下の1行が追加（またはアンコメント）されます。

```ruby
# config/routes.rb
Rails.application.routes.draw do
  resources :articles
end
```

*   **`resources :articles`**: これは、`articles`リソースに対する一連のRESTfulなルートを自動で定義するための記述です。具体的には、以下の7つのアクションに対応するURLとコントローラのアクションがマッピングされます。

| HTTPメソッド | URLパス             | コントローラ#アクション | 用途                     |
| :----------- | :------------------ | :---------------------- | :----------------------- |
| `GET`        | `/articles`         | `articles#index`        | 全記事の一覧表示         |
| `GET`        | `/articles/new`     | `articles#new`          | 新規記事の作成フォーム   |
| `POST`       | `/articles`         | `articles#create`       | 新規記事の作成処理       |
| `GET`        | `/articles/:id`     | `articles#show`         | 特定記事の詳細表示       |
| `GET`        | `/articles/:id/edit`| `articles#edit`         | 特定記事の編集フォーム   |
| `PATCH/PUT`  | `/articles/:id`     | `articles#update`       | 特定記事の更新処理       |
| `DELETE`     | `/articles/:id`     | `articles#destroy`      | 特定記事の削除処理       |

この1行だけで、ブログ記事の基本的な操作に必要なすべてのURLが定義されます。

## 2. `app/controllers/articles_controller.rb` - コントローラ

次に、リクエストを処理するコントローラを見てみましょう。

```ruby
# app/controllers/articles_controller.rb
class ArticlesController < ApplicationController
  before_action :set_article, only: %i[ show edit update destroy ]

  # GET /articles
  def index
    @articles = Article.all
  end

  # GET /articles/1
  def show
  end

  # GET /articles/new
  def new
    @article = Article.new
  end

  # GET /articles/1/edit
  def edit
  end

  # POST /articles
  def create
    @article = Article.new(article_params)

    if @article.save
      redirect_to @article, notice: "Article was successfully created."
    else
      render :new, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /articles/1
  def update
    if @article.update(article_params)
      redirect_to @article, notice: "Article was successfully updated."
    else
      render :edit, status: :unprocessable_entity
    end
  end

  # DELETE /articles/1
  def destroy
    @article.destroy
    redirect_to articles_url, notice: "Article was successfully destroyed."
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_article
      @article = Article.find(params[:id])
    end

    # Only allow a list of trusted parameters through.
    def article_params
      params.require(:article).permit(:title, :content)
    end
end
```

*   **`before_action :set_article, ...`**: `show`, `edit`, `update`, `destroy`アクションが実行される前に、`set_article`メソッドを呼び出す設定です。これにより、各アクションで`@article = Article.find(params[:id])`という記述を繰り返す必要がなくなります。
*   **`index`**: `Article.all`ですべての記事を取得し、インスタンス変数`@articles`に格納します。この変数はビュー（`index.html.erb`）で使われます。
*   **`show`**: `before_action`で`@article`がセットされるので、中身は空です。
*   **`new`**: 新しい`Article`オブジェクトを作成し、`@article`に格納します。これはビューのフォーム (`form_with`) で使われます。
*   **`edit`**: `before_action`で`@article`がセットされるので、中身は空です。
*   **`create`**: `new`アクションから送信されたパラメータ（`article_params`で安全にフィルタリング済み）を使って新しい記事を作成し、データベースに保存します。保存が成功すれば記事詳細ページにリダイレクトし、失敗すれば`new`のビューを再表示します。
*   **`update`**: `edit`アクションから送信されたパラメータで記事を更新します。成功すれば記事詳細ページにリダイレクトし、失敗すれば`edit`のビューを再表示します。
*   **`destroy`**: 記事を削除し、記事一覧ページにリダイレクトします。
*   **`private`メソッド**: 
    *   `set_article`: URLの`:id`パラメータを使って、対象の記事をデータベースから見つけます。
    *   `article_params`: **Strong Parameters**という仕組みです。フォームから送られてきたデータのうち、`title`と`content`だけを許可し、意図しないデータが登録されるのを防ぎます。

## 3. `app/models/article.rb` - モデル

モデルファイルは非常にシンプルです。

```ruby
# app/models/article.rb
class Article < ApplicationRecord
end
```

*   **`class Article < ApplicationRecord`**: `Article`クラスが`ApplicationRecord`を継承することを示しています。`ApplicationRecord`は`ActiveRecord::Base`を継承しており、これにより`Article`モデルはデータベースの`articles`テーブルと連携し、`find`, `all`, `save`, `update`, `destroy`などのメソッドが使えるようになります。

## 4. `app/views/articles/` - ビュー

`scaffold`は、各アクションに対応するビューファイルも生成します。

*   **`index.html.erb`**: 記事一覧ページ。`@articles`をループして各記事のタイトルを表示し、詳細ページへのリンクを設置します。
*   **`show.html.erb`**: 記事詳細ページ。`@article`のタイトルと内容を表示します。
*   **`new.html.erb`**: 新規作成ページ。`_form.html.erb`パーシャルを呼び出します。
*   **`edit.html.erb`**: 編集ページ。こちらも`_form.html.erb`パーシャルを呼び出します。
*   **`_form.html.erb`**: `new`と`edit`で共有されるフォーム部分のテンプレート（パーシャル）です。`form_with(model: article)` を使い、`@article`が新規オブジェクトか既存オブジェクトかを自動で判断して、適切な`POST`先（`create`か`update`）にフォームを送信します。

## 5. `db/migrate/xxxxxxxx_create_articles.rb` - マイグレーション

最後に、データベースのテーブル定義です。

```ruby
# db/migrate/20240628000000_create_articles.rb (タイムスタンプは実行日時による)
class CreateArticles < ActiveRecord::Migration[7.0]
  def change
    create_table :articles do |t|
      t.string :title
      t.text :content

      t.timestamps
    end
  end
end
```

*   **`create_table :articles`**: `articles`という名前のテーブルを作成します。
*   **`t.string :title`**: `title`という名前の`string`型（文字列）カラムを追加します。
*   **`t.text :content`**: `content`という名前の`text`型（長文テキスト）カラムを追加します。
*   **`t.timestamps`**: `created_at`と`updated_at`という2つのタイムスタンプカラムを自動で追加します。これにより、データの作成日時と更新日時が記録されます。

このファイルをもとに`rails db:migrate`を実行することで、実際にデータベースにテーブルが作成されます。

## まとめ

`scaffold`は、これらすべてのファイルを連携させて、一つのまとまった機能を一瞬で作り上げてくれます。それぞれのファイルがどのような役割を持ち、どのように連携しているかを理解することで、`scaffold`を単なる「魔法のコマンド」から、カスタマイズ可能な「開発の土台」として活用できるようになります。

ぜひ、生成されたコードを自分なりに改造して、Railsアプリケーションの仕組みをより深く探求してみてください。
