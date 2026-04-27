---
title: パフォーマンスチューニング：EXPLAIN ANALYZEの読み方
description: PostgreSQLのEXPLAIN ANALYZEを使ってクエリの実行計画を分析し、パフォーマンスを改善する方法を解説します
order: 15
---

# パフォーマンスチューニング：EXPLAIN ANALYZEの読み方

## はじめに

PostgreSQLで運用しているデータベースが遅い、という経験はありませんか？大量のデータを扱うアプリケーションでは、SQLクエリのパフォーマンスがシステム全体のレスポンスに大きく影響します。

本記事では、PostgreSQLが提供する最も強力なパフォーマンス分析ツール「EXPLAIN ANALYZE」の使い方と、出力結果からボトルネックを特定する方法を解説します。

## EXPLAINとEXPLAIN ANALYZEの違い

PostgreSQLには、クエリの実行計画を確認するための2つの主要なコマンドがあります。

### EXPLAIN

```sql
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';
```

- **予測**コストのみを表示
- 実際にはクエリを実行しない
- プランナーが見積もるコストと行数を表示

### EXPLAIN ANALYZE

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```

- 実際にクエリを**実行**して測定
- 実際の実行時間と実際の行数を表示
- より正確なパフォーマンス情報を提供

::: tip
本番環境では `EXPLAIN ANALYZE` はデータを変更するクエリ（UPDATE, DELETE, INSERT）に対しても実際に実行されるため注意が必要です。`BEGIN; EXPLAIN ANALYZE ...; ROLLBACK;` のようにトランザクションで囲むか、`EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, BUFFERS OFF)` を検討してください。
:::

## 基本的な使い方と出力の見方

### 基本的な出力の構造

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123;
```

```
Seq Scan on orders  (cost=0.00..35.50 rows=10 width=72) (actual time=0.015..0.230 rows=15 loops=1)
  Filter: (user_id = 123)
  Rows Removed by Filter: 985
Planning Time: 0.123 ms
Execution Time: 0.312 ms
```

各数値の意味：

| 項目 | 説明 |
|------|------|
| `cost=0.00..35.50` | 開始コストと総コスト（コスト単位） |
| `rows=10` | 見積もり行数 |
| `width=72` | 見積もり行の平均幅（バイト） |
| `actual time=0.015..0.230` | 最初の行出力時間と総実行時間（ms） |
| `rows=15` | 実際の行数 |
| `loops=1` | このノードが実行された回数 |

## 主要な実行ノードの解説

### 1. Seq Scan（シーケンシャルスキャン）

```
Seq Scan on users  (cost=0.00..18334.00 rows=1000000 width=68)
```

- テーブル全体を先頭から読み込む
- 小規模なテーブルや、大部分の行が必要な場合は有効
- 大規模テーブルでの多用はボトルネックの原因に

### 2. Index Scan（インデックススキャン）

```
Index Scan using idx_users_email on users  (cost=0.42..8.44 rows=1 width=68)
  Index Cond: (email = 'test@example.com'::text)
```

- インデックスを使用して特定の行を効率的に検索
- 行数が少ない場合に非常に高速

### 3. Bitmap Index Scan + Bitmap Heap Scan

```
Bitmap Heap Scan on products  (cost=4.32..45.67 rows=100 width=120)
  Recheck Cond: (category_id = 5)
  ->  Bitmap Index Scan on idx_products_category  (cost=0.00..4.20 rows=100 width=0)
        Index Cond: (category_id = 5)
```

- 複数のインデックス条件を効率的に結合
- 中程度の行数を取得する場合に有効

### 4. Nested Loop（ネステッドループ）

```
Nested Loop  (cost=0.42..123.45 rows=50 width=150)
  ->  Seq Scan on orders  (cost=0.00..25.00 rows=10 width=72)
  ->  Index Scan using idx_users_id on users  (cost=0.42..9.85 rows=1 width=78)
        Index Cond: (users.id = orders.user_id)
```

- 外側のテーブルの各行に対して内側のテーブルを検索
- 小規模な結果セットの結合に適している

### 5. Hash Join（ハッシュ結合）

```
Hash Join  (cost=45.67..234.56 rows=1000 width=200)
  Hash Cond: (orders.user_id = users.id)
  ->  Seq Scan on orders  (cost=0.00..150.00 rows=10000 width=72)
  ->  Hash  (cost=35.50..35.50 rows=1000 width=68)
        ->  Seq Scan on users  (cost=0.00..35.50 rows=1000 width=68)
```

- 小さい方のテーブルをメモリ上にハッシュテーブルとして構築
- 大規模な結合に非常に効率的

### 6. Merge Join（マージ結合）

```
Merge Join  (cost=234.56..456.78 rows=5000 width=150)
  Merge Cond: (a.id = b.a_id)
  ->  Index Scan using idx_a_id on a  (cost=0.42..123.45 rows=5000 width=75)
  ->  Index Scan using idx_b_a_id on b  (cost=0.42..123.45 rows=5000 width=75)
```

- 両方のテーブルがソート済みの場合に使用
- 大規模なソート済みデータの結合に効率的

## コストと実際の時間の読み方

### 見積もりと実際の乖離

```
Seq Scan on large_table  (cost=0.00..12345.67 rows=100 width=50) 
  (actual time=0.123..5678.900 rows=1000000 loops=1)
```

この例では：
- 見積もり行数: 100行
- 実際の行数: 1,000,000行

**乖離が大きい場合**、以下の対応が必要です：

