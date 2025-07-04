
# Rubyメタプログラミング入門

メタプログラミングとは、「コードを書くコードを書く」ことです。Rubyは、その動的な性質と強力なリフレクションAPIにより、メタプログラミングが非常に得意な言語です。メタプログラミングを使いこなすことで、コードの重複を減らし（DRY: Don't Repeat Yourself）、より柔軟で表現力豊かなプログラムを書くことができます。

## メタプログラミングの基本概念

### 1. オープンクラス

Rubyでは、既存のクラスを後から変更（オープン）することができます。これにより、標準ライブラリのクラスに新しいメソッドを追加することも可能です。

```ruby
class String
  def emphasize
    "!!! #{self} !!!"
  end
end

puts "Hello, world".emphasize
#=> !!! Hello, world !!!
```

### 2. `send` メソッド

`send`メソッドを使うと、メソッド名を文字列やシンボルで指定して動的に呼び出すことができます。

```ruby
class Greeter
  def say_hello
    "Hello"
  end

  def say_goodbye
    "Goodbye"
  end
end

greeter = Greeter.new
method_name = :say_hello
puts greeter.send(method_name) #=> "Hello"

method_name = "say_goodbye"
puts greeter.send(method_name) #=> "Goodbye"
```

## メソッドの動的定義

`define_method` を使うと、メソッドを動的に定義できます。これは、似たようなメソッドを多数作成する場合に特に便利です。

例として、複数の色でテキストを出力するメソッドを考えてみましょう。

```ruby
class Logger
  COLORS = {
    red: 31,
    green: 32,
    yellow: 33
  }

  # 各色に対応するメソッドを動的に定義
  COLORS.each do |color_name, color_code|
    define_method("log_#{color_name}") do |text|
      puts "\e[#{color_code}m#{text}\e[0m"
    end
  end
end

logger = Logger.new
logger.log_red("This is an error.")
logger.log_green("This is a success message.")
logger.log_yellow("This is a warning.")
```

`define_method` を使わずに書くと、以下のようになります。

```ruby
class Logger
  def log_red(text)
    puts "\e[31m#{text}\e[0m"
  end

  def log_green(text)
    puts "\e[32m#{text}\e[0m"
  end

  def log_yellow(text)
    puts "\e[33m#{text}\e[0m"
  end
end
```

メタプログラミングを使うことで、コードがより簡潔で保守しやすくなっていることがわかります。

## `method_missing`

オブジェクトに対して未定義のメソッドが呼び出されたときに、Rubyは`NoMethodError`を発生させる代わりに `method_missing` という特別なメソッドを呼び出します。これをオーバーライドすることで、未定義のメソッド呼び出しを捕捉し、独自の処理を行うことができます。

```ruby
class DynamicFinder
  def method_missing(method_name, *args)
    # "find_by_name" のようなメソッド呼び出しを捕捉
    if method_name.to_s.start_with?("find_by_")
      # "name" の部分を取り出す
      attribute = method_name.to_s.split("find_by_").last
      value = args.first
      puts "Searching for a record where #{attribute} is '#{value}'"
      # ここで実際のデータベース検索処理などを行う
    else
      super # 親クラスの method_missing を呼び出す (重要)
    end
  end
end

finder = DynamicFinder.new
finder.find_by_name("Alice")
#=> Searching for a record where name is 'Alice'

finder.find_by_email("bob@example.com")
#=> Searching for a record where email is 'bob@example.com'

# finder.undefined_method #=> NoMethodError (superが呼ばれるため)
```

`method_missing`は非常に強力ですが、乱用するとコードが追跡しにくくなるため、注���が必要です。また、パフォーマンス上のオーバーヘッドもあります。

## `instance_eval` と `class_eval`

- `instance_eval`: 特定のオブジェクトのコンテキストでコードブロックを実行します。そのオブジェクトのインスタンス変数にアクセスできます。
- `class_eval` (または `module_eval`): 特定のクラス（またはモジュール）のコンテキストでコードブロックを実行します。そのクラスのメソッドを定義するのに使われます。

### `instance_eval` の例

```ruby
class MyClass
  def initialize
    @secret = "a secret value"
  end
end

obj = MyClass.new
# 通常は @secret にアクセスできない
# puts obj.secret #=> NoMethodError

# instance_eval を使ってアクセスする
secret_value = obj.instance_eval { @secret }
puts secret_value #=> "a secret value"
```

### `class_eval` の例

```ruby
class MyOtherClass
end

# class_eval を使って動的にメソッドを定義
MyOtherClass.class_eval do
  def say_hello
    "Hello from a dynamically defined method!"
  end
end

obj = MyOtherClass.new
puts obj.say_hello
#=> Hello from a dynamically defined method!
```

これは `define_method` を使った例と似ていますが、`class_eval` はより広範なクラス定義のコンテキストを提供します。

## まとめ

Rubyのメタプログラミングは、DRY原則を徹底し、柔軟で強力なライブラリやDSL（ドメイン固有言語）を構築するための鍵となります。

- **オープンクラス**: 既存のクラスを拡張する。
- **`send`**: メソッドを動的に呼び出す。
- **`define_method`**: メソッドを動的に定義する。
- **`method_missing`**: 未定義のメソッド呼び出しをフックする。
- **`instance_eval` / `class_eval`**: 特定のコンテキストでコードを実行する。

これらのテクニックは非常に強力ですが、コードの可読性やデバッグのしやすさを損なう可能性もあります。使いどころを見極め、慎重に利用することが重要です。
