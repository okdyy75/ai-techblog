# Rackミドルウェアを自作してリクエスト/レスポンスをカスタマイズする

## はじめに

Railsアプリケーションは、ブラウザからのリクエストを受け取ってから、コントローラのアクションが実行されるまでの間に、数多くの処理を行っています。セッション管理、クッキーの解析、パラメータのパース、キャッシュ処理など、これらの機能の多くは**Rackミドルウェア**として実装されています。

Rackとは、RubyのWebサーバーとWebフレームワーク（Rails, Sinatraなど）の間の標準的なインターフェースを定義した仕様です。そしてRackミドルウェアは、リクエストとレスポンスの間に挟まり、それらを検査したり変更したりできるコンポーネントです。Railsの心臓部とも言えるこの仕組みを理解し、自作できるようになることで、アプリケーションの動作をより低レベルで制御することが可能になります。

この記事では、Rackミドルウェアの基本的な概念を解説し、実際にカスタムミドルウェアを作成してRailsアプリケーションに組み込む方法を紹介します。

## Rackの基本

Rackの最も基本的なコンセプトは、「**`call`メソッドを持つオブジェクト**」です。このオブジェクトは、環境変数（リクエスト情報）のハッシュ（`env`）を引数として受け取り、`[ステータスコード, ヘッダー, レスポンスボディ]`という3つの要素からなる配列を返します。

```ruby
class HelloWorldApp
  def call(env)
    status = 200
    headers = { "Content-Type" => "text/plain" }
    body = ["Hello, Rack!"]

    [status, headers, body]
  end
end
```

Railsアプリケーション自体も、このRack仕様に準拠した巨大なアプリケーションオブジェクトと見なすことができます。

## Rackミドルウェアとは？

Rackミドルウェアは、このRackアプリケーションをラップする（包み込む）オブジェクトです。ミドルウェアもまた`call`メソッドを持ちますが、その中で次のミドルウェアまたはアプリケーション本体の`call`メソッドを呼び出す点が異なります。

```ruby
class MyMiddleware
  def initialize(app)
    @app = app # 次に実行すべきミドルウェア or アプリケーション本体
  end

  def call(env)
    # --- リクエストに対する前処理 --- 
    # envハッシュを変更したり、リクエストを記録したりできる

    # 次のミドルウェア/アプリを呼び出し、レスポンスを受け取る
    status, headers, body = @app.call(env)

    # --- レスポンスに対する後処理 ---
    # status, headers, bodyを変更したりできる

    # 最終的なレスポンスを返す
    [status, headers, body]
  end
end
```

このように、ミドルウェアは玉ねぎの皮のように層をなしており、リクエストは外側から内側へ、レスポンスは内側から外側へと伝わっていきます。`rails middleware`コマンドを実行すると、現在のアプリケーションで使われているミドルウェアのスタック（層の順番）を確認できます。

## カスタムミドルウェアの作成

それでは、実際に簡単なカスタムミドルウェアを作成してみましょう。ここでは、すべてのレスポンスにカスタムヘッダー（例: `X-App-Version: 1.0`）を追加するミドルウェアを作成します。

### 1. ミドルウェアクラスの作成

`lib/middleware`ディレクトリを作成し、その中にミドルウェアのファイルを作成するのが一般的です。

```bash
mkdir -p lib/middleware
touch lib/middleware/version_header.rb
```

```ruby
# lib/middleware/version_header.rb
module Middleware
  class VersionHeader
    def initialize(app, version: "1.0")
      @app = app
      @version = version
    end

    def call(env)
      # 次のミドルウェアを呼び出してレスポンスを取得
      status, headers, body = @app.call(env)

      # レスポンスヘッダーにカスタムヘッダーを追加
      headers['X-App-Version'] = @version

      # 変更後のレスポンスを返す
      [status, headers, body]
    end
  end
end
```

*   `initialize`メソッドで、次のアプリケーション`@app`と、オプションの引数（ここではバージョン番号）を受け取れるようにしています。

### 2. ミドルウェアの読み込みと登録

作成したミドルウェアをRailsアプリケーションに認識させる必要があります。

まず、`lib`ディレクトリ配下のファイルが自動で読み込まれるように、`config/application.rb`に設定を追加します。

```ruby
# config/application.rb
module YourApp
  class Application < Rails::Application
    # ...
    config.autoload_paths << Rails.root.join('lib')
  end
end
```

次に、同じく`config/application.rb`で、ミドルウェアスタックに自作のミドルウェアを追加します。

```ruby
# config/application.rb
# ...
require_relative '../lib/middleware/version_header' # ファイルを明示的にrequire

module YourApp
  class Application < Rails::Application
    # ...
    config.autoload_paths << Rails.root.join('lib')

    # ミドルウェアスタックに追加
    config.middleware.use Middleware::VersionHeader, version: "1.1"
  end
end
```

*   **`config.middleware.use`**: ミドルウェアをスタックの末尾に追加します。
*   `Middleware::VersionHeader`の後ろに渡した引数（`version: "1.1"`）は、ミドルウェアの`initialize`メソッドに渡されます。
*   `insert_before`や`insert_after`を使えば、スタック内の特定の位置にミドルウェアを挿入することもできます。

### 3. 動作確認

Railsサーバーを再起動し、ブラウザの開発者ツールや`curl`コマンドでレスポンスヘッダーを確認してみましょう。

```bash
curl -I http://localhost:3000
```

レスポンスの中に`X-App-Version: 1.1`というヘッダーが含まれていれば成功です。

## カスタムミドルウェアのユースケース

カスタムミドルウェアは、様々な場面で活用できます。

*   **APIキーによる認証**: 特定のパス（例: `/api/`以下）へのリクエストヘッダーをチェックし、有効なAPIキーが含まれていなければ401エラーを返す。
*   **メンテナンスモード**: 特定の条件下で、すべてのリクエストをメンテナンスページにリダイレクトする。
*   **リクエストのロギング**: 特定の条件に合致するリクエストの詳細な情報を、Railsのログとは別のファイルに記録する。
*   **下位互換性のためのパラメータ変換**: 古いAPIクライアントからのリクエストに含まれるパラメータ名を、新しい形式に変換してからコントローラに渡す。
*   **サイト全体のA/Bテスト**: リクエストに応じて、異なるバージョンのアプリケーションロジックに処理を振り分ける。

## まとめ

Rackミドルウェアは、Railsアプリケーションのリクエスト/レスポンスサイクルに介入するための強力なフックです。普段意識することは少ないかもしれませんが、Railsの根幹を支えるこの仕組みを理解することで、フレームワークの提供する機能だけでは実現が難しい、より高度な要求に柔軟に対応できるようになります。

コントローラよりも低いレイヤーで、アプリケーション全体に影響を与えるような横断的な関心事（cross-cutting concern）を処理したい場合に、カスタムミドルウェアの作成は非常に有効な選択肢となるでしょう。
