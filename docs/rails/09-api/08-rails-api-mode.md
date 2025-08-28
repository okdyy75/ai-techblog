# Ruby on RailsのAPIモード

Rails 5から導入されたAPIモードは、JSON APIなど、Web APIの開発に特化したRailsアプリケーションを構築するための機能です。HTMLのビュー層やセッション管理など、APIに不要なミドルウェアをそぎ落とし、軽量で高速なAPIサーバーを構築できます。

## 1. APIモードでのアプリケーション作成

`--api`フラグを付けて`rails new`を実行します。

```bash
$ rails new my_api_app --api -d postgresql
```

## 2. 通常のRailsとの違い

APIモードで作成されたアプリケーションは、以下の点が異なります。

- **ミドルウェアの削減**: `ActionDispatch::Cookies`, `ActionDispatch::Session::CookieStore`など、ブラウザ向けの機能が除外されます。
- **コントローラの継承元**: `ApplicationController`は`ActionController::API`を継承します。これは`ActionController::Base`の軽量版です。
- **ジェネレータの挙動**: `scaffold`ジェネレータはビューファイルを生成せず、JSONを返すコントローラのみを作成します。
- **モジュールの削減**: `ActionView::Rendering`など、ビューに関連するモジュールがコントローラに含まれません。

## 3. APIコントローラの作成例

`scaffold`を使って、基本的なCRUD APIを作成してみましょう。

```bash
$ rails generate scaffold Post title:string content:text
$ rails db:migrate
```

生成される`PostsController`は以下のようになります。

**`app/controllers/posts_controller.rb`**
```ruby
class PostsController < ApplicationController
  before_action :set_post, only: %i[ show update destroy ]

  # GET /posts
  def index
    @posts = Post.all
    render json: @posts
  end

  # GET /posts/1
  def show
    render json: @post
  end

  # POST /posts
  def create
    @post = Post.new(post_params)

    if @post.save
      render json: @post, status: :created, location: @post
    else
      render json: @post.errors, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /posts/1
  def update
    if @post.update(post_params)
      render json: @post
    else
      render json: @post.errors, status: :unprocessable_entity
    end
  end

  # DELETE /posts/1
  def destroy
    @post.destroy
  end

  private
    def set_post
      @post = Post.find(params[:id])
    end

    def post_params
      params.require(:post).permit(:title, :content)
    end
end
```
`render json:`が使われ、HTMLをレンダリングする代わりにJSONデータを返していることがわかります。

## 4. シリアライザの活用

APIレスポンスのJSON構造を整形・制御するために、`active_model_serializers`や`jsonapi-serializer`などのGemを導入するのが一般的です。

**`jsonapi-serializer`の例:**

`Gemfile`に追加:
```ruby
gem 'jsonapi-serializer'
```

シリアライザを作成:
```bash
$ rails g serializer post title content created_at
```

**`app/serializers/post_serializer.rb`**
```ruby
class PostSerializer
  include JSONAPI::Serializer
  attributes :title, :content, :created_at
end
```

コントローラでシリアライザを使用:
```ruby
def show
  render json: PostSerializer.new(@post).serializable_hash
end
```

これにより、JSON:API仕様に準拠した、一貫性のあるJSONレスポンスを簡単に生成できます。

APIモードは、Railsの強力なORMであるActive Recordやルーティング機能を活用しつつ、API開発に集中したい場合に最適な選択肢です。
