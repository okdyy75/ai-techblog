
# Rubyにおけるデザインパターン

デザインパターンは、ソフトウェア設計において頻繁に発生する問題に対する、再利用可能な解決策のカタログです。有名な「GoF (Gang of Four) のデザインパターン」はオブジェクト指向言語で広く知られていますが、Rubyの動的な性質と表現力豊かな構文により、これらのパターンは独自の方法で実装されたり、あるいは言語機能そのものによって不要になったりします。

ここでは、Rubyで特によく使われる、またはRubyらしく実装されるデザインパターンをいくつか紹介します。

## 1. Template Method パターン

スーパークラスで処理の骨格（テンプレート）を定義し、具体的な処理の内容はサブクラスに委ねるパターンです。継承を利用した基本的なパターンですが、RubyではブロックやProcを使うことで、より柔軟な実装が可能です。

### GoF的な実装 (継承)

```ruby
class Report
  def generate
    puts "--- Report Start ---"
    print_title
    print_body
    puts "--- Report End ---"
  end

  def print_title
    raise NotImplementedError, "Subclasses must implement 'print_title'"
  end

  def print_body
    raise NotImplementedError, "Subclasses must implement 'print_body'"
  end
end

class MonthlyReport < Report
  def print_title
    puts "## Monthly Report ##"
  end

  def print_body
    puts "This is the body of the monthly report."
  end
end

MonthlyReport.new.generate
```

### Ruby的な実装 (ブロック)

継承を使わずに、処理の可変部分をブロックとして外部から注入します。

```ruby
class ReportGenerator
  def generate
    puts "--- Report Start ---"
    yield(:title)  # ブロックに処理を委譲
    yield(:body)   # ブロックに処理を委譲
    puts "--- Report End ---"
  end
end

generator = ReportGenerator.new
generator.generate do |section|
  case section
  when :title
    puts "## Weekly Report ##"
  when :body
    puts "This is the body of the weekly report."
  end
end
```

## 2. Strategy パターン

アルゴリズムのファミリーを定義し、それぞれをカプセル化して、動的に切り替えられるようにするパターンです。Rubyでは、アルゴリズムをクラスとしてではなく、ProcやLambdaオブジェクトとして表現することで、よりシンプルに実装できます。

### GoF的な実装 (クラス)

```ruby
class Formatter
  def format(text)
    raise NotImplementedError
  end
end

class PlainTextFormatter < Formatter
  def format(text)
    text
  end
end

class HtmlFormatter < Formatter
  def format(text)
    "<p>#{text}</p>"
  end
end

class Context
  attr_writer :formatter

  def initialize(formatter)
    @formatter = formatter
  end

  def output(text)
    puts @formatter.format(text)
  end
end

context = Context.new(PlainTextFormatter.new)
context.output("Hello") #=> Hello

context.formatter = HtmlFormatter.new
context.output("Hello") #=> <p>Hello</p>
```

### Ruby的な実装 (Lambda)

```ruby
class Context
  attr_writer :formatter

  def initialize(formatter)
    @formatter = formatter
  end

  def output(text)
    puts @formatter.call(text)
  end
end

PLAIN_TEXT_FORMATTER = ->(text) { text }
HTML_FORMATTER = ->(text) { "<p>#{text}</p>" }

context = Context.new(PLAIN_TEXT_FORMATTER)
context.output("Hello") #=> Hello

context.formatter = HTML_FORMATTER
context.output("Hello") #=> <p>Hello</p>
```

## 3. Observer パターン

あるオブジェクト（Subject）の状態が変化したときに、そのオブジェクトに依存するすべてのオ���ジェクト（Observer）に自動的に通知され、更新されるようにするパターンです。Rubyの標準ライブラリには、このパターンを実装するための`Observable`モジュールが用意されています。

```ruby
require 'observer'

# Subject (観測対象)
class WeatherStation
  include Observable

  def set_temperature(temp)
    puts "New temperature: #{temp}"
    changed # 状態が変化したことをマーク
    notify_observers(temp) # Observerに通知
  end
end

# Observer (観測者)
class PhoneDisplay
  def update(temp)
    puts "Phone Display: Temperature is now #{temp}°C"
  end
end

class WebsiteDisplay
  def update(temp)
    puts "Website Display: Current temperature is #{temp}°C"
  end
end

# セットアップ
station = WeatherStation.new
phone = PhoneDisplay.new
website = WebsiteDisplay.new

station.add_observer(phone)
station.add_observer(website)

# 状態を変化させる
station.set_temperature(25)
#=> New temperature: 25
#=> Phone Display: Temperature is now 25°C
#=> Website Display: Current temperature is 25°C
```

## 4. Decorator パターン

オブジェクトに動的に新しい責務を追加するパターンです。Rubyでは、`SimpleDelegator`クラスやモジュールの`prepend`を使うことで、エレ��ントに実装できます。

### Ruby的な実装 (`SimpleDelegator`)

`SimpleDelegator`は、ラップしたオブジェクトにメソッド呼び出しを移譲（デリゲート）する機能を提供します。

```ruby
require 'delegate'

class Coffee
  def cost
    10
  end
end

# デコレーター
class MilkDecorator < SimpleDelegator
  def cost
    super + 2 # 元のオブジェクトのcostに2を追加
  end
end

class SugarDecorator < SimpleDelegator
  def cost
    super + 1 # 元のオブジェクトのcostに1を追加
  end
end

# 使い方
coffee = Coffee.new
puts coffee.cost #=> 10

milk_coffee = MilkDecorator.new(coffee)
puts milk_coffee.cost #=> 12

sweet_milk_coffee = SugarDecorator.new(milk_coffee)
puts sweet_milk_coffee.cost #=> 13
```

### Ruby的な実装 (`prepend`)

`prepend`は`include`と似ていますが、モジュールをクラスの継承チェーンの**前**に挿入します。これにより、元のクラスのメソッドを`super`で呼び出しながらオーバーライドできます。

```ruby
module MilkAddon
  def cost
    super + 2
  end
end

module SugarAddon
  def cost
    super + 1
  end
end

class Coffee
  def cost
    10
  end
end

coffee = Coffee.new
coffee.extend(MilkAddon)  # extendで特定のインスタ���スに機能を追加
coffee.extend(SugarAddon)

puts coffee.cost #=> 13
```

## 5. Singleton パターン

あるクラスのインスタンスがプログラム全体で1つしか存在しないことを保証するパターンです。Rubyでは、標準ライブラリの`Singleton`モジュールを使うだけで実現できます。

```ruby
require 'singleton'

class AppConfig
  include Singleton

  def initialize
    # 設定を読み込むなどの重い処理
    @config = { api_key: "12345-secret" }
    puts "AppConfig initialized."
  end

  def get(key)
    @config[key]
  end
end

# AppConfig.new はできない (private method `new' called)
config1 = AppConfig.instance
config2 = AppConfig.instance

puts config1.get(:api_key) #=> "12345-secret"
puts config1.object_id == config2.object_id #=> true
```

## まとめ

Rubyは、その柔軟な言語機能により、伝統的なデザインパターンをよりシンプルかつエレガントに実装する方法を提供します。
- **ブロックやProc/Lambda**は、StrategyやTemplate Methodのような振る舞いを注入するパターンを簡潔にします。
- **`Observable`モジュール**は、Observerパターンを簡単に実現します。
- **`SimpleDelegator`や`prepend`**は、Decoratorパターンを強力に��ポートします。
- **`Singleton`モジュール**は、Singletonパターンを一行で実現します。

これらのRubyらしいイディオムを理解し、活用することで、より柔軟で保守性の高いコードを書くことができます。
