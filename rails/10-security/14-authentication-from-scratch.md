# Devise gemを使わずに自前で認証機能を実装する

## はじめに

Ruby on Railsで認証機能を実装する際、多くの開発者はまず**Devise**という非常に高機能でポピュラーなgemを思い浮かべるでしょう。Deviseは確かに強力ですが、その多機能さゆえに内部がブラックボックスになりがちで、独自のカスタマイズが難しいと感じることもあります。また、シンプルなアプリケーションにはオーバースペックになることも少なくありません。

そこで今回は、あえてDeviseを使わず、Railsに標準で備わっている機能を使って、基本的な認証（サインアップ、ログイン、ログアウト、アクセス制御）をゼロから実装する方法を解説します。自前で実装することで、認証の仕組みそのものへの深い理解が得られ、より柔軟なカスタマイズが可能になります。

## 認証の心臓部: `has_secure_password`

自前認証の鍵となるのが、Active Modelに用意されている`has_secure_password`というメソッドです。これを利用するには、まず`bcrypt` gemが`Gemfile`に含まれていることを確認してください。（Rails 6以降、新規プロジェクトにはデフォルトで含まれています）

```ruby
# Gemfile
# gem 'bcrypt', '~> 3.1.7' # この行のコメントアウトを外す
```

`has_secure_password`は、以下の魔法のような機能を提供します。

1.  `password`と`password_confirmation`という仮想的な属性を追加する。
2.  ユーザー作成・更新時に`password`が指定されると、それをbcryptでハッシュ化し、`password_digest`というカラムに保存する。
3.  `authenticate(password)`というメソッドを追加する。引数で渡されたパスワードをハッシュ化し、DB内の`password_digest`と一致するかを検証してくれる。

## 1. Userモデルの準備

まず、ユーザー情報を格納する`User`モデルを作成します。重要なのは、パスワードそのものを保存する`password`カラムではなく、ハッシュ化されたパスワードを保存するための`password_digest`カラムを用意することです。

```bash
rails g model User name:string email:string password_digest:string
rails db:migrate
```

次に、`User`モデルを編集します。

```ruby
# app/models/user.rb
class User < ApplicationRecord
  # メールアドレスは小文字に変換して保存
  before_save { self.email = email.downcase }

  validates :name, presence: true, length: { maximum: 50 }
  VALID_EMAIL_REGEX = /\A[\w+\-.]+@[a-z\d\-.]+\.[a-z]+\z/i
  validates :email, presence: true, length: { maximum: 255 },
                    format: { with: VALID_EMAIL_REGEX },
                    uniqueness: { case_sensitive: false }

  # この一行を追加
  has_secure_password

  validates :password, presence: true, length: { minimum: 6 }, allow_nil: true
end
```

*   `has_secure_password`を呼び出します。
*   `email`の一意性やフォーマットを検証します。
*   `password`の存在と長さを検証します。`allow_nil: true`は、ユーザー情報を更新する際にパスワードの再入力を不要にするための設定です。

## 2. ユーザー登録（サインアップ）

ユーザーが自身でアカウントを作成できるように、`UsersController`とビューを作成します。

```bash
rails g controller Users new create
```

**`config/routes.rb`**
```ruby
resources :users, only: [:new, :create]
get '/signup', to: 'users#new'
```

**`app/controllers/users_controller.rb`**
```ruby
class UsersController < ApplicationController
  def new
    @user = User.new
  end

  def create
    @user = User.new(user_params)
    if @user.save
      # 登録成功後、自動的にログインさせる
      session[:user_id] = @user.id
      flash[:success] = "Welcome to the Sample App!"
      redirect_to @user # ユーザー詳細ページなどにリダイレクト
    else
      render 'new', status: :unprocessable_entity
    end
  end

  private

  def user_params
    params.require(:user).permit(:name, :email, :password, :password_confirmation)
  end
end
```

