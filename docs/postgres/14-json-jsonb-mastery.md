---
title: JSON/JSONBデータ型の徹底活用
order: 12
outline: deep
---

# JSON/JSONBデータ型の徹底活用

PostgreSQLは9.2からJSONデータ型を、9.4からJSONBデータ型をサポートしています。これらのデータ型により、リレーショナルデータベースでありながら柔軟なスキーマ設計が可能になり、NoSQLデータベースのような使い方も実現できます。この記事では、JSONとJSONBの違いから実践的な活用方法までを詳しく解説します。

## 1. JSONとJSONBの違いと特徴

### JSON型

JSON型はテキスト形式でJSONデータを保存します。入力されたJSONをそのまま保存し、検証のみを行います。

**特徴：**
- 入力されたJSONをそのまま保存（空白やキーの順序を保持）
- 重複したキーを許可
- 保存時の検証のみ（高速）
- 検索・操作時に毎回パースが必要（遅い）

### JSONB型

JSONB型はバイナリ形式でJSONデータを保存します。分解されたバイナリ形式で保存されるため、効率的な検索と操作が可能です。

**特徴：**
- バイナリ形式で保存（空白を除去、キーをソート）
- 重複したキーは最後の値のみ保持
- 保存時に変換処理が必要（JSONより少し遅い）
- インデックス作成可能（GINインデックス）
- 検索・操作が高速

### 比較表

| 項目 | JSON | JSONB |
|------|------|-------|
| 保存形式 | テキスト | バイナリ |
| 空白・改行 | 保持 | 削除 |
| キーの順序 | 保持 | ソート済み |
| 重複キー | 許可 | 最後の値のみ |
| 保存速度 | 速い | やや遅い |
| 検索速度 | 遅い | 速い |
| インデックス | 不可 | 可（GIN）|
| 推奨用途 | 正確な保存が必要 | 検索・操作が必要 |

**結論：ほとんどの場合、JSONBを使用することを推奨します。**

## 2. JSON/JSONBの基本操作

### テーブルの作成

```sql
-- JSONBを使用したテーブル作成
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    profile JSONB
);

-- 製品情報テーブル（複雑なJSON構造）
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    attributes JSONB,
    metadata JSONB DEFAULT '{}'
);
```

### データの挿入

```sql
-- 基本的なJSONBデータの挿入
INSERT INTO users (name, profile) VALUES (
    '山田太郎',
    '{
        "age": 30,
        "email": "yamada@example.com",
        "skills": ["Ruby", "PostgreSQL", "Docker"],
        "address": {
            "city": "東京",
            "zip": "100-0001"
        }
    }'::jsonb
);

-- 入れ子のJSONBデータ
INSERT INTO products (name, attributes) VALUES (
    'ゲーミングノートPC',
    '{
        "brand": "TechPro",
        "specs": {
            "cpu": "Intel Core i9",
            "ram": "32GB",
            "storage": {
                "type": "SSD",
                "size": "1TB"
            }
        },
        "price": 198000,
        "tags": ["ゲーミング", "高性能", "軽量"]
    }'::jsonb
);
```

### データの検索

#### -> と ->> 演算子

```sql
-- -> はJSONオブジェクトを返す
SELECT profile -> 'age' FROM users;  -- 30 (jsonb型)

-- ->> はテキストを返す
SELECT profile ->> 'age' FROM users;  -- "30" (text型)

-- チェーンでアクセス
SELECT profile -> 'address' ->> 'city' FROM users;  -- "東京"

-- 条件付き検索
SELECT * FROM users WHERE profile ->> 'age' = '30';

-- テキスト比較（->> を使用）
SELECT * FROM users 
WHERE profile ->> 'email' LIKE '%@example.com';
```

#### #> と #>> 演算子（パス指定）

```sql
-- パスを配列で指定
SELECT profile #> '{address, city}' FROM users;  -- "東京" (jsonb型)
SELECT profile #>> '{address, city}' FROM users;  -- "東京" (text型)

-- 製品の深い階層へアクセス
SELECT attributes #>> '{specs, storage, type}' FROM products;
-- 結果: "SSD"
```

#### ? 演算子（キー/値の存在確認）

```sql
-- キーの存在確認
SELECT * FROM users WHERE profile ? 'email';

-- 配列内の値の存在確認
SELECT * FROM users WHERE profile -> 'skills' ? 'Ruby';

-- 複数のキーのいずれかが存在
SELECT * FROM users WHERE profile ?| ARRAY['age', 'birthday'];

-- 複数のキーがすべて存在
SELECT * FROM users WHERE profile ?& ARRAY['age', 'email'];
```

#### @> と <@ 演算子（包含関係）

