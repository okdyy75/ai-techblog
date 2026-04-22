# PostgreSQLのJSON/JSONBデータ型徹底解説：構造から実践活用まで

## はじめに

現代のアプリケーション開発において、データ構造の柔軟性はますます重要になっています。従来のリレーショナルデータベースは厳格なスキーマを要求しますが、実世界のデータは常に変化し、階層構造を持つことが多いです。PostgreSQLはバージョン9.2からJSONデータ型を、9.4からはバイナリ形式のJSONBを導入し、この課題に応えました。

JSON/JSONBデータ型を活用することで、スキーマレスなデータ構造をリレーショナルデータベース内で管理でき、ドキュメント指向データベースとSQLの強みを組み合わせたハイブリッドアプローチが可能になります。本記事では、PostgreSQLのJSON/JSONBデータ型の基本から実践的な活用方法までを解説します。

## JSONとJSONBの違い

PostgreSQLには2つのJSON関連データ型が存在します：

### JSON型

- **テキスト形式**でそのまま保存
- 入力時のフォーマット（空白やキーの順序）を保持
- 保存時に構文検証のみ実行（無効なJSONは拒否）
- 処理時に毎回パースが必要

### JSONB型（推奨）

- **バイナリ形式**で保存
- 空白や重複キーを除去し、キーをソートして保存
- インデックス作成が可能（GINインデックス）
- 処理速度が速い（事前にパース済み）

### 使い分け

| 用途 | 推奨タイプ |
|------|-----------|
| 検索・更新が頻繁 | JSONB |
| データの正確な保存が必要 | JSON |
| インデックスが必要 | JSONB |
| 軽量な読み取り専用 | JSONでも可 |

**原則としてJSONBを使用し、特殊な理由がない限りJSON型は避ける**のがベストプラクティスです。

## 基本的な使い方

### テーブルの作成

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    profile JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### データのINSERT

```sql
-- シンプルなJSONBデータの挿入
INSERT INTO users (name, profile) VALUES (
    '山田太郎',
    '{
        "age": 30,
        "city": "東京",
        "hobbies": ["読書", "旅行", "プログラミング"],
        "social": {
            "twitter": "@yamada",
            "github": "yamada-dev"
        }
    }'
);

-- 別のレコード
INSERT INTO users (name, profile) VALUES (
    '鈴木花子',
    '{"age": 25, "city": "大阪", "hobbies": ["料理", "ヨガ"]}'
);
```

## データの検索と抽出

PostgreSQLはJSONBデータの操作に専用の演算子を提供しています。

### 主要な演算子

| 演算子 | 説明 | 例 |
|--------|------|-----|
| `->` | キーで検索しJSONを返す | `profile->'age'` |
| `->>` | キーで検索しテキストを返す | `profile->>'age'` |
| `#>` | パスで検索しJSONを返す | `profile#>'{social,twitter}'` |
| `#>>` | パスで検索しテキストを返す | `profile#>>'{social,twitter}'` |

### 実践例

```sql
-- 年齢を抽出（テキストとして返る）
SELECT name, profile->>'age' AS age FROM users;

-- 年齢を数値として比較（テキスト→整数変換が必要）
SELECT name FROM users WHERE (profile->>'age')::int > 25;

-- ネストされたデータの抽出
SELECT name, profile#>>'{social,twitter}' AS twitter FROM users;

-- 配列要素へのアクセス
SELECT name, profile->'hobbies'->>0 AS first_hobby FROM users;
```

### 包含演算子（ containment operators）

JSONBの強力な機能として、包含関係のチェックがあります：

```sql
-- 特定のキー・値の組み合わせを含むレコードを検索
SELECT * FROM users WHERE profile @> '{"city": "東京"}';

-- 配列に特定の要素が含まれるかチェック
SELECT * FROM users WHERE profile->'hobbies' @> '["読書"]';

-- キーの存在確認
SELECT * FROM users WHERE profile ? 'social';

-- 複数キーのいずれかが存在するか
SELECT * FROM users WHERE profile ?| array['social', 'settings'];
```

