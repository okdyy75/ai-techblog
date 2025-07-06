# サービスクラス（Service Object）を導入してFat Controllerを解消する

## はじめに

Railsアプリケーションの開発を進めていくと、コントローラのアクション内にビジネスロジックがどんどん膨れ上がってしまうことがあります。これは「**Fat Controller（太ったコントローラ）**」と呼ばれ、コードの見通しを悪くし、テストを困難にし、再利用性を損なうアンチパターンの一つです。

この問題を解決するための強力な設計パターンが「**サービスクラス（Service Object）**」です。この記事では、サービスクラスとは何か、なぜ必要なのか、そしてどのように実装するのかを具体的な例と共に解説します。

## Fat Controllerの問題点

まずは、典型的なFat Controllerの例を見てみましょう。ユーザー登録時に、ユーザーを作成し、ウェルカムメールを送信し、外部のCRMサービスに通知するという一連の処理を行うコントローラです。

```ruby
# app/controllers/users_controller.rb
class UsersController < ApplicationController
  def create
    @user = User.new(user_params)

    if @user.save
      # 1. ウェルカムメールを送信
      UserMailer.welcome_email(@user).deliver_later

      # 2. 外部CRMサービスに通知
      crm_service = CrmService.new
      begin
        crm_service.notify_new_user(@user.id, @user.email)
      rescue CrmService::ConnectionError => e
        # エラーをログに記録するが、ユーザー登録は成功させる
        Rails.logger.error "CRM notification failed: #{e.message}"
      end

      # 3. 登録成功のフラッシュメッセージを設定
      flash[:success] = "Welcome to our service!"
      redirect_to @user
    else
      render :new, status: :unprocessable_entity
    end
  end

  private

  def user_params
    params.require(:user).permit(:name, :email, :password)
  end
end
```

このコードにはいくつかの問題があります。

*   **単一責任の原則違反**: コントローラのアクションは、HTTPリクエストを受け取り、適切なレスポンス（リダイレクトやレンダリング）を返すのが主な責務です。しかし、この`create`アクションは、メール送信や外部API連携といった、ドメイン固有のビジネスロジックまで担当してしまっています。
*   **テストが困難**: このアクションをテストするためには、`User`モデル、`UserMailer`、`CrmService`のすべてをモック化する必要があり、テストが複雑になります。
*   **再利用性の欠如**: もし管理画面やAPI経由でも同じユーザー登録処理を行いたい場合、このロジックをコピー＆ペーストする必要が出てきてしまいます。

## サービスクラスによるリファクタリング

これらの問題を解決するために、この一連のユーザー登録処理を一つのクラスに切り出します。これがサービスクラスです。

### 1. サービスクラスの作成

まず、`app/services`というディレクトリを作成し、その中にサービスクラスを配置するのが一般的です。（このディレクトリはデフォルトでは存在しないので、手動で作成します）

```bash
mkdir app/services
```

次に、ユーザー登録処理を担当する`UserRegistrationService`を作成します。

```ruby
# app/services/user_registration_service.rb
class UserRegistrationService
  # 成功したかどうかと、作成されたユーザーオブジェクトを返す
  attr_reader :user, :error_messages

  def initialize(params)
    @user = User.new(params)
  end

  # publicなインターフェースはcallメソッド一つだけにするのが一般的
  def call
    if @user.save
      send_welcome_email
      notify_crm
      true # 成功
    else
      @error_messages = @user.errors.full_messages
      false # 失敗
    end
  end

  private

  def send_welcome_email
    UserMailer.welcome_email(@user).deliver_later
  end

  def notify_crm
    crm_service = CrmService.new
    crm_service.notify_new_user(@user.id, @user.email)
  rescue CrmService::ConnectionError => e
    Rails.logger.error "CRM notification failed for user #{@user.id}: #{e.message}"
    # ここでのエラーはトランザクション全体を失敗させない
  end
end
```

このサービスクラスには、以下のような特徴があります。

*   **POJO (Plain Old Ruby Object)**: 特定のフレームワーク（Active Recordなど）に依存しない、ただのRubyクラスです。
*   **単一責任**: 「ユーザーを登録する」という一つのビジネスプロセスにのみ責任を持ちます。
*   **明確なインターフェース**: `initialize`で必要なデータを受け取り、`call`メソッドで処理を実行するというシンプルな構造になっています。
*   **状態を持つ**: 処理の結果（成功/失敗、作成されたオブジェクト、エラーメッセージ）をインスタンス変数として保持し、呼び出し元がそれを参照できるようにします。

### 2. コントローラの修正

サービスクラスを導入することで、コントローラは劇的にスリムになります。

```ruby
# app/controllers/users_controller.rb
class UsersController < ApplicationController
  def create
    # ビジネスロジックをサービスクラスに委譲
    service = UserRegistrationService.new(user_params)

    if service.call
      flash[:success] = "Welcome to our service!"
      redirect_to service.user # サービスが作成したユーザーを参照
    else
      # サービスが保持するエラーメッセージを使ってビューを再描画
      @user = service.user # バリデーションエラーを持つuserオブジェクトをビューに渡す
      flash.now[:error] = service.error_messages.join(", ")
      render :new, status: :unprocessable_entity
    end
  end

  private

  def user_params
    params.require(:user).permit(:name, :email, :password)
  end
end
```

リファクタリング後のコントローラは、以下の責務に集中できています。

*   HTTPリクエストからパラメータを受け取る (`user_params`)。
*   適切なサービスクラスを呼び出す。
*   サービスの結果に応じて、ユーザーへのフィードバック（リダイレクトやレンダリング）を行う。

ビジネスロジックの複雑さから解放され、本来の役割に徹することができています。

## サービスクラスのメリット

*   **関心の分離**: ビジネスロジックがコントローラやモデルから分離され、コードベース全体の見通しが良くなります。
*   **テスト容易性**: サービスクラスは単体でテストできます。HTTPリクエストをシミュレートする必要はなく、入力と出力だけに注目してテストを書くことができます。
*   **再利用性**: 同じビジネスプロセスを、Webのコントローラ、APIコントローラ、バックグラウンドジョブなど、様々な場所から再利用できます。
*   **カプセル化**: 複雑なプロセスが１つのクラスにまとめられているため、将来ロジックが変更された場合も、修正箇所が`UserRegistrationService`に限定され、影響範囲を最小限に抑えることができます。

## まとめ

Fat Controllerは、Railsアプリケーションが成長するにつれて避けがたい問題です。サービスクラスは、この問題を解決し、アプリケーションをよりクリーンで、テストしやすく、メンテナンスしやすい状態に保つための非常に有効なパターンです。

コントローラのアクションが3〜4行を超え、ビジネスロジックを含み始めたら、それはサービスクラスへの切り出しを検討する良いサインです。最初は少し手間に感じるかもしれませんが、長期的に見れば、その投資は必ず報われるでしょう。
