# Docker Composeを使ったRails開発環境の構築とメリット

## はじめに

「新しいPCに開発環境をセットアップしたら、Rubyのバージョンが違って動かない」「チームメンバーのマシンでだけ発生する謎のエラー」「PostgreSQLやRedisのインストールが面倒」...。Rails開発において、このような環境差異に起因する問題は、多くの開発者が経験する悩みの種です。

**Docker**は、アプリケーションとその依存関係（ライブラリ、ミドルウェアなど）を「コンテナ」という隔離された環境にパッケージングする技術です。そして**Docker Compose**は、複数のコンテナ（例: Railsアプリ、データベース、Redisサーバー）で構成されるアプリケーションを、一つの設定ファイルでまとめて定義・管理するためのツールです。

この2つを組み合わせることで、誰のPCでも全く同じ、クリーンでポータブルなRails開発環境をコマンド一つで構築できるようになります。この記事では、Docker Composeを使って、Rails + PostgreSQL + Redisの典型的な開発環境を構築する手順とそのメリットを解説します。

## Docker Composeを使うメリット

*   **環境の統一**: 全メンバーが全く同じバージョンのRuby, Node.js, PostgreSQL, Redisなどを使うことを保証します。これにより「自分のマシンでだけ動かない」問題が根絶されます。
*   **セットアップの簡略化**: 新しいメンバーがプロジェクトに参加する際、`git clone`して`docker-compose up`を実行するだけで、数分で開発環境が手に入ります。もうOSごとの複雑なインストール手順書は必要ありません。
*   **クリーンな環境**: 開発環境がホストOS（あなたのPC）から隔離されるため、PC自体に様々なバージョンのRubyやgemをインストールして汚すことがありません。
*   **本番環境との近似**: 本番環境もDockerコンテナで運用する場合、開発環境と本番環境の構成を近づけることができ、デプロイ時の予期せぬ問題を減らすことができます。

## Docker Composeによる環境構築手順

それでは、既存のRailsアプリケーションをDocker化する、または新規にDockerベースで開発を始めるための手順を見ていきましょう。

### ステップ1: `Dockerfile`の作成

`Dockerfile`は、Railsアプリケーションのコンテナイメージを構築するための設計図です。プロジェクトのルートディレクトリに作成します。

**`Dockerfile`**
```dockerfile
# ベースとなるRubyのイメージを指定
FROM ruby:3.1.2

# 必要なOSパッケージをインストール (Node.js, yarn, postgresql-clientなど)
RUN apt-get update -qq && apt-get install -y build-essential libpq-dev nodejs yarn

# アプリケーションの作業ディレクトリを作成
WORKDIR /myapp

# Gemfileを先にコピーして、bundle installを実行
# Gemfileに変更がない限り、このレイヤーはキャッシュされるため、2回目以降のビルドが高速になる
COPY Gemfile /myapp/Gemfile
COPY Gemfile.lock /myapp/Gemfile.lock
RUN bundle install

# package.jsonをコピーして、yarn installを実行
COPY package.json /myapp/package.json
COPY yarn.lock /myapp/yarn.lock
RUN yarn install

# アプリケーションのコード全体をコピー
COPY . /myapp

# コンテナ起動時に実行されるコマンド
CMD ["rails", "server", "-b", "0.0.0.0"]
```

### ステップ2: `docker-compose.yml`の作成

`docker-compose.yml`は、複数のサービス（コンテナ）を定義し、それらの連携を設定するためのファイルです。これもプロジェクトのルートに作成します。

**`docker-compose.yml`**
```yaml
version: '3.8'
services:
  # Railsアプリケーションサービス
  web:
    build: . # Dockerfileがあるカレントディレクトリをビルド
    command: bash -c "rm -f tmp/pids/server.pid && bundle exec rails s -p 3000 -b '0.0.0.0'"
    volumes:
      - .:/myapp # ホストのカレントディレクトリをコンテナの/myappにマウント
    ports:
      - "3000:3000" # ホストの3000番ポートをコンテナの3000番ポートに接続
    depends_on:
      - db
      - redis
    environment:
      - DATABASE_HOST=db
      - REDIS_URL=redis://redis:6379/1

  # PostgreSQLサービス
  db:
    image: postgres:14.1 # 公式のPostgreSQLイメージを使用
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password

  # Redisサービス
  redis:
    image: redis:6.2 # 公式のRedisイメージを使用

# データ永続化のための名前付きボリューム
volumes:
  postgres_data:
```

*   **`services`**: `web`, `db`, `redis`という3つのサービスを定義しています。
*   **`volumes`**: `web`サービスの`volumes`設定 (`.:/myapp`) が重要です。これにより、ホストOS上のソースコードがコンテナ内にリアルタイムで同期され、コードを編集すると即座に開発サーバーに反映されるようになります。
*   **`depends_on`**: `web`サービスが`db`と`redis`サービスが起動した後に起動するように依存関係を定義します。
*   **`environment`**: `web`サービスがデータベースやRedisに接続するためのホスト名（`db`, `redis`）やURLを設定しています。

### ステップ3: `database.yml`の修正

RailsアプリケーションがDockerコンテナ内のPostgreSQLに接続できるように、`config/database.yml`を修正します。

**`config/database.yml`**
```yaml
default: &default
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  host: <%= ENV.fetch("DATABASE_HOST") { 'localhost' } %> # 環境変数からホスト名を取得
  username: postgres
  password: password

development:
  <<: *default
  database: myapp_development
```

`host`の値を環境変数`DATABASE_HOST`から取得するように変更しました。`docker-compose.yml`で設定した`DATABASE_HOST=db`がここで使われます。

### ステップ4: コンテナのビルドと起動

すべての設定ファイルが揃ったら、いよいよコンテナをビルドして起動します。

```bash
# 初回のみ: データベースの作成
docker-compose run --rm web rails db:create

# コンテナをビルドしてバックグラウンドで起動
docker-compose up --build -d
```

これで、3つのコンテナ（web, db, redis）が起動し、連携して動作を開始します。`http://localhost:3000`にアクセスすれば、Railsアプリケーションが表示されるはずです。

### 日常的なコマンド

*   **起動**: `docker-compose up -d`
*   **停止**: `docker-compose down`
*   **`rails`コマンドの実行**: `docker-compose run --rm web rails <command>` (例: `rails g model ...`)
*   **コンソールに入る**: `docker-compose run --rm web rails c`
*   **ログの確認**: `docker-compose logs -f web`

## まとめ

Docker Composeを導入することで、Railsの開発環境構築は劇的にシンプルで堅牢になります。初期設定は少し手間がかかるように感じるかもしれませんが、その投資はチーム全体の生産性向上と環境トラブルの削減によって、すぐに回収できるでしょう。

「誰でも」「いつでも」「どこでも」同じ環境を再現できるポータビリティは、現代のチーム開発において非常に強力な武器となります。まだDockerを導入していないプロジェクトがあれば、ぜひこの記事を参考に、コンテナ化への第一歩を踏み出してみてください。
