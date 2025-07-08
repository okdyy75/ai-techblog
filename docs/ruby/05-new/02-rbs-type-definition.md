# RBSによる型定義

RBSは、Rubyのコードに型定義を与えるための言語です。Ruby 3から標準で添付されるようになり、静的型チェックツール（例: `Steep`）と組み合わせて使用することで、コードの品質と保守性を向上させます。

## RBSの基本

RBSファイル（`.rbs`）にRubyコードとは別に型情報を記述します。

**例: `user.rb`**
```ruby
class User
  attr_reader :name, :age

  def initialize(name, age)
    @name = name
    @age = age
  end

  def adult?
    age >= 20
  end
end
```

**例: `user.rbs`**
```rbs
class User
  attr_reader name: String
  attr_reader age: Integer

  def initialize: (String, Integer) -> void

  def adult?: () -> bool
end
```

## 型の種類

RBSでは、基本的な型から複雑な型までサポートされています。

- **基本型**: `String`, `Integer`, `bool` (trueまたはfalse), `void` (値を返さない)
- **リテラル型**: `"hello"`, `123`, `true`
- **nil許容型**: `?String` (`String | nil`のエイリアス)
- **配列**: `Array[String]`
- **ハッシ��**: `Hash[Symbol, String]`
- **タプル**: `[String, Integer]`
- **ユニオン型**: `String | Integer`
- **インターフェース**: `_ToStr`のように`_`で始まる名前で定義し、特定のメソッドを持つことを要求します。

```rbs
interface _ToStr
  def to_s: () -> String
end

def show: (_ToStr) -> void
```

## メソッドの型定義

メソッドの引数と返り値の型を定義します。

```rbs
class Calculator
  def add: (Integer, Integer) -> Integer
  def div: (Integer, Integer) -> (Integer | nil)
  def greeting: (String name, ?Integer age) -> String
  def process: () { (String) -> void } -> void
end
```

- `(Integer, Integer) -> Integer`: 2つの`Integer`を引数に取り、`Integer`を返す。
- `(Integer | nil)`: `Integer`または`nil`を返す可能性がある。
- `?Integer`: `age`が省略可能な引数であることを示す。
- `() { (String) -> void } -> void`: ブロック引数を取るメソッド。

## ジェネリクス

クラスやメソッドに型変数を導入することで、汎用的な型定義が可能です。

```rbs
class Box[T]
  attr_reader value: T

  def initialize: (T) -> void
end

# 使用例
# Box[String]
# Box[Integer]
```

RBSを導入することで、ドキュメントとしての役割も果たし、大規模なアプリケーション開発において型安全の恩恵を享受できます。
