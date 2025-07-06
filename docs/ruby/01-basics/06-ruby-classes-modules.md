# Rubyのクラスとモジュール

Rubyは純粋なオブジェクト指向言語であり、すべての値はオブジェクトです。クラスとモジュールは、Rubyのオブジェクト指向プログラミングにおける中心的な概念です。

## クラス (Class)

クラスは、オブジェクトの設計図です。同じ属性（インスタンス変数）と振る舞い（メソッド）を持つオブジェクトを生成するために使用します。

### クラスの定義

`class`キーワードを使って定義します。クラス名は大文字で始めます。

```ruby
class Dog
  # インスタンスが生成されるときに呼ばれる初期化メソッド
  def initialize(name, breed)
    @name = name   # インスタンス変数
    @breed = breed
  end

  # インスタンスメソッド
  def bark
    puts "Woof! My name is #{@name}."
  end
end
```

### インスタンスの生成と利用

`new`メソッドでクラスのインスタンス（オブジェクト）を生成します。

```ruby
# Dogクラスのインスタンスを生成
my_dog = Dog.new("Buddy", "Golden Retriever")
another_dog = Dog.new("Lucy", "Poodle")

# メソッドの呼び出し
my_dog.bark      #=> Woof! My name is Buddy.
another_dog.bark #=> Woof! My name is Lucy.
```

### アクセサメソッド

インスタンス変数は、デフォルトではクラスの外から直接アクセスできません。アクセスを許可するために、アクセサメソッドを定義します。

```ruby
class Cat
  def initialize(name)
    @name = name
  end

  # @nameを読み取るためのメソッド (ゲッター)
  def name
    @name
  end

  # @nameに書き込むためのメソッド (セッター)
  def name=(new_name)
    @name = new_name
  end
end

cat = Cat.new("Whiskers")
puts cat.name #=> Whiskers
cat.name = "Tama"
puts cat.name #=> Tama
```

Rubyでは、これらのアクセサメソッドを簡単に定義するための便利なメソッドが用意されています。

- `attr_reader`: ゲッターを定義
- `attr_writer`: セッターを定義
- `attr_accessor`: ゲッターとセッターの両方を定義

```ruby
class Bird
  attr_accessor :name, :species
  # attr_reader :name
  # attr_writer :name

  def initialize(name, species)
    @name = name
    @species = species
  end
end

bird = Bird.new("Poe", "Crow")
puts bird.name      #=> Poe
bird.species = "Raven"
puts bird.species   #=> Raven
```

### クラスメソッド

インスタンスではなく、クラス自身に属するメソッドです。メソッド名の前に`self.`を付けて定義します。

```ruby
class MathHelper
  def self.square(x)
    x * x
  end
end

puts MathHelper.square(5) #=> 25
```

### 継承

あるクラスの機能を引き継いで、新しいクラスを作成することができます。これを継承と呼びます。

```ruby
# Animalクラス (親クラス、スーパークラス)
class Animal
  def speak
    puts "The animal makes a sound."
  end
end

# Dogクラス (子クラス、サブクラス)
class Dog < Animal
  def speak
    puts "Woof!"
  end
end

# Catクラス (子クラス、サブクラス)
class Cat < Animal
  # speakメソッドはAnimalクラスから継承される
end

dog = Dog.new
cat = Cat.new

dog.speak #=> Woof! (オーバーライドされたメソッド)
cat.speak #=> The animal makes a sound. (継承したメソッド)
```

## モジュール (Module)

モジュールは、メソッドや定数をまとめるための仕組みです。クラスと似ていますが、以下の違いがあります。

- モジュールはインスタンスを生成できない。
- モジュールは継承できない。

モジュールには主に2つの用途があります。

### 1. 名前空間の提供

関連するクラスやメソッドをグループ化し、名前の衝突を防ぎます。

```ruby
module MyAuth
  class User
    # ...
  end

  class Session
    # ...
  end
end

user = MyAuth::User.new
session = MyAuth::Session.new
```

### 2. Mix-in (ミックスイン)

モジュールのメソッドをクラスに取り込むことで、クラスに機能を追加します。これは多重継承の代わりとして使われます。`include`キーワードを使います。

```ruby
module Swimmable
  def swim
    puts "I'm swimming!"
  end
end

module Flyable
  def fly
    puts "I'm flying!"
  end
end

class Duck
  include Swimmable
  include Flyable
end

class Fish
  include Swimmable
end

duck = Duck.new
duck.swim #=> I'm swimming!
duck.fly  #=> I'm flying!

fish = Fish.new
fish.swim #=> I'm swimming!
# fish.fly #=> NoMethodError
```

`include`されたモジュールは、クラスの継承チェーンの中間に挿入されます。これにより、あたかもそのモジュールが親クラスであるかのようにメソッドを呼び出すことができます。

## まとめ

- **クラス**: オブジェクトの設計図。`new`でインスタンス化して使う。継承によって階層構造を作れる。
- **モジュール**: メソッドや定数の集まり。インスタンス化できない。名前空間の提供や、Mix-inによる機能追加に使う。

クラスとモジュールを効果的に使い分けることが、Rubyで再利用性が高く、保守しやすいコードを書くための鍵となります。