# PostgreSQL JSON/JSONBデータ型徹底活用ガイド

## はじめに

近年、アプリケーションのデータ構造はますます複雑化し、柔軟性が求められています。従来のリレーショナルデータベースでは、厳格なスキーマ定義が必要でしたが、PostgreSQLのJSON/JSONBデータ型を使うことで、スキーマレスなデータ構造とリレーショナルモデルの強みを組み合わせることができます。

本記事では、PostgreSQLのJSON/JSONBデータ型の使い方から、パフォーマンス最適化までを実践的に解説します。

### JSON/JSONBとは

PostgreSQLには2つのJSONデータ型があります：

- **JSON**: テキスト形式でJSONデータを保存（入力値をそのまま保存）
- **JSONB**: バイナリ形式でJSONデータを保存（分解・インデックス化が可能）

一般的には**JSONB**の使用が推奨されます。

---

## JSONとJSONBの違い

| 特性 | JSON | JSONB |
|------|------|-------|
| ストレージ形式 | テキスト（そのまま） | バイナリ（分解済み） |
| 保存速度 | 速い | やや遅い（変換処理あり） |
| クエリ速度 | 遅い | 速い（インデックス可能） |
| 重複キー | 許可 | 最後の値が有効 |
| キーの順序 | 保持される | ソートされ再構成される |
| 空白 | 保持される | 削除される |
| インデックス | 不可 | GINインデックスで可能 |

### パフォーマンス比較

```sql
-- JSON型：毎回パースが必要
SELECT data->>'name' FROM users_json WHERE data::json->>'age' = '25';

-- JSONB型：事前にバイナリ化されている
SELECT data->>'name' FROM users_jsonb WHERE data->>'age' = '25';
```

JSONBはクエリ時にパース不要のため、大量データの検索で大きな差が出ます。

---

## 基本的な使い方

### テーブルの作成

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    attributes JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### データの挿入

```sql
-- 単純なJSONBデータの挿入
INSERT INTO products (name, attributes) VALUES (
    'MacBook Pro',
    '{"color": "space_gray", "storage": "512GB", "memory": "16GB"}'
);

-- オブジェクトをネスト
INSERT INTO products (name, attributes) VALUES (
    'iPhone 15',
    '{
        "color": "blue",
        "specs": {
            "screen": "6.1inch",
            "chip": "A16",
            "camera": {
                "main": "48MP",
                "ultra": "12MP"
            }
        },
        "features": ["5G", "FaceID", "MagSafe"]
    }'
);
```

### データのSELECT

```sql
-- 特定キーの値を取得（JSONB型として返す）
SELECT attributes->'color' FROM products;
-- 結果: "space_gray" (JSONB型)

-- テキストとして取得
SELECT attributes->>'color' FROM products;
-- 結果: space_gray (TEXT型)

-- ネストされた値を取得
SELECT attributes->'specs'->>'screen' FROM products WHERE name = 'iPhone 15';
-- 結果: 6.1inch

-- パス演算子を使用（より簡潔）
SELECT attributes#>'{specs, camera, main}' FROM products;
-- 結果: "48MP"

SELECT attributes#>>'{specs, camera, main}' FROM products;
-- 結果: 48MP (TEXT型)
```

### データの更新

```sql
-- 特定のキーを更新
UPDATE products 
SET attributes = attributes || '{"color": "silver"}'::jsonb
WHERE name = 'MacBook Pro';

-- ネストされた値を更新
UPDATE products
SET attributes = jsonb_set(
    attributes,
    '{specs, storage}',
    '"1TB"'
)
WHERE name = 'iPhone 15';

-- 配列に要素を追加
UPDATE products
SET attributes = jsonb_set(
    attributes,
    '{features}',
    (attributes->'features') || '["Wireless Charging"]'
)
WHERE name = 'iPhone 15';

-- キーを削除
UPDATE products
SET attributes = attributes - 'color'
WHERE name = 'MacBook Pro';
```

### データの削除

```sql
-- 条件付きで行を削除
DELETE FROM products WHERE attributes->>'color' = 'blue';

-- 特定のキーを削除（UPDATEで）
UPDATE products SET attributes = attributes - 'obsolete_key';
```

---

## クエリと演算子

### 主要な演算子一覧

