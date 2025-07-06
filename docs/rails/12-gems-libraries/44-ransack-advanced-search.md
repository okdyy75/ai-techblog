# 44. Ransackを使った高度な検索機能の実装

## はじめに

多くのWebアプリケーションにとって、ユーザーが目的のデータを簡単に見つけられるようにするための検索機能は不可欠です。シンプルなキーワード検索は比較的簡単に実装できますが、「価格が5,000円以上」「名前に『Rails』を含み、作成日が今月内」といった、複数の条件を組み合わせた高度な検索機能をゼロから作るのは非常に手間がかかります。

**Ransack**は、Railsアプリケーションに高度な検索機能を簡単に追加するためのgemです。ビューで柔軟な検索フォームを構築し、そのパラメータを受け取ってActive Recordのクエリを動的に組み立てるプロセスを劇的に簡素化してくれます。

本記事では、Ransackの基本的な使い方から、複数の条件を組み合わせた検索フォームの実装方法までを解説します。

## この記事で学べること

- Ransackの導入と基本的な検索の流れ
- `search_form_for` ヘルパーを使った検索フォームの作成
- 様々な検索マッチャー（`_cont`, `_eq`, `_gteq`など）の使い方
- 関連モデル（アソシエーション）をまたいだ検索の実装方法

## 1. Ransackの導入

`Gemfile` に `ransack` を追加し、`bundle install` を実行します。

Gemfile
```ruby
gem 'ransack'
```

## 2. 基本的な検索機能の実装

例として、`Article` モデル（`title` と `body` カラムを持つ）に対する検索機能を実装します。

### ステップ1: コントローラ

コントローラの `index` アクションで、検索パラメータを受け取り、結果を返却するようにします。

app/controllers/articles_controller.rb
```ruby
class ArticlesController < ApplicationController
  def index
    # params[:q] にRansackの検索パラメータが入る
    # .ransack() でRansackオブジェクトを生成
    @q = Article.ransack(params[:q])

    # .result で検索結果（ActiveRecord::Relation）を取得
    @articles = @q.result(distinct: true).page(params[:page])
  end
end
```

- `Article.ransack(params[:q])` で、送られてきた検索パラメータ `params[:q]` を元に検索オブジェクト `@q` を作成します。
- `@q.result` で、検索条件に合致する `Article` のコレクションを取得します。

### ステップ2: ビュー

ビューでは `search_form_for` ヘルパーを使って検索フォームを作成します。これはRails標準の `form_for` と似た使い方です。

app/views/articles/index.html.erb
```erb
<h1>記事一覧</h1>

<%# `search_form_for` にRansackオブジェクト (@q) を渡す %>
<%= search_form_for @q do |f| %>
  <div class="field">
    <%= f.label :title_cont, "タイトルに次を含む" %>
    <%= f.search_field :title_cont %>
  </div>

  <div class="actions">
    <%= f.submit "検索" %>
  </div>
<% end %>

<%# --- 検索結果の表示 --- %>
<table>
  ...
</table>
```

ここで重要なのが、フォームフィールドの名前 `title_cont` です。

- `title`: 検索対象のカラム名（`Article` モデルの `title` カラム）。
- `_cont`: Ransackが提供する **検索マッチャー (Predicate)** 。`cont` は "contains" (含む) を意味します。

つまり、`title_cont` は「`title` カラムに、入力された値を含む」という検索条件を生成します。

## 3. 様々な検索マッチャー

Ransackの強力な点の一つが、豊富な検索マッチャーです。いくつか代表的なものを紹介します。

| マッチャー | 意味 | SQL (例) |
| :--- | :--- | :--- |
| `_eq` | 等しい (Equal) | `... WHERE articles.price = 1000` |
| `_not_eq` | 等しくない (Not Equal) | `... WHERE articles.price != 1000` |
| `_cont` | 含む (Contains) | `... WHERE articles.title LIKE '%Rails%'` |
| `_start` | 前方一致 (Starts with) | `... WHERE articles.title LIKE 'Rails%'` |
| `_end` | 後方一致 (Ends with) | `... WHERE articles.title LIKE '%Rails'` |
| `_gt` | より大きい (Greater Than) | `... WHERE articles.price > 1000` |
| `_gteq` | 以上 (Greater Than or Equal To) | `... WHERE articles.price >= 1000` |
| `_lt` | より小さい (Less Than) | `... WHERE articles.price < 1000` |
| `_lteq` | 以下 (Less Than or Equal To) | `... WHERE articles.price <= 1000` |
| `_in` | いずれかを含む (In) | `... WHERE articles.status IN ('published', 'draft')` |
| `_present` | NULLでない、かつ空文字でない | `... WHERE articles.published_at IS NOT NULL` |
| `_blank` | NULLまたは空文字 | `... WHERE articles.published_at IS NULL` |

これらのマッチャーをフィールド名に付けるだけで、複雑な条件のクエリを簡単に生成できます。

## 4. 関連モデル（アソシエーション）の検索

Ransackは、関連先モデルのカラムを検索条件に含めることもできます。例えば、`Article` が `User` に属している (`belongs_to :user`) 場合を考えます。

「ユーザー名に『John』を含む記事」を検索したい場合、以下のようにフォームを記述します。

```erb
<%= search_form_for @q do |f| %>
  <%# ... Articleのタイトル検索 ... %>

  <div class="field">
    <%# user_name_cont => userモデルのnameカラムを検索 %>
    <%= f.label :user_name_cont, "投稿者名に次を含む" %>
    <%= f.search_field :user_name_cont %>
  </div>

  <%= f.submit %>
<% end %>
```

`[関連モデル名]_[カラム名]_[マッチャー]` という命名規則で、アソシエーションを辿って検索条件を指定できます。Ransackは自動的に `JOIN` 句を生成してくれます。

## 5. 複数の条件を組み合わせる

検索フォームに複数のフィールドを置くだけで、AND条件で検索できます。

```erb
<%= search_form_for @q do |f| %>
  <%= f.label :title_cont, "タイトル" %>
  <%= f.search_field :title_cont %>

  <%= f.label :created_at_gteq, "作成日（以降）" %>
  <%= f.date_field :created_at_gteq %>

  <%= f.submit %>
<% end %>
```

このフォームで両方に入力して検索すると、「タイトルに○○を含み、かつ、作成日が△△以降」という条件のクエリが生成されます。

## まとめ

Ransackは、Railsにおける高度な検索機能の実装を劇的に楽にしてくれる強力なgemです。

- **宣言的な検索フォーム**: `search_form_for` と命名規則に従ったフィールド名で、柔軟な検索フォームを構築できる。
- **豊富なマッチャー**: `_cont`, `_gteq` などのマッチャーを使い分けることで、様々な検索条件に対応できる。
- **アソシエーション検索**: 関連モデルをまたいだ検索も簡単に行える。

検索機能はユーザービリティに直結する重要な機能です。Ransackを使いこなして、ユーザーにとって価値のある、高機能な検索を実装しましょう。