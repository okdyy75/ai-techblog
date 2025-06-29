# Viewの基本: `form_with` を使って安全なフォームを作成する方法

## はじめに

Webアプリケーションにおいて、ユーザーからのデータを受け取るためのHTMLフォームは不可欠な要素です。Ruby on Railsでは、フォームを簡単かつ安全に作成するための強力なヘルパーメソッド`form_with`が提供されています。

この記事では、`form_with`の基本的な使い方から、その裏側で何が行われているのか、そしてなぜそれが「安全」なのかについて詳しく解説します。`form_for`や`form_tag`に慣れている方も、モダンなRails開発の標準である`form_with`への理解を深めていきましょう。

## `form_with`とは？

`form_with`は、Rails 5.1から導入された統一的なフォームヘルパーです。それ以前に存在した`form_for`（モデルオブジェクトに紐づくフォーム用）と`form_tag`（特定のモデルに紐づかないフォーム用）の機能を統合し、よりシンプルで柔軟な記述が可能になりました。

## 1. モデルに紐づくフォームの作成 (`model`オプション)

最も一般的な使い方は、Active Recordのモデルオブジェクトと連携させる方法です。新規作成（new）と編集（edit）で同じフォームテンプレートを共有できるのが大きなメリットです。

### コントローラ

まず、コントローラでフォームが使用するオブジェクトを用意します。

```ruby
# app/controllers/articles_controller.rb
class ArticlesController < ApplicationController
  def new
    @article = Article.new # 新規作成用の空のオブジェクト
  end

  def edit
    @article = Article.find(params[:id]) # 編集対象のオブジェクト
  end

  # ... create, updateアクションなど
end
```

### ビュー (`_form.html.erb`)

次に、ビューで`form_with`を使ってフォームを描画します。

```erb
<%# app/views/articles/_form.html.erb %>

<%= form_with(model: @article) do |form| %>
  <div>
    <%= form.label :title %><br>
    <%= form.text_field :title %>
  </div>

  <div>
    <%= form.label :content %><br>
    <%= form.text_area :content %>
  </div>

  <div>
    <%= form.submit %>
  </div>
<% end %>
```

このフォームは`new`と`edit`の両方のアクションからパーシャルとして呼び出せます。

### `form_with`の賢い挙動

ここで`form_with`は、渡された`@article`オブジェクトの状態を自動で判別します。

*   **`@article`が新規オブジェクトの場合 (`@article.persisted?`が`false`)**
    *   フォームの`action`属性は`/articles`になります。
    *   HTTPメソッドは`POST`になります。
    *   `submit`ボタンのテキストは "Create Article" になります。

*   **`@article`がデータベースに保存済みのオブジェクトの場合 (`@article.persisted?`が`true`)**
    *   フォームの`action`属性は`/articles/1`のような具体的なパスになります。
    *   HTTPメソッドは`PATCH`になります。（HTMLの`<form>`タグには`method="post"`と出力されますが、内部に`<input type="hidden" name="_method" value="patch">`が生成され、Railsがこれを解釈します）
    *   `submit`ボタンのテキストは "Update Article" になります。

このように、オブジェクトの状態に応じて適切なリクエスト先とメソッドを自動で設定してくれるため、開発者はロジックを共通化できるのです。

## 2. モデルに紐づかないフォームの作成 (`url`オプション)

検索フォームのように、特定のモデルオブジェクトと直接関連しないフォームを作成する場合は、`url`オプションで送信先のパスを明示的に指定します。

```erb
<%# 検索フォームの例 %>
<%= form_with(url: search_path, method: :get) do |form| %>
  <%= form.label :query, "Search for:" %>
  <%= form.text_field :query %>
  <%= form.submit "Search" %>
<% end %>
```

*   **`url: search_path`**: フォームの送信先を`search_path`（`rails routes`で確認できる名前付きルート）に設定します。
*   **`method: :get`**: 検索なので、HTTPメソッドを`GET`に指定しています。これにより、検索クエリがURLのクエリパラメータ（例: `/search?query=Rails`）として送信されます。

## 3. なぜ`form_with`は安全なのか？ - CSRF対策

`form_with`（およびRailsのフォームヘルパー全般）が生成するHTMLをよく見ると、見慣れない`hidden`タイプの`input`タグが2つ含まれていることに気づきます。

```html
<form action="/articles" method="post">
  <!-- ... form fields ... -->

  <!-- 1. UTF-8エンコーディング強制 -->
  <input type="hidden" name="utf8" value="✓">

  <!-- 2. CSRFトークン -->
  <input type="hidden" name="authenticity_token" value="GENERATED_TOKEN">
</form>
```

このうち、セキュリティ上非常に重要なのが**`authenticity_token`**です。これは**CSRF（クロスサイト・リクエスト・フォージェリ）**という種類の攻撃を防ぐためのものです。

### CSRF攻撃とは？

1.  悪意のある攻撃者が、罠サイトに「あなたのサイトのデータを削除するリクエスト」を送信するリンクやフォームを仕掛ける。
2.  あなたのサイトにログイン中のユーザーが、その罠サイトを訪れてリンクをクリックしてしまう。
3.  ユーザーのブラウザは、ログイン情報（Cookie）を保持したまま、あなたのサイトに意図しないリクエストを送信してしまう。
4.  あなたのサイトは正規のユーザーからのリクエストだと誤認し、データが不正に操作されてしまう。

### CSRFトークンによる防御

Railsは、`form_with`でフォームを生成する際に、セッションごとにユニークな`authenticity_token`を埋め込みます。そして、`POST`, `PATCH`, `DELETE`などのデータ変更を伴うリクエストを受け取った際に、送信されてきたトークンがサーバー側で保持している正しいトークンと一致するかを検証します。

悪意のあるサイトは、この正しいトークンを知ることができないため、偽のリクエストを送信してもRails側でブロックされます。`form_with`を使うだけで、この重要なセキュリティ対策が自動的に施されるのです。

## まとめ

`form_with`は、Railsにおけるフォーム作成の標準的な方法です。

*   **`model: @object`** を使えば、新規作成と編集でロジックを共通化できる。
*   **`url: path`** を使えば、モデルに依存しないフォームも簡単に作れる。
*   オブジェクトの状態を判別し、適切な`action`と`method`を自動で設定してくれる。
*   **CSRF対策**が自動的に組み込まれており、安全なフォームを構築できる。

フォームを作成する際は、手で`<form>`タグを書くのではなく、常に`form_with`を利用することを心がけましょう。これにより、コードの可読性が向上し、アプリケーションのセキュリティも確保されます。
