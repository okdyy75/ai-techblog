# Sidekiqではじめるバックグラウンドジョブ入門

## はじめに

Webアプリケーションを開発していると、実行に時間のかかる処理（重い処理）を扱わなければならない場面が多々あります。例えば、メールの送信、画像の変換、外部APIへの問い合わせ、大量データの集計などです。これらの処理を通常のWebリクエストのサイクル内で同期的に実行すると、ユーザーは処理が終わるまでレスポンスを待たされ、UX（ユーザー体験）を著しく損なってしまいます。

この問題を解決するのが「**バックグラウンドジョブ**」です。時間のかかる処理をWebリクエストとは別のプロセスに任せる（非同期化する）ことで、ユーザーに素早くレスポンスを返し、アプリケーション全体の応答性を高めることができます。

この記事では、Ruby on Railsでバックグラウンドジョブを実現するための最もポピュラーなライブラリである**Sidekiq**の導入と基本的な使い方を解説します。

## Sidekiqとは？

Sidekiqは、Rubyで書かれた高機能かつ高性能なバックグラウンドジョブ処理フレームワークです。その最大の特徴は、**Redis**をデータストアとして利用することです。

*   **高速**: Redisはインメモリデータベースであるため、ジョブのキューイング（登録）や取得が非常に高速です。
*   **高信頼性**: Sidekiqには、失敗したジョブを自動的にリトライする仕組みが組み込まれています。
*   **並列処理**: マルチスレッドで動作するため、複数のジョブを同時に効率よく処理できます。
*   **エコシステム**: 監視用のWeb UIや豊富なプラグインなど、エコシステムが充実しています。

## 1. 必要なもののインストール

### Redisのインストール

SidekiqはRedisに依存しているため、まずRedisをインストールする必要があります。

**macOS (Homebrewを使用)**
```bash
brew install redis
brew services start redis
```

**Ubuntu**
```bash
sudo apt-get update
sudo apt-get install redis-server
```

### Sidekiqのインストール

次に、`Gemfile`にSidekiqを追加して、`bundle install`を実行します。

```ruby
# Gemfile
gem 'sidekiq'
```

```bash
bundle install
```

## 2. Active Jobの設定

Rails 4.2から導入されたActive Jobは、SidekiqやResqueといった様々なバックグラウンドジョブライブラリのアダプタとして機能する共通インターフェースです。Active Jobを使うことで、将来的に別のライブラリに乗り換える際も、ジョブクラスのコードを書き換える必要がなくなります。

`config/application.rb`で、Active JobのアダプタとしてSidekiqを指定します。

```ruby
# config/application.rb
module YourAppName
  class Application < Rails::Application
    # ...
    config.active_job.queue_adapter = :sidekiq
  end
end
```

## 3. ジョブクラスの作成

それでは、実際にバックグラウンドで実行したい処理を定義するジョブクラスを作成しましょう。Railsのジェネレータを使うと便利です。

ここでは例として、ユーザー登録時にウェルカムメールを送信するジョブを作成します。

```bash
rails generate job WelcomeEmail
```

これにより、`app/jobs/welcome_email_job.rb`というファイルが生成されます。

```ruby
# app/jobs/welcome_email_job.rb
class WelcomeEmailJob < ApplicationJob
  queue_as :default

  def perform(user_id)
    # performメソッドの中に、バックグラウンドで実行したい処理を書く
    user = User.find(user_id)
    UserMailer.welcome_email(user).deliver_now
  end
end
```

*   **`perform(*args)`**: このメソッド内に、非同期で実行したい重い処理を記述します。
*   **引数**: `perform`メソッドの引数には、シリアライズ可能な単純なオブジェクト（ID、文字列、数値など）を渡すのが原則です。Active Recordのモデルオブジェクトそのものを渡すと、古いデータで処理してしまうなどの問題が起きる可能性があるため、`user_id`のようにIDを渡して、`perform`メソッド内で改めてオブジェクトを検索するのが一般的です。

## 4. ジョブの投入（Enqueue）

作成したジョブを実行キューに入れるには、コントローラなどから`perform_later`メソッドを呼び出します。

```ruby
# app/controllers/users_controller.rb
class UsersController < ApplicationController
  def create
    @user = User.new(user_params)
    if @user.save
      # 同期的にメールを送信する代わりに、ジョブをキューに入れる
      # UserMailer.welcome_email(@user).deliver_now # ← これを置き換える
      WelcomeEmailJob.perform_later(@user.id)

      flash[:success] = "Welcome! You will receive a welcome email shortly."
      redirect_to @user
    else
      render :new
    end
  end
  # ...
end
```

`perform_later`が呼び出されると、ジョブの情報（クラス名と引数）がRedisに保存され、リクエストは即座に完了します。ユーザーは待つことなく次のページへ遷移できます。

## 5. Sidekiqプロセスの起動

キューに入れられたジョブを実際に処理するためには、RailsのWebサーバー（Pumaなど）とは別に、Sidekiqのワーカープロセスを起動する必要があります。

ターミナルで以下のコマンドを実行します。

```bash
bundle exec sidekiq
```

このプロセスがRedisを監視し、キューに新しいジョブが入ってくると、それを取り出して`perform`メソッドを実行します。

## 6. Sidekiq Web UIによる監視

Sidekiqには、ジョブの実行状況（処理中のジョブ、待機中のジョブ、失敗したジョブなど）をリアルタイムで確認できるWebインターフェースが付属しています。

`config/routes.rb`に以下の設定を追加します。

```ruby
# config/routes.rb
require 'sidekiq/web'

Rails.application.routes.draw do
  # ...
  mount Sidekiq::Web => '/sidekiq'
end
```

Railsサーバーを起動し、`/sidekiq`にアクセスすると、管理画面が表示されます。（本番環境では、Deviseなどの認証でアクセスを制限することを忘れないでください）

## まとめ

SidekiqとActive Jobを導入することで、時間のかかる処理を簡単に非同期化し、アプリケーションの応答性を劇的に改善することができます。

1.  **Redisをインストールする**
2.  **Sidekiq gemを追加し、Active Jobのアダプタとして設定する**
3.  **`rails g job`でジョブクラスを作成し、`perform`メソッドに処理を記述する**
4.  **`YourJob.perform_later(args)`でジョブをキューに入れる**
5.  **`bundle exec sidekiq`でワーカープロセスを起動する**

この流れをマスターすれば、ユーザーを待たせることのない、快適なWebアプリケーションを構築できるはずです。ぜひ活用してみてください。
