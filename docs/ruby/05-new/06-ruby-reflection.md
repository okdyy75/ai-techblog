# Rubyのリフレクション機能

リフレクションとは、プログラムが実行時に自分自身の構造（クラス、メソッド、変数など）を調査し、操作する能力のことです。Rubyは動的な性質を持つため、強力なリフレクション機能が備わっています。

## 1. クラスとオブジェクトの情報を取得する

- **`class`**: オブジェクトのクラスを取得します。
- **`is_a?`, `kind_of?`**: クラスやモジュールを継承しているか確認します。
- **`instance_of?`**: そのクラスの直接のインスタンスであるか確認します。
- **`respond_to?`**: 特定のメソッドを持つか確認します。

```ruby
str = "hello"
p str.class         #=> String
p str.is_a?(Object) #=> true
p str.instance_of?(String) #=> true
p str.respond_to?(:upcase) #=> true
```

## 2. メソッドに関する情報を取得・操作する

- **`methods`**: publicメソッドの一覧を取得します。
- **`instance_methods`**: インスタンスメソッドの一覧を取得します。
- **`private_methods`**: privateメソッドの一覧を取得します。
- **`send`, `public_send`**: メソッド名をシンボルや文字列で指定して動的に呼び出します。`send`はprivateメソッドも呼び出せます。

```ruby
class Greeter
  def initialize(name)
    @name = name
  end

  def say_hello
    "Hello, #{@name}"
  end

  private

  def secret_message
    "This is a secret."
  end
end

greeter = Greeter.new("Alice")
p greeter.public_methods.grep(/say/) #=> [:say_hello]

# メソッドの動的呼び出し
p greeter.send(:say_hello) #=> "Hello, Alice"
p greeter.send(:secret_message) #=> "This is a secret."
# p greeter.public_send(:secret_message) #=> NoMethodError
```

## 3. インスタンス変数とクラス変数を操作する

- **`instance_variables`**: インスタンス変数の一覧を取得します。
- **`instance_variable_get`**: インスタンス変数の値を取得します。
- **`instance_variable_set`**: インスタンス変数に値を設定します。

```ruby
class MyClass
  def initialize
    @my_var = 100
  end
end

obj = MyClass.new
p obj.instance_variables #=> [:@my_var]
p obj.instance_variable_get(:@my_var) #=> 100

obj.instance_variable_set(:@new_var, 200)
p obj.instance_variable_get(:@new_var) #=> 200
```

## 4. 定数とクラ���を動的に扱う

- **`const_get`**: 定数名（クラス名も含む）からその値を取得します。
- **`const_set`**: 定数に値を設定します。

```ruby
# 文字列からクラスを取得してインスタンス化
class_name = "String"
klass = Object.const_get(class_name)
p klass.new("dynamic") #=> "dynamic"

# 動的にクラスを定義
Object.const_set("MyDynamicClass", Class.new do
  def greet
    "Hello from a dynamic class!"
  end
end)

p MyDynamicClass.new.greet #=> "Hello from a dynamic class!"
```

リフレクションは、メタプログラミングやDSL（ドメイン固有言語）の構築、汎用的なライブラリ開発において非常に強力なツールですが、多用するとコードが複雑で読みにくくなる可能性があるため、注意して使用する必要があります。
