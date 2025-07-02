# RailsにおけるA/Bテストの実装と分析

Webアプリケーションの改善において、A/Bテストはデータに基づいた意思決定を行うための強力な手法です。RailsアプリケーションにA/Bテストを導入することで、UIの変更、新機能の導入、マーケティングコピーの改善などが、ユーザーエンゲージメントやコンバージョン率にどのような影響を与えるかを定量的に評価できます。

この記事では、RailsでA/Bテストを実装するための主要なgemである`vanity`と`split`を紹介し、それぞれの特徴と基本的な使い方を解説します。

## A/Bテストとは？

A/Bテスト（またはスプリットテスト）は、2つ以上のバージョンのページや機能をランダムにユーザーに提示し、どちらがより良いパフォーマンスを示すかを比較する実験です。

- **コントロール（A）**: オリジナルのバージョン
- **バリアント（B）**: 変更を加えたバージョン

ユーザーをランダムにグループ分けし、各グループの行動（例: クリック率、登録率、購入率）を追跡・分析することで、どのバージョンがビジネス目標の達成に最も効果的かを判断します。

## A/Bテスト用Gemの選定

Railsコミュニティでは、A/Bテストを容易に実装するための優れたgemがいくつか存在します。

| Gem | 特徴 |
|---|---|
| **Split** | - シンプルで軽量<br>- Redisに依存<br>- Rackミドルウェアベースで動作<br>- ダッシュボード機能が標準で付属 |
| **Vanity** | - 多機能で柔軟性が高い<br>- RedisまたはActive Recordをデータストアとして選択可能<br>- ゴール追跡やレポーティング機能が豊富<br>- 長期間メンテナンスされていない（最終更新が古い） |

現在、`split`は活発にメンテナンスされており、多くのプロジェクトで採用されています。一方、`vanity`は非常に高機能ですが、近年は更新が滞っているため、新規プロジェクトでの採用は慎重に検討する必要があります。

この記事では、よりモダンで広く使われている`split`を中心に解説します。

## `split` gemを使ったA/Bテストの実装

### 1. インストール

まず、`Gemfile`に`split`を追加し、`bundle install`を実行します。

```ruby:Gemfile
gem 'split'
```

```bash
$ bundle install
```

また、`split`はデータの保存にRedisを必要とします。`redis` gemも追加しておきましょう。

```ruby:Gemfile
gem 'redis'
```

### 2. 設定

`config/initializers/split.rb`を作成し、基本的な設定を行います。

```ruby:config/initializers/split.rb
Split.configure do |config|
  # Redisサーバーへの接続設定
  config.redis = Redis.new(url: ENV['REDIS_URL'])

  # A/Bテストに参加できないボットやクローラーを除外する
  config.robot_regex = /bot|crawler|spider|crawling/i

  # ユーザーがA/Bテストのグループに一度割り当てられたら、その割り当てを維持する
  config.persistence = :session
end
```

`config.persistence`には以下のオプションがあります。
- `:session`: セッションが続く限り、同じグループに属します。
- `:cookie`: クッキーを使い、セッションを超えてグループを維持します。
- `Split::Persistence::Redis`: Redisを使い、ユーザーIDに紐づけて永続化します。ログインユーザーに対して有効です。

### 3. テストの定義と実装

A/Bテストは、Controller、View、Helperなど、アプリケーションのどこからでも実行できます。

#### Viewでの使用例

例えば、登録ボタンの文言をテストしたい場合、`ab_test`メソッドを使います。

```erb:app/views/users/new.html.erb
<%= ab_test("signup_button_text") do |alternative| %>
  <% if alternative == "A" %>
    <button type="submit">無料で登録する</button>
  <% elsif alternative == "B" %>
    <button type="submit">今すぐ始める</button>
  <% end %>
<% end %>
```

