
# MinitestとRSpecの比較と使い方

Rubyの世界では、自動テストを記述するためのフレームワークとして、主に**Minitest**と**RSpec**の2つが広く使われています。どちらも優れたツールですが、思想や書き方が大きく異なります。ここでは、両者の特徴、長所と短所を比較し、それぞれの基本的な使い方を紹介します。

## Minitest

Minitestは、Rubyに標準でバンドルされている、軽量で高速なテストフレームワークです。Rubyの標準ライブラリの一部であるため、追加のGemをインストールしなくてもすぐに使い始めることができます。

### 特徴と哲学

- **シンプルで軽量**: Rubyの標準的なクラスとメソッドを使ってテストを記述します。学習コストが低く、Rubyの知識がそのまま活かせます。
- **2つの記法**:
    1.  **Assertion-style (アサーション形式)**: `assert_equal`など、`assert_`で始まるメソッドを使って、期待する結果を検証します。伝統的なxUnit系のスタイルです。
    2.  **Expectation-style (スペック形式)**: `must_equal`など、オブジェクトに対して期待値を記述する、RSpecに似たDSL（ドメイン固有言語）も提供します。
- **高速**: 依存関係が少なく、非常に高速に動作します。

### Minitestの基本的な書き方 (Assertion-style)

```ruby
# test/calculator_test.rb
require 'minitest/autorun'
require_relative '../lib/calculator' # テスト対象のファイルを読み込む

# テストクラスは Minitest::Test を継承する
class CalculatorTest < Minitest::Test
  # test_ で始まるメソッドがテストケースとして実行される
  def test_add
    calculator = Calculator.new
    # assert_equal: 期待値と実際の値が等しいことを検証
    assert_equal 4, calculator.add(2, 2)
    assert_equal 0, calculator.add(-1, 1)
  end

  def test_subtract
    calculator = Calculator.new
    assert_equal 2, calculator.subtract(5, 3)
  end
end
```

### Minitestの基本的な書き方 (Expectation-style)

```ruby
# test/calculator_spec.rb
require 'minitest/autorun'
require_relative '../lib/calculator'

# describeブロックでテスト対象を記述
describe Calculator do
  # itブロックで個々のテストケースを記述
  it "adds two numbers" do
    calculator = Calculator.new
    # expect(actual).to ... の形式に似たDSL
    calculator.add(2, 2).must_equal 4
  end
end
```

## RSpec

RSpecは、BDD (Behavior-Driven Development / 振る舞い駆動開発) のために設計された、非常に表現力豊かなDSLを持つテストフレームワークです。自然言語に近い形でテストを記述できるため、仕様書のように読むことができます。

### 特徴と哲学

- **表現力豊かなDSL**: `describe`, `context`, `it`, `expect`などのキーワードを使い、テストの意図を明確に記述できます。
- **BDDのサポート**: 「振る舞い」を記述することに焦点を当てており、テストがそのまま仕様書の役割を果たします。
- **豊富なマッチャー**: `eq`, `be_truthy`, `include`, `raise_error`など、さまざまな状況に対応するマッチャーが用意されています。
- **拡張性**: 豊富なエコシステム（`rspec-rails`, `factory_bot`, `shoulda-matchers`など）があり、Rails開発などで強力なサポートを受けられます。

### RSpecの基本的な書き方

```ruby
# spec/calculator_spec.rb
require 'calculator' # テスト対象のファイルを読み込む

RSpec.describe Calculator do
  # describe: テスト対象のクラスやメソッドを記述
  describe "#add" do
    # context: 特定の状況や文���を記述
    context "with positive numbers" do
      # it: テストケースの振る舞いを記述
      it "returns the sum of the numbers" do
        calculator = Calculator.new
        # expect(actual).to matcher(expected)
        expect(calculator.add(2, 3)).to eq(5)
      end
    end

    context "with negative numbers" do
      it "returns the correct sum" do
        calculator = Calculator.new
        expect(calculator.add(-1, -5)).to eq(-6)
      end
    end
  end
end
```

## Minitest vs RSpec: どちらを選ぶか？

| 項目 | Minitest | RSpec |
| :--- | :--- | :--- |
| **哲学** | シンプル、軽量、"Just Ruby" | BDD、表現力、DSL |
| **構文** | Rubyのクラスとメソッド | 独自のDSL |
| **学習曲線** | 緩やか | やや急 |
| **速度** | 速い | やや遅い |
| **標準装備** | Rubyに同梱 | Gemとしてインストール |
| **エコシステム** | Railsに統合 | 非常に豊富 (特にRails周り) |
| **コミュニティ** | Railsコアチームが使用 | Railsコミュニティで非常に人気 |

### Minitestを選ぶ理由

- **シンプルさが好き**: Rubyの標準的な書き方でテストを書きたい。魔法のようなDSLは避けたい。
- **速度を重視する**: テストスイートの実行時間を少しでも短くしたい。
- **依存を減らしたい**: プロジェクトの依存Gemを最小限に抑えたい。
- **Gemライブラリを作成している**: ライブラリのテストには、軽量なMinitestが好まれる傾向があります。

### RSpecを選ぶ理由

- **BDDの思想に共感する**: テストを仕様書として扱いたい。
- **可読性を重視する**: 自然言語に近い形で、誰が読んでも理解しやすいテストを書きたい。
- **豊富な機能とエコシステムを活用したい**: Rails開発で`factory_bot`や`shoulda-matchers`などの便利なツールと組み合わせて効率的にテストを書きたい。
- **チームの共通言語として**: 多くのRails開発者がRSpecに慣れているため、チーム開発での生産性が向上する可能性がある。

## まとめ

MinitestとRSpecは、どちらもRubyにおけるテスト駆動開発を支える優れたフレームワークです。

- **Minitest**は、**シンプルさ、速さ、Rubyらしさ**を求める場合に適しています。
- **RSpec**は、**表現力、可読性、BDDの思想**を重視する場合に強力な選択肢となります。

最終的な選択は、プロジェクトの要件やチームの好みに依存します。Railsの新規プロジェクトでは、`rails new`コマンドのオ���ション（`--skip-test`の後に手動でRSpecを導入するか、デフォルトのMinitestを使うか）でどちらかを選択することになります。両方の基本的な書き方を理解しておき、状況に応じて適切なツールを選べるようにしておくことが重要です。
