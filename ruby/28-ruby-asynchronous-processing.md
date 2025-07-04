# Rubyの非同期処理

Rubyにおける非同期処理は、時間のかかるタスク（例: 外部APIへのリクエスト、ファイルの読み書き）をメインスレッドの実行をブロックせずに行うための仕組みです。これにより、アプリケーションの応答性を向上させることができます。

## スレッド (Thread)

Rubyの標準ライブラリには`Thread`クラスが用意されており、並行処理の基本的な単位となります。

```ruby
threads = []
threads << Thread.new do
  # 時間のかかる処理1
  puts "Task 1 started"
  sleep 2
  puts "Task 1 finished"
end

threads << Thread.new do
  # 時間のかかる処理2
  puts "Task 2 started"
  sleep 1
  puts "Task 2 finished"
end

# すべてのスレッドが終了するのを待つ
threads.each(&:join)

puts "All tasks completed"
```

ただし、RubyのMRI（Matz's Ruby Interpreter）にはGVL（Global VM Lock）があるため、複数のスレッドが同時にRubyコードを実行することはできません。そのため、CPUバウンドな処理の並列化には向いていませんが、I/Oバウンドな処理では効果を発揮します。

## Fiber

Fiberは、プログラマが手動で実行を制御できる、より軽量な並行処理の仕組みです。`Fiber.yield`で処理を中断し、`fiber.resume`で再開します。

```ruby
fiber = Fiber.new do
  puts "Fiber started"
  Fiber.yield "yielded"
  puts "Fiber resumed"
end

puts fiber.resume # => "Fiber started", "yielded"
puts fiber.resume # => "Fiber resumed"
```

Fiberは、`async` gemなどのライブラリで、より高度な非同期処理を実現するための基盤として利用されています。

## Concurrent Ruby

`concurrent-ruby`は、Rubyで並行処理や非同期処理を実装するための高レベルな抽象化を提供するgemです。

-   **Promise**: 非同期処理の結果を表すオブジェクトです。処理が完了したら成功または失敗の状態になります。
-   **Future**: `Promise`と似ていますが、生成されるとすぐにバックグラウンドで処理が開始されます。
-   **Thread Pool**: スレッドを再利用することで、スレッド生成のオーバーヘッドを削減します。

```ruby
require 'concurrent'

promise = Concurrent::Promise.execute do
  sleep 2
  "Hello from the promise"
end

puts "Waiting for the promise..."
puts promise.value # 2秒待った後、"Hello from the promise" を出力
```

## Async Gem

`async` gemは、Fiberをベースにした構造化された非同期プログラミングのフレームワークです。`async`ブロック内で実行されるタスクは、I/O処理で自動的に他のタスクに実行を切り替えます。

```ruby
require 'async'
require 'async/http/internet'

Async do
  internet = Async::HTTP::Internet.new
  
  # 2つのリクエストが並行して実行される
  task1 = Async { internet.get('https://example.com') }
  task2 = Async { internet.get('https://google.com') }

  response1 = task1.wait
  response2 = task2.wait

  puts "Response 1: #{response1.status}"
  puts "Response 2: #{response2.status}"
ensure
  internet&.close
end
```

## まとめ

Rubyには、スレッド、Fiber、そして`concurrent-ruby`や`async`といったgemを通じて、様々なレベルの非同期処理の選択肢があります。アプリケーションの要件に応じて適切なツールを選択することが重要です。特にWebアプリケーションやネットワーク関連の処理において、非同期処理はパフォーマンスと応答性を向上させるための鍵となります。
