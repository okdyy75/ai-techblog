---
title: パフォーマンスチューニング：EXPLAIN ANALYZEの読み方
---

# パフォーマンスチューニング：EXPLAIN ANALYZEの読み方

## 1. EXPLAINとは

`EXPLAIN`は、PostgreSQLがSQLクエリをどのように実行するかを示す実行計画を表示するコマンドです。パフォーマンスのボトルネックを特定し、クエリを最適化するための必須ツールです。

### EXPLAINとEXPLAIN ANALYZEの違い

```sql
-- EXPLAIN: 実行計画のみを表示（実際には実行しない）
EXPLAIN SELECT * FROM users WHERE id = 1;

-- EXPLAIN ANALYZE: 実行計画と実際の実行統計を表示
EXPLAIN ANALYZE SELECT * FROM users WHERE id = 1;
```

**重要**: `EXPLAIN ANALYZE`は実際にクエリを実行するため、INSERT/UPDATE/DELETEでは注意が必要です。

## 2. 基本的な実行計画の読み方

### サンプルテーブルの作成

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    age INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- テストデータの挿入
INSERT INTO users (name, email, age)
SELECT 
    'User ' || i,
    'user' || i || '@example.com',
    20 + (i % 50)
FROM generate_series(1, 100000) i;
```

### 実行計画の例

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE age = 25;
```

出力例：
```
Seq Scan on users  (cost=0.00..2084.00 rows=1961 width=45) (actual time=0.025..15.234 rows=2000 loops=1)
  Filter: (age = 25)
  Rows Removed by Filter: 98000
Planning Time: 0.123 ms
Execution Time: 15.456 ms
```

## 3. 実行計画の構成要素

### コスト（cost）

```
cost=0.00..2084.00
```

- **最初の数値（0.00）**: 最初の行を返すまでのコスト
- **2番目の数値（2084.00）**: すべての行を返すまでのコスト
- 相対的な値（絶対的な時間ではない）

### 行数（rows）

```
rows=1961
```

- オプティマイザが推定する返される行数
- 実際の行数と大きく異なる場合、統計情報の更新が必要

### 幅（width）

```
width=45
```

- 各行の平均バイト数

### 実際の実行統計（actual）

```
actual time=0.025..15.234 rows=2000 loops=1
```

- **time**: 実際の実行時間（ミリ秒）
- **rows**: 実際に返された行数
- **loops**: このノードが実行された回数

## 4. スキャン方法の種類

### Sequential Scan（シーケンシャルスキャン）

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE age > 30;
```

- テーブル全体を順番にスキャン
- インデックスがない、または使用されない場合
- 大量の行を返す場合は効率的

### Index Scan（インデックススキャン）

```sql
CREATE INDEX idx_users_age ON users(age);
EXPLAIN ANALYZE SELECT * FROM users WHERE age = 25;
```

```
Index Scan using idx_users_age on users  (cost=0.29..95.23 rows=1961 width=45)
  Index Cond: (age = 25)
```

- インデックスを使用してデータを取得
- 選択的なクエリに効率的

### Index Only Scan（インデックスオンリースキャン）

```sql
EXPLAIN ANALYZE SELECT age FROM users WHERE age = 25;
```

- インデックスだけで結果を返せる（テーブルアクセス不要）
- 最も高速

### Bitmap Heap Scan

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE age BETWEEN 25 AND 30;
```

```
Bitmap Heap Scan on users
  Recheck Cond: ((age >= 25) AND (age <= 30))
  ->  Bitmap Index Scan on idx_users_age
        Index Cond: ((age >= 25) AND (age <= 30))
```

- 中程度の選択性のクエリに使用
- インデックスとヒープスキャンのハイブリッド

## 5. JOIN操作

### Nested Loop Join

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    amount DECIMAL
);

INSERT INTO orders (user_id, amount)
SELECT (random() * 1000)::integer, random() * 1000
FROM generate_series(1, 10000);

EXPLAIN ANALYZE 
SELECT u.name, o.amount 
FROM users u 
JOIN orders o ON u.id = o.user_id 
WHERE u.id < 10;
```

```
Nested Loop
  ->  Index Scan on users u
  ->  Index Scan on orders o
