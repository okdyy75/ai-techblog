
# Rubyの基本構文

Rubyは、シンプルで読みやすい構文が特徴のプログラミング言語です。ここでは、Rubyの基本的な構文である変数、定数、メソッドについて解説します。

## 変数

変数は、データを格納するための名前付きの領域です。Rubyでは、変数の型を明示的に宣言する必要はありません。

### ローカル変数

メソッド内などの特定のスコープでのみ有効な変数です。小文字または`_`で始めます。

```ruby
name = "Alice"
age = 30
_private_variable = "secret"

puts name
puts age
```

### インスタンス変数

クラスのインスタンスごとに存在する変数です。`@`で始めます。

```ruby
class User
  def initialize(name)
    @name = name
  end

  def say_hello
    puts "Hello, I am #{@name}."
  end
end

user = User.new("Bob")
user.say_hello
```

### クラス変数

そのクラスの全てのインスタンスで共有される変数です。`@@`で始めます。

```ruby
class Counter
  @@count = 0

  def initialize
    @@count += 1
  end

  def self.show_count
    puts "Count: #{@@count}"
  end
end

Counter.new
Counter.new
Counter.show_count #=> Count: 2
```

### グローバル変数

プログラムのどこからでもアクセスできる変数です。`$`で始めます。多用は避けるべきとされています。

```ruby
$app_name = "My Awesome App"

def print_app_name
  puts $app_name
end

print_app_name
```

## 定数

定数は、一度代入したら変更すべきでない値を格納します。大文字で始めます。慣習的に、すべて大文字のスネークケースで命名されます。

```ruby
PI = 3.14159
MAX_USERS = 100
```

定数を再代入しようとすると、警告が表示されますが、値は変更されてしまいます。

```ruby
PI = 3.14 #=> warning: already initialized constant PI
```

## メソッド

メソッドは、特定の処理をまとめたものです。`def`キーワードで定義します。

```ruby
def add(a, b)
  return a + b
end

result = add(5, 3)
puts result #=> 8
```

Rubyでは、`return`を省略した場合、最後に評価された式の結果が戻り値となります。

```ruby
def subtract(a, b)
  a - b
end

result = subtract(10, 4)
puts result #=> 6
```

引数がない場合は、括弧を省略できます。

```ruby
def greeting
  "Hello, world!"
end

puts greeting
```

## まとめ

Rubyの基本構文は非常に直感的で、コードの可読性を高めるように設計されています。変数、定数、メソッドの役割と命名規則を理解することが、Rubyプログラミングの第一歩です。
