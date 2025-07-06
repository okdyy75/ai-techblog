# テストカバレッジをSimpleCovで計測し、品質を可視化する

Railsアプリケーションでテストを書くことは、品質を維持し、安全なリファクタリングを可能にするために不可欠です。しかし、「テストが十分かどうか」を客観的に判断するのは難しい問題です。そこで役立つのが**テストカバレッジ**という指標です。

テストカバレッジは、テストコードがアプリケーションコードのどれだけの割合を実行したかを示す指標です。そして、Rails/Rubyアプリケーションでテストカバレッジを計測するための定番gemが`SimpleCov`です。

この記事では、`SimpleCov`の導入方法と、その結果をどう解釈し、活用していくべきかについて解説します。

## テストカバレッジとは？

テストカバレッジは、一般的に「行カバレッジ（Line Coverage）」を指します。これは、アプリケーションの全コード行のうち、テスト実行時に少なくとも一度は通過した行の割合をパーセンテージで示したものです。

### カバレッジを計測するメリット

- **テストの漏れを発見**: カバレッジが極端に低いファイルやメソッドは、テストが不足している可能性が高いことを示唆します。
- **品質の可視化**: 「カバレッジ90%以上を維持する」といった具体的な目標を設定し、チーム全体の品質意識を高めることができます。
- **Pull Requestのレビュー支援**: 変更されたコードがテストされているかを、カバレッジレポートで客観的に確認できます。

### 注意点：カバレッジ100%がゴールではない

カバレッジはあくまで「コードが実行されたか」を示すだけで、「テストのアサーション（検証）が正しいか」までは保証しません。カバレッジが高いからといって、バグがないとは限りません。

カバレッジ100%を盲目的に目指すのではなく、**重要なビジネスロジックが十分にテストされているか**を判断するための補助的な指標として活用することが重要です。

## `SimpleCov`の導入方法

`SimpleCov`の導入は非常に簡単です。

### 1. インストール

`Gemfile`の`:test`グループに`simplecov`を追加し、`bundle install`を実行します。

```ruby
# Gemfile
group :test do
  gem "simplecov", require: false
end
```

`require: false`を付けるのがポイントです。これにより、Railsの起動時に自動で`simplecov`が読み込まれるのを防ぎ、テスト実行時だけ読み込むように制御できます。

### 2. `spec_helper.rb` または `test_helper.rb` の設定

テストの開始時に`SimpleCov`を起動させるため、`spec_helper.rb`（RSpecの場合）または`test_helper.rb`（Minitestの場合）の**一番最初**に以下のコードを追加します。

```ruby
# spec/spec_helper.rb
require 'simplecov'
SimpleCov.start 'rails' # Rails用の設定プリセットを読み込む

# ... (RSpecの他の設定)
```

**`require 'rails_helper'`よりも前に記述することが非常に重要です。** そうしないと、`SimpleCov`が起動する前にアプリケーションコードが読み込まれてしまい、正しくカバレッジを計測できません。

`SimpleCov.start 'rails'`とすることで、Railsアプリケーションに適したデフォルト設定（例: `config`, `db`, `spec`ディレクトリなどをカバレッジ計測対象から除外する）が自動で適用されます。

### 3. テストの実行とレポートの確認

あとは通常通りにテストを実行するだけです。

```bash
rspec
# or
rails test
```

テストが完了すると、プロジェクトのルートディレクトリに`coverage`というディレクトリが生成されます。その中にある`index.html`をブラウザで開くと、詳細なカバレッジレポートを閲覧できます。

レポートでは、ファイルごと、ディレクトリごとのカバレッジ率や、どの行がテストを通過したか（緑）、通過しなかったか（赤）を視覚的に確認できます。

## `SimpleCov`の便利な設定

`SimpleCov.start`ブロックで、より詳細な設定を行うことができます。

### グループ分け

コードの種類ごとにカバレッジを分けて表示すると、レポートが見やすくなります。

```ruby
SimpleCov.start 'rails' do
  add_group "Controllers", "app/controllers"
  add_group "Models", "app/models"
  add_group "Services", "app/services"
  add_group "Jobs", "app/jobs"
  add_group "Long files", ->(src_file) { src_file.lines.count > 100 }

  # 計測対象から除外するパス
  add_filter "app/channels"
  add_filter "app/mailers"
end
```

### 最低カバレッジ率の設定

全体のカバレッジ率が特定の閾値を下回った場合に、テストを失敗させることもできます。CI/CDパイプラインに組み込むことで、品質の低下を防ぎます。

```ruby
SimpleCov.start 'rails' do
  minimum_coverage 90
  minimum_coverage_by_file 80
end
```

- `minimum_coverage`: プロジェクト全体の最低カバレッジ率。
- `minimum_coverage_by_file`: ファイル単位での最低カバレッジ率。

### ブランチカバレッジ（Ruby 2.5+）

行カバレッジだけでなく、`if`文などの条件分岐がどれだけ網羅されているか（`true`のパスと`false`のパスが両方テストされたか）を計測するブランチカバレッジも有効にできます。

```ruby
SimpleCov.start 'rails' do
  enable_coverage :branch
  primary_coverage :branch # レポートでブランチカバレッジを優先的に表示
end
```

## まとめ

`SimpleCov`は、Railsアプリケーションのテスト品質を客観的に評価し、改善の方向性を示してくれる強力なツールです。

- **簡単なセットアップ**: `Gemfile`に追加し、`spec_helper`の先頭で`SimpleCov.start`を呼ぶだけ。
- **可視化**: HTMLレポートにより、テストの弱点を直感的に把握できる。
- **品質維持**: CIで最低カバレッジ率を強制することで、コード品質のデグレードを防ぐ。

カバレッジは万能薬ではありませんが、テスト文化をチームに根付かせ、アプリケーションの健全性を維持するための羅針盤となります。まだ導入していないプロジェクトがあれば、ぜひ試してみてください。
