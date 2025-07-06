# System Spec（E2Eテスト）をCapybaraで書く実践ガイド

Railsアプリケーションの品質を保証するためには、単体テスト（Model Spec）や結合テスト（Request Spec）だけでなく、ユーザーの操作をシミュレートする**システムテスト（System Spec）**が不可欠です。システムテストは、アプリケーション全体が統合された状態で正しく動作するかを確認する、エンドツーエンド（E2E）テストです。

Railsでは、RSpecとCapybaraを組み合わせることで、このシステムテストを効率的に記述できます。

この記事では、RSpecとCapybaraを使ったシステムテストの基本的な書き方から、実践的なテクニックまでを解説します。

## システムテストとは？ なぜ重要なのか？

システムテストは、実際にユーザーがブラウザを操作するのと同じように、アプリケーションを動かしてテストを行います。

- **ユーザー登録**：フォームに情報を入力し、「登録」ボタンをクリックし、成功メッセージが表示されることを確認する。
- **商品購入**：商品をカートに追加し、決済ページへ進み、購入を完了させる一連の流れをテストする。
- **JavaScriptの動作**：非同期で動作する検索フォームや、動的に表示が変わるUIが期待通りに動くかを確認する。

このように、複数のコンポーネント（Controller, View, Model, JavaScript）が連携する複雑なワークフローを検証できるのが、システムテストの最大の利点です。

## 必要なツールのセットアップ

システムテストを行うには、以下のgemが必要です。`rspec-rails`を導入していれば、多くはすでに含まれています。

```ruby
# Gemfile
group :development, :test do
  gem "rspec-rails"
  gem "factory_bot_rails"
  gem "faker"
  gem "capybara"
  gem "selenium-webdriver" # or webdrivers
  # or cuprite for headless chrome
end
```

- **RSpec**: Railsのテストフレームワーク。
- **Capybara**: ブラウザ操作を抽象化し、Rubyで記述できるようにするライブラリ。
- **Driver**: 実際にブラウザを動かすためのドライバ。
    - `selenium-webdriver`: 古くからある定番。実際にブラウザが立ち上がるのでデバッグしやすい。
    - `cuprite`: Headless Chrome（画面描画なしのChrome）を直接操作する。高速でCI環境向き。

`rails_helper.rb`で、System Spec用の設定を有効にします。

```ruby
# spec/rails_helper.rb
require 'capybara/rspec'

# 使用するドライバを設定 (例: cuprite)
Capybara.javascript_driver = :cuprite
Capybara.register_driver(:cuprite) do |app|
  Capybara::Cuprite::Driver.new(app, window_size: [1200, 800], process_timeout: 15)
end
```

## システムテストの基本的な書き方

`spec/system`ディレクトリ以下にテストファイルを作成します。
例として、ユーザーがログインするシナリオをテストしてみましょう。

```ruby
# spec/system/user_logins_spec.rb
require 'rails_helper'

RSpec.describe "UserLogins", type: :system do
  let!(:user) { create(:user, email: "test@example.com", password: "password") }

  scenario "ユーザーは有効な情報でログインできる" do
    # 1. ログインページにアクセスする
    visit login_path

    # 2. フォームに情報を入力する
    fill_in "メールアドレス", with: user.email
    fill_in "パスワード", with: "password"

    # 3. ボタンをクリックする
    click_button "ログイン"

    # 4. 期待する結果を検証する
    expect(page).to have_content "ログインしました"
    expect(page).to have_current_path(root_path)
  end

  scenario "ユーザーは無効な情報ではログインできない" do
    visit login_path

    fill_in "メールアドレス", with: user.email
    fill_in "パスワード", with: "invalid_password"

    click_button "ログイン"

    expect(page).to have_content "メールアドレスまたはパスワードが違います"
    expect(page).to have_current_path(login_path)
  end
end
```

### Capybaraの主要なメソッド

- `visit <path>`: 指定したページにアクセスします。
- `fill_in <locator>, with: <text>`: `label`のテキストや`id`, `name`属性を元にフォーム要素を見つけ、テキストを入力します。
- `click_button <locator>`: ボタンのテキストや`id`を元にクリックします。
- `click_link <locator>`: リンクのテキストや`id`を元にクリックします。
- `select <value>, from: <locator>`: ドロップダウンリストから項目を選択します。
- `check <locator>` / `uncheck <locator>`: チェックボックスを操作します。
- `choose <locator>`: ラジオボタンを選択します。

### 検証（Expectations）

- `expect(page).to have_content <text>`: ページ内に指定したテキストが存在するかを検証します。
- `expect(page).to have_selector <css_selector>`: 指定したCSSセレクタに一致する要素が存在するかを検証します。
- `expect(page).to have_current_path <path>`: 現在のURLが期待通りかを検証します。
- `expect(page).to have_field <locator>, with: <value>`: フォームのフィールドに特定の値が入力されているかを検証します。

## 実践的なテクニック

### `let`と`let!`

- `let`: 遅延評価。変数が初めて呼ばれた時に評価されます。
- `let!`: 即時評価。`before`ブロックの最初に評価されます。DBにレコードを作成しておく必要がある場合は`let!`を使います。

### `before`ブロックの活用

複数の`scenario`で共通のセットアップ処理がある場合は、`before`ブロックにまとめるとDRYになります。

```ruby
before do
  # 各テストの前にログイン処理を済ませておく
  login_as(user, scope: :user)
  visit root_path
end
```

### JavaScriptが絡むテスト

Ajax通信やUIの動的な変更をテストする場合、Capybaraは自動で処理の完了を待ってくれます。しかし、うまく待てない場合は、明示的な待機処理を入れることもできます。

```ruby
click_button "検索"

# "検索結果"というテキストが表示されるまで待つ
expect(page).to have_content "検索結果"
```

`have_content`のようなCapybaraのマッチャーは、デフォルトで一定時間（`Capybara.default_max_wait_time`）待機する機能を持っています。

### デバッグ

テストが失敗したときに、その時点でのブラウザの状態を確認できるとデバッグが捗ります。

- `save_and_open_page`: その時点でのHTMLをブラウザで開きます。
- `save_screenshot`: スクリーンショットを保存します。
- `binding.pry`（`pry-rails` gem）: 実行を止めて、コンソールで状態を確認できます。

## まとめ

システムテストは、アプリケーションの品質に対する最後の砦です。ユーザーが実際に触れる部分の動作を保証することで、自信を持ってデプロイできるようになります。

- **Capybara**を使えば、ユーザーのブラウザ操作を直感的なRubyコードで記述できる。
- **`visit`, `fill_in`, `click_button`** といった基本操作と、**`have_content`** などの検証メソッドを組み合わせるのが基本。
- JavaScriptを含む非同期処理も、Capybaraの自動待機機能である程度カバーできる。
- CI環境では**Headlessドライバ**（Cupriteなど）を、ローカル開発では**Selenium**を使い分けるのが効果的。

最初はテストを書くコストがかかるように感じるかもしれませんが、手動での回帰テストのコストや、本番環境でバグが発生した際の対応コストを考えれば、システムテストへの投資は十分に価値があります。ぜひ、主要なユーザーシナリオからテスト作成を始めてみてください。
