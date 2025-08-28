# Rubyのパターンマッチング

Ruby 2.7で導入されたパターンマッチングは、複雑な条件分岐を簡潔かつ直感的に記述するための強力な機能です。オブジェクトの構造や値に基づいて処理を分岐させることができます。

## 基本構文

パターンマッチングは`case`式と`in`節を組み合わせて使用します。

```ruby
case expression
in pattern1
  # pattern1にマッチした場合の処理
in pattern2
  # pattern2にマッチした場合のcieの処理
else
  # どのパターンにもマッチしなかった場合の処理
end
```

## 配列のパターンマッチング

配列の要素や長さに応じてマッチングさせることができます。

```ruby
array = [1, 2, 3]

case array
in [1, a, b]
  puts "a: #{a}, b: #{b}" #=> a: 2, b: 3
end
```

`*`を使うことで、可変長の要素をキャプチャできます。

```ruby
case [1, 2, 3, 4, 5]
in [1, *re, 5]
  puts "rest: #{rest}" #=> rest: [2, 3, 4]
end
```

## ハッシュのパターンマッチング

ハッシュのキーと値に基づいて���ッチングします。

```ruby
hash = { a: 1, b: 2 }

case hash
in { a: 1, b: val }
  puts "val: #{val}" #=> val: 2
end
```

キーが存在することだけを確認したい場合は、値の部分を省略できます。

```ruby
case { a: 1, b: 2, c: 3 }
in { a:, **rest }
  puts "a: #{a}, rest: #{rest}" #=> a: 1, rest: { b: 2, c: 3 }
end
```

## オブジェクトのパターンマッチング

自作クラスのオブジェクトに対してもパターンマッチングを適用できます。`deconstruct`と`deconstruct_keys`メソッドを定義することで、それぞれ配列とハッシュのパターンに対応します。

```ruby
class Point
  attr_reader :x, :y

  def initialize(x, y)
    @x = x
    @y = y
  end

  def deconstruct
    [@x, @y]
  end

  def deconstruct_keys(keys)
    { x: @x, y: @y }
  end
end

point = Point.new(10, 20)

case point
in Point(10, y)
  puts "y: #{y}" #=> y: 20
in Point(x:, y:)
  puts "x: #{x}, y: #{y}" #=> x: 10, y: 20
end
```

## ガード節

`if`や`unless`を`in`節に追加することで、より複雑な条件を指定できます。

```ruby
case [1, "hello"]
in [a, str] if a.is_a?(Integer) && str.length > 3
  puts "Matched" #=> Matched
end
```

パターンマッチングは、JSONデータのパースや複雑な状態を持つオブジェクトの処理など、多くの場面でコードをクリーンで読みやすくするのに役立ちます。
