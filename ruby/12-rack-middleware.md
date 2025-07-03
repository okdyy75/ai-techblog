
# Rackの基礎とミドルウェア

Rackは、RubyのWebサーバーとWebフレームワーク（Rails, Sinatraなど）の間の標準的なインターフェースを提供するライブラリです。ほとんどのRuby製WebフレームワークはRackをベースにしており、Rackを理解することは、Webアプリケーションがどのように動作しているかを深く知る上で非常に重要です。

## Rackの基本インターフェース

Rackアプリケーションの最も基本的な要件は、「`call`というメソッドに応答し、引数として環境情報（`env`）のハッシュを受け取り、`[ステータスコード, ヘッダー, ボディ]`という3つの要素からなる配列を返す」ことです。

- **`env`**: HTTPリクエストに関する情報（リクエストメソッド、パス、ヘッダーなど）が格納されたハッシュ。
- **ステータスコード**: `200`や`404`などのHTTPステータスコード（Integer）。
- **ヘッダー**: HTTPレスポンスヘッダー（`Content-Type`など）が格納されたハッシュ。
- **ボディ**: レスポンスの本体。`each`に応答するオブジェクト（通常は配列）で、各要素は文字列である必要があります。

### 最もシンプルなRackアプリケーション

```ruby
# my_app.rb
class MyApp
  def call(env)
    # [ステータス, ヘッダー, ボディ] の配列を返す
    [
      200,
      { "Content-Type" => "text/plain" },
      ["Hello, Rack!"]
    ]
  end
end
```

このアプリケーションを起動するには、`config.ru`というファイルを作成し、Rackサーバー（Puma, Unicornなど）にどのアプリケーションを実行するかを伝えます。

```ruby
# config.ru
require_relative 'my_app'

run MyApp.new
```

そして、`rackup`コマンドでサーバーを起動します。

```bash
# pumaがインストールされている場合
rackup config.ru
```

`http://localhost:9292`にアクセスすると、"Hello, Rack!"と表示されます。

## Rackミドルウェア

Rackの最も強力な機能の一つが**ミドルウェア**です。ミドルウェアは、リクエストを受け取ってレスポンスを返すRackアプリケーションの一種ですが、他のRackアプリケーションをラップ（包み込む）する点が特徴です。

ミドルウェアは、リクエストがアプリケーションに到達する前や、レスポンスがクライアントに返される前に、何らかの処理を挟み込むために使われます。これにより、関心事を分離し、再利用可能なコンポーネントを作成できます。

例えば、以下のような処理がミドルウェアとして実装されることがよくあります。
- 認証・認可
- リクエストのロギング
- パラメータの解析
- キャッシュ
- 例外処理

### ミドルウェアの構造

ミドルウェアは通常、以下の構造を持ちます。

1.  `initialize`メソッドで、次に呼び出すべきアプリケーション（`@app`）を受け取る。
2.  `call`メソッドで、リクエストに対する前処理を行う。
3.  `@app.call(env)`を呼び出して、リクエストを次のミドルウェアまたはアプリケーション本体に渡す。
4.  受け取ったレスポンス（`status`, `headers`, `body`）に対して後処理を行う。
5.  最終的なレスポンスを返す。

### 簡単なロギングミドルウェアの例

```ruby
# logging_middleware.rb
class LoggingMiddleware
  def initialize(app)
    @app = app
  end

  def call(env)
    start_time = Time.now
    puts "Request started at #{start_time}"
    puts "Path: #{env['PATH_INFO']}"

    # 次のアプリを呼び出し、���スポンスを受け取る
    status, headers, body = @app.call(env)

    end_time = Time.now
    duration = (end_time - start_time).round(4)
    puts "Request finished in #{duration} seconds with status #{status}"

    # 受け取ったレスポンスをそのまま返す
    [status, headers, body]
  end
end
```

### ミドルウェアの使用

`config.ru`で`use`キーワードを使ってミドルウェアをチェーンに追加します。

```ruby
# config.ru
require_relative 'my_app'
require_relative 'logging_middleware'

# ミドルウェアをスタックに追加
# useは下から上にラップしていく
use LoggingMiddleware

# アプリケーション本体
run MyApp.new
```

`rackup`で起動してリクエストを送ると、コンソールにログが出力されるようになります。

```
Request started at 2023-10-27 12:00:00 +0900
Path: /
Request finished in 0.0012 seconds with status 200
```

複数のミドルウェアを`use`で追加すると、それらはスタックのように積み重なります。リクエストはスタックの上から下に渡され、レスポンスは下から上に返っていきます。

```
Request  -> Middleware1 -> Middleware2 -> App
Response <- Middleware1 <- Middleware2 <- App
```

## RailsとRack

Rails���プリケーションも、実は巨大なRackアプリケーションです。`rails server`コマンドを実行すると、Railsは自身と設定されたすべてのミドルウェアを含むRackスタックを構築し、PumaなどのRackサーバー上で実行します。

以下のコマンドで、現在のRailsアプリケーションで使われているミドルウェアの一覧を確認できます。

```bash
bin/rails middleware
```

認証（Devise）、セッション管理、キャッシュ、アセットパイプラインなど、Railsの多くの機能がRackミドルウェアとして実装されていることがわかります。

## まとめ

- Rackは、RubyのWebサーバーとフレームワークの間の共通インターフェースです。
- すべてのRackアプリケーションは、`env`ハッシュを受け取り、`[status, headers, body]`の配列を返す`call`メソッドを持ちます。
- Rackミドルウェアは、アプリケーションをラップし、リクエストとレスポンスを途中で加工するための強力な仕組みです。
- Railsを含むほとんどのRuby製Webフレームワークは、Rackの上に構築されています。

Rackの仕組みを理解することで、Webアプリケーションの内部動作に対する解像度が上がり、より高度���カスタマイズや問題解決が可能になります。
