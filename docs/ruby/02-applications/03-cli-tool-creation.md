# Ruby製CLIツールの作り方

Rubyは、手軽にCLI（コマンドラインインターフェース）ツールを作成するのに適した言語です。ここでは、標準ライブラリと人気のGemを使った基本的なCLIツールの作り方を紹介します。

## 1. 標準ライブラリ`OptionParser`を使う

`OptionParser`は、コマンドライン引数やオプションをパースするためのライブラリです。

**例: `greet.rb`**
```ruby
require 'optparse'

options = {}
OptionParser.new do |opts|
  opts.banner = "Usage: greet.rb [options]"

  opts.on("-n NAME", "--name NAME", "Name to greet") do |n|
    options[:name] = n
  end

  opts.on("-v", "--[no-]verbose", "Run verbosely") do |v|
    options[:verbose] = v
  end
end.parse!

name = options[:name] || 'World'
puts "Hello, #{name}!"
puts "Verbose mode is on" if options[:verbose]
```

**実行方法:**
```bash
$ ruby greet.rb -n Alice
Hello, Alice!

$ ruby greet.rb --verbose
Hello, World!
Verbose mode is on
```

## 2. Gem `Thor` を使う

`Thor`は、より高機能で宣言的なCLIツールを構築��るためのGemです。Railsのジェネレータなどでも利用されています。

**インストール:**
```bash
$ gem install thor
```

**例: `my_cli.rb`**
```ruby
require 'thor'

class MyCLI < Thor
  desc "hello NAME", "Say hello to NAME"
  option :upcase, type: :boolean, aliases: "-u"
  def hello(name)
    greeting = "Hello, #{name}"
    puts options[:upcase] ? greeting.upcase : greeting
  end

  desc "goodbye", "Say goodbye"
  def goodbye
    puts "Goodbye!"
  end
end

MyCLI.start(ARGV)
```

**実行方法:**
```bash
$ ruby my_cli.rb hello Alice
Hello, Alice

$ ruby my_cli.rb hello Bob -u
HELLO, BOB

$ ruby my_cli.rb help hello
Usage:
  my_cli.rb hello NAME

Options:
  -u, [--upcase]

Say hello to NAME
```

## 実行可能ファイルにする

スクリプトの先頭に`#!/usr/bin/env ruby`を追加し、実行権限を与えることで、`ruby`コマンドなしで実行できるようになります。

```bash
$ chmod +x my_cli.rb
$ ./my_cli.rb goodbye
Goodbye!
```

## まとめ

- **`OptionParser`**: 標準ライブラリで手軽。小さなツール向き。
- **`Thor`**: 高機能で宣言的。サブコマンドを持つような複雑なツール向き。

目的に応じて適切なツールを選ぶことで、効率的にCLIツールを開発で��ます。
