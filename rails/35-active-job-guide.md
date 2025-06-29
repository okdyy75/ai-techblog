# 35. Active Job詳解: アダプターの選び方と高度な使い方

## はじめに

Webアプリケーションでは、メール送信、重いデータの集計、外部APIとの連携など、完了までに時間のかかる処理が発生します。これらの処理をリクエスト/レスポンスサイクル内で同期的に実行すると、ユーザーを長時間待たせてしまい、UXを著しく低下させます。

**Active Job**は、Rails 4.2から導入された、非同期ジョブ（バックグラウンドジョブ）を扱うための共通インターフェースです。Sidekiq, Resque, Delayed Jobなど、様々なバックエンドのジョブキューイングシステムを同じ作法で扱えるように抽象化してくれます。

本記事では、Active Jobの基本的な使い方から、主要なバックエンドアダプターの比較と選び方、そしてリトライやコールバックなどの高度な使い方までを詳しく解説します。

## この記事で学べること

- Active Jobの基本的な使い方とジョブの作成方法
- 主要なバックエンドアダプター（Sidekiq, Delayed Jobなど）の特徴と比較
- アプリケーションの要件に応じたアダプターの選び方
- リトライ処理、優先度設定、コールバックなどの高度な機能

## 1. Active Jobの基本

### 1.1. ジョブの生成

ジェネレータを使ってジョブの雛形を作成します。

```bash
rails generate job process_payment
```

これにより `app/jobs/process_payment_job.rb` が生成されます。

### 1.2. ジョブの実装

ジョブクラスは `ApplicationJob` を継承し、`perform` メソッド内に非同期で実行したい処理を記述します。

```ruby:app/jobs/process_payment_job.rb
class ProcessPaymentJob < ApplicationJob
  queue_as :default # ジョブを投入するキュー名

  def perform(order)
    # 時間のかかる決済処理をここに記述
    puts "Processing payment for order ##{order.id}..."
    sleep 5 # 重い処理をシミュレート
    order.update(status: 'completed')
    puts "Payment completed for order ##{order.id}."
  end
end
```

### 1.3. ジョブの実行

コントローラなどからジョブをキューに追加（エンキュー）します。

- `perform_later`: 非同期でジョブを実行します。こちらが基本です。
- `perform_now`: 同期的にジョブを実行します（テストなどで使用）。

```ruby:app/controllers/orders_controller.rb
def create
  @order = Order.new(order_params)
  if @order.save
    # 決済処理をバックグラウンドジョブとして実行
    ProcessPaymentJob.perform_later(@order)
    redirect_to @order, notice: '注文を受け付けました。決済処理が完了次第、通知します。'
  else
    render :new
  end
end
```

`perform_later` に渡す引数は、Active Jobによってシリアライズ可能である必要があります。Active Recordオブジェクトは、Global IDという仕組みでシリアライズされ、`perform` メソッド実行時にデシリアライズされて元のオブジェクトに復元されます。

## 2. バックエンドアダプターの選択

Active Jobはあくまでインターフェースであり、実際にジョブを永続化し、実行を管理するにはバックエンドのアダプターが必要です。

`config/application.rb` でアダプターを設定します。

```ruby:config/application.rb
module YourAppName
  class Application < Rails::Application
    # ...
    config.active_job.queue_adapter = :sidekiq # 例: Sidekiqを使用
  end
end
```

### 主要アダプター比較

| アダプター | バックエンド | 特徴 | ユースケース |
| :--- | :--- | :--- | :--- |
| **Sidekiq** | Redis | **高パフォーマンス**。マルチスレッドでジョブを高速に処理。多機能で安定している。商用版（Pro/Enterprise）あり。 | 大量のジョブを捌く必要がある、パフォーマンス重視の大規模アプリケーション。**現在のデファクトスタンダード**。 |
| **Delayed Job** | RDB (PostgreSQL, MySQL) | **導入が容易**。Redisなどの追加ミドルウェアが不要で、DBだけで始められる。 | ジョブ量がそれほど多くなく、手軽に始めたい中小規模のアプリケーション。 |
| **Resque** | Redis | Sidekiqの前身。シングルスレッドで安定しているが、パフォーマンスはSidekiqに劣る。 | 既存プロジェクトで使われている場合。新規ではSidekiqが推奨される。 |
| **Async** | (インメモリ) | Railsのプロセス内で非同期に実行。外部ミドルウェア不要だが、**永続性がない**。アプリが再起動するとジョブは消える。 | 開発環境での手軽なテストや、消えても問題ない非常に軽量なタスク。本番環境での利用は非推奨。 |

**選び方の指針**:
- **本番環境で本格的に利用する場合**: **Sidekiq** が第一候補です。
- **とにかく手軽に始めたい、ジョブ量が少ない場合**: **Delayed Job** が適しています。
- **開発環境で試すだけ**: デフォルトの **Async** で十分です。

## 3. 高度な使い方

### 3.1. 実行時間の指定

`set` メソッドを使って、ジョブの実行タイミングを制御できます。

```ruby
# 1週間後に実行
MyJob.set(wait: 1.week).perform_later(record)

# 特定の日時に実行
MyJob.set(wait_until: Date.tomorrow.noon).perform_later(record)
```

### 3.2. リトライ処理

ネットワークエラーなどでジョブが失敗した場合、自動的にリトライさせることができます。

```ruby:app/jobs/my_job.rb
class MyJob < ApplicationJob
  # 例外が発生した場合、5秒後、15秒後、30秒後にリトライする
  retry_on(NetworkError, wait: :exponentially_longer, attempts: 3)

  # 特定の例外はリトライしない
  discard_on(ActiveRecord::RecordNotFound)

  def perform(*args)
    # ...
  end
end
```

### 3.3. コールバック

ジョブのライフサイクルの特定のタイミングで処理を挟むことができます。

```ruby:app/jobs/reporting_job.rb
class ReportingJob < ApplicationJob
  before_enqueue { |job| # ... }
  around_perform { |job, block| # ... ; block.call; # ... }
  after_perform { |job| # ... }

  def perform(report_id)
    # ...
  end
end
```

### 3.4. 優先度とキュー

ジョブの重要度に応じて、処理するキューを分けたり、優先度を設定したりできます。

```ruby
# キューを指定
UrgentJob.set(queue: :urgent).perform_later(user)

# Sidekiqなど、アダプターが優先度に対応している場合
LowPriorityJob.set(priority: 10).perform_later(record)
```

## まとめ

Active Jobは、Railsにおける非同期処理を統一的なインターフェースで扱うための強力な仕組みです。

- **抽象化**: バックエンドの実装を意識することなく、同じ作法で非同期処理を記述できる。
- **柔軟性**: アプリケーションの規模や要件に応じて、SidekiqやDelayed Jobなどの最適なアダプターを選択できる。
- **高機能**: リトライ、スケジュール実行、コールバックなど、堅牢な非同期処理システムを構築するための機能が揃っている。

時間のかかる処理は積極的にバックグラウンドジョブに切り出し、Active Jobを活用して快適なユーザー体験とスケーラブルなアプリケーションを実現しましょう。