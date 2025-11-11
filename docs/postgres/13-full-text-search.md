---
title: 全文検索：pg_trgmとFTS
---

# 全文検索：pg_trgmとFTS

## 1. 全文検索とは

全文検索（Full-Text Search: FTS）は、テキストデータから特定の単語やフレーズを効率的に検索する機能です。PostgreSQLには、高度な全文検索機能が組み込まれており、検索エンジンのような機能を実装できます。

### LIKEとの違い

```sql
-- LIKE検索（遅い）
SELECT * FROM articles WHERE content LIKE '%PostgreSQL%';

-- 全文検索（高速）
SELECT * FROM articles WHERE to_tsvector('english', content) @@ to_tsquery('english', 'PostgreSQL');
```

LIKEはシーケンシャルスキャンが必要ですが、全文検索はインデックスを活用できます。

## 2. PostgreSQLの全文検索の基本

### tsvectorとtsquery

- **tsvector**: 検索対象のドキュメントを表現（正規化された単語のリスト）
- **tsquery**: 検索クエリを表現

```sql
-- tsvectorの作成
SELECT to_tsvector('english', 'PostgreSQL is a powerful database');
-- 結果: 'databas':5 'postgresql':1 'power':4

-- tsqueryの作成
SELECT to_tsquery('english', 'PostgreSQL & database');
-- 結果: 'postgresql' & 'databas'

-- マッチング
SELECT to_tsvector('english', 'PostgreSQL is a powerful database') 
       @@ to_tsquery('english', 'PostgreSQL & database');
-- 結果: true
```

## 3. 全文検索の実装

### テーブルの作成

```sql
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title TEXT,
    content TEXT,
    search_vector tsvector
);

-- サンプルデータの挿入
INSERT INTO articles (title, content) VALUES 
('Introduction to PostgreSQL', 'PostgreSQL is an advanced open-source database system.'),
('Database Performance', 'Optimizing database queries is crucial for performance.'),
('PostgreSQL Features', 'PostgreSQL supports JSON, full-text search, and more.');
```

### search_vectorカラムの更新

```sql
UPDATE articles 
SET search_vector = to_tsvector('english', title || ' ' || content);
```

### トリガーによる自動更新

```sql
CREATE FUNCTION articles_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_search_update 
BEFORE INSERT OR UPDATE ON articles
FOR EACH ROW EXECUTE FUNCTION articles_search_trigger();
```

## 4. 全文検索クエリ

### 基本検索

```sql
-- 単語検索
SELECT title FROM articles 
WHERE search_vector @@ to_tsquery('english', 'PostgreSQL');

-- AND検索
SELECT title FROM articles 
WHERE search_vector @@ to_tsquery('english', 'PostgreSQL & database');

-- OR検索
SELECT title FROM articles 
WHERE search_vector @@ to_tsquery('english', 'PostgreSQL | MySQL');

-- NOT検索
SELECT title FROM articles 
WHERE search_vector @@ to_tsquery('english', 'database & !performance');
```

### フレーズ検索

```sql
-- フレーズ検索（隣接する単語）
SELECT title FROM articles 
WHERE search_vector @@ phraseto_tsquery('english', 'open source database');
```

### ランキング

```sql
-- 関連性でランク付け
SELECT title, ts_rank(search_vector, query) AS rank
FROM articles, to_tsquery('english', 'PostgreSQL') query
WHERE search_vector @@ query
ORDER BY rank DESC;

-- カバー密度でランク付け
SELECT title, ts_rank_cd(search_vector, query) AS rank
FROM articles, to_tsquery('english', 'PostgreSQL & database') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

## 5. GINインデックス

全文検索のパフォーマンスを向上させるには、GINインデックスが不可欠です。

```sql
CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);
```

## 6. 日本語全文検索

PostgreSQLで日本語の全文検索を行うには、pg_bigmやpgroongaなどの拡張が必要です。ここではpg_trgm（トライグラム）を使った方法を紹介します。

### pg_trgm拡張のインストール

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### pg_trgmを使った検索

```sql
CREATE TABLE articles_jp (
    id SERIAL PRIMARY KEY,
    title TEXT,
    content TEXT
);

INSERT INTO articles_jp (title, content) VALUES 
('PostgreSQLの紹介', 'PostgreSQLは高機能なオープンソースデータベースです。'),
('データベースのパフォーマンス', 'クエリの最適化はパフォーマンスに重要です。'),
('PostgreSQLの機能', 'PostgreSQLはJSON、全文検索などをサポートしています。');

-- トライグラムインデックスの作成
CREATE INDEX idx_articles_jp_title_trgm ON articles_jp USING GIN (title gin_trgm_ops);
CREATE INDEX idx_articles_jp_content_trgm ON articles_jp USING GIN (content gin_trgm_ops);

-- 類似検索
SELECT title, similarity(title, 'PostgreSQL') AS sim
FROM articles_jp
WHERE title % 'PostgreSQL'
ORDER BY sim DESC;

-- LIKE検索の高速化
SELECT * FROM articles_jp WHERE content LIKE '%データベース%';
```

### トライグラムの類似度

```sql
-- similarity関数で類似度を計算（0〜1）
SELECT title, similarity(title, 'ポスグレ') AS sim
FROM articles_jp
WHERE similarity(title, 'ポスグレ') > 0.3
ORDER BY sim DESC;

-- word_similarity（部分マッチ）
SELECT title, word_similarity('データベース', content) AS sim
FROM articles_jp
ORDER BY sim DESC
LIMIT 5;
```

## 7. 複数言語のサポート

```sql
-- 複数言語用の設定
CREATE TABLE multilang_articles (
    id SERIAL PRIMARY KEY,
    lang VARCHAR(10),
    content TEXT,
    search_vector_en tsvector,
    search_vector_jp tsvector
);

-- 言語に応じた検索
UPDATE multilang_articles 
SET search_vector_en = to_tsvector('english', content)
WHERE lang = 'en';

-- 検索
SELECT * FROM multilang_articles 
WHERE lang = 'en' 
  AND search_vector_en @@ to_tsquery('english', 'database');
```

## 8. ハイライト表示

検索結果でマッチした部分をハイライトすることができます。

```sql
SELECT title,
       ts_headline('english', content, to_tsquery('english', 'PostgreSQL'), 
                   'StartSel=<b>, StopSel=</b>') AS highlighted
FROM articles
WHERE search_vector @@ to_tsquery('english', 'PostgreSQL');
```

## 9. パフォーマンスチューニング

### インデックスの選択

- **GIN（Generalized Inverted Index）**: 更新が少なく、検索が多い場合
- **GiST（Generalized Search Tree）**: 更新が頻繁な場合

```sql
-- GINインデックス（推奨）
CREATE INDEX idx_gin ON articles USING GIN(search_vector);

-- GiSTインデックス
CREATE INDEX idx_gist ON articles USING GiST(search_vector);
```

### 設定のチューニング

```sql
-- 最小単語長の設定
SET default_text_search_config = 'english';

-- ストップワードのカスタマイズ
-- pg_ts_config, pg_ts_dict テーブルで管理
```

## 10. まとめ

PostgreSQLの全文検索機能は、高度な検索機能を実装するための強力なツールです。

**主なポイント**:
- 英語にはFTS、日本語にはpg_trgmが有効
- GINインデックスでパフォーマンス向上
- ランキング機能で関連性の高い結果を表示
- トリガーで検索ベクターを自動更新

外部の検索エンジンを導入する前に、PostgreSQLの全文検索機能を検討する価値があります。
