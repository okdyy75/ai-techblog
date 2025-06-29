# `rodauth` gemを使った柔軟でセキュアな認証システムの構築

Railsアプリケーションに認証機能を実装する際、多くの開発者はまず`Devise`を思い浮かべるでしょう。Deviseは長年にわたりRailsコミュニティで広く使われてきた、非常に多機能で便利な認証ライブラリです。

しかし、その多機能さゆえに内部がブラックボックス化しやすく、デフォルトから外れたカスタマイズをしようとすると、しばしば困難に直面します。

近年、Deviseに代わる新しい選択肢として注目を集めているのが、**Rodauth**です。

Rodauthは、セキュリティ、パフォーマンス、そして拡張性を最優先に設計された、モダンな認証フレームワークです。もともとはRubyのWebフレームワーク`Roda`のために作られましたが、`rodauth-rails` gemによってRailsにもシームレスに統合できます。

この記事では、RodauthがDeviseとどう違うのか、そしてその特徴と基本的な使い方について解説します。

## Rodauthの設計思想と特徴

Rodauthの設計は、Deviseとは対照的なアプローチを取っています。

- **明示的な設定 (Explicit over Implicit)**: Deviseが多くの機能を「魔法のように」提供するのに対し、Rodauthは必要な機能を一つずつ明示的に有効にしていくスタイルを取ります。これにより、アプリケーションにどのような認証機能が含まれているかが一目瞭然になります。

- **ルーティングツリー (Routing Tree)**: Rodauthは、すべての認証関連のエンドポイント（`/login`, `/logout`, `/create-account`など）を、単一のルーティングツリーとして管理します。これにより、ルーティングの処理が非常に高速になります。

- **単一の`rodauth`オブジェクト**: すべての認証ロジックは、`rodauth`という一つのオブジェクトに集約されます。コントローラーやビューから`rodauth.login(...)`, `rodauth.logged_in?`, `rodauth.logout_path`のように、統一されたインターフェースでアクセスします。

- **セキュリティへの強いこだわり**: パスワードハッシュ化のアルゴリズム、セッショントークンの管理、総当たり攻撃への対策など、セキュリティに関するベストプラクティスがデフォルトで組み込まれています。

- **豊富な機能群**: ログイン/ログアウトだけでなく、アカウント作成、メール検証、パスワードリセット、多要素認証（MFA/2FA）、シングルサインオン（SSO）、APIキートークンなど、数十もの機能がモジュールとして提供されており、必要なものだけを選択して有効化できます。

## セットアップと基本的な使い方

`rodauth-rails`を使ったセットアップは、インストーラによって半自動的に行われます。

### 1. インストール

`Gemfile`に`rodauth-rails`を追加して`bundle install`します。

```ruby
# Gemfile
gem "rodauth-rails"
```

### 2. インストールタスクの実行

```bash
rails g rodauth:install
```

このコマンドが、以下の重要なファイルを生成・設定します。

- **`Account`モデルとマイグレーション**: 認証の主体となる`accounts`テーブルを作成します。`email`カラムには`citext`型（大文字小文字を区別しないテキスト型）が使われ、一意性制約が設定されます。
- **`RodauthMain`クラス (`app/lib/rodauth_main.rb`)**: Rodauthの設定を行う中心的なファイル。
- **`RodauthApp`クラス (`app/lib/rodauth_app.rb`)**: Rodauthのルーティングを処理するRackアプリケーション。
- **`routes.rb`への追記**: RodauthAppをマウントするためのルーティングが追加されます。
- **`ApplicationController`への組み込み**: `rodauth`ヘルパーメソッドが使えるようになります。

### 3. `RodauthMain`での機能設定

認証ロジックのカスタマイズは、`RodauthMain`クラスで行います。`enable`メソッドで、使いたい機能（feature）を有効化していきます。

```ruby
# app/lib/rodauth_main.rb
class RodauthMain < Rodauth::Rails::Auth
  configure do
    # 基本的なログイン機能
    enable :login, :logout, :create_account

    # パスワードリセット機能
    enable :reset_password

    # メール検証機能
    enable :verify_account

    # 多要素認証（TOTP）
    enable :two_factor_authentication

    # JSON APIとしての利用を有効化
    enable :json

    # ... 他にも多くの設定が可能
    # 例: ログイン後のリダイレクト先
    login_return_to_route "/dashboard"
  end
end
```

### 4. ビューとコントローラーでの利用

- **ログイン状態の確認**: `rodauth.logged_in?`
- **現在のユーザー**: `rodauth.current_account`
- **ログイン要求**: `rodauth.require_authentication` (コントローラーの`before_action`で使う)
- **パスの取得**: `rodauth.login_path`, `rodauth.logout_path`など。

```ruby
# app/controllers/dashboard_controller.rb
class DashboardController < ApplicationController
  before_action { rodauth.require_authentication }

  def show
    @user = rodauth.current_account
  end
end
```

```erb
<%# app/views/layouts/application.html.erb %>
<nav>
  <% if rodauth.logged_in? %>
    <%= rodauth.current_account.email %>
    <%= link_to "Logout", rodauth.logout_path, method: :post %>
  <% else %>
    <%= link_to "Login", rodauth.login_path %>
    <%= link_to "Sign Up", rodauth.create_account_path %>
  <% end %>
</nav>
```

## Deviseとの比較

| | Rodauth | Devise |
|:---|:---|:---|
| **設計思想** | 明示的、プラグインベース | 暗黙的、多機能 |
| **カスタマイズ** | 容易（設定やメソッドのオーバーライド） | 難しい場合がある |
| **パフォーマンス** | 高速（ルーティングツリー） | 標準的 |
| **学習曲線** | やや急（設定項目を理解する必要あり） | 緩やか（最初は簡単） |
| **JSON API** | 標準で強力にサポート | 限定的（`devise-jwt`などが必要） |

## まとめ

Rodauthは、Deviseが提供する「魔法」の代わりに、**透明性、柔軟性、そして堅牢なセキュリティ**を提供します。

- **必要な機能だけを有効化**する明示的なアプローチ。
- **カスタマイズが容易**で、フレームワークの内部に潜る必要が少ない。
- **セキュリティとパフォーマンス**が最優先で設計されている。

最初は設定項目が多く、Deviseよりもとっつきにくいと感じるかもしれません。しかし、その明示的な設計は、長期的に見てアプリケーションのメンテナンス性を大幅に向上させます。

特に、JSON APIを主体とするモダンなアプリケーションや、複雑な認証要件を持つプロジェクト、そしてセキュリティを最重要視する場合には、RodauthはDeviseに代わる非常に強力な選択肢となります。新しいRailsプロジェクトを始める際には、ぜひその採用を検討してみてください。
