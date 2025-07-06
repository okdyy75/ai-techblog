# Active RecordのEnumを使いこなす: 型安全で可読性の高いコードへ

RailsのActive Recordに備わる`enum`は、モデルの属性を整数（integer）カラムで管理しつつ、人間が読みやすい名前で扱えるようにするための強力な機能です。ステータス管理やカテゴリ分類など、決まった種類の値しか取らない属性に対して絶大な効果を発揮します。

この記事では、`enum`の基本的な使い方から、より実践的なテクニックまでを解説し、コードの可読性と安全性を高める方法を紹介します。

## `enum`とは？ なぜ便利なのか？

例えば、ブログ記事に「下書き」「公開中」「非公開」という3つのステータスを持たせたいとします。`enum`を使わない場合、以下のように文字列や整数で管理することになるでしょう。

```ruby
# 文字列で管理する場合
article.status = "draft"

# 整数で管理する場合 (0: draft, 1: published, 2: private)
article.status = 0
```

文字列での管理は直感的ですが、タイポの危険性や、データベースのインデックス効率が悪いという欠点があります。一方、整数での管理は効率的ですが、「0が何を表すのか」がコードから読み取りにくく、マジックナンバー問題を引き起こします。

`enum`は、この両者の「いいとこ取り」をする機能です。データベースには効率的な整数として値を保存しつつ、Railsアプリケーション上では意味のある名前（シンボル）で値を扱えるようにしてくれます。

## 基本的な使い方

`enum`を使うのは非常に簡単です。`Article`モデルに`status`という属性を追加し、`enum`を定義してみましょう。

### 1. マイグレーションの作成

まず、`status`を管理するためのカラムを`articles`テーブルに追加します。`enum`は整数型（integer）のカラムを使用するのが一般的です。

```bash
rails g migration AddStatusToArticles status:integer
```

生成されたマイグレーションファイルに、デフォルト値を設定しておくと良いでしょう。

```ruby
# db/migrate/YYYYMMDDHHMMSS_add_status_to_articles.rb
class AddStatusToArticles < ActiveRecord::Migration[7.1]
  def change
    add_column :articles, :status, :integer, default: 0, null: false
  end
end
```

`default: 0`とすることで、新しく作成された記事は自動的に「下書き」状態になります。`null: false`で値が必ず存在することも保証します。

### 2. モデルでの`enum`定義

`app/models/article.rb`で`status`属性に対して`enum`を定義します。

```ruby
# app/models/article.rb
class Article < ApplicationRecord
  enum status: { draft: 0, published: 1, private: 2 }
end
```

これだけで、`enum`の基本的な設定は完了です。

## `enum`が提供する便利なメソッド

`enum`を定義すると、Active Recordは自動的に多くの便利なメソッドを追加してくれます。

### 値の設定と確認

```ruby
article = Article.new

# 値の設定
article.status = :published
# または
article.published!

# 値の確認
article.published? #=> true
article.draft?     #=> false

# 現在の値を取得
article.status #=> "published"
```

データベース上では`articles.status`カラムに`1`が保存されますが、Rails上では`"published"`という文字列として（あるいはシンボルで）扱えます。

### スコープ

`enum`は、定義した各ステータスに対応するスコープも自動で生成します。

```ruby
# 公開中の記事をすべて取得
Article.published

# 下書きではない記事を取得
Article.not_draft
```

これにより、特定のステータスを持つレコードを簡単に検索できます。

## 実践的なテクニック

### プレフィックスとサフィックス

複数の`enum`を一つのモデルで定義すると、メソッド名が衝突する可能性があります。

```ruby
class Order < ApplicationRecord
  # statusとpayment_statusで `pending?` メソッドが衝突する
  enum status: { pending: 0, completed: 1 }
  enum payment_status: { pending: 0, paid: 1 }
end
```

このような衝突を避けるために、`_prefix`や`_suffix`オプションが利用できます。

```ruby
class Order < ApplicationRecord
  enum status: { pending: 0, completed: 1 }, _prefix: true # or _prefix: :status
  enum payment_status: { pending: 0, paid: 1 }, _suffix: :payment
end

order = Order.new

# プレフィックス付きのメソッド
order.status_pending?    #=> true
Order.status_completed # scope

# サフィックス付きのメソッド
order.paid_payment?      #=> false
Order.pending_payment  # scope
```

### i18nによる日本語化

`enum`で定義した値をビューで表示する際、日本語で表示したいケースは多いでしょう。Railsのi18n機能と連携することで、これを実現できます。

`config/locales/ja.yml`に以下のように定義します。

```yaml
# config/locales/ja.yml
ja:
  activerecord:
    attributes:
      article:
        statuses:
          draft: "下書き"
          published: "公開中"
          private: "非公開"
```

`Article.human_attribute_name("status.#{article.status}")` のようにして日本語名を取得できますが、毎回書くのは面倒です。ヘルパーメソッドを用意すると便利です。

```ruby
# app/helpers/application_helper.rb
module ApplicationHelper
  def human_enum_name(model, enum_name)
    model.class.human_attribute_name("#{enum_name}.#{model.send(enum_name)}")
  end
end

# Viewで使う
# <%= human_enum_name(@article, :status) %>
```

## 注意点

`enum`の定義に新しい値を追加する際は、既存の整数の値を変えないように注意が必要です。

```ruby
# BAD: 既存の値の意味が変わってしまう
enum status: { draft: 0, archived: 1, published: 2, private: 3 }

# GOOD: 末尾に追加する
enum status: { draft: 0, published: 1, private: 2, archived: 3 }
```

途中に新しい値を追加すると、データベースに保存されている既存のレコードの意味が変わってしまい、深刻なバグの原因となります。必ず末尾に追加するようにしましょう。

## まとめ

Active Recordの`enum`は、ステータス管理のようなコードを劇的に改善してくれる強力な機能です。

- **可読性**: マジックナンバーを排除し、コードの意図を明確にします。
- **安全性**: 定義外の値を防ぎ、タイポによるバグを減らします。
- **利便性**: スコープやヘルパーメソッドが自動生成され、開発が効率化します。

`enum`を正しく理解し、活用することで、より堅牢でメンテナンス性の高いRailsアプリケーションを構築できます。ぜひ次のプロジェクトから導入してみてください。
