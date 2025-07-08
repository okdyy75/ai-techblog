# Active Record Encryptionを使った機密データの暗号化

## はじめに

Active Record Encryptionは、Rails 7で導入された機能で、アプリケーションレベルでデータベースに保存されるデータを透明に暗号化できます。機密性の高いPII（個人識別情報）やクレジットカード情報などを安全に保存するための強力なツールです。

### なぜActive Record Encryptionが必要なのか

```ruby
# 従来の問題点
class User < ApplicationRecord
  # このデータはプレーンテキストでDBに保存される
  # email: "user@example.com"
  # ssn: "123-45-6789"
  # credit_card: "4111-1111-1111-1111"
end

# データベースを直接見た場合
# SELECT email, ssn FROM users;
# user@example.com | 123-45-6789
```

**リスク:**
- データベースダンプの漏洩
- 開発者による不適切なアクセス
- ログファイルへの機密データ出力
- バックアップファイルの管理不備

## 基本的な設定

### 1. 暗号化の有効化

```ruby
# config/application.rb
config.active_record.encryption.support_unencrypted_data = true
config.active_record.encryption.extend_queries = true

# config/credentials.yml.enc に暗号化キーを追加
# rails credentials:edit
active_record_encryption:
  primary_key: your_primary_key_here
  deterministic_key: your_deterministic_key_here
  key_derivation_salt: your_salt_here
```

### 2. 暗号化の初期化

```ruby
# config/initializers/encryption.rb
Rails.application.configure do
  config.active_record.encryption.primary_key = Rails.application.credentials.active_record_encryption[:primary_key]
  config.active_record.encryption.deterministic_key = Rails.application.credentials.active_record_encryption[:deterministic_key]
  config.active_record.encryption.key_derivation_salt = Rails.application.credentials.active_record_encryption[:key_derivation_salt]
end
```

## 暗号化の実装

### 1. 基本的な暗号化

```ruby
class User < ApplicationRecord
  # 基本的な暗号化
  encrypts :email
  encrypts :phone_number
  encrypts :ssn
  
  # 複数の属性を一度に暗号化
  encrypts :credit_card_number, :bank_account_number
end

# 使用例
user = User.create!(
  name: "John Doe",
  email: "john@example.com",  # 暗号化される
  ssn: "123-45-6789"         # 暗号化される
)

puts user.email  # => "john@example.com" (復号化されて表示)
```

### 2. 決定論的暗号化

```ruby
class User < ApplicationRecord
  # 検索可能な暗号化
  encrypts :email, deterministic: true
  
  # 通常の暗号化（検索不可）
  encrypts :ssn
end

# 決定論的暗号化では検索が可能
User.where(email: "john@example.com")  # 動作する
User.where(ssn: "123-45-6789")         # 動作しない（エラー）
```

### 3. 大文字小文字を無視した暗号化

```ruby
class User < ApplicationRecord
  encrypts :email, deterministic: true, downcase: true
  encrypts :username, deterministic: true, ignore_case: true
end

# 使用例
user = User.create!(email: "John@Example.COM")

# 検索時に大文字小文字が自動的に処理される
User.find_by(email: "john@example.com")     # 見つかる
User.find_by(email: "JOHN@EXAMPLE.COM")     # 見つかる
```

## 高度な暗号化設定

### 1. カスタム暗号化キー

```ruby
class PaymentInfo < ApplicationRecord
  # 支払い情報専用のカスタムキー
  encrypts :credit_card_number, key: :payment_key
  encrypts :cvv, key: :payment_key
  
  # キーの定義
  def self.payment_key
    Rails.application.credentials.payment_encryption_key
  end
end
```

### 2. コンテキストベースの暗号化

```ruby
class Document < ApplicationRecord
  encrypts :content, context: -> { "document_#{id}" }
  
  # 異なるコンテキストで暗号化
  encrypts :metadata, context: -> { "metadata_#{organization_id}" }
end
```

### 3. 暗号化の圧縮

```ruby
class LargeData < ApplicationRecord
  # 大きなデータの暗号化時に圧縮を適用
  encrypts :large_text, compress: true
  encrypts :json_data, compress: true
end
```

## データ移行の戦略

### 1. 既存データの暗号化

```ruby
# db/migrate/encrypt_existing_user_data.rb
class EncryptExistingUserData < ActiveRecord::Migration[7.0]
  def up
    User.find_each do |user|
      # 暗号化を一時的に無効にして既存データを取得
      user.class.without_encryption do
        email = user.email_before_type_cast
        ssn = user.ssn_before_type_cast
        
        # 暗号化を有効にして保存
        user.update!(email: email, ssn: ssn)
      end
    end
  end
  
  def down
    # 必要に応じて復号化処理
  end
end
```

### 2. 段階的な暗号化移行

```ruby
class User < ApplicationRecord
  # 移行期間中は暗号化されていないデータも読み取り可能
  encrypts :email, support_unencrypted_data: true
  
  # 移行完了後にこのオプションを削除
end

# 移行の確認
def check_encryption_migration
  unencrypted_count = User.where.not(email: nil).count do |user|
    user.class.without_encryption { user.email_before_type_cast == user.email }
  end
  
  puts "Unencrypted records: #{unencrypted_count}"
end
```

## パフォーマンスの考慮事項

