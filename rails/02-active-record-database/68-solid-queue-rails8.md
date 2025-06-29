# Rails 8のSolid Queueで実現するジョブキューの新しいアプローチ

## はじめに

Rails 8で導入されたSolid Queueは、従来のRedisやmemcachedに依存しない、データベースベースのジョブキューシステムです。外部インフラの管理を簡素化し、トランザクションの整合性を保ちながら、高性能なバックグラウンドジョブ処理を実現します。

### 従来の課題

```ruby
# 従来のSidekiq + Redisの構成
# config/application.rb
config.active_job.queue_adapter = :sidekiq

# Redis接続設定
Sidekiq.configure_server do |config|
  config.redis = { url: ENV['REDIS_URL'] }
end
```

**問題点:**
- Redis/memcachedの追加インフラが必要
- トランザクション外でのジョブエンキューによる整合性問題
- 開発環境での設定の複雑さ

## Solid Queueの導入

### 1. インストールと設定

```bash
# Rails 8では標準で含まれていますが、明示的に追加する場合
# Gemfile
gem "solid_queue"

# 初期設定
rails generate solid_queue:install
rails db:migrate
```

### 2. 基本設定

```ruby
# config/application.rb
config.active_job.queue_adapter = :solid_queue

# config/environments/production.rb
config.solid_queue.connects_to = { database: { writing: :primary } }
```

### 3. キューの定義

```yaml
# config/queue.yml
production:
  dispatchers:
    - polling_interval: 1
      batch_size: 500
  workers:
    - queues: "default,low_priority"
      threads: 3
    - queues: "high_priority"
      threads: 5
      processes: 2
```

## 実践的な使用例

### 1. 基本的なジョブの作成

```ruby
# app/jobs/email_notification_job.rb
class EmailNotificationJob < ApplicationJob
  queue_as :default
  
  def perform(user_id, template)
    user = User.find(user_id)
    NotificationMailer.send_email(user, template).deliver_now
  end
end

# ジョブの実行
EmailNotificationJob.perform_later(user.id, "welcome")
```

### 2. トランザクション内でのエンキュー

```ruby
# app/models/user.rb
class User < ApplicationRecord
  after_create_commit :send_welcome_email
  
  private
  
  def send_welcome_email
    # トランザクションコミット後に確実にジョブが実行される
    EmailNotificationJob.perform_later(id, "welcome")
  end
end

# または明示的なトランザクション
User.transaction do
  user = User.create!(email: "user@example.com")
  # userの作成が成功した場合のみジョブがエンキューされる
  WelcomeEmailJob.perform_later(user.id)
end
```

### 3. 優先度とスケジュール機能

```ruby
# 優先度の設定
class HighPriorityJob < ApplicationJob
  queue_as :high_priority
  
  def perform(data)
    # 緊急性の高い処理
    process_urgent_task(data)
  end
end

# スケジュール実行
class ReportGenerationJob < ApplicationJob
  def perform(report_id)
    report = Report.find(report_id)
    report.generate!
  end
end

# 5分後に実行
ReportGenerationJob.set(wait: 5.minutes).perform_later(report.id)

# 特定時刻に実行
ReportGenerationJob.set(wait_until: Date.tomorrow.noon).perform_later(report.id)
```

### 4. リトライとエラーハンドリング

```ruby
class DataProcessingJob < ApplicationJob
  queue_as :default
  retry_on StandardError, wait: :exponentially_longer, attempts: 5
  discard_on ActiveJob::DeserializationError
  
  def perform(data_id)
    data = ProcessingData.find(data_id)
    
    begin
      process_complex_data(data)
    rescue CustomAPIError => e
      # カスタムエラーの場合は即座に失敗とする
      logger.error "API Error: #{e.message}"
      raise ActiveJob::DeserializationError
    end
  end
  
  private
  
  def process_complex_data(data)
    # 複雑な処理ロジック
    ExternalAPI.process(data.payload)
    data.update!(status: :processed)
  end
end
```

## 高度な機能

### 1. バッチジョブの実装

```ruby
class BatchProcessingJob < ApplicationJob
  queue_as :batch_processing
  
  def perform(batch_id, item_ids)
    batch = ProcessingBatch.find(batch_id)
    
    item_ids.each_slice(100) do |chunk|
      chunk.each do |item_id|
        process_item(item_id)
      end
      
      # 進捗の更新
      batch.increment!(:processed_count, chunk.size)
    end
    
    batch.update!(status: :completed) if batch.all_processed?
  end
end

# バッチの作成とエンキュー
def enqueue_batch_processing(items)
  batch = ProcessingBatch.create!(
    total_count: items.size,
    status: :pending
  )
  
  # アイテムを適切なサイズに分割
  items.each_slice(1000) do |chunk|
    BatchProcessingJob.perform_later(batch.id, chunk.map(&:id))
  end
  
  batch
end
```

