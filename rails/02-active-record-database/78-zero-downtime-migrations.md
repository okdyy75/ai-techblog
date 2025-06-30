# データベース移行のベストプラクティス: ゼロダウンタイム・デプロイメント

## はじめに

本番環境でのデータベース移行は、サービス停止時間を最小限に抑えることが重要です。適切な戦略とテクニックを使用することで、ユーザーに影響を与えることなくスキーマの変更やデータの移行を実行できます。

### ゼロダウンタイム移行の原則

1. **後方互換性の維持**
2. **段階的な変更の実施**
3. **ロールバック可能な設計**
4. **パフォーマンスへの配慮**

## 安全な移行戦略

### 1. カラムの追加

```ruby
# 安全な例：新しいカラムの追加
class AddEmailToUsers < ActiveRecord::Migration[7.0]
  def change
    add_column :users, :email, :string
    add_index :users, :email
  end
end

# モデルでの対応
class User < ApplicationRecord
  # 新しいカラムをオプショナルに設定
  validates :email, presence: true, allow_blank: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, allow_blank: true
end
```

### 2. カラムの削除（3段階アプローチ）

```ruby
# Step 1: カラムを無視するようアプリケーションを更新
class User < ApplicationRecord
  # 削除予定のカラムを無視
  self.ignored_columns = ["deprecated_field"]
end

# Step 2: デプロイ後、カラムを削除
class RemoveDeprecatedFieldFromUsers < ActiveRecord::Migration[7.0]
  def change
    remove_column :users, :deprecated_field, :string
  end
end

# Step 3: ignored_columns設定を削除
class User < ApplicationRecord
  # ignored_columns設定を削除
end
```

### 3. インデックスの追加（大きなテーブル）

```ruby
# 安全でない例：ロックが発生する可能性
class AddIndexToUsersEmail < ActiveRecord::Migration[7.0]
  def change
    add_index :users, :email
  end
end

# 安全な例：CONCURRENTLYオプションの使用（PostgreSQL）
class AddIndexToUsersEmailSafely < ActiveRecord::Migration[7.0]
  disable_ddl_transaction!
  
  def change
    add_index :users, :email, algorithm: :concurrently
  end
end

# MySQL用の安全な実装
class AddIndexToUsersEmailMysql < ActiveRecord::Migration[7.0]
  def up
    # MySQLでは ALGORITHM=INPLACE, LOCK=NONE を使用
    execute <<-SQL
      ALTER TABLE users 
      ADD INDEX index_users_on_email (email) 
      ALGORITHM=INPLACE, LOCK=NONE
    SQL
  end
  
  def down
    remove_index :users, :email
  end
end
```

### 4. カラム名の変更（5段階アプローチ）

```ruby
# Step 1: 新しいカラムを追加
class AddNewNameToUsers < ActiveRecord::Migration[7.0]
  def change
    add_column :users, :full_name, :string
  end
end

# Step 2: アプリケーションで両方のカラムを使用
class User < ApplicationRecord
  def name
    full_name.presence || old_name
  end
  
  def name=(value)
    self.full_name = value
    self.old_name = value
  end
  
  before_save :sync_name_fields
  
  private
  
  def sync_name_fields
    if full_name_changed?
      self.old_name = full_name
    elsif old_name_changed?
      self.full_name = old_name
    end
  end
end

# Step 3: 既存データを移行
class MigrateOldNameToFullName < ActiveRecord::Migration[7.0]
  def up
    User.where(full_name: nil).find_each do |user|
      user.update_column(:full_name, user.old_name)
    end
  end
  
  def down
    # Rollback logic if needed
  end
end

# Step 4: 新しいカラムのみを使用するようアプリケーションを更新
class User < ApplicationRecord
  alias_attribute :name, :full_name
  self.ignored_columns = ["old_name"]
end

# Step 5: 古いカラムを削除
class RemoveOldNameFromUsers < ActiveRecord::Migration[7.0]
  def change
    remove_column :users, :old_name, :string
  end
end
```

## 高度な移行テクニック

### 1. 大きなテーブルでのデータ変更

