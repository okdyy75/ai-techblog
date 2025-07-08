# 31. RailsとStripe連携: サブスクリプション課金システムを構築する

## はじめに

SaaS (Software as a Service) をはじめとする多くのWebサービスにおいて、サブスクリプション（月額・年額課金）モデルは主要な収益源となっています。この複雑な課金システムをゼロから構築するのは大変ですが、決済代行サービス **Stripe** を利用することで、安全かつ迅速に実装することが可能です。

本記事では、RailsアプリケーションにStripeを連携させ、基本的なサブスクリプション課金システムを構築する手順を解説します。

## この記事で学べること

- Stripeの基本的な概念（Customer, Product, Price, Subscription）
- `stripe` gemを使ったRailsとStripe APIの連携方法
- Stripe Checkoutを利用した安全な決済ページの生成
- Stripe Webhookによる課金イベントのハンドリング

## 1. Stripeの準備

### 1.1. Stripeアカウントの作成とAPIキーの取得

1.  [Stripe公式サイト](https://stripe.com/)でアカウントを登録します。
2.  ダッシュボードにログインし、開発者メニューから「APIキー」ページに移動します。
3.  「標準キー」の **公開可能キー (Publishable key)** と **シークレットキー (Secret key)** をコピーしておきます。これらは後ほどRailsの設定で使用します。

### 1.2. 商品と価格の作成

Stripeダッシュボードで、ユーザーに提供するサブスクリプションプランを作成します。

1.  「商品」メニューに移動し、「商品を追加」をクリックします。
2.  **商品情報**（例: プレミアムプラン）を入力します。
3.  **料金体系**で「継続」を選択し、価格（例: 1,500円/月）と請求期間を設定します。
4.  作成後、価格詳細ページに表示される **価格ID (Price ID)**（`price_...` から始まる文字列）をコピーしておきます。

## 2. RailsアプリケーションへのStripe導入

### 2.1. Gemのインストールと設定

`Gemfile` に `stripe` gemを追加します。

Gemfile
```ruby
gem 'stripe'
```

`bundle install` を実行します。

次に、APIキーを設定します。`config/initializers/stripe.rb` を作成し、以下のように記述します。

config/initializers/stripe.rb
```ruby
Stripe.api_key = Rails.application.credentials.dig(:stripe, :secret_key)
```

`rails credentials:edit` を実行し、Stripeのシークレットキーを保存します。

config/credentials.yml.enc
```yml
stripe:
  secret_key: sk_test_xxxxxxxxxxxx
  publishable_key: pk_test_xxxxxxxxxxxx
  # Webhook署名シークレットも後で追加
```

### 2.2. ユーザーモデルの準備

ユーザーがStripeの顧客情報と紐づくように、`User` モデルに `stripe_customer_id` カラムを追加します。

```bash
rails g migration AddStripeCustomerIdToUsers stripe_customer_id:string
rails db:migrate
```

## 3. サブスクリプション登録フローの実装

Stripe Checkoutを利用すると、Stripeがホストする安全な決済ページにリダイレクトさせるだけで、カード情報の入力をStripeに任せることができます（PCI DSSコンプライアンスに準拠しやすくなります）。

### 3.1. Checkoutセッションの作成

ユーザーが「登録」ボタンを押したときに、Stripeの決済ページへのリダイレクトURLを生成するコントローラのアクションを作成します。

app/controllers/subscriptions_controller.rb
```ruby
class SubscriptionsController < ApplicationController
  before_action :authenticate_user! # Deviseなどの認証を想定

  def create
    # ユーザーに対応するStripe顧客を作成または取得
    customer = find_or_create_stripe_customer

    # Stripe Checkoutセッションを作成
    session = Stripe::Checkout::Session.create(
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{
        price: 'price_xxxxxxxxxxxx', # Stripeで作成した価格ID
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: subscription_success_url,
      cancel_url: subscription_cancel_url
    )

    # Stripeの決済ページへリダイレクト
    redirect_to session.url, allow_other_host: true, status: :see_other
  end

  def success
    # 決済成功時の処理（Webhookで処理するのがより堅牢）
    flash[:notice] = "サブスクリプションに登録しました！"
    redirect_to root_path
  end

  def cancel
    # 決済キャンセル時の処理
    flash[:alert] = "サブスクリプション登録をキャンセルしました。"
    redirect_to root_path
  end

  private

  def find_or_create_stripe_customer
    if current_user.stripe_customer_id?
      Stripe::Customer.retrieve(current_user.stripe_customer_id)
    else
      customer = Stripe::Customer.create(email: current_user.email)
      current_user.update!(stripe_customer_id: customer.id)
      customer
    end
  end
end
```

### 3.2. ルーティングとビュー

`config/routes.rb` にルーティングを追加します。

config/routes.rb
```ruby
resource :subscription, only: [:create]
get 'subscription/success', to: 'subscriptions#success'
get 'subscription/cancel', to: 'subscriptions#cancel'
```

ビューに登録ボタンを設置します。

app/views/home/index.html.erb
```erb
<%= button_to "プレミアムプランに登録", subscription_path, method: :post %>
```

## 4. Webhookによるイベント処理

決済成功、失敗、更新、キャンセルなど、Stripe上で発生したイベントを確実にRailsアプリケーションに通知させるためにWebhookを利用します。

### 4.1. Webhookエンドポイントの作成

StripeからのPOSTリクエストを受け取るコントローラを作成します。

```bash
rails g controller Webhooks receive
```

app/controllers/webhooks_controller.rb
```ruby
class WebhooksController < ApplicationController
  skip_before_action :verify_authenticity_token # CSRF保護を無効化

  def receive
    payload = request.body.read
    sig_header = request.env['HTTP_STRIPE_SIGNATURE']
    endpoint_secret = Rails.application.credentials.dig(:stripe, :webhook_secret)
    event = nil

    begin
      event = Stripe::Webhook.construct_event(
        payload, sig_header, endpoint_secret
      )
    rescue JSON::ParserError => e
      render json: { error: 'Invalid payload' }, status: 400
      return
    rescue Stripe::SignatureVerificationError => e
      render json: { error: 'Signature verification failed' }, status: 400
      return
    end

    # イベントタイプに応じて処理を分岐
    case event.type
    when 'checkout.session.completed'
      # 決済が完了したときの処理
      session = event.data.object
      user = User.find_by(stripe_customer_id: session.customer)
      # ユーザーのステータスを更新するなどの処理
      user.update(plan: 'premium')
    when 'customer.subscription.deleted'
      # サブスクリプションがキャンセルされたときの処理
      subscription = event.data.object
      user = User.find_by(stripe_customer_id: subscription.customer)
      user.update(plan: 'free')
    else
      puts "Unhandled event type: #{event.type}"
    end

    render json: { status: :ok }
  end
end
```

### 4.2. StripeでのWebhook設定

1.  開発環境でWebhookをテストするために、`stripe-cli` をインストールして使います。
    ```bash
    stripe listen --forward-to localhost:3000/webhooks/receive
    ```
2.  上記のコマンドを実行すると、Webhook署名シークレット（`whsec_...`）が表示されるので、これを `credentials.yml.enc` に保存します。
3.  本番環境では、Stripeダッシュボードの「Webhook」設定ページで、`https://your-domain.com/webhooks/receive` のような公開URLをエンドポイントとして登録します。

## まとめ

StripeとRailsを連携させることで、複雑なサブスクリプション課金システムを比較的容易に実装できます。

- **Stripe Checkout**: カード情報の入力をStripeに任せ、安全性を高める。
- **Stripe Webhook**: 課金に関するイベントを確実に捕捉し、アプリケーションの状態を正確に更新する。

本記事で紹介したのは基本的な流れですが、これを基に複数プランへの対応、クーポンの適用、解約・再開処理などを実装していくことで、本格的なSaaSを構築することが可能です。