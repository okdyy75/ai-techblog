# 37. Punditを使った認可機能の実装: ポリシーベースのアクセス制御

## はじめに

Webアプリケーションにおいて、**認証 (Authentication)** と **認可 (Authorization)** はセキュリティの根幹をなす重要な概念です。

- **認証**: 「ユーザーが誰であるか」を確認するプロセス（例: ログイン）。
- **認可**: 「そのユーザーが何をしてよいか」を制御するプロセス（例: 管理者だけが記事を削除できる）。

Deviseなどのgemは認証機能を提供しますが、認可のロジックはアプリケーションごとに異なるため、別途実装が必要です。**Pundit**は、この認可ロジックをクリーンでスケーラブルに実装するための、シンプルで強力なgemです。

本記事では、Punditを導入し、ポリシーオブジェクトに基づいたアクセス制御をRailsアプリケーションに実装する方法を解説します。

## この記事で学べること

- Punditの基本的な考え方と設定方法
- ポリシーファイルの作成と、アクションごとの認可ルールの定義
- コントローラとビューでの認可チェックの方法
- スコープを使った、インデックスページでのレコードの絞り込み

## 1. Punditの導入と設定

### 1.1. Gemのインストール

`Gemfile` に `pundit` を追加し、`bundle install` を実行します。

```ruby:Gemfile
gem "pundit"
```

### 1.2. Punditの初期設定

ジェネレータを実行して、ベースとなる `ApplicationPolicy` を作成します。

```bash
rails generate pundit:install
```

これにより `app/policies/application_policy.rb` が生成されます。このクラスは、すべてのポリシーの親クラスとなり、共通のロジックを定義します。

### 1.3. ApplicationControllerへの組み込み

`ApplicationController` に `Pundit::Authorization` をインクルードします。これにより、コントローラで `authorize` などのヘルパーメソッドが使えるようになります。

```ruby:app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  include Pundit::Authorization

  # (任意) Punditの認可が実行されなかった場合にエラーを発生させる
  # after_action :verify_authorized, except: :index
  # after_action :verify_policy_scoped, only: :index
end
```

`verify_authorized` と `verify_policy_scoped` を有効にすると、認可チェックを忘れているアクションがあればエラーで通知してくれるため、セキュリティホールを防ぐのに役立ちます。

## 2. ポリシーの作成と実装

例として、`Article` モデルに対する認可を実装します。

### 2.1. ポリシーの生成

ジェネレータで `Article` モデルに対応するポリシーファイルを生成します。

```bash
rails generate pundit:policy article
```

`app/policies/article_policy.rb` が作成されます。

### 2.2. ポリシーの編集

ポリシーファイルには、コントローラのアクションに対応する名前のメソッド（クエスチョンマーク `?` で終わる）を定義していきます。メソッドは `true` または `false` を返すように実装します。

ポリシーメソッドは、第一引数に `user`（通常は `current_user`）、第二引数に `record`（対象のモデルオブジェクト）を受け取ります。

```ruby:app/policies/article_policy.rb
class ArticlePolicy < ApplicationPolicy
  # `user` は current_user, `record` は @article
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  # 誰でも記事一覧は見れる
  def index?
    true
  end

  # 誰でも記事詳細は見れる
  def show?
    true
  end

  # ログインユーザーなら誰でも作成できる
  def create?
    user.present?
  end

  # 記事の所有者、または管理者のみが更新できる
  def update?
    user.present? && (record.user == user || user.admin?)
  end

  # 記事の所有者、または管理者のみが削除できる
  def destroy?
    update? # update? と同じロジックを再利用
  end
end
```

## 3. コントローラでの認可チェック

`authorize` メソッドを使って、各アクションで認可チェックを実行します。

```ruby:app/controllers/articles_controller.rb
class ArticlesController < ApplicationController
  before_action :set_article, only: [:show, :edit, :update, :destroy]

  def show
    authorize @article # show? ポリシーが呼ばれる
  end

  def new
    @article = Article.new
    authorize @article # create? ポリシーが呼ばれる
  end

  def create
    @article = current_user.articles.build(article_params)
    authorize @article # create? ポリシーが呼ばれる
    # ...
  end

  def update
    authorize @article # update? ポリシーが呼ばれる
    # ...
  end

  def destroy
    authorize @article # destroy? ポリシーが呼ばれる
    # ...
  end

  private

  def set_article
    @article = Article.find(params[:id])
  end
end
```

`authorize` メソッドは、対応するポリシーメソッドが `false` を返した場合、`Pundit::NotAuthorizedError` という例外を発生させます。この例外を `ApplicationController` で捕捉し、ユーザーにエラーメッセージを表示するのが一般的です。

```ruby:app/controllers/application_controller.rb
rescue_from Pundit::NotAuthorizedError, with: :user_not_authorized

private

def user_not_authorized
  flash[:alert] = "この操作を実行する権限がありません。"
  redirect_to(request.referrer || root_path)
end
```

## 4. スコープによるレコードの絞り込み

`index` アクションのように、全レコードの中からユーザーが見れるものだけを表示したい場合があります。このようなケースでは **スコープ** を使います。

ポリシーファイル内に `Scope` という内部クラスを定義します。

```ruby:app/policies/article_policy.rb
class ArticlePolicy < ApplicationPolicy
  # ... (既存のポリシーメソッド)

  class Scope
    attr_reader :user, :scope

    def initialize(user, scope)
      @user = user
      @scope = scope
    end

    def resolve
      if user&.admin?
        scope.all # 管理者なら全記事
      else
        scope.where(published: true) # 一般ユーザーなら公開済みの記事のみ
      end
    end
  end
end
```

コントローラの `index` アクションで `policy_scope` ヘルパーを使います。

```ruby:app/controllers/articles_controller.rb
def index
  # policy_scope(Article) が ArticlePolicy::Scope.new(current_user, Article).resolve を呼び出す
  @articles = policy_scope(Article)
end
```

これにより、ユーザーの権限に応じて、表示されるレコードの集合を安全に絞り込むことができます。

## 5. ビューでの認可チェック

ビューの中でも `policy` ヘルパーを使って、特定のUI（編集ボタンなど）を表示するかどうかを制御できます。

```erb:app/views/articles/show.html.erb
<h1><%= @article.title %></h1>

<%# update? ポリシーが true を返す場合のみリンクを表示 %>
<% if policy(@article).update? %>
  <%= link_to '編集', edit_article_path(@article) %>
<% end %>
```

## まとめ

Punditは、認可ロジックを責務の明確なポリシーオブジェクトに分離することで、アプリケーションのセキュリティと保守性を高めます。

- **関心の分離**: 認可ロジックをコントローラから切り離し、`app/policies` に集約できる。
- **スケーラビリティ**: アプリケーションが複雑になっても、ポリシーが明確なため見通しが良く、管理しやすい。
- **テスト容易性**: ポリシーオブジェクトは単なるRubyのクラスなので、単体テストが容易。

認証と認可は、堅牢なアプリケーションを構築するための両輪です。Punditを活用して、クリーンで安全なアクセス制御を実装しましょう。