| 演算子 | 説明 | 例 |
|--------|------|-----|
| `->` | JSONBオブジェクトのキー取得（JSONB型） | `'{"a":1}'::jsonb->'a'` → `1` |
| `->>` | JSONBオブジェクトのキー取得（TEXT型） | `'{"a":1}'::jsonb->>'a'` → `1` |
| `#>` | パス指定で取得（JSONB型） | `'{"a":{"b":2}}'::jsonb#>'{a,b}'` → `2` |
| `#>>` | パス指定で取得（TEXT型） | `'{"a":{"b":2}}'::jsonb#>>'{a,b}'` → `2` |
| `@>` | 包含演算子（左辺が右辺を含む） | `'{"a":1}'::jsonb @> '{"a":1}'` → `true` |
| `<@` | 包含演算子（右辺が左辺を含む） | 同上、逆方向 |
| `?` | キー/配列要素の存在確認 | `'{"a":1}'::jsonb ? 'a'` → `true` |
| `?|` | いずれかのキーが存在するか | `'{"a":1}'::jsonb ?| array['a','b']` → `true` |
| `?&` | すべてのキーが存在するか | `'{"a":1,"b":2}'::jsonb ?& array['a','b']` → `true` |
| `\|\|` | JSONB同士を結合 | `'{"a":1}'::jsonb \|\| '{"b":2}'::jsonb` |

### 実践的なクエリ例

```sql
-- 特定のキーが存在する行を検索
SELECT * FROM products WHERE attributes ? 'color';

-- 特定の値を持つ行を検索（文字列）
SELECT * FROM products WHERE attributes->>'color' = 'blue';

-- 数値の比較
SELECT * FROM products 
WHERE (attributes->>'price')::numeric < 1000;

-- 配列に特定の要素が含まれるか
SELECT * FROM products 
WHERE attributes->'features' ? '5G';

-- 包含演算子で部分一致検索
SELECT * FROM products 
WHERE attributes @> '{"specs": {"chip": "A16"}}';

-- 複合条件
SELECT * FROM products 
WHERE attributes->>'color' = 'blue'
  AND (attributes->'features') ? 'FaceID'
  AND attributes @> '{"specs": {"screen": "6.1inch"}}';
```

---

## インデックス戦略

JSONBの真価を発揮するのは、GIN（Generalized Inverted Index）インデックスとの組み合わせです。

### GINインデックスの作成

```sql
-- 基本的なGINインデックス（全キー対象）
CREATE INDEX idx_products_attributes ON products USING GIN (attributes);

-- 特定のキーに対するインデックス
CREATE INDEX idx_products_color ON products USING GIN ((attributes->'color'));

-- 複数の式に対するインデックス
CREATE INDEX idx_products_specs ON products USING GIN (
    (attributes->'specs')
);
```

### インデックスの使い分け

```sql
-- GINインデックスが効くクエリ
SELECT * FROM products WHERE attributes @> '{"color": "blue"}';
SELECT * FROM products WHERE attributes ? 'features';

-- B-treeインデックスが効くクエリ（特定キーに対して）
CREATE INDEX idx_products_color_text ON products ((attributes->>'color'));

SELECT * FROM products WHERE attributes->>'color' = 'blue';
```

### パフォーマンス最適化のポイント

1. **クエリパターンに合わせたインデックス設計**
   - `@>` や `?` 演算子にはGINインデックス
   - 特定キーの等値検索にはB-treeインデックス（式インデックス）

2. **インデックスサイズの考慮**
   ```sql
   -- インデックスサイズを確認
   SELECT pg_size_pretty(pg_relation_size('idx_products_attributes'));
   ```

3. **部分インデックスの活用**
   ```sql
   -- 頻繁に検索される特定の構造のみインデックス
   CREATE INDEX idx_products_electronics ON products USING GIN (attributes)
   WHERE category = 'electronics';
   ```

---

## 実践的なユースケース

### 1. 設定管理システム

```sql
CREATE TABLE app_settings (
    id SERIAL PRIMARY KEY,
    app_name VARCHAR(100) UNIQUE NOT NULL,
    config JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 柔軟な設定の保存
INSERT INTO app_settings (app_name, config) VALUES (
    'payment_gateway',
    '{
        "api_key": "sk_live_...",
        "webhook_secret": "whsec_...",
        "features": {
            "stripe_connect": true,
            "subscriptions": true,
            "apple_pay": false
        },
        "retry_policy": {
            "max_attempts": 3,
            "backoff_multiplier": 2
        }
    }'
);

-- 特定の設定を取得
SELECT config#>'{features, stripe_connect}' FROM app_settings WHERE app_name = 'payment_gateway';
```

### 2. ログデータの保存と分析

```sql
CREATE TABLE application_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(20),
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ログの挿入
INSERT INTO application_logs (level, message, metadata) VALUES (
    'ERROR',
    'Database connection failed',
    '{
        "user_id": 12345,
        "request_id": "req-abc-123",
        "endpoint": "/api/v1/users",
        "error_code": "DB_CONN_001",
        "stack_trace": ["line 45", "line 120"]
    }'
);

-- 特定エラーコードで集計
SELECT 
    metadata->>'error_code' as error_code,
    COUNT(*) as count
FROM application_logs
WHERE level = 'ERROR'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY metadata->>'error_code';
```

### 3. 柔軟な製品カタログ

