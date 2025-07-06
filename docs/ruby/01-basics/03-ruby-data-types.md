# Rubyのデータ型

Rubyは動的型付け言語であり、変数の型を宣言する必要はありません。値そのものが型情報を持っています。ここでは、Rubyの主要なデータ型について解説します。

## 数値 (Numeric)

Rubyの数値型には、整数 (Integer) と浮動小数点数 (Float) があります。

### 整数 (Integer)

```ruby
a = 10
b = -5
c = 1_000_000 # アンダースコアは無視される
```

### 浮動小数点数 (Float)

```ruby
x = 3.14
y = -0.5
z = 1.2e3 # 指数表現
```

## 文字列 (String)

文字列は、"" (ダブルクォート) または '' (シングルクォート) で囲みます。

### ダブルクォートとシングルクォートの違い

ダブルクォートで囲んだ文字列では、式展開 (`#{...}`) とバックスラッシュ記法 (`\n`, `\t`など) が使えます。

```ruby
name = "Alice"
puts "Hello, #{name}!" #=> Hello, Alice!
puts "Hello\nWorld"
#=> Hello
#=> World
```

シングルクォートでは、これらは無効になります。

```ruby
name = "Alice"
puts 'Hello, #{name}!' #=> Hello, #{name}!
puts 'Hello\nWorld'   #=> Hello\nWorld
```

## 配列 (Array)

複数のオブジェクトを順序付きで格納するコレクションです。

```ruby
fruits = ["apple", "banana", "cherry"]
numbers = [1, 2, 3, 4, 5]
mixed = [1, "apple", true]

puts fruits[0] #=> "apple"
puts numbers.last #=> 5

fruits << "orange" # 要素の追加
puts fruits # ["apple", "banana", "cherry", "orange"]
```

## ハッシュ (Hash)

キーと値のペアでデータを格納するコレクションです。キーには通常、シンボルが使われます。

### シンボルをキーにする場合 (推奨)

```ruby
user = { name: "Bob", age: 25, email: "bob@example.com" }

puts user[:name] #=> "Bob"
```

これは以下の古い記法と同じ意味です。

```ruby
user = { :name => "Bob", :age => 25, :email => "bob@example.com" }
```

### 文字列をキーにする場合

```ruby
config = { "host" => "localhost", "port" => 3000 }

puts config["host"] #=> "localhost"
```

## シンボル (Symbol)

シンボルは、`:`で始まる識別子です。文字列と似ていますが、内部的には整数として扱われ、同じシンボルは常に同じオブジェクトを指します。そのため、ハッシュのキーなど、識別子として使う場合に効率的です。

```ruby
:name
:success
:error_message

puts :name.object_id
puts :name.object_id #=> 同じIDが表示される

puts "name".object_id
puts "name".object_id #=> 異なるIDが表示される
```

## 真偽値 (true, false) と nil

- `true`: 真を表すオブジェクト
- `false`: 偽を表すオブジェクト
- `nil`: 何も存在しないことを表すオブジェクト

Rubyでは、`false`と`nil`のみが偽として扱われ、それ以外のすべてのオブジェクト（`0`や空文字列`""`も含む）は真として扱われます。

## まとめ

Rubyの基本的なデータ型を理解することは、プログラミングの基礎となります。それぞれのデータ型の特性を活かして、適切に使い分けることが重要です.