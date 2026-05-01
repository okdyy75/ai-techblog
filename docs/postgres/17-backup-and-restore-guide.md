---
title: "PostgreSQLのバックアップとリストア完全ガイド"
description: "PostgreSQLのバックアップ方式（pg_dump、pg_basebackup、PITR）を徹底解説。論理バックアップと物理バックアップの違い、戦略の立て方、自動化手法まで実践的に解説します。"
---

# PostgreSQLのバックアップとリストア完全ガイド

## 1. はじめに

データベースは企業にとって最も重要な資産の一つです。ハードウェアの故障、人為的なミス、ランサムウェア攻撃など、データを失うリスクは常に存在します。適切なバックアップ戦略を策定し、リストア手順を事前に確認しておくことは、ビジネス継続性を確保する上で不可欠です。

本記事では、PostgreSQLで利用可能なバックアップ方式の特徴と、実際の運用に即したバックアップ戦略の立て方を解説します。

## 2. PostgreSQLのバックアップ方式の種類

PostgreSQLには、主に以下の3つのバックアップ方式があります。

| 方式 | コマンド | 特徴 |
|------|----------|------|
| 論理バックアップ | `pg_dump` / `pg_dumpall` | テキスト形式またはカスタム形式で出力。特定のDBやオブジェクトを選択可能。 |
| 物理バックアップ | `pg_basebackup` | データディレクトリ全体をコピー。高速なリストアが可能。 |
| PITR | `pg_basebackup` + WAL | 任意の時点まで復元可能。継続的アーカイブが必要。 |

## 3. 各バックアップ方式の詳細

### 3.1 論理バックアップ（pg_dump / pg_dumpall）

`pg_dump`は、特定のデータベースのスキーマとデータをSQLまたはカスタム形式で出力します。

#### メリット
- **柔軟性**: 特定のテーブルやスキーマのみバックアップ可能
- **移植性**: 異なるPostgreSQLバージョン間で復元可能
- **圧縮**: カスタム形式で効率的に圧縮できる

#### デメリット
- **速度**: 大規模データベースでは時間がかかる
- **一貫性**: バックアップ中のトランザクションは含まれない場合がある

#### 基本的な使用方法

```bash
# 単一データベースのバックアップ（SQL形式）
pg_dump -h localhost -U postgres -d mydb > mydb_backup.sql

# カスタム形式（推奨）
pg_dump -h localhost -U postgres -d mydb -Fc > mydb_backup.dump

# 特定のテーブルのみバックアップ
pg_dump -h localhost -U postgres -d mydb -t users -t orders > tables_backup.sql

# スキーマのみ（データなし）
pg_dump -h localhost -U postgres -d mydb --schema-only > schema_backup.sql
```

#### pg_dumpallの使用

すべてのデータベースをバックアップする場合：

```bash
# 全データベースを含むバックアップ（グローバルオブジェクトも含む）
pg_dumpall -h localhost -U postgres > all_databases.sql
```

### 3.2 物理バックアップ（pg_basebackup）

`pg_basebackup`は、PostgreSQLのデータディレクトリをそのままコピーします。

#### メリット
- **速度**: ファイルシステムレベルでのコピーにより高速
- **完全性**: クラスタ全体を正確に複製
- **レプリケーション**: スタンバイサーバーの作成にも使用

#### デメリット
- **サイズ**: データベース全体のサイズと同じ容量が必要
- **バージョン固定**: 同じPostgreSQLバージョンでのみ復元可能

#### 基本的な使用方法

```bash
# 基本的な物理バックアップ
pg_basebackup -h localhost -U postgres -D /backup/basebackup -Fp -Xs -P

# 圧縮してバックアップ
tar czvf basebackup.tar.gz /backup/basebackup

# オプションの説明
# -D: バックアップ先ディレクトリ
# -Fp: プレーンフォーマット（tar形式も選択可能）
# -Xs: WALファイルをストリーミングして含める
# -P: 進捗状況を表示
```

