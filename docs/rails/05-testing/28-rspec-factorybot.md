# 28. RSpecとFactoryBotを使った実践的なテストコードの書き方

## はじめに

Railsアプリケーション開発において、テストは品質を担保し、安全なリファクタリングを可能にするための重要な要素です。Railsには標準でMinitestが組み込まれていますが、より表現力豊かでDRY（Don't Repeat Yourself）に記述できる **RSpec** と、テストデータを簡単に作成できる **FactoryBot** の組み合わせは、多くの開発現場で採用されています。

本記事では、RSpecとFactoryBotを導入し、実践的なテストコードを記述する方法を解説します。

## この記事で学べること

- RSpecとFactoryBotの導入・設定方法
- `describe`, `context`, `it` を使ったテスト構造化
- FactoryBotを使ったテストデータの生成
- モデル、リクエスト（コントローラ）の基本的なテストの書き方

## 1. 導入と設定

### 1.1. Gemのインストール

`Gemfile` の `:development, :test` グループに以下のgemを追加します。

Gemfile
```ruby
group :development, :test do
  gem "rspec-rails"
  gem "factory_bot_rails"
  gem "faker" # テストデータにリアルな名前やメールアドレスを使うために追加
end
```

`bundle install` を実行します。

```bash
bundle install
```

### 1.2. RSpecの初期設定

以下のコマンドを実行し、RSpecの設定ファイルを生成します。

```bash
rails generate rspec:install
```

これにより、以下のファイルが生成されます。

- `.rspec`
- `spec/spec_helper.rb`
- `spec/rails_helper.rb`

### 1.3. FactoryBotの設定

`spec/rails_helper.rb` にFactoryBotの構文をテスト内で直接使えるように設定を追加します。

spec/rails_helper.rb
```ruby
# ... (既存の設定) ...
RSpec.configure do |config|
  # ...

  # FactoryBotの構文をincludeする
  config.include FactoryBot::Syntax::Methods

  # ...
end
```

また、FactoryBotのファクトリ定義ファイルを `spec/factories` ディレクトリに置くのが一般的です。

## 2. モデルのテスト

例として、`User` モデルのテストを作成します。

### 2.1. モデルとマイグレーションの作成

```bash
rails g model User name:string email:string
rails db:migrate
```

`app/models/user.rb` にバリデーションを追加します。

app/models/user.rb
```ruby
class User < ApplicationRecord
  validates :name, presence: true
  validates :email, presence: true, uniqueness: true
end
```

### 2.2. Factoryの作成

`spec/factories/users.rb` を作成し、`User` モデルのテストデータを生成するためのファクトリを定義します。`Faker` gemを使って、実行ごとに異なるリアルなデータを生成します。

spec/factories/users.rb
```ruby
FactoryBot.define do
  factory :user do
    name { Faker::Name.name }
    sequence(:email) { |n| "'''test#{n}@example.com'''" } # 重複しないようにsequenceを使う
  end
end
```

### 2.3. モデルスペックの作成

`spec/models/user_spec.rb` を作成し、テストを記述します。

spec/models/user_spec.rb
```ruby
require 'rails_helper'

RSpec.describe User, type: :model do
  describe 'バリデーション' do
    context '正常な場合' do
      it '名前とメールアドレスがあれば有効であること' do
        user = build(:user) # FactoryBotでUserオブジェクトをビルド
        expect(user).to be_valid
      end
    end

    context '異常な場合' do
      it '名前がなければ無効であること' do
        user = build(:user, name: nil)
        user.valid?
        expect(user.errors[:name]).to include("can't be blank")
      end

      it 'メールアドレスがなければ無効であること' do
        user = build(:user, email: nil)
        user.valid?
        expect(user.errors[:email]).to include("can't be blank")
      end

      it '重複したメールアドレスは無効であること' do
        create(:user, email: '''test@example.com''') # 最初にユーザーを作成・保存
        user2 = build(:user, email: '''test@example.com''')
        user2.valid?
        expect(user2.errors[:email]).to include("has already been taken")
      end
    end
  end
end
```

`build` はオブジェクトをメモリ上に作成するだけで、`create` はデータベースに保存する、という違いがあります。

## 3. リクエスト（コントローラ）のテスト

次に、`UsersController` の `index` アクションに対するリクエストスペックを作成します。

### 3.1. コントローラとルーティングの作成

```bash
rails g controller Users index
```

`config/routes.rb` に `resources :users, only: [:index]` が追加されます。

`app/controllers/users_controller.rb` を編集します。

app/controllers/users_controller.rb
```ruby
class UsersController < ApplicationController
  def index
    @users = User.all
    render json: @users, status: :ok
  end
end
```

### 3.2. リクエストスペックの作成

`spec/requests/users_spec.rb` を作成します。

spec/requests/users_spec.rb
```ruby
require 'rails_helper'

RSpec.describe "Users", type: :request do
  describe "GET /users" do
    let!(:user1) { create(:user) }
    let!(:user2) { create(:user) }

    before { get '/users' }

    it "HTTPステータス200が返されること" do
      expect(response).to have_http_status(:ok)
    end

    it "ユーザーの一覧がJSON形式で返されること" do
      json = JSON.parse(response.body)
      expect(json.size).to eq(2)
    end

    it "返されるJSONにユーザーの情報が含まれていること" do
      json = JSON.parse(response.body)
      expect(json[0]['name']).to eq(user1.name)
      expect(json[1]['email']).to eq(user2.email)
    end
  end
end
```

`let!` を使うと、`before` ブロックの前にテストデータが作成されます。

## 4. テストの実行

以下のコマンドで、すべてのスペックを実行できます。

```bash
bundle exec rspec
```

特定のファイルだけを実行することも可能です。

```bash
bundle exec rspec spec/models/user_spec.rb
```

## まとめ

RSpecとFactoryBotを使うことで、可読性が高く、メンテナンスしやすいテストコードを効率的に記述できます。

- **RSpec**: `describe`, `context`, `it` でテストの意図を明確に構造化できる。
- **FactoryBot**: テストデータの準備を簡潔にし、テストコードをDRYに保つ。

テストはアプリケーションの堅牢性を高める上で不可欠です。本記事を参考に、ぜひRSpecとFactoryBotによるテスト駆動開発を実践してみてください。