### 2. ジョブの監視とメトリクス

```ruby
# app/models/job_monitor.rb
class JobMonitor
  def self.queue_stats
    {
      pending: SolidQueue::Job.pending.count,
      running: SolidQueue::Job.running.count,
      failed: SolidQueue::Job.failed.count,
      completed_today: SolidQueue::Job.where(
        finished_at: Date.current.all_day
      ).count
    }
  end
  
  def self.slow_jobs(threshold = 1.minute)
    SolidQueue::Job.where(
      "finished_at - scheduled_at > ?", threshold
    ).includes(:arguments)
  end
end

# 管理画面での表示
def admin_dashboard
  @queue_stats = JobMonitor.queue_stats
  @slow_jobs = JobMonitor.slow_jobs
end
```

### 3. カスタムワーカー設定

```ruby
# config/solid_queue.yml
production:
  dispatchers:
    - polling_interval: 1
      batch_size: 500
      concurrency_maintenance_interval: 600
  
  workers:
    # 高優先度キュー専用ワーカー
    - queues: "critical"
      threads: 1
      processes: 3
      
    # 通常処理用ワーカー
    - queues: "default,low_priority"
      threads: 3
      processes: 2
      
    # バッチ処理専用ワーカー
    - queues: "batch_processing"
      threads: 1
      processes: 1
```

## パフォーマンスの最適化

### 1. データベースインデックスの追加

```ruby
# db/migrate/add_solid_queue_indexes.rb
class AddSolidQueueIndexes < ActiveRecord::Migration[8.0]
  def change
    add_index :solid_queue_jobs, [:queue_name, :finished_at]
    add_index :solid_queue_jobs, [:scheduled_at], where: "finished_at IS NULL"
    add_index :solid_queue_jobs, [:created_at]
  end
end
```

### 2. 設定の調整

```ruby
# config/environments/production.rb
config.solid_queue.silence_polling = true
config.solid_queue.supervisor_pidfile = Rails.root.join("tmp", "pids", "solid_queue_supervisor.pid")

# ワーカープロセスの最適化
config.solid_queue.default_concurrency = Rails.env.production? ? 3 : 1
```

### 3. メモリ使用量の監視

```ruby
class MemoryMonitorJob < ApplicationJob
  def perform
    memory_usage = `ps -o rss= -p #{Process.pid}`.to_i
    
    if memory_usage > 500_000  # 500MB
      Rails.logger.warn "High memory usage detected: #{memory_usage}KB"
      
      # 必要に応じてワーカーを再起動
      if memory_usage > 1_000_000  # 1GB
        Process.kill("TERM", Process.pid)
      end
    end
  end
end

# 定期実行
MemoryMonitorJob.set(wait: 5.minutes).perform_later
```

## 運用のベストプラクティス

### 1. ログ設定

```ruby
# config/environments/production.rb
config.solid_queue.logger = Logger.new(Rails.root.join("log", "solid_queue.log"))
config.solid_queue.logger.level = Logger::INFO
```

### 2. 健全性チェック

```ruby
# app/controllers/health_controller.rb
class HealthController < ApplicationController
  def check
    queue_health = check_queue_health
    
    if queue_health[:healthy]
      render json: { status: "healthy", details: queue_health }
    else
      render json: { status: "unhealthy", details: queue_health }, status: :service_unavailable
    end
  end
  
  private
  
  def check_queue_health
    pending_jobs = SolidQueue::Job.pending.count
    old_jobs = SolidQueue::Job.where("created_at < ?", 1.hour.ago).pending.count
    
    {
      healthy: old_jobs < 100,
      pending_jobs: pending_jobs,
      old_pending_jobs: old_jobs,
      workers_count: SolidQueue::Process.where(kind: "Worker").count
    }
  end
end
```

## まとめ

Solid Queueは、Rails 8の大きな革新の一つです。外部依存を削減し、データベースの一貫性を保ちながら、スケーラブルなバックグラウンドジョブ処理を実現します。

**主な利点:**
- インフラの簡素化
- トランザクション整合性の保証
- 高性能なジョブ処理
- 豊富な監視・管理機能

従来のRedisベースのソリューションからの移行を検討している場合は、段階的に導入し、パフォーマンスとリソース使用量を監視しながら最適化を進めることをお勧めします。