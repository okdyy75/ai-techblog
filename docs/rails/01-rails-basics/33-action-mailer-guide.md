# 33. Action Mailer実践ガイド: メール送信とプレビュー、テスト

## はじめに

ユーザー登録の完了通知、パスワードリセット、通知メールなど、多くのWebアプリケーションにとってメール送信は不可欠な機能です。Railsでは、**Action Mailer** というフレームワークが用意されており、メールの作成、送信、テストを簡単に行うことができます。

本記事では、Action Mailerの基本的な使い方から、開発中に便利なメールプレビュー機能、そしてテストの書き方までを網羅した実践的なガイドを提供します。

## この記事で学べること

- Action Mailerを使ったメーラーの作成と設定方法
- テキスト形式とHTML形式のメールテンプレートの作成
- 開発環境で送信メールをブラウザで確認できるプレビュー機能の使い方
- メーラーの単体テストと、メール送信を伴う機能テストの書き方

## 1. メーラーの生成と設定

### 1.1. メーラーの生成

まずはジェネレータを使って、メーラーの雛形を作成します。ここでは、ユーザー登録完了メールを送る `UserMailer` を作成します。

```bash
rails generate mailer UserMailer welcome_email
```

これにより、以下のファイルが生成されます。

- `app/mailers/user_mailer.rb` (メーラーのロジック)
- `app/views/user_mailer/welcome_email.html.erb` (HTML形式のメールテンプレート)
- `app/views/user_mailer/welcome_email.text.erb` (テキスト形式のメールテンプレート)
- `test/mailers/previews/user_mailer_preview.rb` (メールのプレビュー用ファイル)

### 1.2. SMTP設定

実際にメールを送信するには、SMTPサーバーの設定が必要です。開発環境では `letter_opener_web` などを使い、本番環境ではSendGridやAmazon SESなどの外部サービスを利用するのが一般的です。

`config/environments/development.rb` には、開発中にメール送信をシミュレートする設定をします。

config/environments/development.rb
```ruby
# gem 'letter_opener_web' を追加して `bundle install` しておく
config.action_mailer.delivery_method = :letter_opener_web
config.action_mailer.perform_deliveries = true
config.action_mailer.default_url_options = { host: 'localhost', port: 3000 }
```

`config/environments/production.rb` には、本番用のSMTPサーバー情報を設定します。

config/environments/production.rb
```ruby
config.action_mailer.delivery_method = :smtp
config.action_mailer.smtp_settings = {
  address:              'smtp.sendgrid.net',
  port:                 587,
  domain:               'your-domain.com',
  user_name:            Rails.application.credentials.dig(:sendgrid, :user_name),
  password:             Rails.application.credentials.dig(:sendgrid, :password),
  authentication:       'plain',
  enable_starttls_auto: true
}
config.action_mailer.default_url_options = { host: 'your-domain.com' }
```

## 2. メールの作成と送信

### 2.1. メーラーの編集

`app/mailers/user_mailer.rb` を編集します。メーラーのメソッド内で、宛先、件名、送信元などを設定します。インスタンス変数を定義すると、ビューテンプレートから参照できます。

app/mailers/user_mailer.rb
```ruby
class UserMailer < ApplicationMailer
  default from: '''notifications@example.com'''

  def welcome_email(user)
    @user = user
    @url  = '''http://example.com/login'''
    mail(to: @user.email, subject: 'サービスへようこそ！')
  end
end
```

### 2.2. メールテンプレートの編集

HTML形式 (`.html.erb`) とテキスト形式 (`.text.erb`) の両方のテンプレートを用意することが推奨されます。これにより、受信者の環境に応じて適切な形式でメールが表示されます。

`app/views/user_mailer/welcome_email.html.erb`:
```erb
<!DOCTYPE html>
<html>
  <head>
    <meta content='text/html; charset=UTF-8' http-equiv='Content-Type' />
  </head>
  <body>
    <h1><%= @user.name %>様、ようこそ！</h1>
    <p>
      アカウントの登録が完了しました。<br>
      以下のリンクからログインしてください:
    </p>
    <p><a href="<%= @url %>">ログインする</a></p>
  </body>
</html>
```

`app/views/user_mailer/welcome_email.text.erb`:
```erb
<%= @user.name %>様、ようこそ！

アカウントの登録が完了しました。
以下のURLからログインしてください:
<%= @url %>
```

### 2.3. メールの送信

コントローラなど、アプリケーションのロジックからメーラーを呼び出します。

- `.deliver_now`: 同期的にメールを送信します。
- `.deliver_later`: Active Jobのキューに追加し、バックグラウンドで非同期に送信します。ユーザーを待たせないため、こちらが推奨されます。

app/controllers/users_controller.rb
```ruby
def create
  @user = User.new(user_params)
  if @user.save
    # ユーザー登録成功後、ウェルカムメールを送信
    UserMailer.welcome_email(@user).deliver_later
    redirect_to @user, notice: 'ユーザー登録が完了しました。'
  else
    render :new
  end
end
```

## 3. メールのプレビュー

開発中にメールの見た目を確認するたびに実際にメールを送信するのは非効率です。Railsには、ブラウザで送信メールのプレビューを確認できる機能が組み込まれています。

`test/mailers/previews/user_mailer_preview.rb` を編集します。

test/mailers/previews/user_mailer_preview.rb
```ruby
class UserMailerPreview < ActionMailer::Preview
  def welcome_email
    # プレビュー用のダミーデータを作成
    user = User.new(name: "テストユーザー", email: "'''test@example.com'''")
    UserMailer.welcome_email(user)
  end
end
```

開発サーバーを起動し、 `http://localhost:3000/rails/mailers/user_mailer/welcome_email` にアクセスすると、生成されるメールのHTML版とテキスト版をブラウザで確認できます。

## 4. メールのテスト

### 4.1. メーラー単体テスト

`test/mailers/user_mailer_test.rb` で、メーラーが正しい内容のメールを生成するかをテストします。

test/mailers/user_mailer_test.rb
```ruby
require "test_helper"

class UserMailerTest < ActionMailer::TestCase
  test "welcome_email" do
    user = users(:one) # fixturesからユーザーを取得
    email = UserMailer.welcome_email(user)

    # メールがキューに追加されたことを確認
    assert_emails 1 do
      email.deliver_now
    end

    # 送信内容のテスト
    assert_equal ['''notifications@example.com'''], email.from
    assert_equal [user.email], email.to
    assert_equal "サービスへようこそ！", email.subject
    assert_match user.name, email.body.encoded
  end
end
```

### 4.2. 機能テスト（統合テスト）

ユーザー登録機能など、特定の操作をトリガーとしてメールが送信されることをテストします。

test/integration/user_creation_test.rb
```ruby
require "test_helper"

class UserCreationTest < ActionDispatch::IntegrationTest
  test "a welcome email is sent upon user creation" do
    # ActionMailer::Base.deliveries 配列に送信済みメールが格納される
    assert_difference 'ActionMailer::Base.deliveries.size', +1 do
      post users_url, params: { user: { name: "新規ユーザー", email: "'''new@example.com'''", password: "password" } }
    end
  end
end
```

## まとめ

Action Mailerは、Railsアプリケーションにおけるメール関連の機能を一手に引き受ける強力なフレームワークです。

- **メーラーとビューの分離**: ロジックと見た目を分離し、管理しやすくする。
- **プレビュー機能**: 開発効率を大幅に向上させる。
- **テスト**: `assert_emails` などのヘルパーを使い、メール送信機能を確実にテストできる。

本記事で紹介した方法を活用し、信頼性の高いメール送信機能を実装してください。