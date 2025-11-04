---
title: PostgreSQL入門：初めてのデータベース構築
---

# PostgreSQL入門：初めてのデータベース構築

## 1. PostgreSQLとは？

PostgreSQLは、オープンソースのリレーショナルデータベース管理システム（RDBMS）です。信頼性、堅牢性、パフォーマンスに定評があり、Webアプリケーションからデータウェアハウスまで、幅広い用途で利用されています。

### 主な特徴

- **オープンソース**: ライセンス費用が不要で、自由に利用・改変できます。
- **高い信頼性**: トランザクション、ACID特性を完全にサポートし、データの整合性を保証します。
- **豊富な機能**: JSON、XML、地理情報（PostGIS）など、多様なデータ型をサポートしています。
- **高い拡張性**: 独自関数、データ型、インデックスなどを追加できます。
- **活発なコミュニティ**: 世界中の開発者によって、継続的に開発・改善されています。

## 2. インストールと初期設定

### macOS (Homebrew)

```bash
brew install postgresql
```

### Ubuntu

```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
```

インストール後、データベースクラスタが自動的に初期化され、`postgres`という名前のスーパーユーザーが作成されます。

## 3. データベースの作成と接続

### データベースの作成

`createdb`コマンドで新しいデータベースを作成します。

```bash
createdb my_database
```

### psqlによる接続

`psql`は、PostgreSQLの対話型ターミナルです。

```bash
psql my_database
```

`psql`を終了するには、`\q`と入力します。

## 4. 基本的なSQL操作

### テーブルの作成

`CREATE TABLE`文でテーブルを作成します。

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

- `SERIAL`: 自動的に連番が振られる整数型。
- `PRIMARY KEY`: テーブル内で各行を一意に識別するためのキー。
- `VARCHAR(n)`: 最大n文字の可変長文字列。
- `UNIQUE`: その列の値がテーブル内で一意であることを保証する制約。
- `NOT NULL`: その列がNULL値を持つことを許可しない制約。
- `DEFAULT`: 明示的に値が指定されなかった場合に、自動的に設定されるデフォルト値。

### データの挿入

`INSERT INTO`文でデータを挿入します。

```sql
INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com');
```

### データの取得

`SELECT`文でデータを取得します。

```sql
-- 全てのユーザーを取得
SELECT * FROM users;

-- 特定のユーザーを取得
SELECT * FROM users WHERE name = 'Alice';
```

### データの更新

`UPDATE`文でデータを更新します。

```sql
UPDATE users SET name = 'Alicia' WHERE name = 'Alice';
```

### データの削除

`DELETE FROM`文でデータを削除します。

```sql
DELETE FROM users WHERE name = 'Bob';
```

## 5. まとめ

このガイドでは、PostgreSQLの基本的な概念と操作について解説しました。
PostgreSQLは非常に高機能なデータベースであり、ここで紹介したのはほんの一部です。
さらに学習を進め、PostgreSQLのパワフルな機能を活用してください。
