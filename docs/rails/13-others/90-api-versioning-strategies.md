# RailsにおけるAPIバージョニング戦略

Web API、特に長期間にわたって運用されるサービスでは、機能の追加や変更に伴いAPIの仕様が変わることがよくあります。しかし、古いバージョンのAPIを利用しているクライアントアプリケーションを壊すことなく、安全にAPIを更新していくためには、「APIバージョニング」という考え方が不可欠です。

この記事では、RailsアプリケーションでAPIのバージョン管理を行うための代表的な戦略をいくつか紹介し、それぞれのメリット・デメリットと実装例を解説します。

## なぜAPIバージョニングが必要か？

- **下位互換性の維持**: 新しいAPIをリリースしても、古いクライアントが正しく動作し続けることを保証します。
- **安全な機能移行**: ユーザーに新しいバージョンへの移行期間を提供し、開発者は安心してAPIの改善やリファクタリングを行えます。
- **明確なコミュニケーション**: APIのバージョンが明確になることで、開発者と利用者の間のコミュニケーションがスムーズになります。

## 代表的なバージョニング戦略

主なAPIバージョニング戦略は以下の通りです。

1.  **URIパスにバージョンを含める**
2.  **クエリパラメータでバージョンを指定する**
3.  **カスタムヘッダーでバージョンを指定する**
4.  **Acceptヘッダーでバージョンを指定する (コンテントネゴシエーション)**

それぞれ詳しく見ていきましょう。

---

### 1. URIパスにバージョンを含める

最も一般的で直感的な方法です。APIのエンドポイントのURIにバージョン番号を含めます。

**例**: `/api/v1/users`, `/api/v2/users`

#### メリット
- **直感的で分かりやすい**: ブラウザでアクセスするだけで、どのバージョンのAPIを叩いているかが一目瞭然です。
- **実装が容易**: Railsのルーティングのnamespace機能を使えば簡単に実現できます。

#### デメリット
- **URIの見た目が変わる**: バージョンアップのたびにURIが変わることを嫌う人もいます。
- **RESTの原則から外れる？**: 「リソースの場所を示すURIは不変であるべき」というRESTの考え方からすると、バージョン番号がURIに含まれるのは好ましくないという意見もあります。

#### Railsでの実装例

`config/routes.rb` で `namespace` を使ってルーティングを定義します。

config/routes.rb
```ruby
Rails.application.routes.draw do
  # /api/v1/*
  namespace :api do
    namespace :v1 do
      resources :users, only: [:index]
    end
  end

  # /api/v2/*
  namespace :api do
    namespace :v2 do
      resources :users, only: [:index]
    end
  end
end
```

コントローラはバージョンごとにディレクトリを分けて管理します。

```
app/controllers/
└── api/
    ├── v1/
    │   └── users_controller.rb
    └── v2/
        └── users_controller.rb
```

**`app/controllers/api/v1/users_controller.rb`**
```ruby
class Api::V1::UsersController < ApplicationController
  def index
    users = User.all
    render json: users.map { |u| { id: u.id, name: u.name } }
  end
end
```

**`app/controllers/api/v2/users_controller.rb`**
```ruby
class Api::V2::UsersController < ApplicationController
  def index
    users = User.all
    # v2ではemailも返すように変更
    render json: users.map { |u| { id: u.id, name: u.name, email: u.email } }
  end
end
```

---

### 2. クエリパラメータでバージョンを指定する

URIのクエリパラメータでバージョンを指定する方法です。

**例**: `/api/users?version=1`, `/api/users?api_version=2`

#### メリット
- **URIが変わらない**: URIパスは不変に保たれます。
- **デフォルトバージョンを設定しやすい**: バージョン指定がない場合は、最新版や安定版を返すといった実装がしやすいです。

#### デメリット
- **キャッシュが効きにくい場合がある**: クエリパラメータを無視するキャッシュプロキシが存在する場合、意図した通りにキャッシュされない可能性があります。
- **URIが少し煩雑になる**: 全てのリクエストにクエリパラメータを付ける必要があります。

#### Railsでの実装例

ルーティングはシンプルになりますが、コントローラ側でバージョンの振り分け処理が必要になります。

**`config/routes.rb`**
config/routes.rb
```ruby
Rails.application.routes.draw do
  namespace :api do
    resources :users, only: [:index]
  end
end
```

