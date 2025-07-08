# Rubyの制御構文

プログラムの流れを制御するための構文は、プログラミングの基本です。Rubyは、直感的で読みやすい制御構文を提供しています。

## 条件分岐

### if / else / elsif

`if`は、条件が真の場合に処理を実行します。

```ruby
score = 85

if score >= 80
  puts "Great!"
elsif score >= 60
  puts "Good."
else
  puts "Keep trying."
end
```

### unless

`unless`は、`if`の逆で、条件が偽の場合に処理を実行します。

```ruby
is_raining = false

unless is_raining
  puts "Let's go for a walk."
end
```

これは `if !is_raining` と同じ意味です。

### case

複数の条件を比較する場合には、`case`文が便利です。

```ruby
signal = "green"

case signal
when "red"
  puts "Stop"
when "yellow"
  puts "Caution"
when "green"
  puts "Go"
else
  puts "Unknown signal"
end
```

`when`には、複数の値を指定したり、範囲を指定したりすることもできます。

```ruby
score = 85

case score
when 90..100
  puts "A"
when 80..89
  puts "B"
when 60..79
  puts "C"
else
  puts "D"
end
```

## 繰り返し

### while

条件が真である間、処理を繰り返します。

```ruby
count = 0
while count < 5
  puts count
  count += 1
end
```

### until

`while`の逆で、条件が偽である間、処理を繰り返します。

```ruby
count = 0
until count >= 5
  puts count
  count += 1
end
```

### for

`for`ループは、配列や範囲などの繰り返し可能なオブジェクトの各要素に対して処理を実行します。

```ruby
fruits = ["apple", "banana", "cherry"]

for fruit in fruits
  puts fruit
end

for i in 1..5
  puts i
end
```

しかし、Rubyでは`for`よりも、後述する`each`メソッドを使う方が一般的です。

### each メソッド

`each`は、配列やハッシュなどのコレクションオブジェクトが持つメソッドで、各要素をブロックに渡して処理を繰り返します。

```ruby
fruits = ["apple", "banana", "cherry"]

fruits.each do |fruit|
  puts fruit
end

# 1行で書く場合
fruits.each { |fruit| puts fruit }
```

### times メソッド

指定した回数だけ処理を繰り返します。

```ruby
5.times do |i|
  puts "Hello, world! #{i}"
end
```

## ループの制御

### break

ループを途中で中断します。

```ruby
numbers = [1, 2, 3, 4, 5, -1, 6]
numbers.each do |n|
  break if n < 0
  puts n
end
```

### next

現在のイテレーションをスキップし、次のイテレーションに進みます。

```ruby
numbers = [1, 2, 3, 4, 5]
numbers.each do |n|
  next if n.even? # 偶数ならスキップ
  puts n
end
```

## まとめ

Rubyの制御構文は、コードの意図を明確に表現できるように設計されています。特に、`unless`や`each`メソッドなどは、Rubyらしいコードを書く上で重要な要素です。