# 36. Railsにおける設定管理: credentials, Figaro, dotenvの比較と実践

## はじめに

Railsアプリケーションを開発・運用する上で、APIキー、データベースのパスワード、外部サービスの認証情報など、環境ごとに異なる設定値や秘密情報を管理する必要が出てきます。これらの情報をソースコードに直接書き込むことは、セキュリティ上非常に危険であり、絶対に避けなければなりません。

Railsでは、これらの設定情報を安全かつ効率的に管理するための方法がいくつか提供されています。本記事では、代表的な3つの方法、**Rails credentials**、**Figaro** gem、**Dotenv** gemについて、それぞれの特徴、長所・短所を比較し、実践的な使い方を解説します。

## この記事で学べること

- なぜ設定情報をコードから分離する必要があるのか
- Rails標準の `credentials.yml.enc` の使い方
- FigaroとDotenvの基本的な使い方と設定方法
- 3つの方法の比較と、プロジェクトの要件に応じた選び方

## 1. Rails Credentials (標準機能)

Rails 5.2から導入された、暗号化されたファイルで秘密情報を管理する仕組みです。`config/credentials.yml.enc` という暗号化されたファイルに情報を保存し、`config/master.key` (または環境ごとのキー) で復号して利用します。

### 使い方

1.  **編集**: 以下のコマンドで暗号化ファイルを安全に編集します。
    ```bash
    rails credentials:edit
    ```
    エディタが開き、YAML形式でキーと値を追加できます。

    ```yaml
    aws:
      access_key_id: YOUR_ACCESS_KEY_ID
      secret_access_key: YOUR_SECRET_ACCESS_KEY
    stripe:
      secret_key: sk_test_xxxxxxxxxxxx
    ```

2.  **アクセス**: アプリケーション内から `Rails.application.credentials` で値にアクセスします。

    ```ruby
    Stripe.api_key = Rails.application.credentials.dig(:stripe, :secret_key)
    ```

### 長所

- **Rails標準**: 追加のgemが不要ですぐに使える。
- **高いセキュリティ**: ファイル自体が暗号化されているため、リポジトリに含めても安全。`master.key` ファイルを `.gitignore` に追加し、安全な場所（サーバーの環境変数やCIのSecretsなど）で管理することが前提です。

### 短所

- **コンフリクト**: 複数人で同時に編集すると、暗号化ファイルのマージコンフリクトが発生しやすい。
- **可読性**: ファイルが暗号化されているため、リポジトリ上で直接内容を確認できない。

## 2. Figaro (gem)

Figaroは、YAMLファイル (`config/application.yml`) を使って設定を管理し、その値を環境変数としてアプリケーションにロードするgemです。

### 使い方

1.  **インストール**:
    ```ruby:Gemfile
    gem 'figaro'
    ```
    `bundle install` を実行後、`bundle exec figaro install` を実行します。これにより `config/application.yml` が生成され、`.gitignore` に自動で追加されます。

2.  **設定**: `config/application.yml` にキーと値を記述します。

    ```yaml:config/application.yml
    # このファイルは .gitignore される
    STRIPE_SECRET_KEY: "sk_test_xxxxxxxxxxxx"
    SENDGRID_USERNAME: "user@example.com"

    # 環境ごとの設定も可能
    development:
      FOO: "bar"
    production:
      FOO: "baz"
    ```

3.  **アクセス**: `ENV['KEY_NAME']` で環境変数として値にアクセスします。

    ```ruby
    Stripe.api_key = ENV['STRIPE_SECRET_KEY']
    ```

### 長所

- **シンプル**: YAMLで記述し、環境変数としてアクセスするだけなので直感的。
- **12-Factor App準拠**: 設定を環境変数で管理する「The Twelve-Factor App」のプラクティスに従っている。

### 短所

- **ファイル管理**: `application.yml` ファイルを本番サーバーなどに安全に配置する仕組みが別途必要。

## 3. Dotenv (gem)

Dotenv (`dotenv-rails`) は、プロジェクトのルートディレクトリに置かれた `.env` ファイルから環境変数をロードするgemです。Figaroと非常に似ていますが、よりシンプルなアプローチを取ります。

### 使い方

1.  **インストール**:
    ```ruby:Gemfile
    gem 'dotenv-rails', groups: [:development, :test]
    ```
    `bundle install` を実行します。

2.  **設定**: プロジェクトルートに `.env` ファイルを作成し、キーと値を記述します。このファイルは `.gitignore` に追加してください。

    ```:.env
    # このファイルは .gitignore する
    STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
    SENDGRID_USERNAME=user@example.com
    ```
    環境ごとの設定は `.env.development`, `.env.production` のようなファイルで行います。

3.  **アクセス**: Figaroと同様、`ENV['KEY_NAME']` でアクセスします。

    ```ruby
    Stripe.api_key = ENV['STRIPE_SECRET_KEY']
    ```

### 長所

- **非常にシンプル**: `.env` ファイルを作成するだけですぐに使える。
- **他言語でも一般的**: `.env` ファイルはNode.jsやPythonなど、他の多くのエコシステムでも使われているため、開発者にとって馴染み深い。

### 短所

- **ファイル管理**: Figaroと同様、`.env` ファイルを本番環境へ安全に配布する仕組みが必要。

## 比較と選び方

| | Rails Credentials | Figaro | Dotenv |
| :--- | :--- | :--- | :--- |
| **管理方法** | 暗号化YAML | 非暗号化YAML | `.env` ファイル |
| **リポジトリ** | ファイルをコミット (キーは除く) | ファイルをignore | ファイルをignore |
| **アクセス方法** | `Rails.application.credentials` | `ENV` | `ENV` |
| **ベストな用途** | **セキュリティ最優先**。チームが小さく、コンフリクトが少ない場合。 | **12-Factor App**を重視し、YAMLの構造化された設定が好ましい場合。 | **シンプルさ最優先**。他のエコシステムに慣れている開発者が多い場合。 |

**推奨されるアプローチ**:

- **新規プロジェクト**: まずは **Rails Credentials** の利用を検討するのが良いでしょう。Rails標準であり、セキュリティモデルが明確です。
- **複数人での開発、コンフリクトが懸念される場合**: **Figaro** や **Dotenv** が有力な選択肢になります。どちらも環境変数ベースで、HerokuやRenderなどのPaaSとも相性が良いです。
- **シンプルさ**: **Dotenv** は最も手軽に始められます。

## まとめ

Railsにおける設定管理は、アプリケーションのセキュリティと運用性を左右する重要な要素です。どの方法を選択するにしても、**秘密情報を絶対にGitリポジトリに直接コミットしない**という原則を徹底することが最も重要です。

プロジェクトの規模、チームの構成、デプロイ環境などを考慮して、最適な設定管理方法を選択してください。