**`app/controllers/api/users_controller.rb`**
```ruby
class Api::UsersController < ApplicationController
  def index
    case params[:version]
    when '2'
      render_v2
    else # デフォルトはv1
      render_v1
    end
  end

  private

  def render_v1
    users = User.all
    render json: users.map { |u| { id: u.id, name: u.name } }
  end

  def render_v2
    users = User.all
    render json: users.map { |u| { id: u.id, name: u.name, email: u.email } }
  end
end
```

---

### 3. カスタムヘッダーでバージョンを指定する

`X-Api-Version: 1` のようなカスタムリクエストヘッダーでバージョンを指定する方法です。

#### メリット
- **URIがクリーン**: URIパスもクエリパラメータも汚染されません。
- **RESTの原則に忠実**: URIはリソースを一意に示し、表現（バージョン）はヘッダーで制御するという考え方です。

#### デメリット
- **直感的でない**: ブラウザから直接試したり、curlで叩いたりするのが少し面倒になります。
- **ヘッダー名の標準がない**: `X-Api-Version`, `Api-Version`など、ヘッダー名がサービスによってバラバラになりがちです。

#### Railsでの実装例

`before_action` などを使って、リクエストヘッダーからバージョンを判定します。

app/controllers/api/users_controller.rb
```ruby
class Api::UsersController < ApplicationController
  def index
    case request.headers['X-Api-Version']
    when '2'
      render_v2
    else
      render_v1
    end
  end

  # ... render_v1, render_v2 メソッドは上記と同じ
end
```

---

### 4. Acceptヘッダーでバージョンを指定する

HTTPの`Accept`ヘッダーを使い、メディアタイプでバージョンを指定する方法です。これはコンテントネゴシエーションの一種です。

**例**: `Accept: application/vnd.myapi.v1+json`

#### メリット
- **HTTPの仕様に最も準拠**: `Accept`ヘッダーは本来、クライアントが受け入れ可能なメディアタイプをサーバーに伝えるためのものです。
- **URIが完全にクリーン**: URIはリソースの場所のみを示します。

#### デメリット
- **実装が複雑**: ルーティングやコントローラでの実装が他の方法より複雑になりがちです。
- **利用が難しい**: APIを利用する側にとって、この方法が最も手間がかかります。curlでの指定も長くなります。

#### Railsでの実装例

`constraints` を使ってルーティングを定義するのが一般的です。

**`config/routes.rb`**
config/routes.rb
```ruby
class ApiVersion
  attr_reader :version

  def initialize(version)
    @version = version
  end

  def matches?(request)
    request.headers['Accept'].include?("application/vnd.myapi.v#{@version}+json")
  end
end

Rails.application.routes.draw do
  namespace :api do
    # v1
    scope constraints: ApiVersion.new(1) do
      resources :users, only: [:index], controller: 'v1/users'
    end

    # v2
    scope constraints: ApiVersion.new(2) do
      resources :users, only: [:index], controller: 'v2/users'
    end
  end
end
```
この場合、コントローラはURIパス方式と同様に、バージョンごとにファイルを分けます。

## どの戦略を選ぶべきか？

絶対的な正解はありませんが、一般的には以下の基準で選ばれることが多いです。

- **公開API（Public API）の場合**:
  - **URIパス方式 (`/api/v1`)** が最も一般的で、ドキュメントも作りやすく、利用者にとっても分かりやすいため、第一候補となります。
- **内部API（Private API）の場合**:
  - 開発チーム内で完結するため、どの方法でも問題ありません。URIパス方式やカスタムヘッダー方式がよく使われます。
- **RESTの原則を厳密に守りたい場合**:
  - カスタムヘッダー方式やAcceptヘッダー方式が適しています。

多くの大規模サービス（GitHub, Stripeなど）がURIパス方式を採用していることからも、この方法がデファクトスタンダードと言えるでしょう。迷ったら **URIパス方式** を選ぶのが無難です。

## まとめ

APIバージョ���ングは、進化し続けるサービスを支える重要な技術です。それぞれの戦略のメリット・デメリットを理解し、自分のプロジェクトの要件（公開範囲、チームのスキル、思想など）に合った最適な方法を選択してください。

Railsでは、どの戦略も比較的容易に実装できる強力なルーティング機能が備わっています。まずはURIパス方式から試してみることをお勧めします。