### 3.3 PITR（ポイントインタイムリカバリ）

PITRは、WAL（Write-Ahead Log）ファイルをアーカイブすることで、任意の時点までデータベースを復元できる機能です。

#### 設定方法

**postgresql.conf:**

```ini
# WALアーカイブの有効化
archive_mode = on
archive_command = 'cp %p /archive/%f'

# WALの保持設定
wal_level = replica
max_wal_size = 1GB
min_wal_size = 80MB
```

**pg_hba.conf**（レプリケーション接続用）:

```
local   replication     postgres                                trust
host    replication     postgres        127.0.0.1/32            trust
```

#### ベースバックアップの取得

```bash
# PITR用のベースバックアップ
pg_basebackup -h localhost -U postgres \
  -D /backup/basebackup_$(date +%Y%m%d) \
  -Fp -Xs -P -v \
  --wal-method=fetch
```

## 4. バックアップ戦略の設計

### 4.1 バックアップスケジュールの例

| 頻度 | 方式 | 対象 | 保持期間 |
|------|------|------|----------|
| 毎日 | 論理バックアップ | 全データベース | 7日間 |
| 毎週 | 物理バックアップ | フルクラスタ | 4週間 |
| 毎時 | WALアーカイブ | トランザクションログ | 30日間 |

### 4.2 自動化スクリプト

```bash
#!/bin/bash
# /usr/local/bin/postgres_backup.sh

BACKUP_DIR="/backup/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="myapp_production"
RETENTION_DAYS=7

# バックアップディレクトリの作成
mkdir -p ${BACKUP_DIR}/{daily,weekly,archive}

# 日次論理バックアップ
echo "Starting daily logical backup..."
pg_dump -h localhost -U postgres -d ${DB_NAME} -Fc \
  > ${BACKUP_DIR}/daily/${DB_NAME}_${DATE}.dump

# 圧縮
gzip ${BACKUP_DIR}/daily/${DB_NAME}_${DATE}.dump

# 古いバックアップの削除
find ${BACKUP_DIR}/daily -name "*.dump.gz" -mtime +${RETENTION_DAYS} -delete

echo "Backup completed: ${BACKUP_DIR}/daily/${DB_NAME}_${DATE}.dump.gz"
```

### 4.3 cronでの自動化

```bash
# 毎日深夜2時に実行
0 2 * * * /usr/local/bin/postgres_backup.sh >> /var/log/postgres_backup.log 2>&1

# 毎週日曜日に物理バックアップ
0 3 * * 0 /usr/local/bin/postgres_basebackup.sh
```

## 5. リストア手順

### 5.1 pg_restoreによる復元

```bash
# データベースの作成
createdb -h localhost -U postgres mydb_restore

# カスタム形式からの復元
pg_restore -h localhost -U postgres -d mydb_restore mydb_backup.dump

# 特定のテーブルのみ復元
pg_restore -h localhost -U postgres -d mydb_restore -t users mydb_backup.dump

# データのみ復元（スキーマは作成済みの場合）
pg_restore -h localhost -U postgres -d mydb_restore --data-only mydb_backup.dump
```

### 5.2 物理バックアップからの復元

```bash
# PostgreSQLサービスの停止
sudo systemctl stop postgresql

# 既存データのバックアップ（安全のため）
sudo mv /var/lib/postgresql/data /var/lib/postgresql/data_old

# バックアップの展開
sudo tar xzvf basebackup.tar.gz -C /var/lib/postgresql/

# パーミッションの修正
sudo chown -R postgres:postgres /var/lib/postgresql/data

# PostgreSQLサービスの起動
sudo systemctl start postgresql
```

### 5.3 PITRの実行

