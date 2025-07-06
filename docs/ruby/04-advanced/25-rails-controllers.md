# Railsのコントローラ

Railsのコントローラは、MVCアーキテクチャにおける「C」の部分を担います。ユーザーからのリクエストを受け取り、モデルとビューと連携して、適切なレスポンスを返すのが主な役割です。

## コントローラの役割

-   **リクエストの処理**: ルーティングからリクエストを受け取ります。
-   **ビジネスロジックの呼び出し**: モデルを介して、データの取得や更新などのビジネスロジックを実行します。
-   **データの準備**: ビューに渡すためのインスタンス変数（`@`で始まる変数）を準備します。
-   **レスポンスの生成**: ビューをレンダリングするか、リダイレクトを行うことで、HTTPレスポンスを生成します。

## コントローラの作成

コントローラは、`rails generate controller`コマンドで生成できます。

```bash
bin/rails generate controller Posts index show
```

これにより、`app/controllers/posts_controller.rb`ファイルが生成され、`index`と`show`アクションが定義されます。

```ruby
# app/controllers/posts_controller.rb
class PostsController < ApplicationController
  def index
    @posts = Post.all
  end

  def show
    @post = Post.find(params[:id])
  end
end
```

## パラメータの受け取り

コントローラは、`params`ハッシュを通じて、リクエストのパラメータ（URLのクエリパラメータやフォームの送信データなど）にアクセスできます。

`params[:id]`のようにして、特定のパラメータを取得します。

## Strong Parameters

セキュリティ上の理由から、マスアサインメント（一度に複数の属性を更新すること）を行う際には、`Strong Parameters`という仕組みを使用します。これにより、許可されたパラメータのみがモデルに渡されるようになります。

```ruby
def create
  @post = Post.new(post_params)
  if @post.save
    redirect_to @post
  else
    render :new
  end
end

private

def post_params
  params.require(:post).permit(:title, :body)
end
```

`require`でトップレベルのキーを指定し、`permit`で許可する属性のリストを指定します。

## レンダリングとリダイレクト

-   `render`: 指定されたビューテンプレートをレンダリングして、レスポンスを生成します。
    ```ruby
    render :index
    ```
-   `redirect_to`: ブラウザに別のURLへのリダイレクトを指示します。
    ```ruby
    redirect_to posts_path
    ```

## before_action

`before_action`は、特定のアクションが実行される前に共通の処理を実行するためのフィルタです。例えば、複数のアクションで特定のデータが必要な場合などに使用します。

```ruby
class PostsController < ApplicationController
  before_action :set_post, only: [:show, :edit, :update, :destroy]

  # ...

  private

  def set_post
    @post = Post.find(params[:id])
  end
end
```

## まとめ

コントローラは、Railsアプリケーションの心臓部であり、リクエストのライフサイクルを管理します。`params`の扱いや`Strong Parameters`によるセキュリティ対策、`render`と`redirect_to`の使い分けを理解することが重要です。