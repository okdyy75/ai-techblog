# Ruby on Railsのセキュリティベストプラクティス

Ruby on Railsは、多くのセキュリティ対策をフレームワークレベルで提供しており、開発者が安全なWebアプリケーションを構築するのを助けてくれます。しかし、フレームワークの機能に頼るだけでなく、開発者自身がセキュリティのベストプラクティスを理解し、実践することが不可欠です。

この記事では、Railsアプリケーションを保護するために従うべき重要なセキュリティ対策を解説します。

## 1. マスアサインメント脆弱性 (Mass Assignment)

**問題**: ユーザーが送信したフォームデータを、`update`や`new`メソッドで直接モデルに割り当てる際に、意図しない属性（例: `admin`フラグ）まで更新されてしまう脆弱性。

**対策**: **Strong Parameters** を必ず使用する。コントローラで、許可するパラメータを明示的にホワイトリスト化します。

```ruby
# app/controllers/users_controller.rb
class UsersController < ApplicationController
  def update
    @user = User.find(params[:id])
    if @user.update(user_params)
      # ...
    else
      # ...
    end
  end

  private

  def user_params
    # :nameと:emailのみ許可し、:adminなどは許可しない
    params.require(:user).permit(:name, :email)
  end
end
```

## 2. SQLインジェクション (SQL Injection)

**問題**: ユーザーからの入力をSQLクエリに直接埋め込むことで、不正なSQLが実行されてしまう脆弱性。

**対策**: Active Recordのプレースホルダ（`?`や名前付き変数）を使用する。これにより、入力値は安全にエスケープされます。

```ruby
# 危険な例 (SQLインジェクションの可能性あり)
User.where("name = '#{params[:name]}'")

# 安全な例 (プレースホルダを使用)
User.where("name = ?", params[:name])
User.where(name: params[:name]) # こちらがより推奨される
```

## 3. クロスサイトスクリプティング (XSS)

**問題**: ユーザーが入力した悪意のあるスクリプトがページに埋め込まれ、他のユーザーのブラウザで実行されてしまう脆弱性。

**対策**:
- **RailsはデフォルトでERBテンプレート内の出力をエスケープします**。これは非常に強力な防御策です。
- `raw`や`html_safe`の使用��慎重に行う。ユーザーからの入力を`raw`で出力するのは非常に危険です。どうしても必要な場合は、`sanitize`メソッドで安全なHTMLタグのみを許可します。

```erb
<%# 安全: 自動的にエスケープされる %>
<%= @user.comment %>

<%# 危険: スクリプトが実行される可能性がある %>
<%= raw @user.comment %>

<%# 対策: タグを無害化する %>
<%= sanitize @user.comment, tags: %w(strong em a), attributes: %w(href) %>
```

## 4. クロスサイトリクエストフォージェリ (CSRF)

**問題**: ユーザーがログイン状態のサービスに対し、悪意のあるサイトに設置されたリンクやフォームから、意図しないリクエスト（投稿や削除など）を送信させられる脆弱性。

**対策**: RailsはデフォルトでCSRF対策が有効になっています。`ApplicationController`にある`protect_from_forgery`がその役割を担い、すべての非GETリクエストにセキュリティトークンを要求します。この設定は絶対に無効にしないでください。

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception
end
```

## 5. 機密情報の管理

**問題**: データベースのパスワードやAPIキーなどの機密情報を、Gitリポジトリに直接コミットしてしまう。

**対策**: Rails 5.2以降で導入された**Credentials**を使用する。`config/credentials.yml.enc`に暗号化された形で機密情報を保存し、`config/master.key`（これは`.gitignore`に含まれる）で復号します。

```bash
# Credentialsの編集
$ EDITOR=vim bin/rails credentials:edit
```

```ruby
# Credentialsへのアクセス
Rails.application.credentials.api_key
Rails.application.credentials.dig(:stripe, :secret_key)
```

## 6. セキュリティ関連のGemを活用する

- **Brakeman**: Railsアプリケーションの静的セキュリティスキャナ。コードを解析し、潜在的な脆弱性を警告してくれます。CI/CDパイプラインに組み込むことを強く推奨します。
- **Bundler-audit**: `Gemfile.lock`をスキャンし、既知の脆弱性を持つGemが使われていないかをチェックします。

## まとめ

Railsは多くのセキュリティ機能を標準で提供していますが、それらを正しく理解し、活用するのは開発者の責任です。

- **Strong Parameters**でマスアサインメントを防ぐ。
- **プレースホルダ**でSQLインジェクションを防ぐ。
- **`raw`を避け**、XSSを防ぐ。
- **CSRF保護**を有効に保つ。
- **Credentials**で機密情報を安全に管理する。
- **Brakeman**や**bundler-audit**で継続的に脆弱性をチェックする。

これらのベストプラクティスを常に念頭に置くことで、堅牢で安全なRailsアプリケーションを構築することができます。