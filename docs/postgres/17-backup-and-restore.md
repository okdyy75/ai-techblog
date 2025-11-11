---
title: バックアップとリストア戦略
---

# バックアップとリストア戦略

## 1. なぜバックアップが重要なのか

データベースのバックアップは、以下のような様々な状況からデータを保護します：

- ハードウェア障害
- 人的ミス（誤った削除・更新）
- ソフトウェアのバグ
- セキュリティ侵害
- 自然災害

**適切なバックアップ戦略がなければ、データの完全な損失につながる可能性があります。**

## 2. PostgreSQLのバックアップ方法

PostgreSQLには主に3つのバックアップ方法があります：

1. **論理バックアップ**: `pg_dump` / `pg_dumpall`
2. **物理バックアップ**: ファイルシステムレベルのコピー
3. **継続的アーカイブ**: WAL（Write-Ahead Logging）を使用

## 3. 論理バックアップ（pg_dump）

### 基本的な使い方

```bash
# データベース全体をバックアップ
pg_dump dbname > backup.sql

# カスタム形式でバックアップ（推奨）
pg_dump -Fc dbname > backup.dump

# 圧縮付きバックアップ
pg_dump -Fc -Z9 dbname > backup.dump

# 特定のテーブルのみバックアップ
pg_dump -t users dbname > users_backup.sql

# 複数テーブルをバックアップ
pg_dump -t users -t orders dbname > tables_backup.sql
```

### pg_dumpのオプション

```bash
# スキーマのみをバックアップ
pg_dump -s dbname > schema_only.sql

# データのみをバックアップ
pg_dump -a dbname > data_only.sql

# 所有者情報を含めない
pg_dump --no-owner dbname > backup.sql

# 特定のスキーマをバックアップ
pg_dump -n public dbname > public_schema.sql
```

### すべてのデータベースをバックアップ

```bash
# すべてのデータベースとグローバルオブジェクト
pg_dumpall > all_databases.sql

# グローバルオブジェクトのみ（ロール、テーブルスペースなど）
pg_dumpall --globals-only > globals.sql
```

## 4. 論理バックアップのリストア

### SQL形式からのリストア

```bash
# データベースを作成してからリストア
createdb newdb
psql newdb < backup.sql

# または接続しながらリストア
psql -d newdb -f backup.sql
```

### カスタム形式からのリストア

```bash
# pg_restoreを使用
pg_restore -d newdb backup.dump

# 並列リストアで高速化
pg_restore -d newdb -j 4 backup.dump

# 特定のテーブルのみリストア
pg_restore -d newdb -t users backup.dump

# リストア前にDROPを実行
pg_restore -d newdb --clean backup.dump

# 新規データベースを作成してリストア
pg_restore -C -d postgres backup.dump
```

## 5. 物理バックアップ

### ベースバックアップの作成

```bash
# pg_basebackupを使用
pg_basebackup -D /backup/base -Ft -z -P

# オプションの説明：
# -D: バックアップ先ディレクトリ
# -Ft: tar形式
# -z: gzip圧縮
# -P: 進行状況を表示
```

### レプリケーションスロットを使用

```bash
pg_basebackup -D /backup/base -Xs -P -R
# -Xs: WALをストリーミング
# -R: recovery.confを自動作成
```

## 6. 継続的アーカイブとPITR

PITR（Point-In-Time Recovery）を使用すると、任意の時点にデータベースを復元できます。

### WALアーカイブの設定

```sql
-- postgresql.confの設定
wal_level = replica
archive_mode = on
archive_command = 'cp %p /archive/%f'
archive_timeout = 300  -- 5分ごとにWALをアーカイブ
```

または、より堅牢なアーカイブコマンド：

```bash
archive_command = 'test ! -f /archive/%f && cp %p /archive/%f'
```

### ベースバックアップの作成

```bash
# バックアップ開始
psql -c "SELECT pg_start_backup('daily_backup', false, false);"

# ファイルシステムをコピー
rsync -a /var/lib/postgresql/14/main/ /backup/base/

# バックアップ終了
psql -c "SELECT pg_stop_backup();"
```

または`pg_basebackup`を使用：

```bash
pg_basebackup -D /backup/base -Fp -Xs -P
```

### PITRリストア

