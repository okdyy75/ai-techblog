# 43. Railsアプリケーションのメモリ使用量を調査・最適化する方法

## はじめに

Railsアプリケーションを本番環境で安定して運用する上で、メモリ使用量の管理は避けて通れない課題です。メモリリークや過剰なメモリ消費（メモリブロート）は、アプリケーションのパフォーマンス低下、サーバーコストの増大、そして最悪の場合はサーバーダウンを引き起こす原因となります。

特に、バックグラウンドジョブを処理するSidekiqワーカーや、PumaやUnicornといったアプリケーションサーバーのプロセスは、長時間稼働するうちに徐々にメモリ使用量が増加していく傾向があります。

本記事では、Railsアプリケーションのメモリ使用量を調査し、一般的な原因を特定して最適化するための実践的な方法とツールを紹介します。

## この記事で学べること

- メモリ使用量を監視するための主要なツール（`scout_apm`, `memory_profiler`など）
- メモリリークとメモリブロートの違い
- オブジェクトアロケーションの追跡と、不要なオブジェクト生成を削減する方法
- メモリ使用量を削減するための具体的なコーディングパターン

## 1. メモリ使用量の監視

問題解決の第一歩は、現状を正確に把握することです。本番環境と開発環境でメモリ使用量を監視するためのツールを導入しましょう。

### a) APM (Application Performance Monitoring) ツール

**Scout APM** や **New Relic** のようなAPMツールは、本番環境でのメモリ使用量の推移をグラフで可視化し、メモリ使用量が急増している特定のエンドポイントやバックグラウンドジョブを特定するのに非常に役立ちます。

- **導入**: `scout_apm` などのgemを導入し、設定ファイルにAPIキーを記述するだけで基本的な監視が始まります。
- **メリット**: 継続的な監視、問題発生時のアラート、メモリ多消費箇所の特定が容易。

### b) Pumaワーカーの監視

`puma_worker_killer` gemを導入すると、Pumaのワーカープロセスが指定したメモリ閾値を超えた場合に、そのワーカーを自動的に再起動させることができます。これは根本的な解決策ではありませんが、メモリリークによるサーバーダウンを防ぐための応急処置として非常に有効です。

```ruby:Gemfile
gem 'puma_worker_killer'
```

`config/initializers/puma_worker_killer.rb`:
```ruby
PumaWorkerKiller.config do |config|
  config.ram           = 1024 # 1024MBを閾値とする
  config.frequency     = 20   # 20秒ごとにチェック
  config.percent_usage = 0.98
end
PumaWorkerKiller.start
```

## 2. メモリプロファイリング

メモリ使用量が多い箇所を特定したら、次はなぜそこでメモリが消費されているのかを詳細に調査します。`memory_profiler` gemがこの目的のために非常に強力です。

### `memory_profiler` の使い方

調査したいコードブロックを `MemoryProfiler.report` で囲むと、そのブロック内で生成されたオブジェクトの種類、数、消費メモリ量などを詳細に出力してくれます。

```ruby
require 'memory_profiler'

report = MemoryProfiler.report do
  # ここに調査したいコードを記述
  1000.times do
    User.all.map { |u| u.name.downcase }
  end
end

report.pretty_print
```

**出力例**:
```
Total allocated: 12.34 MB (123456 objects)
Total retained:  5.67 MB (56789 objects)

allocated memory by gem:
-----------------------------------
   10.00 MB  activerecord-7.0.4
    2.00 MB  activesupport-7.0.4
    ...

allocated memory by class:
-----------------------------------
    8.00 MB  User
    1.50 MB  String
    ...
```

このレポートから、「どのgem」や「どのクラス」が大量にメモリを確保しているかを特定し、改善のヒントを得ることができます。

## 3. メモリ最適化の実践テクニック

### a) N+1クエリの解消と不要なオブジェクトロードの抑制

N+1クエリは、パフォーマンスだけでなくメモリ使用量にも悪影響を与えます。`includes` や `preload` を使って事前に関連レコードをロードするのは基本ですが、本当に必要なデータだけを取得することも重要です。

- **`pluck`**: 特定のカラムの値だけを配列として取得します。Active Recordオブジェクトを生成しないため、メモリを大幅に節約できます。

  ```ruby
  # 悪い例: Userオブジェクトを全てロード
  User.all.map(&:id)

  # 良い例: idの配列だけを取得
  User.pluck(:id)
  ```

- **`select`**: 必要なカラムだけを指定して、軽量なActive Recordオブジェクトをロードします。

  ```ruby
  # nameとemailだけが必要な場合
  User.select(:id, :name, :email).find_each do |user|
    # ...
  end
  ```

### b) 大量データのバッチ処理

数万件以上のレコードを一度に処理しようとすると、大量のActive Recordオブジェクトがメモリにロードされ、メモリを圧迫します。`find_each` や `find_in_batches` を使いましょう。

```ruby
# 悪い例: 全ユーザーを一度にメモリにロード
User.all.each do |user|
  user.do_something
end

# 良い例: 1000件ずつのバッチで処理
User.find_each(batch_size: 1000) do |user|
  user.do_something
end
```

`find_each` は、内部で `find_in_batches` を使い、指定されたバッチサイズでレコードを取得し、1件ずつオブジェクトをインスタンス化してブロックに渡します。これにより、メモリ使用量を一定に保つことができます。

### c) 文字列のメモリ効率

Ruby 2.2以降、文字列リテラルはデフォルトで `frozen_string_literal: true` が推奨されています。これにより、同じ文字列リテラルが同じオブジェクトIDを共有し、不要な文字列オブジェクトの生成が抑制されます。

ファイルの先頭にマジックコメントを追加するか、`RuboCop` などで一括適用しましょう。

```ruby
# frozen_string_literal: true
```

また、文字列を組み立てる際は、`+` で連結するよりも式展開 `"#{...}"` や `String#<<` を使う方が効率的です。

## まとめ

Railsアプリケーションのメモリ最適化は、地道な調査と改善の繰り返しです。

1.  **監視**: APMツールや `puma_worker_killer` で常にメモリ使用量を監視し、異常を検知する。
2.  **特定**: `memory_profiler` を使って、メモリを大量に消費しているボトルネックを特定する。
3.  **最適化**: `pluck`, `find_each` などのテクニックを駆使して、不要なオブジェクトアロケーションを削減する。

特に長時間稼働する本番環境では、わずかなメモリリークも積み重なって大きな問題に発展します。定期的なプロファイリングとコードレビューを通じて、メモリ効率の良いアプリケーションを維持することが重要です。