
# Pry/IRBでのデバッグテクニック

Rubyのプログラミングにおいて、デバッグは避けて通れないプロセスです。幸い、RubyにはIRB (Interactive Ruby) と、それをさらに強力にしたPryという、優れたREPL (Read-Eval-Print Loop) ツールが付属しており、これらを活用することでデバッグ作業を効率的に進めることができます。

## IRB: Rubyの標準REPL

IRBはRubyに標準でバンドルされている対話的実行環境です。ターミナルで`irb`と入力するだけで起動し、Rubyのコードを一行ずつ実行して結果を確認できます。

```bash
irb
irb(main):001:0> 1 + 2
=> 3
irb(main):002:0> "hello".upcase
=> "HELLO"
```

### `binding.irb`: 実行中のコードに割り込む

Ruby 2.4から、`binding.irb`という非常に便利なデバッグ機能が追加されました。コードの中の好きな場所に`binding.irb`と記述すると、プログラムの実行がその場で一時停止し、IRBセッションが起動します。

```ruby
# user.rb
class User
  def initialize(name, age)
    @name = name
    @age = age
  end

  def greeting
    message = "Hi, I'm #{@name}."
    binding.irb # ここで実行が一時停止する
    puts message
  end
end

user = User.new("Alice", 30)
user.greeting
```

このコードを実行すると、`binding.irb`の行で停止し、ターミナルがIRBプロンプトに切り替わります。このスコープ内では、その時点での変数や状態に自由にアクセスできます。

```
From: user.rb @ line 10 User#greeting:

     5:   def greeting
     6:     message = "Hi, I'm #{@name}."
 =>  7:     binding.irb
     8:     puts message
     9:   end

irb(main):001:0> message
=> "Hi, I'm Alice."
irb(main):002:0> @name
=> "Alice"
irb(main):003:0> self
=> #<User:0x00007f9b1a0b3d40 @name="Alice", @age=30>
irb(main):004:0> @age += 1
=> 31
irb(main):005:0> exit # または Ctrl+D でIRBを終了し、プログラムの実行を再開
```

`exit`コマンドでIRBを抜けると、プログラムは停止した次の行から実行を再開します。

## Pry: さらに強力なREPL

Pryは、IRBを大幅に機能強化したGemです。シンタックスハイライト、コードのインデント、より詳細なオブジェクトの表示、ソースコードの閲覧など、多くの便利な機能を備えています。

### インストール

`Gemfile`に追加してインストールします。デバッグ用のツールなので`:development`グループに入れるのが一般的です。

```ruby
# Gemfile
group :development do
  gem 'pry'
  gem 'pry-byebug' # ステップ実行などの機能を追加
  gem 'pry-rails'  # RailsコンソールをPryに置き換える
end
```

```bash
bundle install
```

### `binding.pry`: Pryで割り込む

`binding.irb`と同様に、コード内に`require 'pry'`を記述した上で`binding.pry`と書くと、その場でPryセッションが起動します。

```ruby
require 'pry'

class Calculator
  def add(a, b)
    result = a + b
    binding.pry # ここでPryが起動
    result
  end
end

calc = Calculator.new
calc.add(5, 3)
```

Pryセッションでは、IRBの機能に加えて以下のような強力なコマンドが使えます。

### Pryの主要コマンド

- **`ls`**: 現在のスコープで利用可能な変数やメソッドの一覧を表示します。
    - `ls -v`: インスタンス変数やローカル変数を表示。
    - `ls -m`: メソッドの一覧を表示。
    - `ls MyClass`: `MyClass`のメソッドや定数を表示。

- **`show-doc` / `?`**: メソッドのドキュメントを表示します。
    - `show-doc Array#map`
    - `? user.greeting`

- **`show-source` / `$`**: メ��ッドのソースコードを表示します。
    - `show-source User#greeting`
    - `$ user.greeting`

- **`cd`**: コンテキスト（`self`）を別のオブジェクトに変更します。これにより、そのオブジェクトの内部を探索するのが容易になります。
    ```pry
    [1] pry(main)> cd user
    [2] pry(#<User>):1> ls -v
    @age: 30
    @name: "Alice"
    [3] pry(#<User>):2> exit # 元のコンテキストに戻る
    ```

- **`whereami`**: 現在のコードの場所（ファイル名と行番号）をソースコード付きで表示します。

### ステップ実行 (`pry-byebug`)

`pry-byebug`を導入すると、ブレークポイントから一歩ずつコードを実行していくステップ実行が可能になります。

- **`next`**: 次の行へ進みます。メソッド呼び出しがあっても、その中には入りません。
- **`step`**: 次の行へ進みます。メソッド呼び出しがあれば、そのメソッドの内部に入ります。
- **`finish`**: 現在のメソッド（またはブロック）の実行を終え、呼び出し元に戻るまで実行を進めます。
- **`continue`**: Pryセッションを終了し、次のブレークポイントかプログラムの終わりまで実行を続けます。

```ruby
require 'pry'
require 'pry-byebug'

def method_a
  puts "Start of method_a"
  x = 10
  method_b(x)
  puts "End of method_a"
end

def method_b(num)
  puts "Start of method_b"
  binding.pry # ここで停止
  result = num * 2
  puts "End of method_b"
  result
end

method_a
```

Pryセッション内で`step`と入力すると`method_b`の次の行に進み、`next`を入力しても同じです。しかし、`method_a`の`method_b(x)`の行で停止していた場合、`step`なら`method_b`の内部に入り、`next`なら`method_b`の実行をすべて終えて`puts "End of method_a"`の行まで進みます。

## まとめ

- **`binding.irb`** は、Rubyに標準で備わっている手軽で強力なデバッグツールです。
- **Pry** は、IRBをさらに拡張し、`ls`, `show-source`, `cd`などの豊富なコマンドで、より詳細なデバッグを可能にします。
- **`pry-byebug`** を使えば、`next`, `step`などのコマンドによるステップ実行が可能になり、コードの流れを一行ずつ追跡できます。

これらのREPLツールを使いこなすことで、`puts`デバッグ（変数の中身を`puts`で表示して確認する方法）から脱却し、プログラムの内部状態を対話的に調査しながら、より迅速かつ正確に問題を特定できるようになります。
