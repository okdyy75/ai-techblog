# Rubyのブロック、Proc、Lambda

Rubyの強力な機能の一つに、コードの断片をオブジェクトとして扱える「クロージャ」があります。Rubyでは、ブロック、Proc、Lambdaという3つの形式でクロージャを実現します。

## ブロック (Block)

ブロックは、メソッド呼び出しに渡すことができるコードの塊です。`do ... end` または `{ ... }` で定義します。ブロックは単独では存在できず、常にメソッドと一緒に使われます。

```ruby
# eachメソッドにブロックを渡す
[1, 2, 3].each do |num|
  puts num * 2
end

# mapメソッドにブロックを渡す
names = ["alice", "bob", "carol"]
capitalized_names = names.map { |name| name.capitalize }
p capitalized_names #=> ["Alice", "Bob", "Carol"]
```

### ブロックを受け取るメソッドの定義

メソッド内で`yield`キーワードを使うと、渡されたブロックを実行できます。

```ruby
def my_method
  puts "--- start ---"
  yield # ブロックを実行
  puts "--- end ---"
end

my_method do
  puts "This is inside the block."
end
#=> --- start ---
#=> This is inside the block.
#=> --- end ---
```

`yield`に引数を渡すと、ブロックの引数として受け取ることができます。

```ruby
def greet(name)
  greeting = yield(name)
  puts greeting
end

greet("Alice") { |n| "Hello, #{n}!" } #=> "Hello, Alice!"
greet("Bob") { |n| "Hi, #{n}!" }     #=> "Hi, Bob!"
```

## Proc (Procedure)

Procは、ブロックをオブジェクト化したものです。これにより、ブロックを変数に格納したり、メソッドの引数として渡したりすることができます。

`Proc.new` または `proc` メソッドで生成します。

```ruby
# Procオブジェクトを作成
my_proc = Proc.new { |name| puts "Hello, #{name}!" }

# callメソッドで実行
my_proc.call("Alice") #=> "Hello, Alice!"
my_proc.call("Bob")   #=> "Hello, Bob!"

# Procをメソッドの引数として渡す
def execute_proc(p)
  p.call("Charlie")
end

execute_proc(my_proc) #=> "Hello, Charlie!"
```

### `&` 演算子

メソッドの引数リストの最後に `&` を付けた引数を置くと、そのメソッドに渡されたブロックをProcオブジェクトに変換して受け取ることができます。

```ruby
def my_method(&block)
  puts block.class #=> Proc
  block.call
end

my_method { puts "This is a block." }
```

逆に、Procオブジェクトをメソッドにブロックとして渡す場合も `&` を使います。

```ruby
words = ["apple", "banana", "cherry"]
upcase_proc = Proc.new { |word| word.upcase }

p words.map(&upcase_proc) #=> ["APPLE", "BANANA", "CHERRY"]
```

## Lambda

Lambdaは、Procの一種ですが、いくつかの点で挙動が異なります。`lambda`メソッドまたは `->` (stab) 構文で生成します。

```ruby
# lambdaメソッド
my_lambda = lambda { |x, y| x + y }
puts my_lambda.call(3, 5) #=> 8

# -> 構文 (アロー演算子)
another_lambda = ->(x, y) { x * y }
puts another_lambda.call(3, 5) #=> 15
```

## ProcとLambdaの違い

### 1. 引数の数の厳密さ

- **Lambda**: 引数の数を厳密にチェックします。数が合わないと`ArgumentError`が発生します。
- **Proc**: 引数の数が合わなくてもエラーにならず、足りない引数は`nil`になり、余分な引数は無視されます。

```ruby
my_lambda = ->(a, b) { puts "a: #{a}, b: #{b}" }
my_proc = Proc.new { |a, b| puts "a: #{a}, b: #{b}" }

my_lambda.call(1, 2) #=> a: 1, b: 2
# my_lambda.call(1)    #=> ArgumentError

my_proc.call(1, 2)   #=> a: 1, b: 2
my_proc.call(1)      #=> a: 1, b:
```

### 2. `return` の挙動

- **Lambda**: `return`はLambda自身から抜けるだけです。呼び出し元のメソッドの処理は続行されます。
- **Proc**: `return`は、Procが定義されたスコープ（通常はメソッド）から抜けます。

```ruby
def lambda_test
  my_lambda = -> { return "from lambda" }
  puts my_lambda.call
  puts "after lambda"
  return "from method"
end

puts lambda_test
#=> from lambda
#=> after lambda
#=> from method

def proc_test
  my_proc = Proc.new { return "from proc" }
  puts my_proc.call # この時点でproc_testメソッドからreturnする
  puts "after proc" # この行は実行されない
  return "from method"
end

puts proc_test
#=> from proc
```

## まとめ

| 機能 | ブロック | Proc | Lambda |
| :--- | :--- | :--- | :--- |
| オブジェクト化 | × | ○ | ○ |
| 引数の数 | 柔軟 | 柔軟 | 厳密 |
| `return`の挙動 | (メソッドから抜ける) | メソッドから抜ける | Lambdaから抜ける |

ブロックは、`each`や`map`などのイテレータで最も一般的に使われます。コードの断片を再利用したい場合や、後で実行したい場合にはProcやLambdaが便利です。特に、引数のチェックや`return`の挙動をメソッドのようにしたい場合はLambdaを選択すると良いでしょう。