```sql
-- JSONBが指定したJSONを含むか（@>）
SELECT * FROM users 
WHERE profile @> '{"address": {"city": "東京"}}'::jsonb;

-- 配列に特定の要素を含む
SELECT * FROM users 
WHERE profile -> 'skills' @> '["PostgreSQL"]'::jsonb;

-- 指定したJSONに含まれるか（<@）
SELECT * FROM users 
WHERE '{"age": 30}'::jsonb <@ profile;
```

### データの更新

```sql
-- 特定のキーの値を更新
UPDATE users 
SET profile = profile || '{"age": 31}'::jsonb
WHERE id = 1;

-- 入れ子の値を更新
UPDATE users 
SET profile = jsonb_set(
    profile, 
    '{address, city}', 
    '"大阪"'::jsonb
)
WHERE id = 1;

-- 配列に要素を追加
UPDATE users 
SET profile = jsonb_set(
    profile,
    '{skills}',
    (profile -> 'skills') || '["Python"]'::jsonb
)
WHERE id = 1;

-- キーを削除
UPDATE users 
SET profile = profile - 'email'
WHERE id = 1;

-- 複数のキーを削除
UPDATE users 
SET profile = profile - '{age, email}'::text[]
WHERE id = 1;
```

## 3. インデックスの作成と活用

JSONB型の最大の利点はGIN（Generalized Inverted Index）インデックスを作成できることです。これにより、JSONB内のデータに対して高速な検索が可能になります。

### GINインデックスの基本

```sql
-- profile列全体にGINインデックスを作成
CREATE INDEX idx_users_profile ON users USING GIN (profile);

-- 特定のキーに対してインデックスを作成
CREATE INDEX idx_users_skills 
ON users USING GIN ((profile -> 'skills'));

-- 複数のGINインデックス
CREATE INDEX idx_products_attributes 
ON products USING GIN (attributes);
```

### インデックスの活用例

```sql
-- GINインデックスが効くクエリ（@> 演算子）
EXPLAIN ANALYZE
SELECT * FROM users 
WHERE profile @> '{"age": 30}'::jsonb;
-- Bitmap Index Scan on idx_users_profile が使用される

-- GINインデックスが効くクエリ（? 演算子）
EXPLAIN ANALYZE
SELECT * FROM users WHERE profile ? 'email';
-- Index Only Scan または Bitmap Index Scan

-- GINインデックスが効かないクエリ（->> 演算子）
EXPLAIN ANALYZE
SELECT * FROM users WHERE profile ->> 'age' = '30';
-- Seq Scan（フルスキャン）
```

### パフォーマンス最適化

```sql
-- B-treeインデックス（特定のキーに対して等価検索が多い場合）
CREATE INDEX idx_users_age 
ON users ((profile ->> 'age'));

-- これにより以下のクエリが高速化される
SELECT * FROM users WHERE profile ->> 'age' = '30';

-- 複合インデックス
CREATE INDEX idx_products_price_brand 
ON products (((attributes ->> 'price')::int), ((attributes ->> 'brand')));
```

### JSONBパスインデックス（PostgreSQL 12+）

```sql
-- 特定のパスに対するインデックス
CREATE INDEX idx_users_city 
ON users USING GIN ((profile #> '{address, city}'));

-- 複数のパスを含むインデックス
CREATE INDEX idx_users_multi 
ON users USING GIN (profile jsonb_path_ops);
```

## 4. 実践的なユースケースとベストプラクティス

### ユースケース1：ユーザー設定の保存

```sql
-- 柔軟なユーザー設定テーブル
CREATE TABLE user_settings (
    user_id INT PRIMARY KEY,
    settings JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 通知設定、UI設定などをJSONBで管理
INSERT INTO user_settings (user_id, settings) VALUES (
    1,
    '{
        "notifications": {
            "email": true,
            "push": false,
            "frequency": "daily"
        },
        "ui": {
            "theme": "dark",
            "language": "ja",
            "sidebar_collapsed": false
        },
        "privacy": {
            "profile_visible": true,
            "activity_tracking": false
        }
    }'::jsonb
);

-- 設定の更新
UPDATE user_settings 
SET settings = jsonb_set(
    settings,
    '{ui, theme}',
    '"light"'::jsonb
),
updated_at = CURRENT_TIMESTAMP
WHERE user_id = 1;
```

### ユースケース2：製品カタログ

```sql
CREATE TABLE product_catalog (
    sku VARCHAR(50) PRIMARY KEY,
    base_info JSONB,
    variants JSONB[],  -- 配列として保存
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- バリアントを持つ製品
INSERT INTO product_catalog VALUES (
    'SHIRT-001',
    '{"name": "オーガニックTシャツ", "base_price": 2980}'::jsonb,
    ARRAY[
        '{"color": "white", "size": "S", "stock": 10}'::jsonb,
        '{"color": "white", "size": "M", "stock": 15}'::jsonb,
        '{"color": "black", "size": "M", "stock": 8}'::jsonb
    ]
);

-- バリアントの検索
SELECT * FROM product_catalog 
WHERE EXISTS (
    SELECT 1 FROM unnest(variants) v 
    WHERE v @> '{"color": "black"}'::jsonb
);
```

