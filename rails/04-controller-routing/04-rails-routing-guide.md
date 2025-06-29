# もう怖くない！Railsのルーティング (`routes.rb`) 完全ガイド

## はじめに

Ruby on Railsにおいて、ルーティングはアプリケーションの「交通整理係」です。ブラウザからのリクエスト（URLとHTTPメソッド）を受け取り、どのコントローラのどのアクションに処理を渡すかを決定する、非常に重要な役割を担っています。

`config/routes.rb`ファイルに記述されるこのルーティングですが、初学者にとっては少し複雑に見えるかもしれません。この記事では、Railsのルーティングの基本から応用までを体系的に解説し、「ルーティングがわからない」という状態からの脱却を目指します。

## 1. ルーティングの基本: `get`, `post`

最も基本的なルーティングは、HTTPメソッドとURLのパスを、コントローラのアクションに直接結びつける方法です。

```ruby
# config/routes.rb
Rails.application.routes.draw do
  # GETリクエストで /welcome にアクセスがあった場合、
  # welcomeコントローラのindexアクションを呼び出す
  get "welcome/index"

  # POSTリクエストで /inquiries にアクセスがあった場合、
  # inquiriesコントローラのcreateアクションを呼び出す
  post "inquiries/create"
end
```

`get "controller_name/action_name"` という書き方は、その名の通り`ControllerName#action_name`へのルートを定義するショートカットです。

より明示的に書くこともできます。

```ruby
get "/about", to: "static_pages#about"
```

この場合、`/about`というURLへのGETリクエストが、`StaticPagesController`の`about`アクションにマッピングされます。

## 2. RESTfulなルーティング: `resources`

Webアプリケーションでは、特定のリソース（例えばブログの記事、ユーザー情報など）に対して、作成（Create）、読み取り（Read）、更新（Update）、削除（Delete）といった一連の操作を行うことがよくあります。これをCRUD操作と呼びます。

Railsでは、このCRUD操作に対応する7つのアクションへのルートを一行で定義できる`resources`メソッドが用意されています。これはRailsのルーティングにおける最も重要な概念です。

```ruby
resources :articles
```

このたった1行が、以下の7つのルートを自動的に生成します。

| HTTPメソッド | URLパス             | アクション | 用途                     |
| :----------- | :------------------ | :--------- | :----------------------- |
| `GET`        | `/articles`         | `index`    | 全記事の一覧表示         |
| `GET`        | `/articles/new`     | `new`      | 新規記事の作成フォーム   |
| `POST`       | `/articles`         | `create`   | 新規記事の作成処理       |
| `GET`        | `/articles/:id`     | `show`     | 特定記事の詳細表示       |
| `GET`        | `/articles/:id/edit`| `edit`     | 特定記事の編集フォーム   |
| `PATCH/PUT`  | `/articles/:id`     | `update`   | 特定記事の更新処理       |
| `DELETE`     | `/articles/:id`     | `destroy`  | 特定記事の削除処理       |

`:id`の部分は動的なセグメントで、URLに含まれるID（例: `/articles/1`の`1`）を`params[:id]`としてコントローラで受け取ることができます。

### ルートの確認方法

定義したルートがどのようになっているか確認したい場合は、ターミナルで`rails routes`コマンドを実行します。これにより、アプリケーションに存在する全てのルートの一覧が表示され、デバッグに非常に役立ちます。

```bash
$ rails routes
   Prefix Verb   URI Pattern                  Controller#Action
 articles GET    /articles(.:format)          articles#index
          POST   /articles(.:format)          articles#create
new_article GET    /articles/new(.:format)      articles#new
edit_article GET    /articles/:id/edit(.:format) articles#edit
 article GET    /articles/:id(.:format)      articles#show
          PATCH  /articles/:id(.:format)      articles#update
          PUT    /articles/:id(.:format)      articles#update
          DELETE /articles/:id(.:format)      articles#destroy
```

`Prefix`列にある`articles`, `new_article`などは**名前付きルート（Named Routes）**といい、ビューやコントローラで`articles_path`や`new_article_url`のようなヘルパーメソッドとして利用でき、URLをハードコーディングするのを防いでくれます。

## 3. ルートのカスタマイズ

`resources`は便利ですが、7つのアクションが全て必要ない場合や、独自のアクションを追加したい場合もあります。

### 特定のアクションのみを定義する: `only`, `except`

```ruby
# indexとshowアクションだけを生成
resources :articles, only: [:index, :show]

# destroyアクション以外をすべて生成
resources :photos, except: [:destroy]
```

### 独自のアクションを追加する: `member`, `collection`

リソースに独自のアクションを追加したい場合は、`member`または`collection`を使います。

*   **`member`**: 特定のメンバー（IDが必要なリソース）に対するアクションを追加します。
    ```ruby
    resources :photos do
      member do
        get 'preview' # GET /photos/1/preview
      end
    end
    ```
*   **`collection`**: 全体のコレクションに対するアクションを追加します。
    ```ruby
    resources :photos do
      collection do
        get 'search' # GET /photos/search
      end
    end
    ```

## 4. ネストしたリソース

リソース間に関連がある場合（例: 記事とコメント）、ルートをネストさせることができます。

```ruby
resources :articles do
  resources :comments, only: [:create, :destroy]
end
```

これにより、以下のようなルートが生成されます。

*   `POST /articles/:article_id/comments` -> `comments#create`
*   `DELETE /articles/:article_id/comments/:id` -> `comments#destroy`

URLに親リソースのID (`:article_id`) が含まれるため、どの記事に対するコメントなのかを明確に表現できます。

## 5. ルートURLの設定: `root`

アプリケーションのトップページ（例: `http://localhost:3000/`）にアクセスした際に表示されるページは`root`で設定します。

```ruby
# welcomeコントローラのindexアクションをルートに設定
root 'welcome#index'

# resourcesで定義したarticlesのindexアクションをルートに設定
root 'articles#index'
```

## まとめ

Railsのルーティングは、アプリケーションの振る舞いを定義する中心的な部分です。`config/routes.rb`を見れば、そのアプリケーションがどのような機能を持っているのかを大まかに把握することができます。

*   **`get`, `post`**: 基本的なルート定義
*   **`resources`**: RESTfulなルートを一括定義する最も一般的な方法
*   **`rails routes`**: ルートを確認するための必須コマンド
*   **`only`, `except`**: 不要なルートを制限する
*   **`member`, `collection`**: 独自アクションの追加
*   **ネスト**: リソース間の関連を表現
*   **`root`**: アプリケーションの入り口を設定

これらの概念を理解すれば、`routes.rb`を自由に、そして自信を持って記述できるようになるはずです。まずは`rails routes`コマンドと仲良くなることから始めてみましょう。
