# Railsのビューとテンプレート

Railsのビューは、ユーザーインターフェースを構築する責務を持ちます。コントローラから渡されたデータを使用して、HTMLなどのレスポンスを生成します。ビューのテンプレートは、`app/views`ディレクトリに配置されます。

## ERB (Embedded Ruby)

Railsでは、デフォルトでERBというテンプレートエンジンが使用されます。ERBを使用すると、HTMLファイル内にRubyコードを埋め込むことができます。

-   `<%= ... %>`: Rubyの式を評価し、その結果を出力します。HTMLエスケープが自動的に適用されます。
-   `<% ... %>`: Rubyのコードを実行しますが、結果は出力しません。条件分岐やループなどに使用します。

```erb
<!-- app/views/posts/index.html.erb -->
<h1>Posts</h1>

<ul>
  <% @posts.each do |post| %>
    <li>
      <%= link_to post.title, post_path(post) %>
    </li>
  <% end %>
</ul>
```

## ���ーシャル

パーシャルは、再利用可能なビューの断片です。ファイル名の先頭にアンダースコア（`_`）を付けます（例: `_form.html.erb`）。

パーシャルをレンダリングするには、`render`メソッドを使用します。

```erb
<%= render 'form' %>
```

ローカル変数をパーシャルに渡すこともできます。

```erb
<%= render 'post', post: @post %>
```

## レイアウト

レイアウトは、アプリケーション共通のヘッダーやフッターなど、複数のページで共有されるテンプレートです。レイアウトは`app/views/layouts`ディレクトリに配置されます。

`application.html.erb`がデフォルトのレイアウトファイルです。`yield`キーワードがある場所に、各ビューの内容が挿入されます。

```erb
<!-- app/views/layouts/application.html.erb -->
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
  <%= csrf_meta_tags %>
  <%= csp_meta_tag %>
  <%= stylesheet_link_tag "application", "data-turbo-track": "reload" %>
  <%= javascript_importmap_tags %>
</head>
<body>
  <header>
    <!-- Header content -->
  </header>

  <main>
    <%= yield %>
  </main>

  <footer>
    <!-- Footer content -->
  </footer>
</body>
</html>
```

## ヘルパーメソッド

Railsには、ビューでよく使われるHTMLタグを生成するためのヘルパーメソッドが多数用意されています。

-   `link_to`: ハイパーリンクを生成します。
-   `form_with`: フォームを生成します。
-   `image_tag`: 画像タグを生成します。
-   `number_to_currency`: 数値を通貨形式にフォーマットします。

## まとめ

Railsのビューは、ERB、パーシャル、レイアウト、ヘルパーメソッドを組み合わせることで、動的で再利用性の高いユーザーインターフェースを効率的に構築することができます。
