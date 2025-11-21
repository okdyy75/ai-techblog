---
title: JSON/JSONBデータ型の徹底活用
---

# JSON/JSONBデータ型の徹底活用

## 1. JSON vs JSONB

PostgreSQLには、JSONデータを扱うための2つのデータ型があります。

### JSON型
- テキストとしてそのまま保存
- 入力データを保持（空白、フィールドの順序など）
- 処理が遅い（毎回パース必要）

### JSONB型（推奨）
- バイナリ形式で保存
- より高速な処理
- インデックスをサポート
- 空白やフィールドの順序は保持されない

**ほとんどのケースでJSONBを使用することを推奨します。**

## 2. JSON/JSONBデータの挿入

### テーブルの作成

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    metadata JSONB
);
```

### データの挿入

```sql
INSERT INTO products (name, metadata) VALUES 
('Laptop', '{"brand": "Dell", "cpu": "Intel i7", "ram": "16GB", "price": 1200}'),
('Smartphone', '{"brand": "Samsung", "model": "Galaxy S21", "storage": "128GB", "price": 800}'),
('Tablet', '{"brand": "Apple", "model": "iPad Pro", "storage": "256GB", "price": 1100}');
```

## 3. JSONBデータのクエリ

### 演算子

| 演算子 | 説明 | 例 |
|--------|------|-----|
| `->` | JSONオブジェクトから値を取得（JSON型として） | `metadata->'brand'` |
| `->>` | JSONオブジェクトから値を取得（テキスト型として） | `metadata->>'brand'` |
| `#>` | 指定されたパスから値を取得（JSON型） | `metadata#>'{specs,cpu}'` |
| `#>>` | 指定されたパスから値を取得（テキスト型） | `metadata#>>'{specs,cpu}'` |
| `@>` | 左側のJSONが右側のJSONを含むか | `metadata @> '{"brand":"Dell"}'` |
| `<@` | 左側のJSONが右側のJSONに含まれるか | `'{"brand":"Dell"}' <@ metadata` |
| `?` | キーが存在するか | `metadata ? 'brand'` |
| `?|` | いずれかのキーが存在するか | `metadata ?| array['brand','model']` |
| `?&` | すべてのキーが存在するか | `metadata ?& array['brand','price']` |

### 基本的なクエリ

```sql
-- 特定のブランドの製品を取得
SELECT * FROM products WHERE metadata->>'brand' = 'Dell';

-- 価格が1000以上の製品を取得
SELECT name, metadata->>'price' AS price 
FROM products 
WHERE (metadata->>'price')::integer >= 1000;

-- メタデータに特定のキーを持つ製品を検索
SELECT * FROM products WHERE metadata ? 'model';

-- 複数条件の検索
SELECT * FROM products 
WHERE metadata @> '{"brand": "Apple"}';
```

## 4. JSONBデータの更新

### 値の更新

```sql
-- jsonb_set関数を使用
UPDATE products 
SET metadata = jsonb_set(metadata, '{price}', '1300')
WHERE name = 'Laptop';

-- 新しいキーを追加
UPDATE products 
SET metadata = metadata || '{"warranty": "2 years"}'
WHERE name = 'Laptop';
```

### キーの削除

```sql
UPDATE products 
SET metadata = metadata - 'warranty'
WHERE name = 'Laptop';
```

## 5. JSONBインデックス

### GINインデックス

JSONBデータに対してGINインデックスを作成することで、検索パフォーマンスを大幅に向上させることができます。

```sql
-- デフォルトのGINインデックス
CREATE INDEX idx_products_metadata ON products USING GIN (metadata);

-- 特定のパス用のインデックス
CREATE INDEX idx_products_brand ON products ((metadata->>'brand'));

-- 複数キー用のインデックス
CREATE INDEX idx_products_metadata_path ON products USING GIN (metadata jsonb_path_ops);
```

## 6. JSONB関数

### よく使う関数

```sql
-- jsonb_array_elements: JSON配列を展開
SELECT jsonb_array_elements('["apple", "banana", "orange"]'::jsonb);

-- jsonb_object_keys: オブジェクトのキーを取得
SELECT jsonb_object_keys('{"name": "John", "age": 30}'::jsonb);

-- jsonb_each: キーと値のペアを取得
SELECT * FROM jsonb_each('{"name": "John", "age": 30}'::jsonb);

-- jsonb_build_object: オブジェクトを構築
SELECT jsonb_build_object('name', 'John', 'age', 30);

-- jsonb_agg: 行をJSON配列に集約
SELECT jsonb_agg(name) FROM products;
```

## 7. 実践例：ネストしたJSONデータ

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    profile JSONB
);

INSERT INTO users (name, profile) VALUES 
('John', '{
    "email": "john@example.com",
    "address": {
        "city": "Tokyo",
        "zip": "100-0001"
    },
    "skills": ["Python", "PostgreSQL", "Docker"]
}');

-- ネストした値へのアクセス
SELECT name, profile#>>'{address,city}' AS city FROM users;

-- 配列要素の検索
SELECT * FROM users WHERE profile->'skills' ? 'PostgreSQL';

-- 配列を展開
SELECT name, jsonb_array_elements_text(profile->'skills') AS skill 
FROM users;
```

## 8. パフォーマンスのベストプラクティス

1. **JSONB型を使用する**: 特別な理由がない限り、JSONBを選択
2. **適切なインデックスを作成**: よく検索するキーにはインデックスを設定
3. **型変換を最小限に**: `->`でJSON型、`->>`でテキスト型として取得
4. **正規化を検討**: 頻繁にクエリするデータは通常のカラムに分離することも検討

## 9. まとめ

PostgreSQLのJSON/JSONBサポートにより、リレーショナルデータベースの堅牢性と柔軟なドキュメント指向データモデルを組み合わせることができます。適切に使用することで、スキーマレスなデータの保存と高速なクエリの両立が可能になります。
