# Rails標準のテストフレームワーク「Minitest」ではじめるテスト駆動開発（TDD）

## はじめに

「テストを書く」と聞くと、多くの開発者は「アプリケーションが完成した後に、動作を確認するために書くもの」と想像するかもしれません。しかし、モダンなソフトウェア開発、特にアジャイルな開発手法では、**コードを書く前にテストを書く**という「**テスト駆動開発（Test-Driven Development, TDD）**」が広く実践されています。

Railsには、標準で**Minitest**という軽量かつ強力なテストフレームワークが同梱されており、TDDをすぐに始められる環境が整っています。この記事では、Minitestを使い、具体的なモデルの機能実装を例にして、TDDの基本的なサイクル（レッド→グリーン→リファクタリング）を体験します。

## TDDのサイクルとは？

TDDは、以下の3つのステップを短いサイクルで繰り返す開発手法です。

1.  **レッド (Red)**: まず、これから実装する機能に対する**失敗するテスト**を書きます。まだ機能が存在しないので、このテストは必ず失敗します（赤くなります）。これは、実装すべき仕様をテストコードとして明確に定義するステップです。

2.  **グリーン (Green)**: 次に、このテストを**パスさせるための最小限のコード**を実装します。ここでは完璧なコードを目指す必要はありません。とにかくテストを成功させる（緑にする）ことだけを考えます。

3.  **リファクタリング (Refactor)**: テストが通る状態を維持しながら、実装したコードの重複をなくしたり、可読性を高めたりといった「リファクタリング（改善）」を行います。テストが安全網として機能するため、安心してコードの変更ができます。

このサイクルを繰り返すことで、動く仕様（テスト）に裏付けられた、クリーンなコードを少しずつ積み上げていくことができます。

## MinitestによるTDDの実践

それでは、ブログの`Article`モデルに「下書き状態の記事は公開されていないことを示す」ロジックをTDDで実装してみましょう。

### 前提

*   `Article`モデルには`status`カラム（`string`型）が存在するとします。
*   `rails g model Article title:string content:text status:string`などでモデルが作成済み。

### ステップ1: レッド - 失敗するテストを書く

まず、`Article`モデルのテストファイル`test/models/article_test.rb`を開き、新しいテストケースを追加します。

```ruby
# test/models/article_test.rb
require "test_helper"

class ArticleTest < ActiveSupport::TestCase
  test "is not published when status is draft" do
    # 1. 準備 (Arrange)
    article = Article.new(status: 'draft')

    # 2. 実行 (Act) & 3. 検証 (Assert)
    assert_not article.published?, "Draft article should not be considered published"
  end
end
```

このテストは、「`status`が`'draft'`の`Article`インスタンスを作成し、そのインスタンスの`published?`メソッドを呼び出すと`false`（または`nil`）が返ってくるはずだ」という仕様をコードで表現しています。

当然、まだ`published?`メソッドは存在しないので、このテストを実行するとエラーになります。ターミナルで以下のコマンドを実行してみましょう。

```bash
rails test test/models/article_test.rb
```

結果はエラー（レッド）になるはずです。

```
Error:
ArticleTest#test_is_not_published_when_status_is_draft:
NoMethodError: undefined method `published?' for #<Article:0x00000....>
```

これで最初のステップ「レッド」は完了です。実装すべき目標が明確になりました。

### ステップ2: グリーン - テストをパスさせる

次に、この`NoMethodError`を解消し、テストをパスさせるための最小限のコードを`Article`モデルに実装します。

```ruby
# app/models/article.rb
class Article < ApplicationRecord
  def published?
    false
  end
end
```

これでは不十分に思えるかもしれませんが、「`published?`が`false`を返す」という現在のテストケースを満たすには、これで十分です。完璧な実装は次のサイクルで行います。

再度テストを実行します。

```bash
rails test test/models/article_test.rb
```

今度はテストが成功（グリーン）するはずです。

```
Finished in 0.12345s, 8.1000 runs/s, 8.1000 assertions/s.
1 runs, 1 assertions, 0 failures, 0 errors, 0 skips
```

### ステップ3: リファクタリング（と次のサイクル）

テストが通ったので、安心してリファクタリングができます。しかし、現在の実装は明らかに不完全です。「`status`が`'published'`のときは`true`を返す」という仕様が欠けています。

そこで、次のTDDサイクルに入ります。

#### レッド（2回目）

新しい仕様のためのテストを追加します。

```ruby
# test/models/article_test.rb
class ArticleTest < ActiveSupport::TestCase
  # ... 既存のテスト ...

  test "is published when status is published" do
    article = Article.new(status: 'published')
    assert article.published?, "Published article should be considered published"
  end
end
```

この状態でテストを実行すると、新しく追加したテストが失敗します（レッド）。

```
Failure:
ArticleTest#test_is_published_when_status_is_published [test/models/article_test.rb:13]:
Published article should be considered published.
Expected: true
  Actual: false
```

#### グリーン（2回目）

この新しいテストもパスさせるように、モデルのコードを修正します。

```ruby
# app/models/article.rb
class Article < ApplicationRecord
  def published?
    self.status == 'published'
  end
end
```

再度テストを実行すると、今度は2つのテストが両方とも成功するはずです（グリーン）。

#### リファクタリング（2回目）

現在の実装はシンプルで明確なので、特にリファクタリングの必要はなさそうです。これで`published?`メソッドの基本的な実装は完了です。

## TDDのメリット

*   **設計の改善**: テストを先に書くことで、その機能がどのように使われるかを考えることになり、よりクリーンで使いやすいインターフェースの設計につながります。
*   **網羅性の向上**: 仕様を一つずつテストに落とし込んでいくため、実装すべき機能の漏れが少なくなります。
*   **安心感**: 堅牢なテストスイートが「安全網」となり、リファクタリングや機能追加を恐れずに行うことができます。
*   **動くドキュメント**: テストコード自体が、そのクラスやメソッドがどのように振る舞うべきかを示す「生きたドキュメント」になります。

## まとめ

テスト駆動開発は、単にバグを見つけるための手法ではありません。ソフトウェアの設計を改善し、開発プロセスに自信とリズムをもたらすための強力なプラクティスです。

RailsとMinitestが提供する環境は、TDDを始めるのに最適です。最初は少し回りくどく感じるかもしれませんが、このレッド→グリーン→リファクタリングのサイクルに慣れることで、コードの品質と開発の生産性は確実に向上するでしょう。ぜひ、次の小さな機能からTDDを試してみてください。
