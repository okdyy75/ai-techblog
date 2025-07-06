# 39. RailsアプリケーションのCI/CDパイプラインをGitHub Actionsで構築する

## はじめに

モダンなWeb開発において、CI/CD (継続的インテグレーション/継続的デリバリー) は、開発プロセスの自動化と品質向上に不可欠なプラクティスです。コードの変更をリポジトリにプッシュするたびに、テスト、静的解析、ビルドなどを自動で実行し、問題があれば即座にフィードバックを得ることで、バグの早期発見と安定したデプロイを実現します。

**GitHub Actions**は、GitHubに組み込まれたCI/CDプラットフォームです。GitHubリポジトリ内で、ワークフローと呼ばれるYAMLファイルを定義するだけで、テストやデプロイのパイプラインを簡単に構築できます。

本記事では、RailsアプリケーションのCIパイプラインをGitHub Actionsで構築する具体的な手順を解説します。

## この記事で学べること

- CI/CDの基本的な概念とメリット
- GitHub Actionsのワークフローの基本的な構文
- Railsアプリケーションのテスト（RSpec）と静的コード解析（RuboCop）を自動化するワークフローの作成方法
- データベース（PostgreSQL）やキャッシュ（Redis）をCI環境でセットアップする方法

## 1. GitHub Actionsの基本

GitHub Actionsのワークフローは、リポジトリの `.github/workflows` ディレクトリに置かれたYAMLファイルによって定義されます。

### 主な構成要素

- **Workflow**: 1つ以上のジョブを含む自動化プロセスの全体。YAMLファイル1つが1ワークフローに対応します。
- **Event**: ワークフローの実行を開始させるきっかけ（例: `push`, `pull_request`）。
- **Job**: 特定のランナー（仮想マシン）上で実行される一連のステップ。複数のジョブはデフォルトで並列実行されます。
- **Step**: ジョブ内で実行される個々のタスク。コマンドを実行したり、アクション（再利用可能なスクリプト）を呼び出したりします。
- **Action**: ワークフローを構成するための再利用可能な部品。GitHub Marketplaceで多数公開されています（例: `actions/checkout`, `ruby/setup-ruby`）。

## 2. Rails CIワークフローの作成

それでは、`main` ブランチまたはプルリクエストへのプッシュをトリガーとして、RSpecとRuboCopを実行するワークフローを作成してみましょう。

`.github/workflows/ci.yml` というファイルを作成します。

.github/workflows/ci.yml
```yaml
name: Rails CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14-alpine
        ports:
          - "5432:5432"
        env:
          POSTGRES_DB: rails_test
          POSTGRES_USER: rails
          POSTGRES_PASSWORD: password
      redis:
        image: redis:7-alpine
        ports:
          - "6379:6379"

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2.2' # プロジェクトのRubyバージョンに合わせる
          bundler-cache: true # bundle installの結果をキャッシュして高速化

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18' # プロジェクトのNode.jsバージョンに合わせる
          cache: 'yarn'

      - name: Install dependencies (Yarn)
        run: yarn install --check-files

      - name: Set up database
        env:
          RAILS_ENV: test
          DATABASE_URL: "postgres://rails:password@localhost:5432/rails_test"
        run: |
          bundle exec rails db:prepare

      - name: Run RSpec
        env:
          RAILS_ENV: test
          DATABASE_URL: "postgres://rails:password@localhost:5432/rails_test"
          REDIS_URL: "redis://localhost:6379/1"
        run: bundle exec rspec

  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2.2'
          bundler-cache: true

      - name: Run RuboCop
        run: bundle exec rubocop
```

## 3. ワークフローの解説

### `name` と `on`

- `name`: ワークフローの名前を定義します。
- `on`: ワークフローを実行するイベントを指定します。ここでは `main` ブランチへの `push` と `pull_request` をトリガーにしています。

### `jobs`

このワークフローには `test` と `lint` という2つのジョブがあります。これらは並列で実行されます。

### `test` ジョブ

- `runs-on: ubuntu-latest`: ジョブを実行する仮想環境を指定します。
- `services`: ジョブの実行中、バックグラウンドでサービス（コンテナ）を起動します。ここではPostgreSQLとRedisを起動し、Railsアプリケーションから接続できるようにしています。
  - `env`: サービスの環境変数を設定します。
  - `ports`: コンテナのポートをホスト（ランナー）にマッピングします。

- `steps`: ジョブが実行するステップを定義します。
  1.  **`actions/checkout@v3`**: リポジトリのコードをランナーにチェックアウトします。
  2.  **`ruby/setup-ruby@v1`**: 指定したバージョンのRuby環境をセットアップします。`bundler-cache: true` を指定すると、`Gemfile.lock` に基づいてgemのキャッシュが行われ、2回目以降の実行が高速になります。
  3.  **`actions/setup-node@v3`**: Node.js環境をセットアップし、Yarnのキャッシュを有効にします。
  4.  **Install dependencies (Yarn)**: `yarn install` を実行します。
  5.  **Set up database**: `db:prepare` を実行してテスト用のデータベースを作成・マイグレーションします。`env` で `DATABASE_URL` を設定し、サービスとして起動したPostgreSQLに接続しています。
  6.  **Run RSpec**: `bundle exec rspec` でテストを実行します。ここでも必要な環境変数を設定します。

### `lint` ジョブ

- こちらはデータベースなどを必要としないため、シンプルなステップになっています。
- Rubyのセットアップ後、`bundle exec rubocop` を実行してコードの静的解析を行います。

## 4. GitHubでの確認

この `ci.yml` ファイルをリポジトリにプッシュすると、GitHubの「Actions」タブでワークフローの実行状況を確認できます。

<img width="1052" alt="GitHub Actionsの実行結果画面の例" src="https://user-images.githubusercontent.com/5518/156975538-1c94f3a3-687c-486c-86a9-32185f883a4c.png">

各ジョブ、各ステップの成功/失敗やログを確認でき、問題があれば迅速に対応することが可能です。

## まとめ

GitHub Actionsを利用することで、RailsアプリケーションのCIパイプラインをリポジトリ内で完結させ、簡単に構築・管理することができます。

- **自動化による品質向上**: テストとリントを自動化することで、コードの品質を常に高く保つことができる。
- **迅速なフィードバック**: プルリクエストごとにCIが実行されるため、マージする前に問題を発見できる。
- **インフラ管理不要**: GitHubが仮想環境を提供してくれるため、自前でCIサーバーを管理する必要がない。

CIパイプラインは、現代の開発に必須のツールです。本記事を参考に、ぜひあなたのRailsプロジェクトにも導入してみてください。ここからさらに、CD（継続的デリバリー）のステップを追加して、HerokuやRenderへの自動デプロイを実現することも可能です。