### ユースケース3：アクティビティログ

```sql
CREATE TABLE activity_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50),
    user_id INT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- パーティションテーブル作成
CREATE TABLE activity_logs_2024_01 
PARTITION OF activity_logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- イベントログの記録
INSERT INTO activity_logs (event_type, user_id, metadata) VALUES
('purchase', 1, '{"item_id": "PROD-123", "amount": 5000, "currency": "JPY"}'::jsonb),
('login', 1, '{"ip": "192.168.1.1", "device": "mobile", "location": "Tokyo"}'::jsonb),
('page_view', 1, '{"path": "/products/123", "referrer": "google"}'::jsonb);

-- アナリティクスクエリ
SELECT 
    event_type,
    COUNT(*),
    metadata ->> 'currency' as currency
FROM activity_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY event_type, metadata ->> 'currency';
```

### ベストプラクティス

1. **JSONBを優先する**
   - ほとんどのユースケースでJSONBが適切
   - インデックス作成が可能で検索が高速

2. **正規化とのバランス**
   ```sql
   -- 良い例：頻繁に検索するフィールドは別カラム化
   CREATE TABLE orders (
       id SERIAL PRIMARY KEY,
       user_id INT NOT NULL,  -- 正規化された外部キー
       status VARCHAR(20),     -- 頻繁に検索される
       details JSONB           -- その他の詳細情報
   );
   ```

3. **インデックス戦略**
   - よく検索するパスにGINインデックス
   - 範囲検索が必要な場合はB-treeインデックス
   - インデックスサイズを監視

4. **スキーマバリデーション**
   ```sql
   -- CHECK制約でJSON構造を検証
   CREATE TABLE validated_data (
       id SERIAL PRIMARY KEY,
       data JSONB,
       CONSTRAINT valid_schema CHECK (
           data ? 'required_field' AND
           jsonb_typeof(data -> 'count') = 'number'
       )
   );
   ```

5. **パフォーマンス考慮**
   - 巨大なJSONBはパフォーマンス低下の原因に
   - 頻繁にアクセスするフィールドは正規化を検討
   - 適切なパーティショニング

## 5. パフォーマンスの比較と選択の指針

### ベンチマーク例

```sql
-- テストデータ作成（10万行）
INSERT INTO users (name, profile)
SELECT 
    'user_' || i,
    jsonb_build_object(
        'age', (random() * 50 + 20)::int,
        'city', (ARRAY['東京', '大阪', '名古屋', '福岡'])[(random() * 4 + 1)::int],
        'score', (random() * 100)::int
    )
FROM generate_series(1, 100000) i;

-- インデックスなしでの検索時間
EXPLAIN ANALYZE
SELECT * FROM users 
WHERE profile @> '{"city": "東京"}'::jsonb;
-- Execution Time: ~150ms (Seq Scan)

-- GINインデックス作成後
CREATE INDEX idx_profile_gin ON users USING GIN (profile);

EXPLAIN ANALYZE
SELECT * FROM users 
WHERE profile @> '{"city": "東京"}'::jsonb;
-- Execution Time: ~2ms (Bitmap Index Scan)
```

### 選択の指針

| シナリオ | 推奨 | 理由 |
|---------|------|------|
| 検索が必要 | JSONB + GIN | 高速検索が可能 |
| 保存のみで検索不要 | JSON | 保存が最速 |
| 頻繁に更新 | JSONB | 部分更新が効率的 |
| 正確なJSON保存が必要 | JSON | 空白や順序を保持 |
| 複雑な集計クエリ | 正規化 | JSONBは集計が遅い |

### 注意点

1. **JSONBのサイズ制限**
   - 理論上は1GBまで保存可能
   - 実際には数MBを超えるとパフォーマンス低下

2. **インデックスサイズ**
   - GINインデックスは大きくなる傾向
   - 監視とメンテナンスが必要

3. **ロックの競合**
   - 大きなJSONBの更新は行ロック時間が長くなる
   - 頻繁に更新されるデータは分割を検討

## まとめ

PostgreSQLのJSON/JSONBデータ型は、リレーショナルデータベースの厳密性とスキーマレスの柔軟性を組み合わせた強力な機能です。JSONBの採用により、GINインデックスを活用した高速検索が可能になり、現代的なアプリケーション開発に最適です。

主なポイント：
- **JSONBを優先**：ほとんどのユースケースでJSONBが最適
- **インデックス活用**：GINインデックスで検索パフォーマンス向上
- **正規化とのバランス**：頻繁に検索するフィールドは別カラム化
- **スキーマ設計**：適切な制約とバリデーションでデータ品質を保持

PostgreSQLのJSONB機能を活用することで、柔軟で高性能なデータベース設計が実現できます。