```ruby
class UpdateLargeTableData < ActiveRecord::Migration[7.0]
  def up
    # バッチ処理で大量データを更新
    User.in_batches(of: 1000) do |batch|
      batch.update_all("status = CASE 
                         WHEN active = true THEN 'active'
                         WHEN active = false THEN 'inactive'
                         ELSE 'unknown'
                       END")
      
      # 各バッチ間で一時停止してリソースを解放
      sleep(0.1)
    end
  end
  
  def down
    User.in_batches(of: 1000) do |batch|
      batch.update_all("active = CASE 
                         WHEN status = 'active' THEN true
                         WHEN status = 'inactive' THEN false
                         ELSE NULL
                       END")
      sleep(0.1)
    end
  end
end
```

### 2. 外部キー制約の安全な追加

```ruby
class AddForeignKeyConstraint < ActiveRecord::Migration[7.0]
  def up
    # Step 1: NOT VALID制約を追加（PostgreSQL）
    execute <<-SQL
      ALTER TABLE posts 
      ADD CONSTRAINT fk_posts_user_id 
      FOREIGN KEY (user_id) REFERENCES users(id)
      NOT VALID
    SQL
    
    # Step 2: 制約を検証（バックグラウンドで実行）
    execute <<-SQL
      ALTER TABLE posts 
      VALIDATE CONSTRAINT fk_posts_user_id
    SQL
  end
  
  def down
    execute "ALTER TABLE posts DROP CONSTRAINT fk_posts_user_id"
  end
end

# Rails 7.1以降の書き方
class AddForeignKeyConstraintRails71 < ActiveRecord::Migration[7.1]
  def change
    add_foreign_key :posts, :users, validate: false
    validate_foreign_key :posts, :users
  end
end
```

### 3. 型変更の安全な実装

```ruby
class ChangeUserAgeType < ActiveRecord::Migration[7.0]
  def up
    # Step 1: 新しい型のカラムを追加
    add_column :users, :age_new, :integer
    
    # Step 2: データを変換してコピー
    User.find_each do |user|
      if user.age.present?
        user.update_column(:age_new, user.age.to_i)
      end
    end
    
    # Step 3: 新しいカラムにNOT NULL制約を追加（必要な場合）
    change_column_null :users, :age_new, false
    
    # Step 4: 古いカラムを削除し、新しいカラムをリネーム
    remove_column :users, :age
    rename_column :users, :age_new, :age
  end
  
  def down
    # Rollback処理
    add_column :users, :age_old, :string
    
    User.find_each do |user|
      if user.age.present?
        user.update_column(:age_old, user.age.to_s)
      end
    end
    
    remove_column :users, :age
    rename_column :users, :age_old, :age
  end
end
```

## 移行の監視とパフォーマンス最適化

### 1. 移行の実行時間監視

```ruby
class MonitoredMigration < ActiveRecord::Migration[7.0]
  def up
    start_time = Time.current
    
    say "Starting large data migration..."
    
    total_records = User.count
    processed = 0
    
    User.find_in_batches(batch_size: 1000) do |batch|
      batch.each do |user|
        # 処理を実行
        update_user_data(user)
        processed += 1
      end
      
      # 進捗レポート
      if processed % 10000 == 0
        elapsed = Time.current - start_time
        percentage = (processed.to_f / total_records * 100).round(2)
        rate = processed / elapsed
        eta = (total_records - processed) / rate
        
        say "Progress: #{processed}/#{total_records} (#{percentage}%) - ETA: #{eta.round(0)}s"
      end
    end
    
    say "Migration completed in #{Time.current - start_time} seconds"
  end
  
  private
  
  def update_user_data(user)
    # 実際の更新処理
  end
end
```

### 2. リソース使用量の制御

