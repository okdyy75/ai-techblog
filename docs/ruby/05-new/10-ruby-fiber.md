# RubyのFiberと非同期処理

Rubyの`Fiber`は、軽量な協調的マルチタスキングを実現するための仕組みです。スレッドとは異なり、明示的に制御を切り替える（`resume`, `yield`）ことで動作します。これにより、競合状態を心配することなく、特定の処理を中断・再開できます。

## Fiberの基本

`Fiber.new`でファイバーを作成し、`resume`で実行を開始します。ファイバー内の処理は`Fiber.yield`で中断され、呼び出し元に制御を戻します。

```ruby
fiber = Fiber.new do
  puts "Fiber: Start"
  message = Fiber.yield "Fiber: Paused" # 制御を戻し、値を渡す
  puts "Fiber: Resumed with '#{message}'"
  "Fiber: Finished"
end

puts "Main: Starting fiber"
result1 = fiber.resume # ファイバーを開始
puts "Main: Received '#{result1}'"
puts "Main: Resuming fiber"
result2 = fiber.resume "Hello from Main" # 中断点から再開し、値を渡す
puts "Main: Received '#{result2}'"

# 実行結果:
# Main: Starting fiber
# Fiber: Start
# Main: Received 'Fiber: Paused'
# Main: Resuming fiber
# Fiber: Resumed with 'Hello from Main'
# Main: Received 'Fiber: Finished'
```

## Fiberを使った非同期処理

Ruby 3.0から導入された`Fiber.schedule`とノンブロッキングI/Oを組み合わせることで、効率的な非同期処理を実装できます。`async` Gemなどがこの仕組みを利用しています。

以下は、`Fiber.schedule`を使った簡単な非同期HTTPリクエストの例です。（`async`と`async-http` Gemが必要です）

**インストール:**
```bash
$ gem install async async-http
```

**コード:**
```ruby
require 'async'
require 'async/http/internet'

Async do
  internet = Async::HTTP::Internet.new

  # 2つのリクエストを同時に開始
  task1 = Async do
    response = internet.get('https://httpbin.org/delay/2') # 2秒待つAPI
    puts "Task 1: Finished with status #{response.status}"
  end

  task2 = Async do
    response = internet.get('https://httpbin.org/delay/1') # 1秒待つAPI
    puts "Task 2: Finished with status #{response.status}"
  end

  # 両方のタスクが完了するのを待つ
  task1.wait
  task2.wait
ensure
  internet&.close
end

puts "All tasks completed."

# 実行結果（約2秒で完了する）:
# Task 2: Finished with status 200
# Task 1: Finished with status 200
# All tasks completed.
```
この例で��、I/O待ち（HTTPリクエスト）が発生すると、ファイバースケジューラが自動的に他のファイバーに制御を切り替えます。これにより、1秒のタスクと2秒のタスクが並行して実行され、全体としては約2秒で完了します。

## スレッドとの違い

| 特徴 | Fiber | Thread |
| --- | --- | --- |
| **スケジューリング** | **協調的** (Cooperative) <br> `yield`で明示的に切り替え | **プリエンプティブ** (Preemptive) <br> OSが自動的に切り替え |
| **並列性** | シングルスレッドで動作（I/Oバウンドな処理に強い） | マルチコアCPUで並列実行可能（CPUバウンドな処理に強い） |
| **競合** | 競合状態が起きにくい | 排他制御（Mutexなど）が必要 |
| **リソース** | 軽量（メモリ消費が少ない） | やや重い |

Fiberは、特に多くのI/O処理を同時に扱うネットワークサーバーやAPIクライアントなどで、スレッドよりもシンプルかつ効率的に非同期処理を記述するための強力なツールです。
