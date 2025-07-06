# CanCanCanによるシンプルで強力な認可管理

## 概要

認証（Authentication）が「ユーザーが誰であるか」を検証するプロセスであるのに対し、認可（Authorization）は「そのユーザーが何をしてよいか」を決定するプロセスです。Railsアプリケーションでは、ユーザーの役割（管理者、一般ユーザーなど）に応じて、特定のアクションやデータへのアクセスを制限する必要があります。

CanCanCanは、この認可ロジックを一箇所に集約し、クリーンで管理しやすいコードベースを維持するための強力なGemです。コミュニティで長年支持されてきた`CanCan`の後継プロジェクトであり、現在も活発にメンテナンスされています。

この記事では、`CanCanCan`の基本的なセットアップと、Abilityファイルを使った権限定義の方法を解説します。

## CanCanCanの導入

`Gemfile`に`cancancan`を追加し、`bundle install`を実行します。

Gemfile
```ruby
gem 'cancancan'
```

次に、ジェネレータを実行して、権限を定義するための`Ability`ファイルを生成します。

```bash
$ rails g cancan:ability
```

これにより、`app/models/ability.rb`が作成されます。

## Abilityファイルでの権限定義

全ての認可ルールは`app/models/ability.rb`に集約されます。このファイルで、ユーザーの権限を定義します。

```ruby
# app/models/ability.rb

class Ability
  include CanCan::Ability

  def initialize(user)
    # ユーザーオブジェクトがnilの場合（非ログインユーザー）のデフォルトを設定
    user ||= User.new # guest user (not logged in)

    # 権限の定義
    if user.admin?
      # 管理者は全ての操作が可能
      can :manage, :all
    else
      # 一般ユーザーの権限
      # 自分が作成した記事のみ、更新と削除が可能
      can [:update, :destroy], Post, user_id: user.id

      # 全てのユーザーが記事を読むことは可能
      can :read, Post

      # コメントの作成は可能
      can :create, Comment

      # 自分が作成したコメントのみ、削除が可能
      can :destroy, Comment, user_id: user.id
    end
  end
end
```

### `can`メソッドの基本

`can`メソッドは、権限を定義するための主要なメソッドです。基本的な構文は以下の通りです。

`can :action, :subject, :conditions`

-   **:action**: 許可されるアクション。`read`（閲覧）、`create`（作成）、`update`（更新）、`destroy`（削除）などのシンボルで指定します。`:manage`は全てのションを意味するエイリアスです。
-   **:subject**: アクションの対象となるオブジェクト。モデルクラス（例: `Post`）や、`:all`（全てのオブジェクト）を指定します。
-   **:conditions** (任意): 権限が適用される条件をハッシュで指定します。`{ user_id: user.id }`は、「`Post`の`user_id`が現在のユーザーのIDと一致する場合」という条件を意味します。

## コントローラでの権限制御

コントローラで権限をチェックするには、`load_and_authorize_resource`メソッドを使います。これにより、各アクションの実行前に自動的に認可が行われます。

```ruby
# app/controllers/posts_controller.rb

class PostsController < ApplicationController
  # 各アクションの前に、リソースの読み込みと認可を自動的に実行
  load_and_authorize_resource

  def show
    # @postはload_and_authorize_resourceによって自動的に設定される
  end

  def edit
    # ユーザーが@postを編集する権限がない場合、CanCan::AccessDenied例外が発生
  end

  def update
    if @post.update(post_params)
      redirect_to @post, notice: 'Post was successfully updated.'
    else
      render :edit
    end
  end

  # ...
end
```

-   `load_and_authorize_resource`は、`before_action`フィルターとして機能します。
-   `params[:id]`に基づいて`@post`のようなインスタンス変数を自動でロードします（`load`の部分）。
-   現在ログインしているユーザー（`current_user`）が、そのアクション（例: `edit`）をそのリソース（`@post`）に対して実行できるかを`Ability`ファイルに基づいてチェックします（`authorize`の部分）。
-   権限がない場合、`CanCan::AccessDenied`例外が発生します。

### 例外処理

`CanCan::AccessDenied`例外を補足し、ユーザーに適切なフィードバック（例: トップページへのリダイレクトとエラーメッセージ）を返すように、`ApplicationController`で設定します。

```ruby
# app/controllers/application_controller.rb

class ApplicationController < ActionController::Base
  rescue_from CanCan::AccessDenied do |exception|
    redirect_to root_url, alert: exception.message
  end
end
```

## ビューでの権限制御

ビューで、ユーザーの権限に応じてリンクやボタンの表示・非表示を切り替えることができます。

```erb
<%# app/views/posts/show.html.erb %>

<h1><%= @post.title %></h1>
<p><%= @post.body %></p>

<%# 編集権限がある場合のみ「Edit」リンクを表示 %>
<% if can? :update, @post %>
  <%= link_to 'Edit', edit_post_path(@post) %>
<% end %>

<%# 削除権限がある場合のみ「Destroy」ボタンを表示 %>
<% if can? :destroy, @post %>
  <%= button_to 'Destroy', @post, method: :delete, data: { confirm: 'Are you sure?' } %>
<% end %>
```

-   `can?(:action, @subject)`ヘルパーメソッドは、現在のユーザーが指定されたアクションを対象オブジェクトに対して実行できる場合に`true`を返します。
-   これにより、権限のないユーザーに不要なUI要素を見せることなく、すっきりとしたインターフェースを提供できます。

## まとめ

`CanCanCan`は、Railsアプリケーションにおける認可のロジックを、シンプルかつ一元的に管理するための優れたソリューションです。

-   **一元管理**: 全ての権限ルールを`Ability`ファイルに集約できる。
-   **宣言的なルール**: `can`メソッドを使って、直感的に権限を定義できる。
-   **自動化**: `load_and_authorize_resource`で、コントローラのアクションを自動的に保護できる。
-   **ビュー連携**: `can?`ヘルパーで、UIの表示を動的に制御できる。

認証機能を持つ多くのアプリケーションにとって、認可は不可欠な要素です。`CanCanCan`を導入することで、複雑になりがちな権限管理をシンプルに保ち、よりセキュアで保守性の高いアプリケーションを構築しましょう。
