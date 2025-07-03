
# Sinatraで作る軽量Webアプリケーション

Sinatraは、Rubyで書かれたDSL（ドメイン固有言語）で、最小限の労力で素早くWebアプリケーションを作成するためのライブラリです。Railsのようなフルスタックフレームワークとは対照的に、Sinatraは非常に軽量で、規約よりも設定を重視します。小規模なWebサービス、APIサーバー、プロトタイピングなどに最適なツールです。

## Sinatraの哲学

- **軽量かつ最小限**: Sinatraは、Webアプリケーションの基本的な機能（ルーティング、リクエスト処理、レスポンス返却）に特化しています。
- **柔軟性**: データベース接続、テンプレートエンジン、認証など、必要な機能は自分で好きなGemを選んで組み合わせることができます。
- **学習の容易さ**: 覚えるべき規約が少なく、直感的なDSLでアプリケーションを記述できます。

## はじめてのSinatraアプリケーション

### 1. インストール

まず、SinatraのGemをインストールします。

```bash
gem install sinatra
```

### 2. アプリケーションファイルの作成

`app.rb`という名前でファイルを作成し、以下のコードを記述します。

```ruby
# app.rb
require 'sinatra'

# ルートURL ("/") へのGETリクエストを処理
get '/' do
  "Hello, Sinatra!"
end

# "/about" へのGETリクエストを処理
get '/about' do
  "This is a simple web application made with Sinatra."
end

# URLにパラメータを含む場合
# 例: /users/alice
get '/users/:name' do
  name = params['name']
  "Hello, #{name}!"
end
```

- `require 'sinatra'`: Sinatraライブラリを読み込みます。
- `get`, `post`, `put`, `delete`: HTTPメソッドに対応するメソッドを呼び出し、第一引数にパス、第二引数に処理ブロックを渡します。
- `params`: URLのパスパラメータやクエリパラメータが格納されたハッシュです。

### 3. アプリケーションの実行

ターミナルからRubyでこのファイルを実行します。

```bash
ruby app.rb
```

すると、SinatraはデフォルトでPumaやWEBrickなどのRackサーバーを起動します。

```
== Sinatra (v3.0.0) has taken the stage on 4567 for development with backup from Puma
Puma starting in single mode...
* Puma version: 6.0.0 (ruby 3.1.2-p20) ("Sunflower")
*  Min threads: 0
*  Max threads: 5
*  Environment: development
*          PID: 12345
* Listening on http://127.0.0.1:4567
* Listening on http://[::1]:4567
Use Ctrl-C to stop
```

ブラウザで以下のURLにアクセスすると、それぞれ対応する文字列が表示されます。
- `http://localhost:4567/` -> "Hello, Sinatra!"
- `http://localhost:4567/about` -> "This is a simple web application made with Sinatra."
- `http://localhost:4567/users/Bob` -> "Hello, Bob!"

## ビュー（テンプレート）を使う

レスポンスとしてHTMLを返す場合、文字列を直接書くのは現実的ではありません。Sinatraは、ERBやHamlなど、さまざまなテンプレートエンジンと簡単に連携できます。

### ERB (Embedded Ruby) の利用

1.  `app.rb`と同じ階層に`views`というディレクトリを作成します。
2.  `views`ディレクトリの中に、`index.erb`というファイルを作成します。

```erb
<!-- views/index.erb -->
<!DOCTYPE html>
<html>
<head>
  <title>My Sinatra App</title>
</head>
<body>
  <h1><%= @message %></h1>
  <p>The current time is <%= Time.now %>.</p>
</body>
</html>
```

3.  `app.rb`を修正して、`erb`メソッドでテンプレートをレンダリングするようにします。

```ruby
# app.rb
require 'sinatra'

get '/' do
  # インスタンス変数を定義すると、テンプレート内で利用できる
  @message = "Welcome to my awesome application!"
  # :index シンボルを渡すと、views/index.erb を探してレンダリングする
  erb :index
end
```

アプリケーションを再起動（Ctrl+Cで停止し、再度`ruby app.rb`）して`http://localhost:4567/`にアクセスすると、HTMLがレンダリングされて表示されます。

## 静的ファイルの配信

CSSやJavaScript、画像などの静的ファイルは、デフォルトで`public`という名前のディレクトリから配信されます。

1.  `app.rb`と同じ階層に`public`ディレクトリを作成します。
2.  `public`ディレクトリに`style.css`を作成します。

```css
/* public/style.css */
body {
  font-family: sans-serif;
  background-color: #f0f0f0;
}
```

3.  テンプレートファイル (`views/index.erb`) からこのCSSを読み込みます。

```erb
<!-- views/index.erb -->
<head>
  <title>My Sinatra App</title>
  <link rel="stylesheet" href="/style.css">
</head>
```

こ��で、ページにCSSが適用されるようになります。

## `config.ru` を使った起動

より本格的なアプリケーションでは、`rackup`コマンドで起動するのが一般的です。そのために`config.ru`ファイルを作成します。

```ruby
# config.ru
require_relative 'app'

run Sinatra::Application
```

そして、`rackup`コマンドで起動します。

```bash
rackup config.ru
```

この方法を使うと、PumaやUnicornなどのより高性能なRackサーバーの設定を柔軟に行うことができます。

## まとめ

Sinatraは、Rubyで手軽にWebアプリケーションを構築するための優れたツールです。
- **ルーティング**: `get`, `post`などのメソッドで直感的に定義できる。
- **テンプレート**: `views`ディレクトリと`erb`メソッドで簡単にHTMLをレンダリングできる。
- **静的ファイル**: `public`ディレクトリに置くだけで配信できる。

Railsの学習を始める前のウォーミングアップとして、あるいは小規模なAPIやマイクロサービスのバックエンドとして、SinatraはRubyによるWeb開発の楽しさと本質を教えてくれます。