```

- 小さなデータセットに効率的
- 外側のテーブルの各行に対して内側のテーブルをスキャン

### Hash Join

```sql
EXPLAIN ANALYZE 
SELECT u.name, o.amount 
FROM users u 
JOIN orders o ON u.id = o.user_id;
```

```
Hash Join
  Hash Cond: (o.user_id = u.id)
  ->  Seq Scan on orders o
  ->  Hash
        ->  Seq Scan on users u
```

- 大きなデータセットに効率的
- 一方のテーブルをメモリ上のハッシュテーブルに構築

### Merge Join

```sql
CREATE INDEX idx_orders_user_id ON orders(user_id);

EXPLAIN ANALYZE 
SELECT u.name, o.amount 
FROM users u 
JOIN orders o ON u.id = o.user_id;
```

```
Merge Join
  Merge Cond: (u.id = o.user_id)
  ->  Index Scan on users u
  ->  Index Scan on orders o
```

- ソート済みデータセットに効率的
- 両方のテーブルがソートされている必要がある

## 6. 集約操作

### GROUP BY

```sql
EXPLAIN ANALYZE 
SELECT age, COUNT(*) 
FROM users 
GROUP BY age;
```

```
HashAggregate
  Group Key: age
  ->  Seq Scan on users
```

または

```
GroupAggregate
  Group Key: age
  ->  Index Scan on users using idx_users_age
```

## 7. フォーマットオプション

### 詳細出力

```sql
EXPLAIN (ANALYZE, VERBOSE, BUFFERS) 
SELECT * FROM users WHERE age = 25;
```

- **VERBOSE**: より詳細な情報を表示
- **BUFFERS**: バッファの使用状況を表示

### JSON形式

```sql
EXPLAIN (ANALYZE, FORMAT JSON) 
SELECT * FROM users WHERE age = 25;
```

プログラムで解析しやすい形式で出力されます。

## 8. パフォーマンス問題の特定

### 問題の兆候

1. **高いコスト**: 不要な全テーブルスキャン
2. **推定行数と実際の行数の乖離**: 統計情報が古い
3. **高いループ数**: 非効率なネステッドループ
4. **多数の削除行**: インデックスの選択性が低い

### チェックポイント

```sql
-- 統計情報の確認
SELECT schemaname, tablename, last_analyze, last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename = 'users';

-- 統計情報の更新
ANALYZE users;

-- インデックスの使用状況
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'users';
```

## 9. 実践例

### 最適化前

```sql
EXPLAIN ANALYZE 
SELECT u.name, COUNT(o.id) 
FROM users u 
LEFT JOIN orders o ON u.id = o.user_id 
WHERE u.age > 30 
GROUP BY u.name;
```

問題点：
- Sequential Scanが発生
- 統計情報が古い

### 最適化後

```sql
-- 統計情報の更新
ANALYZE users;
ANALYZE orders;

-- 適切なインデックスの作成
CREATE INDEX idx_users_age_name ON users(age, name);
CREATE INDEX idx_orders_user_id ON orders(user_id);

EXPLAIN ANALYZE 
SELECT u.name, COUNT(o.id) 
FROM users u 
LEFT JOIN orders o ON u.id = o.user_id 
WHERE u.age > 30 
GROUP BY u.name;
```

## 10. ベストプラクティス

1. **定期的に統計情報を更新**: `ANALYZE`を実行
2. **適切なインデックスを作成**: WHERE、JOIN、ORDER BYに使用されるカラム
3. **クエリを分析**: 本番環境のクエリを定期的にレビュー
4. **バッファ使用を確認**: `BUFFERS`オプションでメモリ効率を確認
5. **推定と実際の差を確認**: 大きな乖離があれば統計情報を更新

## 11. まとめ

`EXPLAIN ANALYZE`は、PostgreSQLのパフォーマンスチューニングの基本ツールです。実行計画を読み解くことで、クエリのボトルネックを特定し、適切な最適化を行うことができます。定期的にクエリを分析し、継続的な改善を行いましょう。