```bash
# 1. ベースバックアップをリストア
cp -r /backup/base/* /var/lib/postgresql/14/main/

# 2. recovery.confを作成（PostgreSQL 12以降はpostgresql.confに記述）
cat > /var/lib/postgresql/14/main/postgresql.auto.conf << EOF
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2024-11-11 10:00:00'
EOF

# 3. recovery.signalファイルを作成
touch /var/lib/postgresql/14/main/recovery.signal

# 4. PostgreSQLを起動
systemctl start postgresql
```

## 7. バックアップ戦略のベストプラクティス

### 3-2-1ルール

- **3**: データのコピーを3つ保持
- **2**: 2つの異なるメディアに保存
- **1**: 1つは別の場所（オフサイト）に保存

### バックアップスケジュール例

```bash
#!/bin/bash
# daily_backup.sh

BACKUP_DIR="/backup/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# フルバックアップ（週次）
if [ $(date +%u) -eq 7 ]; then
    pg_basebackup -D $BACKUP_DIR/base -Ft -z -P
fi

# 論理バックアップ（日次）
pg_dump -Fc dbname > $BACKUP_DIR/dbname_$(date +%H%M).dump

# 古いバックアップを削除（30日より古い）
find /backup -type d -mtime +30 -exec rm -rf {} +

# S3にアップロード（オフサイトバックアップ）
aws s3 sync /backup s3://my-backup-bucket/postgres/
```

### cronで自動化

```bash
# crontabに追加
# 毎日午前2時にバックアップ
0 2 * * * /usr/local/bin/daily_backup.sh >> /var/log/backup.log 2>&1
```

## 8. バックアップの検証

バックアップは定期的にテストする必要があります。

```bash
#!/bin/bash
# test_restore.sh

# テスト用データベースにリストア
pg_restore -d test_db backup.dump

# データの整合性チェック
psql -d test_db -c "SELECT COUNT(*) FROM users;"
psql -d test_db -c "SELECT COUNT(*) FROM orders;"

# 問題なければテストDBを削除
dropdb test_db
```

## 9. バックアップツール

### pgBackRest

高性能なバックアップツール：

```bash
# インストール
apt-get install pgbackrest

# 設定ファイル /etc/pgbackrest/pgbackrest.conf
[global]
repo1-path=/backup/pgbackrest
repo1-retention-full=4

[mydb]
pg1-path=/var/lib/postgresql/14/main

# フルバックアップ
pgbackrest --stanza=mydb backup

# 差分バックアップ
pgbackrest --stanza=mydb --type=diff backup

# リストア
pgbackrest --stanza=mydb restore
```

### Barman

エンタープライズグレードのバックアップ管理：

```bash
# インストール
apt-get install barman

# 設定
barman check mydb
barman backup mydb
barman list-backup mydb
barman recover mydb latest /var/lib/postgresql/14/main
```

## 10. クラウドバックアップ

### AWS RDS自動バックアップ

```bash
# AWS CLIで手動スナップショット
aws rds create-db-snapshot \
    --db-instance-identifier mydb \
    --db-snapshot-identifier mydb-snapshot-$(date +%Y%m%d)

# スナップショットからリストア
aws rds restore-db-instance-from-db-snapshot \
    --db-instance-identifier restored-db \
    --db-snapshot-identifier mydb-snapshot-20241111
```

### Azure Database for PostgreSQL

```bash
# Azure CLIでバックアップ
az postgres server restore \
    --resource-group myResourceGroup \
    --name restored-server \
    --restore-point-in-time 2024-11-11T10:00:00Z \
    --source-server myserver
```

## 11. バックアップのサイジング

```sql
-- データベースのサイズを確認
SELECT pg_size_pretty(pg_database_size('dbname'));

-- テーブルごとのサイズ
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

## 12. トラブルシューティング

### バックアップが遅い

```sql
-- 長時間実行中のクエリを確認
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '5 minutes';

-- 並列ダンプを使用
pg_dump -Fd -j 4 -f backup_dir dbname
```

### リストアエラー

```bash
# 詳細なエラーログを出力
pg_restore -d newdb -v backup.dump 2> restore_errors.log

# 既存のオブジェクトをスキップ
pg_restore -d newdb --no-owner --no-acl backup.dump
```

## 13. まとめ

効果的なバックアップ戦略には以下が含まれます：

- **複数のバックアップ方法**: 論理バックアップとPITRの組み合わせ
- **定期的な実行**: 自動化されたスケジュール
- **オフサイトストレージ**: 別の場所にコピーを保管
- **定期的なテスト**: バックアップが実際にリストア可能か確認
- **監視とアラート**: バックアップの失敗を検知

**バックアップは保険です。必要になる前に準備しておきましょう。**
