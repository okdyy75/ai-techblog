# 30. DockerでPostgreSQL環境を構築する

## 導入

開発環境を効率的に構築・管理する上で、Dockerは現代のソフトウェアエンジニアにとって不可欠なツールとなっています。特にデータベースのような依存関係は、OSやバージョン、設定の差異によって多くの問題を引き起こしがちです。本記事では、Dockerを利用してPostgreSQLの開発環境を簡単に、かつ再現性高く構築する方法について解説します。これにより、環境構築の手間を省き、開発に集中できる状態を目指します。

## 概要

このガイドでは、DockerとDocker Composeを用いてPostgreSQLデータベースサーバーをコンテナとして立ち上げる方法を説明します。Dockerコンテナを使用することで、ホストマシンにPostgreSQLを直接インストールすることなく、分離された環境でデータベースを運用できます。また、Docker Composeを使うことで、複数のサービス（例えば、Webアプリケーションとデータベース）をまとめて定義し、一度に起動・停止・管理することが可能になります。これにより、チーム開発における環境の統一や、新しい開発者のオンボーディングが容易になります。

## 前提知識

本記事を読み進めるにあたり、以下の知識とツールがPCにインストールされていることを前提とします。

*   **Dockerの基本**: コンテナ、イメージ、ボリュームの概念を理解していること。
*   **Docker Compose**: `docker-compose.yml`ファイルの基本的な書き方と、`docker compose up`などのコマンドの利用経験があること。
*   **Docker Desktop**: Docker EngineとDocker Composeが統合された環境がインストールされていること。
    *   [Docker Desktopのインストールガイド](https://docs.docker.com/desktop/install/mac-install/)

## 実装または設定手順

Docker Composeを使用してPostgreSQL環境を構築します。

### 1. プロジェクトディレクトリの作成

まず、新しいプロジェクト用のディレクトリを作成し、その中に移動します。

```bash
mkdir my-postgres-app
cd my-postgres-app
```

### 2. `docker-compose.yml`ファイルの作成

`my-postgres-app`ディレクトリの直下に`docker-compose.yml`という名前のファイルを作成し、以下の内容を記述します。

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    restart: always
    environment:
      POSTGRES_DB: mydatabase
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
```

### `docker-compose.yml`の内容解説

*   **`version: '3.8'`**: Docker Composeファイルのバージョンを指定します。
*   **`services:`**: 定義するサービスの一覧です。
    *   **`db:`**: データベースサービスを`db`という名前で定義します。
        *   **`image: postgres:15`**: PostgreSQL 15の公式Dockerイメージを使用します。必要に応じてバージョン（例: `postgres:latest`, `postgres:16`）を変更できます。
        *   **`restart: always`**: コンテナが停止した場合に常に再起動するように設定します。
        *   **`environment:`**: 環境変数を設定します。これらはPostgreSQLの初期設定に使用されます。
            *   `POSTGRES_DB`: データベース名を`mydatabase`に設定。
            *   `POSTGRES_USER`: ユーザー名を`myuser`に設定。
            *   `POSTGRES_PASSWORD`: パスワードを`mypassword`に設定。
            **本番環境では、これらの認証情報は環境変数やシークレット管理ツールで安全に管理すべきです。**
        *   **`ports: - "5432:5432"`**: ホストマシンのポート5432をコンテナのポート5432にマッピングします。これにより、ホストマシンからデータベースにアクセスできます。
        *   **`volumes: - db_data:/var/lib/postgresql/data`**: データ永続化のためにボリュームを設定します。`db_data`という名前付きボリュームがホストマシンに作成され、コンテナ内の`/var/lib/postgresql/data`（PostgreSQLのデータディレクトリ）にマウントされます。これにより、コンテナを削除してもデータが失われることはありません。
*   **`volumes:`**: 定義する名前付きボリュームの一覧です。
    *   **`db_data:`**: `db_data`という名前付きボリュームを定義します。

### 3. PostgreSQLコンテナの起動

`docker-compose.yml`ファイルを作成したディレクトリで、以下のコマンドを実行します。

```bash
docker compose up -d
```

*   `-d`オプションは、コンテナをバックグラウンドで実行（デタッチドモード）することを意味します。
*   初めて実行する場合、PostgreSQLイメージのダウンロードが行われるため時間がかかることがあります。

コンテナが正常に起動したことを確認するには、以下のコマンドを実行します。

```bash
docker compose ps
```

`db`サービスの`State`が`running`になっていれば成功です。

### 4. データベースへの接続

PostgreSQLコンテナが起動したら、ホストマシンから`psql`クライアントやその他のデータベースクライアントツールを使って接続できます。

#### `psql`コマンドで接続する

PostgreSQLクライアントがホストマシンにインストールされている場合、以下のコマンドで接続できます。

```bash
psql -h localhost -p 5432 -U myuser -d mydatabase
```

パスワードの入力を求められたら、`mypassword`と入力します。

#### Dockerコンテナ内で`psql`を利用する

ホストマシンに`psql`がインストールされていない場合でも、以下のコマンドでコンテナ内の`psql`を利用して接続できます。

```bash
docker compose exec db psql -U myuser mydatabase
```

こちらもパスワードを求められたら`mypassword`と入力します。

接続後、`\dt`と入力してテーブル一覧を表示したり、SQLクエリを実行したりできます。終了するには`\q`と入力します。

### 5. PostgreSQLコンテナの停止と削除

コンテナを停止するには、以下のコマンドを実行します。

```bash
docker compose stop
```

コンテナを停止し、関連するボリュームも削除するには、以下のコマンドを実行します。データボリュームを削除するとデータベースデータも失われるため注意してください。

```bash
docker compose down -v
```

## ハマりどころ / 注意点

*   **ポート競合**: ホストマシンの5432番ポートが他のアプリケーション（既にPostgreSQLがインストールされている場合など）で使用されていると、コンテナが起動できません。`docker-compose.yml`の`ports`設定を変更して、ホスト側のポート番号を別のもの（例: `"5433:5432"`）にすることで回避できます。
*   **データ永続化の重要性**: `volumes`設定をせずにコンテナを削除すると、その中のデータは全て失われます。開発環境であっても、重要なデータは必ず永続化するように設定しましょう。
*   **認証情報の管理**: `docker-compose.yml`に直接パスワードを記述することは、開発環境では許容されることが多いですが、本番環境ではセキュリティリスクとなります。環境変数管理システム（例: Docker Secrets, Kubernetes Secrets, HashiCorp Vault）や、`.env`ファイル（ただし、Git管理外にする）の使用を検討してください。
*   **Dockerイメージのバージョン**: `postgres:latest`は常に最新版を指すため、予期しない挙動変更のリスクがあります。特定のバージョン（例: `postgres:15.5`）を指定することをお勧めします。
*   **リソース消費**: Dockerコンテナはホストマシンリソース（CPU, メモリ）を消費します。複数のコンテナを起動する場合は、PCのリソースに注意してください。

## まとめ

本記事では、DockerとDocker Composeを使ってPostgreSQLの開発環境を構築する手順を解説しました。これにより、煩雑な環境構築から解放され、より多くの時間をアプリケーション開発に費やすことができます。データ永続化、ポート設定、認証情報の扱いに注意しながら、効率的な開発ワークフローを構築しましょう。

## 参考リンク

1.  [Docker Documentation: Docker Compose overview](https://docs.docker.com/compose/)
2.  [Docker Hub: PostgreSQL Official Image](https://hub.docker.com/_/postgres)
3.  [PostgreSQL Official Documentation](https://www.postgresql.org/docs/)
4.  [DigitalOcean Community: How To Install and Use PostgreSQL on Docker](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-docker)