```ruby
class ResourceControlledMigration < ActiveRecord::Migration[7.0]
  def up
    # データベース接続プールのサイズを一時的に調整
    original_pool_size = ActiveRecord::Base.connection_pool.size
    ActiveRecord::Base.establish_connection(
      ActiveRecord::Base.connection_config.merge(pool: 1)
    )
    
    begin
      User.find_in_batches(batch_size: 500) do |batch|
        ActiveRecord::Base.transaction do
          batch.each { |user| process_user(user) }
        end
        
        # CPUとメモリの使用量を制御
        sleep(0.05)
        
        # メモリリークを防ぐためにガベージコレクションを実行
        GC.start if batch.first.id % 10000 == 0
      end
    ensure
      # 元の接続設定を復元
      ActiveRecord::Base.establish_connection(
        ActiveRecord::Base.connection_config.merge(pool: original_pool_size)
      )
    end
  end
  
  private
  
  def process_user(user)
    # ユーザー処理ロジック
  end
end
```

## 本番環境での移行戦略

### 1. 段階的デプロイメント

```ruby
# FeatureFlag を使用した段階的な機能公開
class User < ApplicationRecord
  def use_new_email_system?
    # Feature flagで段階的に新機能を公開
    return false unless Rails.application.config.feature_flags[:new_email_system]
    
    # 特定の条件のユーザーのみに新機能を提供
    case Rails.env
    when 'production'
      # 本番では段階的にロールアウト
      id % 100 < Rails.application.config.rollout_percentage
    when 'staging'
      true
    else
      false
    end
  end
  
  def email_service
    if use_new_email_system?
      NewEmailService.new(self)
    else
      LegacyEmailService.new(self)
    end
  end
end
```

### 2. ロールバック可能な設計

```ruby
class ReversibleDataMigration < ActiveRecord::Migration[7.0]
  def up
    # データ移行の実行
    say "Migrating user preferences..."
    
    User.find_each do |user|
      # 移行前のデータをバックアップテーブルに保存
      UserPreferenceBackup.create!(
        user_id: user.id,
        old_preferences: user.preferences,
        migration_version: version
      )
      
      # 新しい形式にデータを変換
      user.update!(preferences: convert_preferences(user.preferences))
    end
  end
  
  def down
    # ロールバック時は バックアップから復元
    say "Rolling back user preferences..."
    
    UserPreferenceBackup.where(migration_version: version).find_each do |backup|
      user = User.find(backup.user_id)
      user.update!(preferences: backup.old_preferences)
      backup.destroy!
    end
  end
  
  private
  
  def convert_preferences(old_prefs)
    # 設定データの変換ロジック
  end
  
  def version
    self.class.to_s.match(/(\d+)/)[1]
  end
end
```

### 3. ヘルスチェック機能の実装

```ruby
# app/controllers/health_controller.rb
class HealthController < ApplicationController
  def check
    checks = {
      database: check_database,
      migrations: check_migrations,
      services: check_external_services
    }
    
    overall_status = checks.values.all? { |check| check[:status] == 'ok' }
    
    render json: {
      status: overall_status ? 'ok' : 'error',
      checks: checks,
      timestamp: Time.current
    }, status: overall_status ? 200 : 503
  end
  
  private
  
  def check_database
    ActiveRecord::Base.connection.execute("SELECT 1")
    { status: 'ok', message: 'Database connection successful' }
  rescue => e
    { status: 'error', message: e.message }
  end
  
  def check_migrations
    pending = ActiveRecord::Base.connection.migration_context.needs_migration?
    if pending
      { status: 'warning', message: 'Pending migrations detected' }
    else
      { status: 'ok', message: 'All migrations up to date' }
    end
  rescue => e
    { status: 'error', message: e.message }
  end
  
  def check_external_services
    # 外部サービスの正常性をチェック
    { status: 'ok', message: 'All external services operational' }
  rescue => e
    { status: 'error', message: e.message }
  end
end
```

## まとめ

ゼロダウンタイム・デプロイメントを実現するためには、以下の原則を守ることが重要です：

**主要なポイント：**
- 後方互換性を常に維持する
- 大きな変更は段階的に実施する
- 各段階でロールバック可能な設計にする
- パフォーマンスへの影響を最小限に抑える

**実装のベストプラクティス：**
- インデックス追加時はCONCURRENTLYオプションを使用
- 大量データの更新はバッチ処理で実行
- Feature Flagで段階的な機能公開を実施
- 適切な監視とロールバック機能を実装

これらの手法を適切に使用することで、サービスを停止することなく安全にデータベース移行を実行できます。