# 32. ViewComponentを使った再利用可能なビューコンポーネント開発

## はじめに

Rails開発において、ビューのロジックが複雑化し、パーシャル（`_partial.html.erb`）が乱立してしまうことはよくある問題です。パーシャルは便利ですが、テストがしにくかったり、カプセル化が不十分で、意図しない副作用を生むことがあります。

**ViewComponent**は、GitHub社が開発したフレームワークで、ビューのパーツを自己完結したRubyオブジェクトとしてカプセル化し、再利用性とテスト容易性を劇的に向上させます。ReactやVue.jsのコンポーネント志向の開発スタイルをRailsのビュー層にもたらします。

本記事では、ViewComponentの基本的な使い方から、コンポーネントの作成、テスト、そして実践的な活用法までを解説します。

## この記事で学べること

- ViewComponentの導入と基本的な概念
- コンポーネントの生成とビューでの呼び出し方法
- コンポーネントのロジックとビューテンプレートのカプセル化
- ViewComponentの単体テストの方法

## 1. ViewComponentの導入

### 1.1. Gemのインストール

`Gemfile` に `view_component` gemを追加します。

```ruby:Gemfile
gem "view_component"
```

`bundle install` を実行します。

### 1.2. (任意) ジェネレータの設定

`config/application.rb` に設定を追加すると、`rails generate` コマンドでコンポーネントを生成する際のデフォルトテンプレートエンジンなどを指定できます。

```ruby:config/application.rb
config.view_component.generate.template_engine = :erb
```

## 2. コンポーネントの作成と利用

例として、ユーザーのアバターと名前を表示する `AvatarComponent` を作成してみましょう。

### 2.1. コンポーネントの生成

以下のコマンドを実行して、コンポーネントの雛形を生成します。

```bash
rails generate component Avatar user:User
```

これにより、以下のファイルが生成されます。

- `app/components/avatar_component.rb` (コンポーネントのロジック)
- `app/components/avatar_component.html.erb` (コンポーネントのビューテンプレート)
- `test/components/avatar_component_test.rb` (コンポーネントのテストファイル)

### 2.2. コンポーネントのロジック (`.rb`)

`app/components/avatar_component.rb` を編集します。`initialize` メソッドでコンポーネントが必要とするデータを受け取ります。インスタンス変数はビューテンプレートから参照できます。

```ruby:app/components/avatar_component.rb
class AvatarComponent < ViewComponent::Base
  attr_reader :user

  def initialize(user:)
    @user = user
  end

  def initials
    user.name.split.map(&:first).join.upcase
  end
end
```

- `attr_reader` を使うと、ビューからインスタンス変数にアクセスするためのリーダーメソッドが定義されます。
- コンポーネント内にビューで使うロジック（例: `initials` メソッド）をカプセル化できます。

### 2.3. コンポーネントのビュー (`.html.erb`)

`app/components/avatar_component.html.erb` を編集します。これはコンポーネントの見た目を定義するテンプレートです。

```erb:app/components/avatar_component.html.erb
<div class="avatar">
  <%# 画像がない場合はイニシャルを表示するなどのロジック %>
  <div class="avatar-placeholder">
    <%= initials %>
  </div>
  <span class="avatar-name"><%= user.name %></span>
</div>
```

### 2.4. ビューからの呼び出し

通常のビューファイル（例: `app/views/users/show.html.erb`）から、`render` ヘルパーを使ってコンポーネントを呼び出します。

```erb:app/views/users/show.html.erb
<h1>ユーザー詳細</h1>

<%= render(AvatarComponent.new(user: @user)) %>

<%# 他のユーザー情報 %>
<p>Email: <%= @user.email %></p>
```

`render` にコンポーネントのインスタンスを渡すだけで、対応するテンプレートが描画されます。

## 3. コンポーネントのテスト

ViewComponentの大きな利点の一つは、そのテストのしやすさです。Railsのビュー全体をレンダリングすることなく、コンポーネントを単体でテストできます。

`test/components/avatar_component_test.rb` を編集します。

```ruby:test/components/avatar_component_test.rb
require "test_helper"

class AvatarComponentTest < ViewComponent::TestCase
  def setup
    @user = User.new(name: "John Doe", email: "'''john@example.com'''")
  end

  test "renders the user's name" do
    render_inline(AvatarComponent.new(user: @user))

    assert_text("John Doe")
  end

  test "renders the user's initials" do
    render_inline(AvatarComponent.new(user: @user))

    assert_selector(".avatar-placeholder", text: "JD")
  end

  test "does not render if user is nil" do
    # 例: userがnilの場合に何も描画しないことをテスト
    # ※コンポーネント側の実装が必要
    # render_inline(AvatarComponent.new(user: nil))
    # assert_no_selector("div")
  end
end
```

- `render_inline` ヘルパーでコンポーネントを描画し、`assert_text` や `assert_selector` といったCapybaraライクなマッチャーで結果を検証します。
- これにより、コンポーネントの表示ロジックを高速かつ分離された環境でテストできます。

## 4. スロット (Slots) を使った応用

コンポーネントの一部を呼び出し側でカスタマイズしたい場合、スロット機能が便利です。例えば、カード型のコンポーネントで、ヘッダーとボディ部分を自由に差し替えられるようにできます。

```ruby:app/components/card_component.rb
class CardComponent < ViewComponent::Base
  renders_one :header
  renders_one :body
end
```

```erb:app/components/card_component.html.erb
<div class="card">
  <div class="card-header">
    <%= header %>
  </div>
  <div class="card-body">
    <%= body %>
  </div>
</div>
```

呼び出し側:

```erb
<%= render(CardComponent.new) do |c|
  c.with_header do
    content_tag(:h2, "カードのタイトル")
  end

  c.with_body do
    "こちらがカードの本文です。"
  end
end %>
```

## まとめ

ViewComponentは、Railsのビュー層にコンポーネントという強力な設計パターンをもたらします。

- **カプセル化**: ロジックとビューを一体として扱うことで、関心事が分離される。
- **再利用性**: アプリケーションの様々な場所で、同じコンポーネントを簡単に再利用できる。
- **テスト容易性**: 高速な単体テストが可能になり、ビューの品質と保守性が向上する。

複雑なUIを持つアプリケーションや、デザインシステムを導入しているプロジェクトにおいて、ViewComponentは特にその真価を発揮します。パーシャルの管理に悩んだら、ぜひ導入を検討してみてください。