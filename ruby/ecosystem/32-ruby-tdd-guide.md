# RubyでのTDD（テスト駆動開発）実践ガイド

テスト駆動開発（TDD）は、ソフトウェア開発の手法の一つで、「テストを先に書く」ことを特徴とします。このアプローチにより、コードの品質向上、リファクタリングの容易化、そして設計の改善が期待できます。

このガイドでは、Rubyの標準テストライブラリである`Minitest`を使い、TDDの基本的なサイクルを実践します。

## TDDのサイクル

TDDは、以下の3つのステップを繰り返すことで開発を進めます。

1.  **Red**: 失敗するテストを書く。
2.  **Green**: テストをパスするための最小限のコードを書く。
3.  **Refactor**: コードをクリーンにする（リファクタリング）。

このサイクルを「Red-Green-Refactor」と呼びます。

## 実践：シンプルな電卓クラスの作成

例として、2つの数値を足し算する`Calculator`クラスをTDDで作成してみましょう。

### 準備

まず、テストファイルを作成します。

```ruby
# calculator_test.rb
require "minitest/autorun"

class CalculatorTest < Minitest::Test
  def test_addition
    # 未実装のテスト
  end
end
```

### Step 1: Red - 失敗するテストを書く

`Calculator`クラスが`add`メソッドを持つことを期待するテストを書きます。この時点では`Calculator`クラスも`add`メソッドも存在しないため、このテストは失敗します。

```ruby
# calculator_test.rb
require "minitest/autorun"
# require_relative "calculator" # まだファイルは存在しない

class CalculatorTest < Minitest::Test
  def test_addition
    calculator = Calculator.new
    assert_equal 4, calculator.add(2, 2)
  end
end
```

このテストを実行すると、`NameError: uninitialized constant CalculatorTest::Calculator`というエラーが発生します。これが「Red」のステップです。

### Step 2: Green - テストをパスする最小限のコードを書く

次に、このテストをパスさせるための最小限のコードを記述します。

```ruby
# calculator.rb
class Calculator
  def add(a, b)
    4 # とりあえず4を返す
  end
end
```

そして、テストファイルで`calculator.rb`を読み込みます。

```ruby
# calculator_test.rb
require "minitest/autorun"
require_relative "calculator"

class CalculatorTest < Minitest::Test
  def test_addition
    calculator = Calculator.new
    assert_equal 4, calculator.add(2, 2)
  end
end
```

この状態でテストを実行すると、テストは成功します。これが「Green」のステップです。

### Step 3: Refactor - コードをリファクタリングする

現在の`add`メソッドは`4`を返すだけで、汎用性がありません。これをリファクタリングして、任意の数値を足し算できるように修正します。

```ruby
# calculator.rb
class Calculator
  def add(a, b)
    a + b
  end
end
```

リファクタリング後、再度テストを実行し、成功することを確認します。

### 新しい要件の追加（サイクルの繰り返し）

次に、異なる数値の組み合わせでも正しく動作するかテストを追加します。

```ruby
# calculator_test.rb
# ...
class CalculatorTest < Minitest::Test
  def test_addition
    calculator = Calculator.new
    assert_equal 4, calculator.add(2, 2)
    assert_equal 10, calculator.add(5, 5) # 新しいテストケース
    assert_equal 0, calculator.add(-1, 1) # 境界値のテスト
  end
end
```

このテストを実行すると、現在の実装で全てのテストが成功することがわかります。もし失敗した場合は、再度Green -> Refactorのステップを踏みます。

## TDDのメリット

- **安全���リファクタリング**: テストがコードの振る舞いを保証してくれるため、安心してコードの改善に取り組めます。
- **設計の改善**: テストしやすいコードを書くことは、必然的に疎結合で責務が明確な設計につながります。
- **ドキュメントとしての役割**: テストコードは、そのコードがどのように動作すべきかを示す生きたドキュメントとなります。

## まとめ

TDDは、単なるテスト手法ではなく、高品質なソフトウェアを効率的に生み出すための開発サイクルです。最初は手間に感じるかもしれませんが、慣れると開発のリズムが生まれ、自信を持ってコードを出荷できるようになります。

RubyとMinitestを使って、ぜひTDDの世界に飛び込んでみてください。