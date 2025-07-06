# Railsのテスト入門

テストは、高品質なRailsアプリケーションを開発するために不可欠なプロセスです。Railsには、`Minitest`というテストフレームワークが標準で組み込まれており、モデル、コントローラ、ビューなど、アプリケーションの各層に対するテストを記述することができます。

## テストの種類

Railsでは、主に以下の種類のテストが書かれます。

-   **モデルテスト**: モデルのバリデーション、メソッド、アソシエーションなどが正しく機能するかを検証します。
-   **コントローラテスト**: リクエストが正しく処理され、適切なレスポンス（ビューのレンダリングやリダイレクト）が返されるかを検証します。
-   **システムテスト**: ユーザーの操作をシミュレートし、アプリケーション全体の振る舞いをブラウザレベルで検証します。Capybaraというgemが使われます。
-   **結合テスト**: 複数のコントローラやモデルが連携する複雑なワークフローを検証します。

## テストの場所

テストコードは`test`ディレクトリに配置されます。

-   `test/models/`: モデルテスト
-   `test/controllers/`: コントローラテスト
-   `test/system/`: システムテスト
-   `test/fixtures/`: テストで使用するサンプルデータ（フィクスチャ）

## モデルテストの例

`Post`モデルに`title`が存在することを確認するバリデーションのテストです。

```ruby
# test/models/post_test.rb
require "test_helper"

class PostTest < ActiveSupport::TestCase
  test "should not save post without title" do
    post = Post.new
    assert_not post.save, "Saved the post without a title"
  end
end
```

`assert_not`は、引数が`false`であることを期待するアサーション（表明）です。

## テストの実行

すべてのテストを実行するには、以下のコマンドを使用します。

```bash
bin/rails test
```

特定のファイルのテストを実行することもできます。

```bash
bin/rails test test/models/post_test.rb
```

特定の行のテストを実行するには、行番号を指定します。

```bash
bin/rails test test/models/post_test.rb:5
```

## フィクスチャ

フィクスチャは、テストで使用するためのサンプルデータをYAML形式で定義する仕組みです。`test/fixtures/posts.yml`のようにファイルを配置します。

```yaml
# test/fixtures/posts.yml
one:
  title: MyString
  body: MyText

two:
  title: AnotherString
  body: AnotherText
```

テストコード内では、`posts(:one)`のようにしてフィクスチャのデータにアクセスできます。

## まとめ

テストは、コードの品質を保証し、リファクタリングを容易にし、バグの早期発見に繋がります。Railsの標準的なテストの仕組みを理解し、積極的にテストを記述する習慣を身につけることが、堅牢なアプリケーション開発の鍵となります。