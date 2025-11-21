---
title: クエリ最適化：実行計画を改善するテクニック
---

# クエリ最適化：実行計画を改善するテクニック

## 1. クエリ最適化の基本原則

クエリ最適化の目標は、必要なデータを最小のリソースで最速に取得することです。

### 最適化の4つの柱

1. **インデックスの活用**: 適切なインデックスでデータアクセスを高速化
2. **不要なデータの排除**: 必要なカラムと行のみを取得
3. **JOIN の最適化**: 効率的な結合戦略
4. **統計情報の維持**: オプティマイザに正確な情報を提供

## 2. SELECT文の最適化

### 必要なカラムのみを取得

```sql
-- 悪い例：すべてのカラムを取得
SELECT * FROM users WHERE age > 30;

-- 良い例：必要なカラムのみを取得
SELECT id, name, email FROM users WHERE age > 30;
```

**理由**: 
- ディスクI/Oを削減
- ネットワーク転送量を削減
- Index Only Scanを可能にする

### DISTINCT の使用を避ける

```sql
-- 悪い例：DISTINCTで重複を除去
SELECT DISTINCT user_id FROM orders;

-- 良い例：GROUP BYを使用
SELECT user_id FROM orders GROUP BY user_id;

-- さらに良い例：EXISTS を使用
SELECT u.id FROM users u 
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);
```

## 3. WHERE句の最適化

### インデックスを活用できる条件

```sql
-- インデックスが使用される
SELECT * FROM users WHERE age = 25;
SELECT * FROM users WHERE age > 25;
SELECT * FROM users WHERE age BETWEEN 20 AND 30;

-- インデックスが使用されない
SELECT * FROM users WHERE age + 1 = 26;  -- カラムに関数を適用
SELECT * FROM users WHERE LOWER(name) = 'john';  -- 関数を使用
```

### インデックスを使用できるように書き換え

```sql
-- 悪い例
SELECT * FROM users WHERE age + 1 = 26;

-- 良い例
SELECT * FROM users WHERE age = 25;

-- 悪い例
SELECT * FROM users WHERE EXTRACT(YEAR FROM created_at) = 2024;

-- 良い例
SELECT * FROM users 
WHERE created_at >= '2024-01-01' 
  AND created_at < '2025-01-01';
```

### OR条件の最適化

```sql
-- 悪い例：ORは複数のインデックスを使用できない
SELECT * FROM users WHERE age = 25 OR age = 30;

-- 良い例：INを使用
SELECT * FROM users WHERE age IN (25, 30);

-- 場合によってはUNIONが効率的
SELECT * FROM users WHERE age = 25
UNION ALL
SELECT * FROM users WHERE age = 30;
```

## 4. JOINの最適化

### JOIN順序の最適化

PostgreSQLは自動的に最適なJOIN順序を選択しますが、統計情報が正確である必要があります。

```sql
-- 小さいテーブルから結合
SELECT u.name, o.amount, od.product_name
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN order_details od ON o.id = od.order_id
WHERE u.id < 100;  -- 絞り込み条件
```

### 適切なJOIN型の選択

```sql
-- INNER JOINが推奨される場合
SELECT u.name, o.amount
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.amount > 1000;

-- LEFT JOINが必要な場合のみ使用
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

### サブクエリ vs JOIN

```sql
-- サブクエリ（場合によっては非効率）
SELECT * FROM users 
WHERE id IN (SELECT user_id FROM orders WHERE amount > 1000);

-- JOINに書き換え（通常より効率的）
SELECT DISTINCT u.* 
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.amount > 1000;

-- EXISTS を使用（さらに効率的な場合がある）
SELECT * FROM users u
WHERE EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.user_id = u.id AND o.amount > 1000
);
```

## 5. インデックスの最適化

### 複合インデックスの順序

```sql
-- WHERE age = 25 AND city = 'Tokyo' のクエリが多い場合
CREATE INDEX idx_users_age_city ON users(age, city);

-- WHERE city = 'Tokyo' AND age = 25 も同じインデックスを使用可能
-- ただし、WHERE city = 'Tokyo' だけの場合は効率が落ちる
```

**原則**: 選択性の高いカラムを先に配置

### カバリングインデックス

```sql
-- クエリで使用するすべてのカラムをインデックスに含める
CREATE INDEX idx_users_age_name_email ON users(age, name, email);

-- Index Only Scanが可能になる
EXPLAIN ANALYZE 
SELECT name, email FROM users WHERE age = 25;
```

### 部分インデックス

```sql
-- アクティブなユーザーのみにインデックスを作成
CREATE INDEX idx_active_users ON users(created_at) 
WHERE status = 'active';

-- このクエリで部分インデックスが使用される
SELECT * FROM users WHERE status = 'active' AND created_at > '2024-01-01';
```

### 式インデックス

```sql
-- 大文字小文字を区別しない検索用
CREATE INDEX idx_users_lower_email ON users(LOWER(email));

SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
```

## 6. 集約クエリの最適化

### GROUP BYの最適化

```sql
-- 悪い例：集約後にフィルタリング
SELECT age, COUNT(*) as count
FROM users
GROUP BY age
HAVING COUNT(*) > 100;

-- 良い例：可能な限り事前にフィルタリング
SELECT age, COUNT(*) as count
FROM users
WHERE created_at > '2024-01-01'  -- 先にフィルタリング
GROUP BY age
HAVING COUNT(*) > 100;
```

### ウィンドウ関数の活用

```sql
-- サブクエリを使用（非効率）
SELECT u.*, 
       (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as order_count
FROM users u;

-- ウィンドウ関数を使用（効率的）
SELECT u.id, u.name, COUNT(o.id) OVER (PARTITION BY u.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;

-- さらに効率的：通常の集約
SELECT u.id, u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

## 7. ページネーションの最適化

### OFFSET の問題

```sql
-- 悪い例：大きなOFFSETは非効率
SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 100000;
-- すべての行をスキップする必要がある
```

### キーセットページネーション

```sql
-- 最初のページ
SELECT * FROM users ORDER BY id LIMIT 20;

-- 次のページ（最後のidが100だった場合）
SELECT * FROM users WHERE id > 100 ORDER BY id LIMIT 20;
```

**利点**:
- 一定のパフォーマンス
- 大きなオフセットでも高速

## 8. パーティショニングの活用

### 範囲パーティショニング

```sql
-- 日付でパーティション
CREATE TABLE orders_2024 PARTITION OF orders
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- クエリは自動的に関連パーティションのみをスキャン
SELECT * FROM orders WHERE created_at >= '2024-06-01';
```

## 9. マテリアライズドビューの活用

### 重い集計クエリの最適化

```sql
-- 頻繁に実行される重い集計クエリ
CREATE MATERIALIZED VIEW user_order_summary AS
SELECT 
    u.id,
    u.name,
    COUNT(o.id) as order_count,
    SUM(o.amount) as total_amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;

-- インデックスの作成
CREATE INDEX idx_user_order_summary_id ON user_order_summary(id);

-- 定期的に更新
REFRESH MATERIALIZED VIEW user_order_summary;
```

## 10. CTEの最適化

### CTEとサブクエリの使い分け

```sql
-- CTE（読みやすいが、最適化の制約がある場合も）
WITH recent_orders AS (
    SELECT * FROM orders WHERE created_at > '2024-01-01'
)
SELECT u.name, ro.amount
FROM users u
JOIN recent_orders ro ON u.id = ro.user_id;

-- サブクエリ（オプティマイザが最適化しやすい）
SELECT u.name, o.amount
FROM users u
JOIN (SELECT * FROM orders WHERE created_at > '2024-01-01') o 
ON u.id = o.user_id;
```

PostgreSQL 12以降では、CTEの自動インライン化が改善されています。

## 11. クエリのリファクタリング

### バッチ処理

```sql
-- 悪い例：1件ずつ更新
UPDATE users SET status = 'active' WHERE id = 1;
UPDATE users SET status = 'active' WHERE id = 2;
-- ...

-- 良い例：一括更新
UPDATE users SET status = 'active' WHERE id IN (1, 2, 3, ...);

-- さらに良い例：一時テーブルを使用
CREATE TEMP TABLE temp_user_ids (id INTEGER);
INSERT INTO temp_user_ids VALUES (1), (2), (3), ...;

UPDATE users 
SET status = 'active'
FROM temp_user_ids
WHERE users.id = temp_user_ids.id;
```

## 12. パフォーマンス監視

### 遅いクエリの特定

```sql
-- pg_stat_statementsの有効化
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 遅いクエリの確認
SELECT query, calls, total_exec_time, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## 13. チェックリスト

クエリ最適化の際は、以下をチェックしましょう：

- [ ] 必要なカラムのみを SELECT しているか？
- [ ] WHERE 句でインデックスを活用できているか？
- [ ] 適切なインデックスが作成されているか？
- [ ] JOIN の順序は適切か？
- [ ] 不要な DISTINCT や ORDER BY を使用していないか？
- [ ] 統計情報は最新か？（ANALYZE を実行）
- [ ] EXPLAIN ANALYZE で実行計画を確認したか？

## 14. まとめ

クエリ最適化は継続的なプロセスです。以下のステップを踏むことで、効率的な最適化が可能になります：

1. **計測**: EXPLAIN ANALYZE で現状を把握
2. **分析**: ボトルネックを特定
3. **最適化**: 適切な手法を適用
4. **検証**: 改善効果を確認
5. **監視**: 定期的にパフォーマンスを確認

小さな改善の積み重ねが、大きなパフォーマンス向上につながります。
