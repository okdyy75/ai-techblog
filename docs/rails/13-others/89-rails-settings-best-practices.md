# Railsアプリケーションにおける設定ファイルのベストプラクティス

Railsアプリケーションを開発・運用する上で、設定ファイルの管理は非常に重要です。設定が不適切だと、開発効率の低下や、セキュリティリスクの原因にもなりかねません。

この記事では、Railsにおける主要な設定ファイルの役割と、それらを効果的に使い分けるためのベストプラクティスについて解説します。

## TL;DR

- **`config/application.rb`**: アプリケーション全体で共通の基本的な設定を記述します。
- **`config/environments/*.rb`**: `development`, `test`, `production`など、環境ごとに異なる設定を記述します。
- **`config/initializers/*.rb`**: gemの初期化処理や、フレームワークの起動後に実行したい設定を記述します。
- **`config/credentials.yml.enc`**: APIキーなどの秘匿情報を安全に管理します。
- **環境変数**: `dotenv-rails`などを活用し、環境ごとに異なる設定値（特に外部サービスのURLなど）を管理します。

---

## 1. `config/application.rb` - アプリケーションの共通設定

`config/application.rb`は、アプリケーション全体で共有される基本的な設定を記述するファイルです。ここに記述された設定は、すべての環境（development, test, production）で読み込まれます。

config/application.rb
```ruby
require_relative "boot"

require "rails/all"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module MyApp
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 7.1

    # Please, add to the `ignore_paths` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`.
    config.autoload_lib(ignore: %w(assets tasks))

    # タイムゾーンを日本時間に設定
    config.time_zone = "Tokyo"
    config.active_record.default_timezone = :local

    # i18nのデフォルトロケールを日本語に設定
    config.i18n.default_locale = :ja
  end
end
```

### ベストプラクティス

- **普遍的な設定を記述する**: タイムゾーン、i18nのデフォルトロケール、autoloadパスなど、どの環境でも変わら���い設定を記述します。
- **環境によって変わる値は書かない**: データベースの接続情報や外部APIのエンドポイントなど、環境ごとに異なる可能性がある設定はここには記述しません。

## 2. `config/environments/*.rb` - 環境別設定

`config/environments`ディレクトリには、環境ごとの設定ファイルが格納されています。

- `development.rb`: 開発環境用の設定
- `test.rb`: テスト環境用の設定
- `production.rb`: 本番環境用の設定

Railsは実行環境（`RAILS_ENV`）に応じて、対応する設定ファイルを読み込みます。

config/environments/production.rb
```ruby
Rails.application.configure do
  # Code is not reloaded between requests.
  config.cache_classes = true

  # Eager load code on boot. This eager loads most of Rails and
  # your application in memory, allowing both threaded web servers
  # and those relying on copy on write to perform better.
  # Rake tasks automatically ignore this option for performance.
  config.eager_load = true

  # アセットのホストを設定
  config.action_mailer.asset_host = 'https://example.com'

  # ログレベルをinfoに設定
  config.log_level = :info
end
```

### ベストプラクティス

- **環境固有の設定を明確に分離する**: 開発環境でのみ使用するgemの設定（例: `bullet`）、本番環境でのみ有効にしたいキャッシュ設定などを明確に分離できます。
- **`RAILS_ENV`を適切に使い分ける**: `staging`環境など、追加の環境が必要な場合は、新しい設定ファイルを作成して対応します。

## 3. `config/initializers/*.rb` - 初期化処理

`config/initializers`ディレクトリ内のRubyファイルは、Railsフレームワークとgemが読み込まれた**後**に実行されます。

gemの設定や、アプリケーション起動時に一度だけ実行したい処理を記述するのに適しています。

config/initializers/stripe.rb
```ruby
# StripeのAPIキーを設定
Stripe.api_key = Rails.application.credentials.stripe[:secret_key]
```

config/initializers/cors.rb
```ruby
# CORSの設定
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins 'https://example.com'
    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head]
  end
end
```

### ベストプラクティス

- **1ファイル1責務**: 関連する設定を1つのファイルにまとめます（例: `stripe.rb`, `cors.rb`）。
- **`credentials`と連携する**: APIキーなどの秘匿情報は、後述する`credentials`���ら読み込むようにします。

## 4. `config/credentials.yml.enc` - 秘匿情報の管理

APIキー、外部サービスの認証情報、データベースのパスワードなど、リポジトリに直接コミットすべきでない秘匿情報を管理するための仕組みです。

ファイルは暗号化されており、`config/master.key`（または環境変数 `RAILS_MASTER_KEY`）がなければ復号できません。

編集は以下のコマンドで行います。

```bash
$ EDITOR=vim bin/rails credentials:edit
```

config/credentials.yml.enc
```yaml
# development環境のStripeキー
stripe:
  secret_key: sk_test_xxxxxxxxxxxx
  public_key: pk_test_yyyyyyyyyyyy

# production環境のStripeキー
production:
  stripe:
    secret_key: sk_live_zzzzzzzzzzzz
    public_key: pk_live_aaaaaaaaaaaa
```

### 呼び出し方

```ruby
# 環境に応じたキーを自動で取得
Rails.application.credentials.stripe[:secret_key]

# 環境を明示して取得
Rails.application.credentials.production[:stripe][:secret_key]
```

### ベストプラクティス

- **`master.key`をリポジトリにコミットしない**: `.gitignore`に`config/master.key`が含まれていることを必ず確認します。
- **本番環境では環境変数を利用する**: 本番環境では、`RAILS_MASTER_KEY`���境変数に`master.key`ファイルの中身を設定することが推奨されています。

## 5. 環境変数 - `dotenv-rails`の活用

`credentials`は便利ですが、すべての設定を管理するのに適しているわけではありません。特に、開発者ごとに異なる設定値（例: ローカルのDB設定）や、PaaSの環境変数で管理したい値などは、環境変数で管理する方が柔軟です。

`dotenv-rails` gemは、`.env`ファイルに記述された変数を自動で環境変数として読み込んでくれるため、開発環境での管理が容易になります。

### 使い方

1. `Gemfile`に`dotenv-rails`を追加します。

Gemfile
```ruby
group :development, :test do
  gem 'dotenv-rails'
end
```

2. プロジェクトルートに`.env`ファイルを作成します。

```
DATABASE_HOST=localhost
DATABASE_USER=my_user
DATABASE_PASSWORD=my_password
```

3. `.gitignore`に`.env`を追加します。

```
.env
```

4. `config/database.yml`などで環境変数を参照します。

config/database.yml
```yaml
default: &default
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>

development:
  <<: *default
  database: myapp_development
  host: <%= ENV['DATABASE_HOST'] %>
  username: <%= ENV['DATABASE_USER'] %>
  password: <%= ENV['DATABASE_PASSWORD'] %>
```

### ベストプラクティス

- **`.env`をコミットしない**: 開発者個人の設定や、本番用の値を誤ってコミットしないようにします。
- **`.env.example`を用意する**: どのような環境変数が必要かを他の開発者に伝えるため、サンプルファイルを用意しておくと親切です。

## まとめ

Railsの設定ファイルは、それぞれ明確な役割を持っています。これらの役割を理解し、適切に使い分けることで、見通しが良く、メンテナンス性の高いアプリケーションを構築することができます。

特に、秘匿情報の管理はセキュリティの観点から非常に重要です。`credentials`と環境変数を正しく使いこなし、安全なアプリケーション開発を心がけましょう。