```bash
# 1. PostgreSQLを停止
sudo systemctl stop postgresql

# 2. データディレクトリをクリア
sudo rm -rf /var/lib/postgresql/data/*

# 3. ベースバックアップを展開
sudo cp -r /backup/basebackup_20250101/* /var/lib/postgresql/data/

# 4. recovery.conf（PostgreSQL 12以前）またはpostgresql.conf（12以降）の作成
sudo tee /var/lib/postgresql/data/postgresql.conf.d/recovery.conf << EOF
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2025-01-15 14:30:00'
recovery_target_action = 'promote'
EOF

# 5. PostgreSQLを起動
sudo systemctl start postgresql

# 6. 復元の確認
psql -c "SELECT pg_is_in_recovery();"  # falseになったら完了
```

## 6. 自動化と監視

### 6.1 バックアップ成功の確認

```bash
#!/bin/bash
# バックアップ検証スクリプト

BACKUP_FILE="/backup/postgres/daily/mydb_$(date +%Y%m%d)*.dump.gz"

if [ -f $BACKUP_FILE ]; then
    # ファイルサイズチェック
    FILE_SIZE=$(stat -f%z "$BACKUP_FILE")
    if [ $FILE_SIZE -gt 1024 ]; then
        echo "[OK] Backup successful: $BACKUP_FILE (${FILE_SIZE} bytes)"
        exit 0
    fi
fi

echo "[ERROR] Backup failed or file is too small"
# アラート送信（Slackやメールなど）
exit 1
```

### 6.2 監視用SQL

```sql
-- 最後のバックアップ時刻を確認（pg_dumpall使用時）
SELECT 
    pg_database.datname,
    pg_database_size(pg_database.datname) as size_bytes,
    pg_stat_file(pg_relation_filepath(pg_database.datname)) as file_info
FROM pg_database 
WHERE datname = 'myapp_production';

-- WALアーカイブの状態確認
SELECT 
    archived_count,
    last_archived_time,
    failed_count,
    last_failed_time
FROM pg_stat_archiver;
```

## 7. ベストプラクティスと注意点

### 7.1 必須のチェックリスト

- [ ] バックアップは必ずテストリストアを実施
- [ ] バックアップファイルは別サーバーまたはクラウドストレージに保存
- [ ] バックアップログを監視し、失敗時にアラート
- [ ] RTO（復旧時間目標）とRPO（復旧時点目標）を定義
- [ ] 暗号化が必要なデータはバックアップも暗号化

### 7.2 よくある失敗と対策

| 問題 | 原因 | 対策 |
|------|------|------|
| バックアップが失敗する | ディスク容量不足 | 監視アラートを設定し、自動削除を実装 |
| リストアに時間がかかる | 大規模データベース | 物理バックアップを併用 |
| データの不整合 | バックアップ中の書き込み | `--single-transaction`オプションを使用 |
| 権限エラー | ロールが存在しない | `--no-owner`オプションでリストア |

### 7.3 パフォーマンス最適化

```bash
# 並列バックアップ（高速化）
pg_dump -Fd -j 4 -f backup_dir mydb

# 圧縮レベルの調整（速度vs容量のトレードオフ）
pg_dump -Fc -Z 3 mydb > backup.dump  # -Z 0（無圧縮）から9（最大）
```

## 8. まとめ

PostgreSQLのバックアップ戦略は、ビジネス要件と技術的制約のバランスから選択します。

- **小規模〜中規模**: 日次の`pg_dump`で十分な場合が多い
- **大規模・高可用性要件**: 物理バックアップとPITRを組み合わせる
- **ミッションクリティカル**: 両方を実装し、定期的なリストアテストを実施

重要なのは、バックアップが取得できたことだけでなく、実際にリストアができることを確認することです。定期的なリストアテストを計画に含め、災害時に備えましょう。

---

**関連記事:**
- [PostgreSQLのインストールと初期設定ガイド](./02-installation-and-setup.md)
- [パフォーマンスチューニング：EXPLAIN ANALYZEの読方](./15-explain-analyze-guide.md)
