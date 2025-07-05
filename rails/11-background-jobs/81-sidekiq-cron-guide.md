# Sidekiq-cronで定期的なジョブをスケジューリングする

## 概要

Railsアプリケーションでは、日次のレポート生成、定期的なデータ同期、毎時のキャッシュクリアなど、特定の時間に繰り返し実行したいタスク（cronジョブ）が頻繁に発生します。これらを管理するために、サーバーのcrontabを直接編集する方法もありますが、デプロイの複雑化や管理の煩雑さを招きます。

[Sidekiq](https://sidekiq.org/)は、Railsで最も人気のあるバックグラウンドジョブ処理ライブラリの一つです。そして、そのエコシステムの一部である`sidekiq-cron` gemを使えば、cronジョブの定義をアプリケーションのコードベース内で、かつSidekiqの仕組みに乗せてエレガントに管理できます。

この記事では、`sidekiq-cron`の導入方法と、定期的なジョブをスケジュールするための具体的な設定方法を解説します。

## `sidekiq-cron`の導入

### 1. Gemのインストール

`Gemfile`に`sidekiq-cron`を追加します。`sidekiq`本体も必要です。

Gemfile
```ruby
gem 'sidekiq'
gem 'sidekiq-cron'
```

`bundle install`を実行します。

### 2. Sidekiqの設定

`config/initializers/sidekiq.rb`でSidekiqを設定し、`sidekiq-cron`のスケジュールを読み込むようにします。

```ruby
# config/initializers/sidekiq.rb

Sidekiq.configure_server do |config|
  config.redis = { url: 'redis://localhost:6379/0' }

  # sidekiq-cronのスケジュールをロード
  schedule_file = "config/schedule.yml"
  if File.exist?(schedule_file) && Sidekiq.server?
    Sidekiq::Cron::Job.load_from_hash YAML.load_file(schedule_file)
  end
end

Sidekiq.configure_client do |config|
  config.redis = { url: 'redis://localhost:6379/0' }
end
```

-   `Sidekiq.configure_server`ブロック内で、`config/schedule.yml`というファイルを読み込む設定を追加します。
-   `Sidekiq.server?`のチェックにより、Sidekiqサーバープロセスが起動したときにのみスケジュールが読み込まれるようになります。

## スケジュールの定義

`config/schedule.yml`ファイルを作成し、実行したいジョブとそのスケジュールを定義します。

```yaml
# config/schedule.yml

# ジョブの一意な名前
report_job:
  # 実行するSidekiqワーカーのクラス名
  class: "ReportingWorker"
  # cron式 (毎日深夜0時に実行)
  cron: "0 0 * * *"
  # ジョブが所属するキュー
  queue: "default"
  # ジョブの説明 (Sidekiqダッシュボードに表示される)
  description: "Generates a daily sales report."

cleanup_job:
  class: "CleanupWorker"
  # 1時間ごとに実行
  cron: "0 * * * *"
  queue: "low_priority"
  # ジョブに渡す引数
  args: ["expired_records", 100]
  description: "Cleans up old records every hour."
```

### cron式の書き方

cron式は5つのフィールド（分、時、日、月、曜日）で構成されます。

```
*    *    *    *    *
-    -    -    -    -
|    |    |    |    |
|    |    |    |    +----- 曜日 (0 - 7) (日曜日が0または7)
|    |    |    +---------- 月 (1 - 12)
|    |    +--------------- 日 (1 - 31)
|    +-------------------- 時 (0 - 23)
+------------------------- 分 (0 - 59)
```

-   `*`: 全ての値を意味します。
-   `0 0 * * *`: 毎日0時0分。
-   `*/5 * * * *`: 毎時、5分ごと。

[Crontab.guru](https://crontab.guru/)のようなサイトを使うと、cron式を簡単に作成・確認できます。

## Sidekiqワーカーの実装

`schedule.yml`で指定したワーカーを実装します。

```ruby
# app/workers/reporting_worker.rb

class ReportingWorker
  include Sidekiq::Worker

  def perform
    puts "Generating daily report..."
    # レポート生成のロジックをここに記述
    puts "Report generated."
  end
end

# app/workers/cleanup_worker.rb

class CleanupWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'low_priority'

  def perform(target, limit)
    puts "Cleaning up #{limit} #{target}..."
    # クリーンアップ処理
    puts "Cleanup complete."
  end
end
```

-   ワーカーは通常のSidekiqワーカーと全く同じように実装します。
-   `schedule.yml`で`args`を指定した場合、`perform`メソッドで引数として受け取ることができます。

## Sidekiqダッシュボードでの管理

`sidekiq-cron`を導入すると、SidekiqのWeb UIに「Cron」タブが追加されます。

1.  **Sidekiqダッシュボードのマウント**: `config/routes.rb`に以下を追加します。

    ```ruby
    require 'sidekiq/web'
    require 'sidekiq/cron/web'

    Rails.application.routes.draw do
      # ...
      mount Sidekiq::Web => '/sidekiq'
    end
    ```

2.  **ダッシュボードへのアクセス**: `/sidekiq`にアクセスすると、Sidekiqの管理画面が表示されます。「Cron」タブを開くと、`schedule.yml`で定義したジョブの一覧が表示されます。

    ![Sidekiq Cron Dashboard](https://user-images.githubusercontent.com/1659880/322 Sidekiq Cron UI.png)

このダッシュボードから、以下の操作が可能です。

-   **ジョブの有効/無効化**: 一時的にジョブを停止できます。
-   **手動実行**: `Enqueue Now`ボタンを押すと、スケジュールとは関係なく、その場でジョブをキューに追加できます。デバッグに非常に便利です。
-   **次回の実行時刻の確認**。

## 動的なスケジュールの追加

`schedule.yml`だけでなく、コード内から動的にジョブをスケジュールすることも可能です。

```ruby
# 例: ユーザーが設定した時間に通知を送る

job_name = "user_notification_#{user.id}"
job = Sidekiq::Cron::Job.new(
  name: job_name,
  cron: user.notification_time, # "0 9 * * *" のような文字列
  class: 'UserNotificationWorker',
  args: [user.id]
)

if job.valid?
  job.save
else
  # エラー処理
  puts job.errors
end

# ジョブを削除する場合
Sidekiq::Cron::Job.destroy(job_name)
```

## まとめ

`sidekiq-cron`は、Railsアプリケーションにおける定期的なタスク管理を劇的に簡素化してくれます。

-   **コードによる管理**: スケジュール定義を`schedule.yml`に記述し、Gitでバージョン管理できる。
-   **デプロイの簡素化**: アプリケーションのデプロイプロセスに乗せるだけで、cronの設定が完了する。
-   **優れたUI**: SidekiqのWeb UIから、ジョブの状態確認や手動実行が簡単に行える。
-   **柔軟性**: 静的なYAML定義と、動的なコードによるスケジューリングの両方をサポートする。

サーバーのcrontabを手で編集する時代は終わりました。`sidekiq-cron`を活用して、信頼性が高く、管理しやすいバッチ処理基盤を構築しましょう。