`ab_test`メソッドは、現在のユーザーを`signup_button_text`という名前の実験に参加させ、`A`または`B`のどちらかのグループに割り当てます。ブロック内では、割り当てられた`alternative`（バージョン名）に基づいて表示を切り替えます。

デフォルトでは、`A`がコントロール、`B`がバリアントとなりますが、以下のように複数のバリアントを定義することも可能です。

```erb
<%= ab_test("signup_button_text", "無料で登録する", "今すぐ始める", "アカウント作成") do |alternative| %>
  <button type="submit"><%= alternative %></button>
<% end %>
```

#### Controllerでの使用例

Controllerでロジッ��を分岐させることもできます。

```ruby:app/controllers/home_controller.rb
class HomeController < ApplicationController
  def index
    experiment_name = "homepage_layout"
    @layout_version = ab_test(experiment_name)

    if @layout_version == "new_layout"
      render "index_new"
    else
      render "index_original"
    end
  end
end
```

### 4. ゴールの追跡

A/Bテストの目的は、どちらのバージョンが目標（ゴール）達成に貢献したかを測定することです。ゴールは`finished`メソッドで追跡します。

例えば、ユーザー登録がゴールの場合、`users#create`アクションで`finished`を呼び出します。

```ruby:app/controllers/users_controller.rb
class UsersController < ApplicationController
  def create
    @user = User.new(user_params)
    if @user.save
      # "signup_button_text"実験のゴールを達成したことを記録
      finished("signup_button_text")
      redirect_to @user, notice: '登録が完了しました。'
    else
      render :new
    end
  end

  private

  def user_params
    params.require(:user).permit(:name, :email, :password)
  end
end
```

これにより、`split`はどちらのボタン文言がより多くのユーザー登録につながったかを記録します。

### 5. ダッシュボードでの結果分析

`split`には、SinatraベースのWebダッシュボードが付属しており、各実験の進捗と結果をリアルタイムで確認できます。

`config/routes.rb`にダッシュボードをマウントします。

```ruby:config/routes.rb
require 'split/dashboard'

Rails.application.routes.draw do
  # ...
  mount Split::Dashboard, at: 'split'
end
```

これで、`/split`にアクセスすると、以下のようなダッシュボードが表示されます。

- **実験一覧**: 実行中のすべてのA/Bテスト
- **参加者数**: 各バージョンの参加者数
- **コンバージョン率**: 各バージョンのゴール達成率
- **統計的有意性**: 結果が偶然ではないかを判断するためのZ検定スコアなど

ダッシュボードには、特定の実験をリセットしたり、勝者（最もパフォーマンスの良いバージョン）を確定させたりする機能もあります。

## `split`の高度な機能

- **ユーザーIDごとの永続化**: ログインしているユーザーに対して、ユーザーIDベースでテストグループを固定できます。
  ```ruby
  # application_controller.rb
  def split_user
    current_user
  end
  helper_method :split_user
  ```
- **重み付け**: 各バリアントに表示される確率を重み付けできます。
  ```ruby
  ab_test("experiment", { "A" => 1, "B" => 2 }) # BはAの2倍表示される
  ```
- **実験の開始とリセット**: `Split::ExperimentCatalog.find_or_create("experiment").start`や`reset`で実験をプログラムから制御できます。

## まとめ

`split` gemを使うことで、RailsアプリケーションにA/Bテストを簡単かつ効果的に導入できます。

1. **Gemをインストールし、Redisを設定する。**
2. **`ab_test`ヘルパーで、ViewやControllerに実験を埋め込む。**
3. **`finished`メソッドで、コンバージョン（ゴール）を追跡する。**
4. **ダッシュボードで結果を分析し、データに基づいた改善を行う。**

A/Bテストは一度きりの施策ではなく、継続的な改善サイクルの一部です。仮説を立て、実験し、学び、次の改善につなげるプロセスを繰り返すことで、アプリケーションをより良いものへと進化させることができます。ぜひ、あなたのRailsプロジェクトでもA/Bテストを実践してみてください。
