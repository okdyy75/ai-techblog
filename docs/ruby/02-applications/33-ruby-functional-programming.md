# Rubyにおける関数型プログラミング

Rubyは純粋なオブジェクト指向言語として知られていますが、関数型プログラミング（Functional Programming, FP）の要素も多く取り入れています。関数型プログラミングのパラダイムを活用することで、より宣言的で、予測可能で、保守しやすいコードを書くことができます。

この記事では、Rubyで関数型プログラミングの主要な概念をどのように活用できるかを探ります。

## 関数型プログラミングの核となる概念

1.  **第一級関数 (First-Class Functions)**: 関数が他の値（数値や文字列など）と同じように扱えること。変数に代入したり、引数として渡したり、戻り値として返すことができます。
2.  **不変性 (Immutability)**: データが一度作成されたら変更されないこと。
3.  **副作用の回避 (Avoiding Side Effects)**: 関数の実行が、その関数のスコープ外の状態を変更しないこと。

## Rubyでの実践

### 1. 第一級関数: `Proc`と`lambda`

Rubyでは、`Proc`オブジェクトや`lambda`を使うことで、関数をオブジェクトとして���うことができます。

```ruby
# Procを引数として受け取るメソッド
def apply_operation(a, b, operation)
  operation.call(a, b)
end

# 処理をProcオブジェクトとして定義
add = ->(x, y) { x + y }
subtract = Proc.new { |x, y| x - y }

puts apply_operation(5, 3, add)      #=> 8
puts apply_operation(5, 3, subtract) #=> 2
```

`map`, `select`, `reduce`などの`Enumerable`モジュールのメソッドは、ブロック（`Proc`の一種）を受け取ることで、この特性を最大限に活用しています。

### 2. 不変性: `freeze`とイミュータブルなデータ構造

Rubyのオブジェクトはデフォルトでミュータブル（変更可能）ですが、`freeze`メソッドを使うことでイミュータブル（変更不可）にすることができます。

```ruby
name = "Alice".freeze
# name << " Wonder" #=> FrozenError: can't modify frozen String

# 配列やハッシュもfreeze可能
numbers = [1, 2, 3].freeze
# numbers << 4 #=> FrozenError
```

関数型のアプローチでは、元のデータを変更する代わりに、新しいデータ構造を返すことを好みます。

```ruby
# 破壊的なメソッド (副作用あり)
arr = [1, 2, 3]
arr.map! { |n| n * 2 } #=> arrは [2, 4, 6] に変更��れる

# 非破壊的なメソッド (副作用なし)
arr = [1, 2, 3]
new_arr = arr.map { |n| n * 2 } #=> arrは [1, 2, 3] のまま
```

Ruby 3.2で導入された`Data`クラスは、イミュータブルな値オブジェクトを簡単に作成するための優れた方法です。

```ruby
Point = Data.define(:x, :y)
p1 = Point.new(1, 2)
# p1.x = 5 #=> NoMethodError
```

### 3. 副作用の回避

副作用のない関数は「純粋関数（Pure Function）」と呼ばれます。純粋関数は、同じ入力に対して常に同じ出力を返し、外部の状態に依存したり変更したりしません。

```ruby
# 副作用のある関数の例
$total = 0
def add_to_total(n)
  $total += n # グローバル変数を変更している (副作用)
end

# 純粋関数の例
def add(a, b)
  a + b # 引数のみに依存し、外部の状態を変更しない
end
```

純粋関数でプログラムを構成することで、コードの振る舞いが予測しやすくなり、テストやデバッグが容易になります。

## メソッドチェーンによる宣言的なコード

Rubyの`Enumerable`モジュールは、関数型プログラミングのスタイルを促進する素晴らしい例です。メソッドチェーンを使うことで、何をしたいのかを宣言的に記述できます。

```ruby
# 命令的なスタイル
numbers = [1, 2, 3, 4, 5, 6]
evens_squared = []
numbers.each do |n|
  if n.even?
    evens_squared << n * n
  end
end
p evens_squared #=> [4, 16, 36]

# 関数型・宣言的なスタイル
evens_squared_fp = numbers.select(&:even?)
                           .map { |n| n * n }
p evens_squared_fp #=> [4, 16, 36]
```

後者のスタイルは、処理の「方法」ではなく「内容」を記述しており、可読性が高く、意図が明確です。

## まとめ

Rubyはオブジェクト指向言語でありながら、関数型プログラミングの強力な機能を取り入れています。

- `Proc`や`lambda`による第一級関数
- `freeze`や非破壊的メソッドによる不変性の促進
- 純粋関数による副作用の管理

これらの概念を意識的に取り入れることで、Rubyのコードをより堅牢で、再利用可能で、理解しやすいものにすることができます。関数型の考え方は、現代的なソフトウェア開発において非常に価値のあるスキルセットです。