
# Rubyの並行処理と並列処理

多くのプログラミング言語と同様に、Rubyでも複数のタスクを同時に実行するための仕組みが提供されています。これにより、時間のかかる処理（例: ネットワーク通信、ファイルI/O）を待っている間に他の処理を進めたり、マルチコアCPUの能力を最大限に活用したりすることができます。Rubyにおける主な並行・並列処理の仕組みとして、ThreadとFiber、そしてRactorがあります。

## 並行 (Concurrency) vs 並列 (Parallelism)

まず、これらの用語を区別することが重要です。

- **並行処理 (Concurrency)**: 複数のタスクを切り替えながら実行し、あたかも同時に動いているように見せること。シングルコアのCPUでも可能です。
- **並列処理 (Parallelism)**: 複数のタスクを物理的に同時に実行すること。マルチコアのCPUが必要です。

Rubyの従来の並行処理モデル（Thread）は、GVL（Global VM Lock）またはGIL（Global Interpreter Lock）と呼ばれる仕組みにより、一度に1つのスレッドしかRubyコードを実���できないという制約がありま��た。そのため、計算量の多いタスクでは真の並列処理は実現できませんでしたが、I/Oバウンドなタスク（ネットワークリクエストやファイル読み書きなど）では、待ち時間にスレッドを切り替えることで大きな効果を発揮します。

## スレッド (Thread)

スレッドは、OSレベルのスレッドを利用した並行処理の単位です。

```ruby
threads = []

# 3つのスレッドを生成
3.times do |i|
  threads << Thread.new do
    # 各スレッドが実行する処理
    sleep(1) # I/O待ちをシミュレート
    puts "Thread #{i} finished."
  end
end

# すべてのスレッドが終了するのを待つ
threads.each(&:join)

puts "All threads finished."
```

このコードは、3つのスレッドがほぼ同時に開始され、それぞれ1秒待った後にメッセージを出力します。プログラム全体は約1秒で終了し、逐次実行した場合の3秒よりも大幅に高速になります。

### スレッドセーフティ

複数のスレッドが共有されたデータにアクセスすると、競合状態（Race Condition）が発生する可能性があります。

```ruby
counter = 0
threads = []

10.times do
  threads << Thread.new do
    100_000.times do
      # この操作はアトミックではない
      counter += 1
    end
  end
end

threads.each(&:join)
puts counter #=> 1,000,000 にはならず、実行するたびに結果が変わる
```

これを解決するためには、排他制御が必要です。`Mutex` (Mutual Exclusion) を使うと、一度に1つのスレッドしかクリティカルセクション（共有リソースにアクセスするコード）を実行できないようにロックできます。

```ruby
require 'thread' # Mutexはthreadライブラリに含まれる

counter = 0
mutex = Mutex.new
threads = []

10.times do
  threads << Thread.new do
    100_000.times do
      mutex.synchronize do
        counter += 1
      end
    end
  end
end

threads.each(&:join)
puts counter #=> 1000000
```

## ファイバー (Fiber)

ファイバーは、スレッドよりも軽量な協調的マルチタスキングの仕組みです。スレッドと違い、OSによるプリエンプティブな切り替えではなく、プログラマが明示的に`Fiber.yield`や`resume`を呼び出して実行を制御します。

```ruby
fiber = Fiber.new do
  puts "Fiber says hello."
  Fiber.yield # 実行を中断し、呼び出し元に戻る
  puts "Fiber says goodbye."
end

puts "Main says hello."
fiber.resume # ファイバ��の実行を開始または再開
puts "Main says goodbye."
fiber.resume # ファイバーの実行を再開
```

出力:
```
Main says hello.
Fiber says hello.
Main says goodbye.
Fiber says goodbye.
```

ファイバーは、非同期処理やジェネレータ、コルーチンのような複雑な制御フローを実装するのに使われます。特に、`async` gemなどは内部でファイバーを活用して、ノンブロッキングなI/Oを実現しています。

## Ractor (Ruby 3.0+)

Ruby 3.0で導入されたRactorは、GVLの制約を受けずに真の並列処理を実現するための新しい並行・並列実行モデルです。Ractorはアクターモデルに似ており、それぞれが独立したGVLを持ちます。

Ractor間の通信は、メッセージパッシングによって行われ、共有可能なオブジェクトには厳しい制限があります。これにより、スレッドセーフティの問題を設計レベルで回避します。

```ruby
# 計算量の多いタスク
def heavy_computation(n)
  sum = 0
  n.times { |i| sum += i }
  sum
end

# 2つのRactorを生成
ractors = (1..2).map do
  Ractor.new do
    result = heavy_computation(10_000_000)
    # 計算結果をメインRactorに送信
    Ractor.yield result
  end
end

# 各Ractorからの結果を��信
results = ractors.map(&:take)

p results
#=> [49999995000000, 49999995000000]
```

この例では、2つの`heavy_computation`がマルチコアCPU上で並列に実行されるため、シングルスレッドで実行するよりも高速になります。

### Ractorの制約

- **オブジェクト共有の制限**: Ractor間では、基本的に不変 (immutable) なオブジェクト（数値、シンボル、`freeze`された文字列や配列など）しか共有できません。可変 (mutable) なオブジェクトを渡そうとすると、コピーまたは移動されます。
- **通信**: `Ractor.yield` (または `send`) と `take` (または `receive`) を使ったメッセージパッシングが基本です。

## まとめ

| 機能 | GVL | 並列性 | 切り替え | 用途 |
| :--- | :--- | :--- | :--- | :--- |
| **Thread** | あり | I/Oバウンド | OS (プリエンプティブ) | ネットワーク通信、ファイル操作 |
| **Fiber** | あり | なし | プログラマ (協調的) | 非同期処理、コルーチン |
| **Ractor** | なし | CPUバウンド | OS (プリエンプティブ) | 重い計算処理、データ処理 |

- **I/Oバウンドなタスク**には、依然として**Thread**が有効です。
- **複雑な実行フローの制御**には、**Fiber**が適しています���
- **CPUバウンドなタスク**で真の並列性を求めるなら、**Ractor**が最適な選択肢です。

これらの仕組みを適切に使い分けることで、Rubyアプリケーションのパフォーマンスと応答性を大幅に向上させることができます。
