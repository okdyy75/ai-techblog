# 34. Railsアプリケーションの国際化(i18n)対応

## はじめに

グローバルなサービス展開を目指す上で、アプリケーションを多言語に対応させることは不可欠です。このプロセスは **国際化 (Internationalization)**、略して **i18n** と呼ばれます（Iとnの間に18文字あるため）。

Railsには、i18nをサポートする強力なフレームワークが標準で組み込まれています。これを利用することで、コード内のテキストを直接変更することなく、言語ごとの翻訳ファイル（ロケールファイル）を切り替えるだけで、アプリケーションの表示言語を簡単に変更できます。

本記事では、Railsのi18n機能を使って、アプリケーションを日本語と英語に対応させる手順を解説します。

## この記事で学べること

- Rails i18nの基本的な仕組みと設定方法
- 翻訳ファイル（YAML）の構造と記述方法
- ビュー、コントローラ、モデルでの翻訳テキストの呼び出し方
- URLのパスにロケールを含める方法

## 1. i18nの基本設定

### 1.1. 利用可能なロケールとデフォルトロケールの設定

`config/application.rb` で、アプリケーションがサポートする言語（ロケール）と、デフォルトで使用する言語を設定します。

config/application.rb
```ruby
module YourAppName
  class Application < Rails::Application
    # ... (既存の設定)

    # 利用可能なロケールをホワイトリスト化
    config.i18n.available_locales = [:en, :ja]

    # デフォルトのロケールを:ja（日本語）に設定
    config.i18n.default_locale = :ja
  end
end
```

### 1.2. ロケールファイルの準備

翻訳テキストは `config/locales` ディレクトリ内のYAMLファイルで管理します。Railsはデフォルトで `en.yml` を持っています。日本語用の `ja.yml` を作成しましょう。

`rails-i18n` gemを導入すると、Active Recordのバリデーションメッセージや日時のフォーマットなど、Rails標準の翻訳がまとめて手に入り便利です。

`Gemfile` に追加:
Gemfile
```ruby
gem 'rails-i18n'
```

`bundle install` を実行すると、`config/locales` に各言語の翻訳ファイルが生成されます。

## 2. 翻訳テキストの定義と利用

### 2.1. 翻訳ファイルの構造

ロケールファイルは、言語コードをトップレベルのキーとし、階層構造で翻訳を管理します。

`config/locales/ja.yml`:
```yaml
ja:
  hello: "こんにちは、世界"

  common:
    submit: "送信する"
    back: "戻る"

  users:
    show:
      title: "ユーザー詳細"
```

### 2.2. ビューでの翻訳 (`t` ヘルパー)

ビューでは `t` (`translate`) ヘルパーを使って翻訳テキストを呼び出します。

app/views/users/show.html.erb
```erb
<%# 階層をキーとして指定 %>
<h1><%= t('users.show.title') %></h1>

<%# . (ドット) を使った省略記法 %>
<%# 現在のコントローラとアクション (users#show) に基づいてキーが推測される %>
<h1><%= t('.title') %></h1>

<p><%= t('hello') %></p>

<%= f.submit t('common.submit') %>
```

### 2.3. コントローラでの翻訳

コントローラでは `I18n.t` メソッドを使います。特にフラッシュメッセージなどで利用します。

app/controllers/users_controller.rb
```ruby
def create
  # ...
  redirect_to @user, notice: I18n.t('users.create.success_message')
end
```

### 2.4. モデルでの翻訳

Active Recordのモデル名や属性名を翻訳することができます。これにより、バリデーションメッセージが自然な日本語になります。

`config/locales/ja.yml`:
```yaml
ja:
  activerecord:
    models:
      user: "ユーザー"
    attributes:
      user:
        name: "名前"
        email: "メールアドレス"
```

この設定により、`User.model_name.human` は "ユーザー" を、`User.human_attribute_name(:name)` は "名前" を返すようになります。バリデーションエラーメッセージも「名前を入力してください」のように表示されるようになります。

## 3. ロケールの切り替え

ユーザーが言語を切り替えられるようにする仕組みを実装します。

### 3.1. `around_action` でロケールを設定

`ApplicationController` に `around_action` を設定し、リクエストのたびにロケールを適切に設定するようにします。

app/controllers/application_controller.rb
```ruby
class ApplicationController < ActionController::Base
  around_action :switch_locale

  def switch_locale(&action)
    locale = params[:locale] || I18n.default_locale
    I18n.with_locale(locale, &action)
  end
end
```

### 3.2. URLにロケール情報を含める

ユーザーが言語を選択できるように、URLにロケール情報を含めるのが一般的です（例: `/en/users`, `/ja/users`）。

`config/routes.rb` を編集します。

config/routes.rb
```ruby
Rails.application.routes.draw do
  scope "(:locale)", locale: /#{I18n.available_locales.join("|")}/ do
    # ここに通常のルーティングを記述する
    resources :users
    root 'home#index'
  end
end
```

これにより、`/users` へのアクセスは `/ja/users` のようにデフォルトロケールにリダイレクトされ、`/en/users` のようにロケールを指定することも可能になります。

### 3.3. `default_url_options` の設定

`url_for` ヘルパーなどが自動的にURLにロケールを含めるように、`ApplicationController` に `default_url_options` を設定します。

app/controllers/application_controller.rb
```ruby
# ... (switch_locale の後)

def default_url_options
  { locale: I18n.locale }
end
```

### 3.4. 言語切り替えリンクの設置

ビューに言語を切り替えるためのリンクを設置します。

app/views/layouts/application.html.erb
```erb
<nav>
  <%= link_to "日本語", url_for(locale: 'ja') %>
  |
  <%= link_to "English", url_for(locale: 'en') %>
</nav>
```

## まとめ

Railsのi18n機能は、アプリケーションを多言語対応させるための強力で体系的な方法を提供します。

- **設定の集中管理**: `config/application.rb` でロケールを一元管理。
- **翻訳の分離**: `config/locales` 以下のYAMLファイルに翻訳テキストを分離し、コードの変更を不要にする。
- **ヘルパーの活用**: `t` ヘルパーや `I18n.t` を使って、ビューやコントローラから簡単に翻訳を呼び出せる。

グローバルな視点を持つアプリケーションを開発する上で、i18nは初期段階から設計に組み込んでおくべき重要な機能です。本記事を参考に、ぜひ国際化対応に挑戦してみてください。