# `scenic` gemを使ったデータベースビューの管理

Railsアプリケーションを開発していると、複雑なJOINや集計を伴うクエリを頻繁に実行する必要が出てくることがあります。こうしたクエリをActive Recordのスコープやクラスメソッドとして定義することも可能ですが、SQLが複雑化するにつれて、モデルが肥大化し、再利用性やメンテナンス性が低下しがちです。

このような課題を解決する強力なアプローチが、**データベースビュー（Database View）**の活用です。そして、Railsでデータベースビューを効率的に管理するための定番gemが`scenic`です。

この記事では、`scenic` gemを使ってデータベースビューを導入し、Railsアプリケーションをよりクリーンに保つ方法を解説します。

## データベースビューとは？

データベースビューは、一つ以上のテーブルに対するクエリ結果から作られる仮想的なテーブルです。ビュー自体はデータを持ちませんが、まるで本物のテーブルのように参照することができます。

### ビューを使うメリット

1.  **複雑なクエリの隠蔽**: 複雑なJOINや集計ロジックをビューの定義にカプセル化できます。アプリケーション側は、そのビューに対してシンプルな`SELECT`文を発行するだけで済みます。
2.  **再利用性の向上**: 同じような集計ロジックが複数の箇所で必要な場合、ビューを一つ定義しておけば、どこからでも参照できます。
3.  **セキュリティ**: 元のテーブルへのアクセス権を直接与えず、特定のカラムだけに絞ったビューへのアクセス権を与えることで、セキュリティを向上させることができます。
4.  **モデルの責務分離**: 本来SQLレイヤーで解決すべき複雑なデータ取得ロジックを、Active Recordモデルから切り離すことができます。

## `scenic`の導入と使い方

`scenic`は、データベースビューの定義をSQLファイルとして管理し、マイグレーションを通じてビューの作成や更新を可能にしてくれるgemです。

### 1. インストール

`Gemfile`に`scenic`を追加して`bundle install`を実行します。

```ruby
# Gemfile
gem "scenic"
```

### 2. ビューの作成

`scenic`は、ビューを生成するための専用ジェネレータを提供しています。
例えば、公開中の記事（`articles`）とそのコメント数（`comments`）を一覧表示する`published_articles_with_comment_counts`というビューを作成してみましょう。

```bash
rails g scenic:view published_articles_with_comment_counts
```

このコマンドを実行すると、以下のファイルが生成されます。

- `db/views/published_articles_with_comment_counts_v01.sql`: ビューを定義するSQLファイル。
- `db/migrate/YYYYMMDDHHMMSS_create_published_articles_with_comment_counts.rb`: ビューを作成するためのマイグレーションファイル。

### 3. ビューのSQL定義

`db/views/published_articles_with_comment_counts_v01.sql`に、ビューの本体となるSQLを記述します。

```sql
-- db/views/published_articles_with_comment_counts_v01.sql
SELECT
    articles.id,
    articles.title,
    articles.published_at,
    COUNT(comments.id) AS comment_count
FROM articles
LEFT JOIN comments ON comments.article_id = articles.id
WHERE articles.status = 1 -- statusが1=publishedと仮定
GROUP BY articles.id;
```

### 4. マイグレーションの実行

生成されたマイグレーションファイルは以下のようになっています。

```ruby
# db/migrate/YYYYMMDDHHMMSS_create_published_articles_with_comment_counts.rb
class CreatePublishedArticlesWithCommentCounts < ActiveRecord::Migration[7.1]
  def change
    create_view :published_articles_with_comment_counts
  end
end
```

`create_view`という`scenic`が提供するメソッドが使われています。このマイグレーションを実行すると、`scenic`は対応するSQLファイル（`_v01.sql`）を読み込み、データベースにビューを作成します。

```bash
rails db:migrate
```

### 5. モデルの作成と利用

ビューを参照するためのActive Recordモデルを作成します。このモデルはデータベースのテーブルに直接対応しないため、`ApplicationRecord`を継承し、`primary_key`を明示的に設定することが推奨されます。

```ruby
# app/models/published_article_with_comment_count.rb
class PublishedArticleWithCommentCount < ApplicationRecord
  # このモデルはビューに接続されており、読み取り専用です。
  self.primary_key = :id

  def readonly?
    true
  end
end
```

`readonly?`を`true`にすることで、誤ってこのモデルを通じてビューを更新しようとすることを防ぎます。

これで、通常のモデルと同じようにビューを扱うことができます。

```ruby
# コントローラーやコンソールで
@articles = PublishedArticleWithCommentCount.order(published_at: :desc)

@articles.each do |article|
  puts "#{article.title} (コメント: #{article.comment_count})"
end
```

複雑なSQLはビューに隠蔽され、モデルは非常にクリーンな状態に保たれています。

## ビューの更新

ビューの定義を変更したい場合は、`scenic:view`ジェネレータに`--materialized`オプションをつけずに再度実行するか、手動でバージョンを上げて更新します。

```bash
# 新しいバージョンのSQLファイルとマイグレーションファイルを生成
rails g scenic:view published_articles_with_comment_counts --version 2
```

これにより、`_v02.sql`ファイルと、ビューを更新するための`update_view`メソッドを使ったマイグレーションファイルが生成されます。開発者は新しいSQLファイルに変更を加え、マイグレーションを実行するだけで、安全にビューを更新できます。

## マテリアライズドビュー

`scenic`は、PostgreSQLのマテリアライズドビュー（Materialized View）もサポートしています。マテリアライズドビューは、クエリ結果を物理的にディスクに保存するため、参照速度は非常に高速ですが、元のテーブルが更新されても自動では同期されません。定期的に`REFRESH MATERIALIZED VIEW`コマンドで更新する必要があります。

集計に非常に時間がかかるが、リアルタイム性は求められないレポート画面などで有効です。

```bash
rails g scenic:view daily_sales_reports --materialized
```

## まとめ

`scenic` gemは、Railsアプリケーションでデータベースビューを体系的に管理するための優れたツールです。

- **関心の分離**: SQLの複雑さをDBレイヤーに閉じ込め、Active Recordモデルをスリムに保ちます。
- **バージョン管理**: ビューの定義をSQLファイルとしてバージョン管理し、マイグレーションによって安全に変更履歴を追跡できます。
- **再利用性**: アプリケーションの様々な場所から、同じビジネスロジック（ビュー）を再利用できます。

複雑なデータ集計要件に直面したら、Active Recordのコールバックやメソッドチェーンを駆使する前に、`scenic`を使ったデータベースビューの導入を検討してみてください。きっとあなたのアプリケーションをより良い設計へと導いてくれるはずです。
