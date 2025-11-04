---
title: PostgreSQLのインストールと初期設定ガイド
---

# PostgreSQLのインストールと初期設定ガイド

PostgreSQLは、その堅牢性、豊富な機能、高いパフォーマンスで広く利用されているオープンソースのリレーショナルデータベース管理システム（RDBMS）です。このガイドでは、主要なOSへのPostgreSQLのインストール方法と、基本的な初期設定について詳しく解説します。

## 1. PostgreSQLのインストール

お使いのオペレーティングシステムに応じて、以下の手順でインストールを進めてください。

### 1.1. Windows

Windowsでは、EnterpriseDBが提供する公式インストーラーを使用するのが最も簡単で確実です。

1.  **インストーラーのダウンロード**:
    [PostgreSQL公式サイトのダウンロードページ](https://www.postgresql.org/download/windows/)にアクセスし、お使いのWindowsのバージョンに対応したインストーラーをダウンロードします。

2.  **インストーラーの実行**:
    ダウンロードした`.exe`ファイルを実行し、セットアップウィザードを開始します。

3.  **セットアップウィザード**:
    *   **Installation Directory**: インストール先のディレクトリを選択します（通常はデフォルトのままで問題ありません）。
    *   **Select Components**: インストールするコンポーネントを選択します。基本的には「PostgreSQL Server」「pgAdmin 4」「Command Line Tools」の3つは必ず選択してください。
    *   **Data Directory**: データベースのデータを保存するディレクトリを選択します。
    *   **Password**: スーパーユーザー`postgres`のパスワードを設定します。**このパスワードは非常に重要なので、必ず安全な場所に保管してください。**
    *   **Port**: PostgreSQLサーバーが使用するポート番号を設定します（デフォルトは`5432`です）。
    *   **Locale**: ロケール（言語や地域設定）を選択します。通常は`Default locale`で問題ありません。

4.  **インストール完了**:
    設定内容を確認し、インストールを実行します。完了後、追加ツールをインストールするためのStack Builderを起動するか尋ねられますが、必要なければチェックを外して完了して構いません。

### 1.2. macOS

macOSでは、パッケージマネージャーであるHomebrewを使用する方法が最も一般的で推奨されます。

1.  **Homebrewのインストール** (未導入の場合):
    ターミナルを開き、以下のコマンドを実行してHomebrewをインストールします。
    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    ```

2.  **PostgreSQLのインストール**:
    Homebrewを使ってPostgreSQLをインストールします。
    ```bash
    brew install postgresql
    ```

3.  **PostgreSQLサービスの起動**:
    インストール後、以下のコマンドでPostgreSQLサービスを起動し、システム起動時に自動で立ち上がるように設定します。
    ```bash
    brew services start postgresql
    ```
    手動で起動・停止したい場合は、以下のコマンドを使用します。
    ```bash
    # 起動
    pg_ctl -D /opt/homebrew/var/postgresql start
    # 停止
    pg_ctl -D /opt/homebrew/var/postgresql stop
    ```
    *Homebrewのインストールパスは環境によって異なる場合があります。`brew --prefix postgresql`で確認できます。*

### 1.3. Linux (Ubuntu)

Ubuntuでは`apt`パッケージマネージャーを使用します。公式のPostgreSQLリポジトリを追加することで、常に最新の安定版をインストールできます。

1.  **PostgreSQLリポジトリの追加**:
    ```bash
    # GPGキーをインポート
    sudo apt-get install curl ca-certificates gnupg
    curl https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/apt.postgresql.org.gpg >/dev/null
    # リポジトリを追加
    sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    ```

2.  **PostgreSQLのインストール**:
    リポジトリを追加したら、パッケージリストを更新してPostgreSQLをインストールします。
    ```bash
    sudo apt-get update
    sudo apt-get -y install postgresql
    ```

3.  **インストールの確認**:
    サービスが正常に起動しているか確認します。
    ```bash
    sudo systemctl status postgresql
    ```
    `active (running)`と表示されていれば成功です。

## 2. 初期設定

インストールが完了したら、データベースを使用するための基本的な設定を行います。

### 2.1. psqlへの接続

`psql`はPostgreSQLの強力なコマンドラインインターフェースです。まず、スーパーユーザー`postgres`として接続します。

*   **Windows**: スタートメニューから「SQL Shell (psql)」を起動します。サーバー、データベース、ポート、ユーザー名を尋ねられますが、すべてデフォルトのままEnterキーを押し、インストール時に設定したパスワードを入力します。
*   **macOS (Homebrew)**: ターミナルで`psql postgres`と入力します。
*   **Linux (Ubuntu)**: `postgres`システムユーザーに切り替えてから`psql`を実行します。
    ```bash
    sudo -i -u postgres
    psql
    ```
`postgres=#`というプロンプトが表示されれば、正常に接続できています。

### 2.2. 新しいロール（ユーザー）とデータベースの作成

セキュリティの観点から、スーパーユーザー`postgres`を日常的に使用するのは避けるべきです。アプリケーション用や開発用に新しいロール（ユーザー）とデータベースを作成しましょう。

1.  **新しいロールの作成**:
    `psql`内で、以下のSQLコマンドを実行します。`myuser`と`mypassword`は任意の名前に変更してください。
    ```sql
    CREATE ROLE myuser WITH LOGIN PASSWORD 'mypassword';
    ```
    `CREATEDB`権限を付与すると、このユーザーは新しいデータベースを作成できるようになります。
    ```sql
    ALTER ROLE myuser CREATEDB;
    ```

2.  **新しいデータベースの作成**:
    作成したユーザーを所有者として、新しいデータベースを作成します。
    ```sql
    CREATE DATABASE mydatabase OWNER myuser;
    ```

### 2.3. 作成したデータベースへの接続

`psql`内で、作成したデータベースに新しいユーザーで接続してみましょう。

1.  **データベースへの接続**: `\c`または`\connect`コマンドを使用します。
    ```sql
    \c mydatabase myuser
    ```
    パスワードを求められたら、`myuser`に設定したパスワードを入力します。
    プロンプトが`mydatabase=>`のように変われば接続成功です。

2.  **psqlの終了**: `\q`コマンドで`psql`を終了します。

## 3. `pg_hba.conf`による接続制御（応用）

`pg_hba.conf`（Host-Based Authentication）ファイルは、どのユーザーがどのデータベースに、どのIPアドレスから、どの認証方法で接続できるかを定義する重要な設定ファイルです。

*   **ファイルの場所**:
    *   Ubuntu: `/etc/postgresql/XX/main/pg_hba.conf`
    *   macOS (Homebrew): `$(brew --prefix postgresql)/data/pg_hba.conf`
    *   `psql`内で`SHOW hba_file;`を実行すると正確なパスを確認できます。

*   **設定例**:
    デフォルトでは、ローカルからの`peer`認証（OSユーザー名とDBユーザー名が同じなら許可）や`md5`（パスワード認証）が設定されています。
    例えば、開発環境で同一ネットワーク内の他のマシンからの接続を許可したい場合は、以下のような行を追加します。
    ```
    # TYPE  DATABASE        USER            ADDRESS                 METHOD
    host    mydatabase      myuser          192.168.1.0/24          md5
    ```
    この設定は、「192.168.1.xのIPアドレスから`myuser`が`mydatabase`に接続する際は、md5で暗号化されたパスワード認証を要求する」という意味です。

ファイルを変更した後は、必ずPostgreSQLサーバーを再起動して設定を反映させてください。

```bash
# Ubuntuの場合
sudo systemctl restart postgresql
# macOS (Homebrew)の場合
brew services restart postgresql
```

これで、PostgreSQLのインストールと基本的なセットアップは完了です。快適なデータベースライフを始めましょう！
