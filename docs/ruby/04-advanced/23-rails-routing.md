# Railsのルーティング

Railsのルーティングは、受信したリクエストを適切なコントローラのアクションに振り分ける役割を担います。ルーティングの設定は、`config/routes.rb`ファイルで行います。

## RESTfulなルーティング

Railsでは、`resources`メソッドを使用することで、RESTfulなルーティングを簡単に定義できます。

```ruby
# config/routes.rb
Rails.application.routes.draw do
  resources :posts
end
```

これにより、以下の7つのルーティングが自動的に生成されます。

| HTTPメソッド | パス                | コントローラ#アクション | 用途                     |
|--------------|---------------------|-------------------------|--------------------------|
| GET          | `/posts`            | `posts#index`           | すべての投稿を一覧表示   |
| GET          | `/posts/new`        | `posts#new`             | 新しい投稿を作成するフォーム |
| POST         | `/posts`            | `posts#create`          | 新しい投稿を作成         |
| GET          | `/posts/:id`        | `posts#show`            | 特定の投稿を表示         |
| GET          | `/posts/:id/edit`   | `posts#edit`            | 特定の投稿を編集するフォーム |
| PATCH/PUT    | `/posts/:id`        | `posts#update`          | 特定の投稿を更新         |
| DELETE       | `/posts/:id`        | `posts#destroy`         | 特定の投稿を削除         |

## ルーティングの確認

定義したルーティングは、`bin/rails routes`コマンドで確認できます。

```bash
bin/rails routes
```

## 個別のルーティング

`get`, `post`, `patch`, `put`, `delete`メソッドを使用して、個別のルーティングを定義することもできます。

```ruby
get 'welcome', to: 'pages#welcome'
```

この例では、`GET /welcome`リクエストが`pages`コントローラの`welcome`アクションにマッピングされます。

## ルートパス

アプリケーションのルートURL（例: `http://localhost:3000/`）に対応するルーティングは、`root`メソッドで定義します。

```ruby
root 'posts#index'
```

## 名前付きルート

ルーティングには名前を付けることができ、ビューやコントローラでパスを生成する際に便利です。`resources`メソッドは、自動的に名前付きルートを生成します（例: `posts_path`, `new_post_path`）。

個別のルーティングに名前を付けるには、`as`オプションを使用します。

```ruby
get 'login', to: 'sessions#new', as: 'login'
```

これにより、`login_path`や`login_url`といったヘルパーメソッドが利用可能になります。

## まとめ

Railsのルーティングは、アプリケーションのURL構造を定義し、リクエストをコントローラのアクションに結びつけるための強力な仕組みです。`config/routes.rb`を適切に設定することで、クリーンで分かりやすいURLを設計することができます。