```sql
CREATE TABLE catalog_items (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    base_price DECIMAL(10,2),
    variations JSONB, -- 色、サイズなどのバリエーション
    specifications JSONB -- カテゴリ固有の仕様
);

-- 衣類の場合
INSERT INTO catalog_items (sku, name, base_price, variations, specifications) VALUES (
    'SHIRT-001',
    'Premium Cotton T-Shirt',
    29.99,
    '{
        "sizes": ["S", "M", "L", "XL"],
        "colors": ["white", "black", "navy", "gray"],
        "price_adjustments": {
            "XL": 2.00
        }
    }',
    '{
        "material": "100% Cotton",
        "care_instructions": ["Machine wash cold", "Tumble dry low"],
        "origin": "Made in Japan"
    }'
);

-- 電子機器の場合
INSERT INTO catalog_items (sku, name, base_price, variations, specifications) VALUES (
    'PHONE-001',
    'SmartPhone X',
    999.99,
    '{
        "storage_options": ["128GB", "256GB", "512GB"],
        "storage_prices": {"128GB": 0, "256GB": 100, "512GB": 300},
        "colors": ["silver", "black", "gold"]
    }',
    '{
        "display": "6.1 inch OLED",
        "processor": "A16 Bionic",
        "camera": {"main": "48MP", "front": "12MP"},
        "battery_life": "20 hours",
        "water_resistance": "IP68"
    }'
);

-- 特定仕様を持つ商品を検索
SELECT * FROM catalog_items 
WHERE specifications @> '{"water_resistance": "IP68"}';
```

---

## ベストプラクティスと注意点

### ✅ 推奨事項

1. **基本的にJSONBを使用する**
   ```sql
   -- Good
   attributes JSONB
   
   -- Bad（JSONは特殊な用途のみ）
   attributes JSON
   ```

2. **頻繁に検索・絞り込みするキーは正規化を検討**
   ```sql
   -- 頻繁に検索するなら専用カラムを検討
   CREATE TABLE products (
       id SERIAL PRIMARY KEY,
       color VARCHAR(50),  -- 頻繁に検索するなら専用カラム
       attributes JSONB    -- その他の柔軟な属性
   );
   ```

3. **インデックスはクエリパターンに合わせて作成**
   - `@>` や `?` 演算子 → GINインデックス
   - `->>` での等値検索 → B-tree式インデックス

4. **データ整合性の確保**
   ```sql
   -- CHECK制約でJSONの構造を制限
   CREATE TABLE products (
       id SERIAL PRIMARY KEY,
       attributes JSONB,
       CONSTRAINT valid_attributes CHECK (
           attributes ? 'name' AND 
           attributes ? 'price'
       )
   );
   ```

5. **大きなJSONB値は別テーブルへ**
   ```sql
   -- メインテーブルは軽く保つ
   CREATE TABLE products (
       id SERIAL PRIMARY KEY,
       name VARCHAR(255),
       summary JSONB  -- 小さく制限
   );
   
   CREATE TABLE product_details (
       product_id INTEGER REFERENCES products(id),
       full_data JSONB  -- 大きな詳細データ
   );
   ```

### ⚠️ 注意事項

1. **インデックスサイズ**
   - GINインデックスは大きくなる傾向がある
   - 頻繁に更新される列へのGINインデックスは書き込みパフォーマンスに影響

2. **統計情報**
   - JSONB内の値に対する統計は限定的
   - 複雑な条件での実行計画が最適化されない場合がある

3. **NULLとJSON nullの区別**
   ```sql
   -- NULL（行が存在しない）
   SELECT NULL::jsonb IS NULL;  -- true
   
   -- JSON null（値がnull）
   SELECT 'null'::jsonb IS NULL;  -- false
   SELECT 'null'::jsonb = 'null'::jsonb;  -- true
   ```

4. **キーの重複**
   ```sql
   -- JSONBでは最後の値が有効
   SELECT '{"a": 1, "a": 2}'::jsonb;  -- {"a": 2}
   ```

---

## まとめ

PostgreSQLのJSON/JSONBデータ型は、リレーショナルデータベースの厳格さとNoSQLの柔軟性を組み合わせる強力な機能です。

### 主なポイント

1. **JSONBを基本選択肢に** - ほとんどのユースケースでJSONBが最適
2. **GINインデックスで高速化** - 検索パフォーマンスを確保
3. **適切な設計が重要** - 正規化とJSONBのバランスを取る
4. **演算子をマスターする** - `@>`, `?`, `->>`, `#>>`など

### ユースケース別の推奨

| ユースケース | 推奨アプローチ |
|-------------|---------------|
| 設定・メタデータ | JSONB + GINインデックス |
| ログデータ | JSONB + パーティショニング |
| 製品カタログ | JSONB（頻繁に検索する属性は正規化も検討） |
| 半構造化データ | JSONB（スキーマの頻繁な変更がある場合） |

PostgreSQLのJSONBは、適切に使えばアプリケーションの開発速度とデータの柔軟性を大きく向上させることができます。プロジェクトの要件に合わせて、ぜひ活用してください。
