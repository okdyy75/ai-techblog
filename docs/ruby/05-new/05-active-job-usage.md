# Active Jobの活用法

Active Jobは、Ruby on Railsに組み込まれたバックグラウンドジョブのフレームワークです。Sidekiq, Resque, GoodJobなど、様々なキューイングバックエンドを統一したインターフェースで扱うことができます。

## 1. Active Jobの基本

### ジョブの作成

ジェネレータを使ってジョブを作成します。

```bash
$ rails generate job process_payment
```

これにより、`app/jobs/process_payment_job.rb`が生成されます。

```ruby
class ProcessPaymentJob < ApplicationJob
  queue_as :default

  def perform(order)
    # 時間のかかる支払い処理などをここに記述
    order.process_payment!
  end
end
```

### ジョブの実行

コントローラなどからジョブをエンキュー（キューに追加）します。

- **`perform_later`**: 非同期で実行（バックグラウンド）
- **`perform_now`**: 同期で実行（フォアグラウンド）

```ruby
class OrdersController < ApplicationController
  def create
    @order = Order.new(order_params)
    if @order.save
      # 支払い処理をバックグラウンドで実行
      ProcessPaymentJob.perform_later(@order)
      redirect_to @order, notice: 'Order was successfully created.'
    else
      render :new
    end
  end
end
```

## 2. バックエンドの設定

デフォルトでは、Active Jobはインメモリの`:async`アダプタを使用します。これは開発には便利ですが、本番環境では永続的なバックエンド（例: Sidekiq, GoodJob）に切り替える必要があります。

**`config/application.rb`**
```ruby
module MyApp
  class Application < Rails::Application
    # ...
    config.active_job.queue_adapter = :sidekiq
  end
end
```

## 3. よくある活用例

### 時間指定実行

`set`メソッドを使うことで、指定した時間後にジョブを実行できます。

```ruby
# 1週間後にメールを送信
ReminderEmailJob.set(wait: 1.week).perform_later(user)

# 特定の日時に実行
ReminderEmailJob.set(wait_until: Date.tomorrow.noon).perform_later(user)
```

### 優先度の設定

キューごとに優先度を設定できます。

```ruby
class HighPriorityJob < ApplicationJob
  queue_as :high_priority
  # ...
end

class LowPriorityJob < ApplicationJob
  queue_as :low_priority
  # ...
end
```

バックエンドの設定で、`high_priority`キューを先に処理するように構成します。

### コールバック

ジョブのライフサイクルに応じて処理を挟むことができます。

```ruby
class ReportingJob < ApplicationJob
  before_enqueue { |job| # ... }
  around_perform { |job, block| # ... ; block.call; # ... }
  after_perform { |job| # ... }

  def perform
    # ...
  end
end
```

### エラーハンドリングとリトライ

`rescue_from`でエラーを捕捉し、`retry_on`でリトライ処理を定義できます。

```ruby
class RemoteServiceJob < ApplicationJob
  # ネットワークエラーが発生した場合、最大5回までリトライ
  retry_on NetworkError, wait: :exponentially_longer, attempts: 5

  # 特定のエラーは捕捉して何もしない
  discard_on ActiveRecord::RecordNotFound

  def perform(service_id)
    # ...
  end
end
```

Active Jobを使いこなすことで、ユーザーへの応答時間を短縮し、アプリケーションのスケーラビリティを高めることができます。