## データの更新

JSONBデータの更新は柔軟に行えます。

### 完全な置き換え

```sql
UPDATE users 
SET profile = '{"age": 31, "city": "横浜", "hobbies": ["読書", "筋トレ"]}'
WHERE name = '山田太郎';
```

### 部分更新（jsonb_set関数）

```sql
-- 特定のキーの値を更新
UPDATE users 
SET profile = jsonb_set(profile, '{age}', '31')
WHERE name = '山田太郎';

-- ネストされた値を更新
UPDATE users 
SET profile = jsonb_set(profile, '{social,github}', '"yamada-updated"')
WHERE name = '山田太郎';

-- 配列要素の更新
UPDATE users 
SET profile = jsonb_set(profile, '{hobbies,1}', '"ガーデニング"')
WHERE name = '山田太郎';
```

### キーの追加と削除

```sql
-- 新しいキーを追加（存在しないパスを指定）
UPDATE users 
SET profile = jsonb_set(profile, '{job}', '"エンジニア"')
WHERE name = '山田太郎';

-- キーを削除（-演算子）
UPDATE users 
SET profile = profile - 'job'
WHERE name = '山田太郎';

-- 複数キーの削除
UPDATE users 
SET profile = profile - 'job' - 'temp_field'
WHERE name = '山田太郎';

-- ネストされたキーの削除
UPDATE users 
SET profile = profile #- '{social,twitter}'
WHERE name = '山田太郎';
```

### 配列操作

```sql
-- 配列に要素を追加
UPDATE users 
SET profile = jsonb_set(
    profile, 
    '{hobbies}', 
    (profile->'hobbies') || '["映画鑑賞"]'
)
WHERE name = '山田太郎';

-- 配列から要素を削除（特定値）
UPDATE users 
SET profile = jsonb_set(
    profile,
    '{hobbies}',
    (profile->'hobbies') - '読書'
)
WHERE name = '山田太郎';
```

## インデックスの活用

JSONBデータに対して効率的に検索するためには、GIN（Generalized Inverted Index）インデックスが不可欠です。

### GINインデックスの作成

```sql
-- デフォルトのGINインデックス
CREATE INDEX idx_users_profile ON users USING GIN (profile);

-- 特定のキーに対するインデックス
CREATE INDEX idx_users_profile_city ON users USING GIN ((profile->'city'));

-- パスに対するインデックス
CREATE INDEX idx_users_social_github 
ON users USING GIN ((profile#>'{social,github}'));
```

### インデックスを使った高速検索

```sql
-- GINインデックスが効くクエリ
SELECT * FROM users WHERE profile @> '{"city": "東京"}';

-- 存在確認演算子もインデックスを使用
SELECT * FROM users WHERE profile ? 'social';

-- jsonb_path_ops演算子クラス（より高速だが演算子が制限される）
CREATE INDEX idx_users_profile_path_ops 
ON users USING GIN (profile jsonb_path_ops);
```

### インデックス戦略

| 演算子クラス | 対応演算子 | 用途 |
|-------------|-----------|------|
| `jsonb_ops`（デフォルト） | `@>`, `?`, `?&`, `?\|` | 汎用的 |
| `jsonb_path_ops` | `@>` のみ | 包含検索のみ、高速・小容量 |

## 実践パターン

### ドキュメントストアとしての活用

```sql
-- イベントログテーブル
CREATE TABLE event_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50),
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_event_logs_type ON event_logs(event_type);
CREATE INDEX idx_event_logs_payload ON event_logs USING GIN (payload);
CREATE INDEX idx_event_logs_created_at ON event_logs(created_at);

-- 柔軟なイベントデータの保存
INSERT INTO event_logs (event_type, payload) VALUES
('user_signup', '{"user_id": 123, "referral": "twitter", "plan": "pro"}'),
('purchase', '{"order_id": "ORD-001", "amount": 15000, "items": [{"sku": "A001", "qty": 2}]}'),
('page_view', '{"url": "/products", "referrer": "google", "device": "mobile"}');
```

