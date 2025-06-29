# Active Recordクエリの高速化: `joins`, `preload`, `includes`, `eager_load` の違いと使い分け

## はじめに

Ruby on RailsのActive Recordは、データベースとのやり取りを抽象化してくれる非常に強力なORMです。しかし、その便利さの裏で、非効率なクエリを意図せず発行してしまうことがあります。特に、アソシエーション（関連）を持つモデルを扱う際にパフォーマンスを大きく左右するのが、`joins`, `preload`, `includes`, `eager_load`といったメソッドの使い分けです。

これらのメソッドは似ているようで、内部的な動作や得意なシナリオが異なります。この記事では、それぞれのメソッドがどのようなSQLクエリを発行し、どのような場合に使うべきなのかを徹底的に比較・解説します。

### 前提となるモデル

以下の様な、User（投稿者）とArticle（記事）の1対多の関係を例に進めます。

```ruby
class User < ApplicationRecord
  has_many :articles
end

class Article < ApplicationRecord
  belongs_to :user
end
```

## 1. `joins`: 関連テーブルでの絞り込み

`joins`は、SQLの`INNER JOIN`句を生成します。その主な目的は、**関連テーブルの条件を使って、メインのモデルを絞り込むこと**です。

```ruby
# アクティブなユーザーが投稿した記事だけを取得
Article.joins(:user).where(users: { active: true })
```

### 発行されるSQL

```sql
SELECT
  "articles".*
FROM
  "articles"
INNER JOIN
  "users" ON "users"."id" = "articles"."user_id"
WHERE
  "users"."active" = TRUE
```

### `joins`の重要な注意点

`joins`は、デフォルトでは関連先のモデルのデータ（この場合は`users`テーブルのデータ）をメモリにロードしません。`SELECT "articles".*`となっている通り、`articles`テーブルのカラムしか取得しません。

そのため、`joins`で取得した結果に対して以下のように関連モデルにアクセスすると、**N+1問題が発生します**。

```ruby
articles = Article.joins(:user).where(users: { active: true })

articles.each do |article|
  puts article.user.name # ここでN+1クエリが発生！
end
```

`joins`はあくまで絞り込みのためのメソッドであり、関連データを効率的に読み込むためのものではない、と理解することが重要です。

## 2. Eager Loading（事前読み込み）御三家

N+1問題を解決するために使われるのがEager Loadingです。`preload`, `eager_load`, そして両者の挙動を賢く使い分ける`includes`の3つがあります。

### `preload`: 個別のクエリで事前読み込み

`preload`は、メインのモデルを取得するクエリと、関連モデルを取得するクエリの**2つのクエリを個別に発行**します。

```ruby
Article.preload(:user).all
```

### 発行されるSQL

```sql
-- 1. まず記事を取得
SELECT "articles".* FROM "articles"

-- 2. 次に、取得した記事のuser_idを使って、ユーザーをまとめて取得
SELECT "users".* FROM "users" WHERE "users"."id" IN (1, 2, 5, ...) -- (記事のuser_idのリスト)
```

`preload`は、関連テーブルのカラムを`where`句などで使わない場合に、シンプルで効率的なクエリを発行します。

### `eager_load`: `LEFT OUTER JOIN`で事前読み込み

`eager_load`は、`LEFT OUTER JOIN`を使って、**1つの巨大なクエリ**でメインのモデルと関連モデルのデータを一度に取得します。

```ruby
Article.eager_load(:user).all
```

### 発行されるSQL

```sql
SELECT
  "articles"."id" AS t0_r0, ... , "articles"."updated_at" AS t0_r3,
  "users"."id" AS t1_r0, ... , "users"."updated_at" AS t1_r2
FROM
  "articles"
LEFT OUTER JOIN
  "users" ON "users"."id" = "articles"."user_id"
```

`eager_load`の最大のメリットは、**関連テーブルのカラムで絞り込み（`where`）を行いつつ、N+1問題を回避できる**ことです。

```ruby
# アクティブなユーザーの記事を取得し、かつユーザー情報も事前読み込み
Article.eager_load(:user).where(users: { active: true })
```

この場合、`preload`では`where`句で`users`テーブルを参照できないため、`eager_load`を使う必要があります。

### `includes`: Railsにおまかせする賢い選択

`includes`は、これまでの`preload`と`eager_load`の挙動をRailsが自動で判断してくれる、最も便利で一般的に使われるメソッドです。

```ruby
# 関連テーブルの条件がない場合 → preloadと同じ挙動
Article.includes(:user).all

# 関連テーブルの条件がある場合 → eager_loadと同じ挙動
Article.includes(:user).where(users: { active: true })
```

`where(users: { ... })`のように、`references`メソッドを使わずに直接関連テーブルの条件を指定すると、`includes`は自動的に`eager_load`（`LEFT OUTER JOIN`）を選択します。これにより、開発者は細かい使い分けを意識することなく、効率的なクエリの恩恵を受けることができます。

## まとめ: 使い分けのフローチャート

どのメソッドを使うべきか、以下のフローチャートで判断できます。

```mermaid
graph TD
    A[クエリの目的は？] --> B{関連データを表示・利用したい？<br>(N+1問題を避けたい)};
    A --> C{関連データの条件で<br>絞り込みたいだけ？};

    C --> D[<b>joins</b> を使う];

    B --> E{関連データの条件で<br>絞り込みもしたい？};
    E --> F[Yes];
    E --> G[No];

    F --> H[<b>includes</b> を使う<br>(内部でeager_loadが呼ばれる)];
    G --> I[<b>includes</b> を使う<br>(内部でpreloadが呼ばれる)];
```

| メソッド       | SQL                | 主な目的                                                     | N+1問題の解決 | 関連テーブルでの`where` | 一般的な推奨度 |
| :------------- | :----------------- | :----------------------------------------------------------- | :------------ | :---------------------- | :------------- |
| **`joins`**    | `INNER JOIN`       | 関連データで絞り込み                                         | ×             | ○                       | △ (単体では)   |
| **`preload`**  | 2つの`SELECT`      | 関連データの事前読み込み                                     | ○             | ×                       | ○              |
| **`eager_load`** | `LEFT OUTER JOIN`  | 関連データで絞り込み **かつ** 事前読み込み                   | ○             | ○                       | ○              |
| **`includes`** | `preload`か`eager_load`を自動選択 | **ほとんどのケースでこれを使う**                             | ○             | ○                       | ◎ (最推奨)     |


### `joins`と`includes`の組み合わせ

`INNER JOIN`で絞り込みつつ、N+1問題も解決したい、という稀なケースでは、`joins`と`preload`（または`includes`）を明示的に組み合わせることもあります。

```ruby
Article.joins(:user).where(users: { active: true }).preload(:user)
```


Active Recordのクエリインターフェースを正しく理解し、使い分けることは、スケーラブルなRailsアプリケーションを構築するための必須スキルです。まずは`includes`を基本とし、必要に応じて他のメソッドを検討するというアプローチから始めてみましょう。
