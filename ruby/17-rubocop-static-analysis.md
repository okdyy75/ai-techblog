
# RuboCopを使った静的コード解析

RuboCopは、Rubyの静的コードアナライザ（リンター）であり、フォーマッターでもあります。Rubyコミュニティで広く受け入れられている[Rubyスタイルガイド](https://github.com/rubocop/ruby-style-guide)に基づいて、コードが一貫したスタイルに従っているかをチェックし、潜在的な問題を検出します。RuboCopを導入することで、コードの可読性を高め、チーム開発におけるコーディングスタイルを統一し、バグを未然に防ぐことができます。

## RuboCopの主な機能

1.  **スタイルチェック (Linting)**: コーディング規約に違反している箇所を検出して警告します。（例: インデントが正しくない、長すぎる行、不適切な命名など）
2.  **コードフォーマット (Formatting)**: 違反している箇所を自動的に修正し、一貫したスタイルに整形します。
3.  **静的解析 (Static Analysis)**: コードを実行することなく、構文的に正しくても問題を引き起こす可能性のあるコードパターンを検出します。（例: 到達不能なコード、未使用の変数��ど）

## 導入方法

### 1. インストール

Bundlerを使ってプロジェクトに追加するのが一般的です。`Gemfile`に以下を追加します。

```ruby
# Gemfile
group :development do
  gem 'rubocop', require: false
end
```

`require: false` を指定するのは、`bundle require`時にRuboCopを読み込む必要がないためです。

そして、インストールします。

```bash
bundle install
```

### 2. 基本的な使い方

ターミナルから`rubocop`コマンドを実行します。

```bash
# プロジェクト全体のファイルをチェック
bundle exec rubocop

# 特定のディレクトリやファイルのみをチェック
bundle exec rubocop app/models/user.rb
```

実行すると、規約に違反している箇所（Offense）の一覧がファイル名と行番号とともに表示されます。

```
Inspecting 1 file
C

Offenses:

app/models/user.rb:3:5: C: Style/Documentation: Missing top-level class documentation comment.
class User < ApplicationRecord
    ^^^^^
# ... 他の違反 ...

1 file inspected, 5 offenses detected
```

### 3. 自動修正

RuboCopの最も強力な機能の一つが自動修正です。`-a`または`-A`オプションを付けて実行します。

- `bundle exec rubocop -a` (`--auto-correct`): 安全な修��のみを実行します。構文が変わってしまう可能性のある危険な修正は行いません。
- `bundle exec rubocop -A` (`--auto-correct-all`): 安全でない可能性のある修正も含め、すべての修正を試みます。**実行後にコードの動作確認やテストが必須です。**

```bash
# 安全な修正を自動的に適用
bundle exec rubocop -a
```

## 設定ファイルによるカスタマイズ

プロジェクトのルートディレクトリに`.rubocop.yml`という設定ファイルを作成することで、RuboCopの動作を細かくカスタマイズできます。

### 設定の継承

多くの拡張Gem（`rubocop-rails`, `rubocop-rspec`など）は、ベースとなる設定を提供しています。これらを継承するのが一般的です。

```yaml
# .rubocop.yml

# Rails用の設定を読み込む
require:
  - rubocop-rails

# すべてのCop（チェック項目）に適用される設定
AllCops:
  # チェック対象外にするディレクトリ
  Exclude:
    - 'db/schema.rb'
    - 'vendor/**/*'
    - 'node_modules/**/*'
  # 新しいCopをデフォルトで有効にするか
  NewCops: enable
  # 自動修正が安全でないCopも対象にするか
  SuggestExtensions: false

# 特定のCopの設定を上書き
Style/Documentation:
  Enabled: false # クラスのドキュメントコメントチェックを無効化

Layout/LineLength:
  Max: 120 # 1行の最大文字数を120文字に変更

Metrics/BlockLength:
  Exclude:
    - 'spec/**/*' # specファイルではブロックの長さをチェックしない
```

### 主な設定項目

- `Enabled`: Copを有効にするか無効にするか (`true`/`false`)。
- `Exclude`: 特定のファイルやディレクトリをチェック対象から除外する。
- `Max`: 行の長さやメソッドの行数などの最大値を設定する。
- `EnforcedStyle`: 複数のスタイルが許容される場合に、どちらのスタイルを強制するか指定する。（例: `single_quotes` vs `double_quotes`）

## RuboCop拡張 (Extensions)

RuboCopには、特定のフレームワークやライブラリに特化したチェックを行うための拡張Gemが多数存在します。

- **`rubocop-rails`**: Railsアプリケーションに特有のベストプラクティスをチェックします。
- **`rubocop-rspec`**: RSpecのテストコードのスタイルをチェックします。
- **`rubocop-performance`**: パフォーマンスに影響を与える可能性のあるコードを検出します。
- **`rubocop-rake`**: Rakeタスクの書き方をチェックします。

これらは`Gemfile`に追加し���`.rubocop.yml`で`require`することで有効になります。

```ruby
# Gemfile
group :development do
  gem 'rubocop', require: false
  gem 'rubocop-rails', require: false
  gem 'rubocop-rspec', require: false
end
```

```yaml
# .rubocop.yml
require:
  - rubocop-rails
  - rubocop-rspec
```

## CI/CDとの連携

RuboCopをGitHub ActionsなどのCI/CDパイプラインに組み込むことで、コードがマージされる前にスタイルが規約に従っていることを自動的に保証できます。

```yaml
# .github/workflows/rubocop.yml
name: RuboCop

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true
      - name: Run RuboCop
        run: bundle exec rubocop
```

## まとめ

RuboCopは、Rubyプロジェクトのコード品質を維持するための強力なパートナーです。
- コードスタイルを統一し、可読性を向上させる。
- 自動フォーマット機能で、手作業でのスタイル修正の手間を省く。
- 潜在的なバグやアンチパターンを早期に発見する。
- `.rubocop.yml`でプロジェクト固有のルールを柔軟に設定できる。
- CIと連携させることで、品質の高いコードベースを継続的に維持できる。

プロジェクトの初期段階からRuboCopを導入し、チーム全員で規約に従う文化を育むことが、長期的に見てメンテナンス性の高いソフトウェア開発につながります。