### 1. インデックスの最適化

```ruby
class User < ApplicationRecord
  encrypts :email, deterministic: true
  encrypts :ssn  # 非決定論的
  
  # 決定論的暗号化されたフィールドのみインデックス作成可能
  add_index :users, :email
  # add_index :users, :ssn  # これは無効
end
```

### 2. クエリのパフォーマンス

```ruby
# 効率的なクエリ
class UserSearchService
  def self.find_by_email(email)
    # 決定論的暗号化により高速検索が可能
    User.where(email: email).first
  end
  
  def self.search_by_name_and_email(name, email)
    # 複合検索の最適化
    User.where(name: name, email: email)
  end
  
  # 非効率なクエリの例
  def self.search_ssn_like(pattern)
    # SSNは非決定論的暗号化のため、LIKE検索は不可能
    # 全レコードを復号化する必要がある（非常に遅い）
    User.all.select { |user| user.ssn&.include?(pattern) }
  end
end
```

### 3. キャッシュ戦略

```ruby
class User < ApplicationRecord
  encrypts :email, deterministic: true
  encrypts :profile_data
  
  # 復号化済みデータのキャッシュ
  def cached_profile_data
    @cached_profile_data ||= JSON.parse(profile_data)
  end
  
  # キャッシュの無効化
  after_save :clear_profile_cache
  
  private
  
  def clear_profile_cache
    @cached_profile_data = nil
  end
end
```

## セキュリティのベストプラクティス

### 1. キーローテーション

```ruby
# config/initializers/encryption.rb
Rails.application.configure do
  # 複数のキーを設定してローテーションを可能にする
  config.active_record.encryption.key_provider = ActiveRecord::Encryption::EnvelopeEncryptionKeyProvider.new
  
  # 古いキーと新しいキーの設定
  config.active_record.encryption.primary_key = [
    Rails.application.credentials.encryption_key_v2,  # 新しいキー
    Rails.application.credentials.encryption_key_v1   # 古いキー
  ]
end

# キーローテーションの実行
def rotate_encryption_keys
  User.find_each do |user|
    # 古いキーで復号化し、新しいキーで再暗号化
    user.touch  # saved時に最新のキーで再暗号化される
  end
end
```

### 2. 監査ログ

```ruby
class User < ApplicationRecord
  encrypts :email, deterministic: true
  encrypts :ssn
  
  # 暗号化データへのアクセスをログ記録
  after_find :log_access
  before_save :log_modification
  
  private
  
  def log_access
    if ssn_changed? || email_changed?
      AuditLogger.log("Encrypted data accessed", {
        user_id: id,
        fields: changes.keys,
        accessor: Current.user&.id
      })
    end
  end
  
  def log_modification
    if will_save_change_to_ssn? || will_save_change_to_email?
      AuditLogger.log("Encrypted data modified", {
        user_id: id,
        fields: changed_attributes.keys,
        modifier: Current.user&.id
      })
    end
  end
end
```

### 3. 環境別の設定

```ruby
# config/environments/development.rb
config.active_record.encryption.support_unencrypted_data = true
config.active_record.encryption.extend_queries = true

# config/environments/test.rb
config.active_record.encryption.support_unencrypted_data = true
config.active_record.encryption.extend_queries = false

# config/environments/production.rb
config.active_record.encryption.support_unencrypted_data = false
config.active_record.encryption.extend_queries = true
```

## トラブルシューティング

### 1. よくある問題と解決法

```ruby
# 問題: 暗号化データが読み取れない
# 解決: キーの確認
def debug_encryption_keys
  puts "Primary key present: #{Rails.application.config.active_record.encryption.primary_key.present?}"
  puts "Deterministic key present: #{Rails.application.config.active_record.encryption.deterministic_key.present?}"
end

# 問題: 検索ができない
# 解決: 決定論的暗号化の確認
class User < ApplicationRecord
  # 検索したいフィールドは deterministic: true にする
  encrypts :email, deterministic: true  # 検索可能
  encrypts :ssn                         # 検索不可
end

# 問題: パフォーマンスが悪い
# 解決: クエリの最適化
def optimized_user_search(email)
  # 効率的：決定論的暗号化フィールドでの検索
  User.where(email: email)
  
  # 非効率：暗号化フィールドでのLIKE検索
  # User.where("email LIKE ?", "%#{email}%")  # 避ける
end
```

### 2. データ整合性の確認

```ruby
class EncryptionIntegrityChecker
  def self.check_user_data
    User.find_each do |user|
      begin
        # 暗号化データが正常に復号化できるかテスト
        user.email if user.email.present?
        user.ssn if user.ssn.present?
      rescue ActiveRecord::Encryption::Errors::Decryption => e
        puts "Decryption error for User #{user.id}: #{e.message}"
      end
    end
  end
end
```

## まとめ

Active Record Encryptionは、機密データを安全に保存するための強力な機能です。適切に実装することで、データの機密性を保ちながら、アプリケーションの使いやすさを維持できます。

**重要なポイント:**
- 検索が必要なフィールドは決定論的暗号化を使用
- パフォーマンスを考慮したクエリ設計
- 定期的なキーローテーション
- 適切な監査ログの実装

導入時は段階的に進め、既存データの移行計画を慎重に立てることが成功の鍵となります。