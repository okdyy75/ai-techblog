
# Rubyの例外処理

プログラムの実行中にエラーが発生すると、例外 (Exception) が発生します。例外が発生するとプログラムは停止してしまいますが、例外処理を記述することで、エラーから復帰したり、エラーに応じた処理を行ったりすることができます。

## begin / rescue / end

Rubyの例外処理は、`begin`-`rescue`ブロックを使います。

```ruby
begin
  # 例外が発生する可能性のある処理
  result = 10 / 0
  puts result
rescue
  # 例外が発生した場合に実行される処理
  puts "An error occurred!"
end

puts "Program continued."
#=> An error occurred!
#=> Program continued.
```

上記の例では、`10 / 0`で`ZeroDivisionError`という例外が発生します。`rescue`節がその例外を捕捉し、メッセージを出力した後、プログラムは停止せずに続行されます。

### 特定の例外を捕捉する

`rescue`に例外クラスを指定することで、特定の種類の例外のみを捕捉できます。

```ruby
begin
  # ...
  file = File.open("non_existent_file.txt")
  result = 10 / 0
rescue ZeroDivisionError
  puts "Cannot divide by zero."
rescue Errno::ENOENT
  puts "File not found."
end
```

複数の例外を一度に指定することもできます。

```ruby
begin
  # ...
rescue ZeroDivisionError, TypeError => e
  puts "An error occurred: #{e.class}"
end
```

### 例外オブジェクトの利用

`rescue`節で、発生した例外オブジェクトを��数に格納できます。例外オブジェクトからは、エラーメッセージやバックトレース（エラーが発生するまでのメソッド呼び出し履歴）などの詳細な情報を取得できます。

```ruby
begin
  10 / 0
rescue => e
  puts "Error class: #{e.class}"
  puts "Error message: #{e.message}"
  puts "Backtrace:"
  puts e.backtrace
end
```

`rescue`の後に例外クラスを省略した場合、デフォルトで`StandardError`とそのサブクラスが捕捉されます。`rescue => e` は `rescue StandardError => e` とほぼ同義です。

## else / ensure

`begin`-`rescue`ブロックには、`else`と`ensure`という節を追加できます。

### else

`else`節は、`begin`ブロックで例外が**発生しなかった**場合にのみ実行されます。

```ruby
begin
  puts "Opening file..."
  file = File.open("some_file.txt", "w")
  # 例外が発生する可能性のある処理
  file.puts "Hello"
rescue => e
  puts "Error: #{e.message}"
else
  puts "File written successfully."
ensure
  puts "Closing file..."
  file.close if file
end
```

### ensure

`ensure`節は、例外の発生**有無にかかわらず**、`begin`ブロックの処理が終わった後に必ず実行されます。ファイルのクローズやデータベース接続の解放など、後片付け処理を記述するのに適しています。

```ruby
file = nil
begin
  file = File.open("some_file.txt")
  # ... file processing ...
  raise "An intentional error"
rescue => e
  puts "Caught an exception: #{e.message}"
ensure
  puts "Ensuring file is closed."
  file.close if file
end
```

## raise

`raise`メソッドを使うと、意図的に例外を発生させることができます。

```ruby
def check_age(age)
  if age < 0
    raise ArgumentError, "Age cannot be negative."
  end
  puts "Age is valid."
end

begin
  check_age(-5)
rescue ArgumentError => e
  puts e.message
end
#=> Age cannot be negative.
```

`raise`に何も指定しない場合、カレントの例外 (`$!`) を再発生させます。これは、例外を捕捉してログなどに記録した後、さらに���位の呼び出し元に例外処理を委ねたい場合などに使います。

```ruby
begin
  # ...
rescue => e
  log_error(e)
  raise # 例外を再発生させる
end
```

## メソッド定義におけるbegin/endの省略

メソッド定義全体を例外処理の対象とする場合、`begin`と`end`を省略できます。

```ruby
def divide(a, b)
  a / b
rescue ZeroDivisionError
  "Cannot divide by zero"
end

puts divide(10, 2) #=> 5
puts divide(10, 0) #=> Cannot divide by zero
```

## まとめ

- `begin`-`rescue`で例外を捕捉する。
- `rescue`には特定の例外クラスを指定できる。
- `=> e`で例外オブジェクトを取得し、詳細な情報を得る。
- `else`は例外が発生しなかった場合に実行される。
- `ensure`は常に最後に実行され、後片付け処理に適している。
- `raise`で意図的に例外を発生させる。

適切な例外処理は、予期せぬエラーが発生してもプログラムが安全に停止または継続できるようにするための、堅牢なソフトウェア開発に不可欠な要素です。