`app/views/users/new.html.erb`に`form_with`を使った登録フォームを作成すれば、サインアップ機能は完成です。

## 3. セッション管理（ログイン・ログアウト）

ユーザーがログイン状態を維持できるように、セッションを使って管理します。セッションは、サーバー側に保存される一時的なデータストアで、ブラウザのクッキーに保存されたセッションIDと紐付いています。

### ログイン (`create`)

ログイン処理を担当する`SessionsController`を作成します。

```bash
rails g controller Sessions new create destroy
```

**`config/routes.rb`**
```ruby
get    '/login',   to: 'sessions#new'
post   '/login',   to: 'sessions#create'
delete '/logout',  to: 'sessions#destroy'
```

**`app/controllers/sessions_controller.rb`**
```ruby
class SessionsController < ApplicationController
  def new
  end

  def create
    user = User.find_by(email: params[:session][:email].downcase)
    # userが存在し、かつパスワードが正しいか
    if user && user.authenticate(params[:session][:password])
      # ログイン成功
      session[:user_id] = user.id
      flash[:success] = 'Logged in successfully'
      redirect_to root_url
    else
      # ログイン失敗
      flash.now[:danger] = 'Invalid email/password combination'
      render 'new', status: :unprocessable_entity
    end
  end

  def destroy
    # ログアウト処理
  end
end
```

*   `user.authenticate(password)`が`has_secure_password`の提供する認証メソッドです。
*   認証に成功したら、`session[:user_id] = user.id`という形でセッションにユーザーIDを保存します。この`session`ハッシュに保存されたデータが、以降のリクエストでユーザーを識別するための鍵となります。

### ログアウト (`destroy`)

ログアウトは、セッションからユーザーIDを削除するだけです。

**`app/controllers/sessions_controller.rb`**
```ruby
class SessionsController < ApplicationController
  # ... create ...

  def destroy
    session.delete(:user_id)
    @current_user = nil
    flash[:success] = 'Logged out'
    redirect_to root_url, status: :see_other
  end
end
```

## 4. アクセス制御

最後に、ログインしていないユーザーが特定のページにアクセスできないように制限します。これは`ApplicationController`にヘルパーメソッドと`before_action`を定義することで実現します。

**`app/controllers/application_controller.rb`**
```ruby
class ApplicationController < ActionController::Base
  # current_userをヘルパーメソッドとしてビューでも使えるようにする
  helper_method :current_user, :logged_in?

  private

  # 現在ログインしているユーザーを返す
  def current_user
    @current_user ||= User.find_by(id: session[:user_id]) if session[:user_id]
  end

  # ユーザーがログインしていればtrue、その他ならfalseを返す
  def logged_in?
    !current_user.nil?
  end

  # ログイン済みユーザーかどうか確認
  def require_login
    unless logged_in?
      flash[:danger] = "Please log in."
      redirect_to login_url
    end
  end
end
```

そして、認証が必要なコントローラで、この`require_login`を`before_action`として呼び出します。

```ruby
class ArticlesController < ApplicationController
  before_action :require_login, only: [:new, :create, :edit, :update, :destroy]

  # ...
end
```

これで、ログインしていないユーザーが記事の作成や編集ページにアクセスしようとすると、ログインページにリダイレクトされるようになります。

## まとめ

Deviseを使わずに認証機能を自前で実装する流れを見てきました。重要な要素は以下の3つです。

1.  **`has_secure_password`**: パスワードのハッシュ化と認証メソッドを提供してくれる。
2.  **`session`オブジェクト**: ユーザーのログイン状態を維持する。
3.  **`before_action`**: 特定のアクションの実行前に認証チェックを行う。

この基本的な仕組みを理解すれば、パスワードリセットやメール認証、OAuthによるSNSログインといった、より高度な機能を追加していく際の土台となります。認証の裏側で何が起きているかを知ることは、すべてのRails開発者にとって非常に価値のある経験です。