1. **ANALYZEの実行**
   ```sql
   ANALYZE large_table;
   ```
   統計情報が古い場合、見積もりが不正確になります。

2. **統計情報の調整**
   ```sql
   ALTER TABLE large_table ALTER COLUMN status SET STATISTICS 1000;
   ANALYZE large_table;
   ```

## 実践：遅いクエリのチューニング例

### 問題のあるクエリ

```sql
-- Before: 遅いクエリ
SELECT o.*, u.name, u.email
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.created_at > '2024-01-01'
  AND o.status = 'completed'
ORDER BY o.total_amount DESC;
```

```
Sort  (cost=45678.90..45679.90 rows=1000 width=200) (actual time=2345.67..2346.89 rows=5000 loops=1)
  Sort Key: o.total_amount DESC
  Sort Method: external merge  Disk: 5120kB
  ->  Hash Join  (cost=12345.67..45678.90 rows=1000 width=200) (actual time=1234.56..2234.56 rows=5000 loops=1)
        Hash Cond: (o.user_id = u.id)
        ->  Seq Scan on orders o  (cost=0.00..30000.00 rows=1000 width=120)
              Filter: ((created_at > '2024-01-01'::timestamp) AND (status = 'completed'::text))
              Rows Removed by Filter: 999000
        ->  Hash  (cost=2234.00..2234.00 rows=100000 width=80)
              ->  Seq Scan on users u  (cost=0.00..2234.00 rows=100000 width=80)
Planning Time: 0.456 ms
Execution Time: 2347.123 ms
```

**問題点：**
1. `orders` テーブルのシーケンシャルスキャン（999,000行を除外）
2. ディスクを使用した外部ソート
3. 実行時間が約2.3秒

### 最適化後

```sql
-- インデックス作成
CREATE INDEX idx_orders_created_at_status ON orders(created_at, status, total_amount DESC);
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

```sql
-- After: 最適化後のクエリ（同じSQL）
SELECT o.*, u.name, u.email
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.created_at > '2024-01-01'
  AND o.status = 'completed'
ORDER BY o.total_amount DESC;
```

```
Nested Loop  (cost=0.85..2345.67 rows=1000 width=200) (actual time=0.234..15.678 rows=5000 loops=1)
  ->  Index Scan using idx_orders_created_at_status on orders o  (cost=0.42..1234.56 rows=1000 width=120)
        Index Cond: ((created_at > '2024-01-01'::timestamp) AND (status = 'completed'::text))
  ->  Index Scan using users_pkey on users u  (cost=0.42..0.56 rows=1 width=80)
        Index Cond: (id = o.user_id)
Planning Time: 0.234 ms
Execution Time: 16.789 ms
```

**改善結果：**
- 実行時間: 2,347ms → 17ms（約**140倍**の高速化）
- インデックススキャンを使用
- メモリ内で処理完了

## よくある問題とその解決策

### 1. Seq Scanが多すぎる

**症状**: 大規模テーブルで `Seq Scan` が頻出

**解決策**:
```sql
-- 適切なインデックスを作成
CREATE INDEX CONCURRENTLY idx_table_column ON table(column);

-- 統計情報を更新
ANALYZE table;
```

### 2. 過剰な行数の見積もり

**症状**: `rows` の見積もりと実際の値が大きく異なる

**解決策**:
```sql
-- 統計情報ターゲットを増やす
ALTER TABLE table_name ALTER COLUMN column_name SET STATISTICS 1000;
ANALYZE table_name;
```

### 3. ディスクソートの発生

**症状**: `Sort Method: external merge Disk: ...`

**解決策**:
```sql
-- work_memを増やす（セッション単位）
SET work_mem = '256MB';

-- または、カバリングインデックスを使用
CREATE INDEX idx_covering ON table(a, b, c) INCLUDE (d, e);
```

### 4. ネステッドループの多用

**症状**: 大規模な結果セットで `Nested Loop` が使用される

**解決策**:
```sql
-- 結合方式を一時的に変更
SET enable_nestloop = off;

-- または、from_collapse_limitを調整
SET from_collapse_limit = 1;
```

## 便利なオプション

### BUFFERS：I/O情報の表示

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE user_id = 123;
```

```
Seq Scan on orders  (cost=0.00..18334.00 rows=100 width=72) 
  (actual time=0.023..234.567 rows=1000 loops=1)
  Filter: (user_id = 123)
  Buffers: shared read=10000
Planning Time: 0.123 ms
Execution Time: 234.890 ms
```

`Buffers: shared read=10000` は、10,000ブロックのディスク読み取りが発生したことを示します。

### FORMAT JSON：機械可読な出力

```sql
EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM users LIMIT 10;
```

### VERBOSE：詳細情報の表示

```sql
EXPLAIN (ANALYZE, VERBOSE) SELECT * FROM users;
```

## まとめ

EXPLAIN ANALYZEはPostgreSQLのパフォーマンスチューニングにおいて不可欠なツールです。以下のポイントを覚えておきましょう：

1. **常にEXPLAIN ANALYZEを使用する** - 実際の実行時間を確認
2. **行数の乖離に注目する** - 統計情報の問題を早期発見
3. **Seq Scanに疑問を持つ** - 大規模テーブルではインデックスを検討
4. **ソート方法を確認する** - ディスクソートは改善の余地あり
5. **Buffersオプションを活用する** - I/Oボトルネックの特定

継続的に実行計画を確認し、インデックス設計を見直すことで、アプリケーションのパフォーマンスを大幅に向上させることができます。