### スキーマレス設計とのハイブリッド

```sql
-- 製品テーブル（共通フィールド + カテゴリ固有の属性）
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    -- カテゴリ固有の属性をJSONBで管理
    attributes JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_attributes ON products USING GIN (attributes);

-- 電子製品（色、保証期間）
INSERT INTO products (sku, name, price, category, attributes) VALUES
('ELEC-001', 'ワイヤレスイヤホン', 15000, 'electronics', 
 '{"color": "ブラック", "warranty_months": 12, "bluetooth_version": "5.2"}');

-- 書籍（著者、ページ数、ISBN）
INSERT INTO products (sku, name, price, category, attributes) VALUES
('BOOK-001', 'PostgreSQL徹底入門', 3500, 'books',
 '{"author": "山田太郎", "pages": 450, "isbn": "978-4-xxx-xxxx"}');

-- カテゴリ固有の検索
SELECT * FROM products 
WHERE category = 'electronics' 
  AND attributes @> '{"color": "ブラック"}';
```

## パフォーマンスと注意点

### JSONBの圧縮とストレージ

JSONBはTOAST（The Oversized-Attribute Storage Technique）を使用して大きな値を圧縮・分割保存します：

```sql
-- JSONBデータのサイズを確認
SELECT 
    name,
    pg_column_size(profile) AS raw_size,
    pg_column_size(profile::text) AS text_size
FROM users;
```

### パフォーマンス最適化のヒント

1. **適切なインデックス設計**
   - 頻繁に検索するキーにはGINインデックスを
   - 特定のキーに対するB-treeインデックスも検討

2. **巨大なJSONBを避ける**
   - 1行あたり数MB以上のJSONBはパフォーマンス低下の原因に
   - 頻繁にアクセスする部分とアーカイブ部分を分離

3. **正規化とのバランス**
   ```sql
   -- 悪い例：すべてをJSONBに
   CREATE TABLE bad_example (
       id SERIAL PRIMARY KEY,
       data JSONB  -- すべてここに...
   );

   -- 良い例：適切な分離
   CREATE TABLE good_example (
       id SERIAL PRIMARY KEY,
       user_id INTEGER REFERENCES users(id),  -- 外部キーは正規化
       status VARCHAR(20),                     -- よく検索する列は独立
       metadata JSONB                         -- 可変部分のみJSONB
   );
   ```

### よくある落とし穴

```sql
-- 落とし穴1: テキストとしての比較（遅い）
SELECT * FROM users WHERE profile->>'age' = '30';  -- 文字列比較

-- 改善: 数値に変換
SELECT * FROM users WHERE (profile->>'age')::int = 30;

-- 落とし穴2: ネストされた検索でインデックスが効かない
SELECT * FROM users WHERE profile->'social'->>'twitter' = '@yamada';

-- 改善: 包含演算子を使用
SELECT * FROM users WHERE profile @> '{"social": {"twitter": "@yamada"}}';
```

## まとめ

PostgreSQLのJSON/JSONBデータ型は、リレーショナルデータベースの厳格さとドキュメントデータベースの柔軟性を組み合わせる強力なツールです。

**主要なポイント：**

- **JSONBを優先して使用** - ほとんどのユースケースでJSONBが適切
- **GINインデックスは必須** - 検索性能を確保するために必ず作成
- **適切な正規化** - すべてをJSONBにするのではなく、関係性を持つデータは正規化
- **演算子を理解する** - `->`, `->>`, `@>`, `?` などの演算子を使い分ける

JSONBを適切に活用することで、変化する要件に柔軟に対応しながら、SQLの強力なクエリ機能と整合性を保つアプリケーションを構築できます。
