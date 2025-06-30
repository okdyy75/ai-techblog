# i18n-tasks gemでRailsの多言語対応を効率化する

## 概要

Railsの国際化（i18n）機能は、アプリケーションを多言語対応させるための強力な仕組みです。しかし、プロジェクトが成長するにつれて、`config/locales`ディレクトリ内のYAMLファイルは肥大化し、管理が困難になります。

-   「この翻訳キーは、もうコードのどこからも使われていないのでは？」
-   「新しい機能を追加したけど、どの言語の翻訳が漏れているだろうか？」
-   「大量のキーを翻訳するのが大変...」

`i18n-tasks`は、このようなi18nにまつわる一般的な課題を解決するためのGemです。静的解析の力で、翻訳キーの利用状況を分析し、翻訳作業を強力にサポートします。

この記事では、`i18n-tasks`の導入方法と、日々の開発を効率化するための主要なコマンドを紹介します。

## `i18n-tasks`の導入

`Gemfile`の`:development`グループに`i18n-tasks`を追加し、`bundle install`を実行します。

```ruby:Gemfile
group :development do
  gem 'i18n-tasks', '~> 1.0.0' # バージョンを指定することを推奨
end
```

次に、設定ファイルを生成します。

```bash
$ cp $(bundle exec i18n-tasks gem-path)/config/i18n-tasks.yml config/
```

これにより、`config/i18n-tasks.yml`が作成され、`i18n-tasks`の挙動を細かくカスタマイズできるようになります。

## 主要なコマンドと使い方

`i18n-tasks`は、`i18n-tasks`というコマンドを提供します。`bundle exec i18n-tasks`で実行できます。

### 1. 翻訳の健康状態をチェック (`health`)

まず最初に実行すべきコマンドは`health`です。これは、翻訳ファイル全体の状態を診断し、問題点を報告してくれます。

```bash
$ i18n-tasks health
```

**出力例:**

```
I18n-tasks is working with 2 locales: en, ja

Missing keys (1):
  ja.users.show.title

Unused keys (2):
  en.common.old_feature
  ja.common.old_feature
```

-   **Missing keys**: 翻訳が不足しているキーを報告します。この例では、`ja`ロケールに`users.show.title`の翻訳がないことを示しています。
-   **Unused keys**: コード中のどこからも使われていない（と思われる）翻訳キーを報告します。リファクタリングで不要になったキーを安全に削除するのに役立ちます。

### 2. 不足している翻訳の追加 (`missing`)

`missing`コマンドを使うと、不足しているキーを一覧表示したり、自動でファイルに追記したりできます。

```bash
# 不足しているキーをロケールごとに表示
$ i18n-tasks missing

# jaロケールで不足しているキーを、Google翻訳を使って自動で翻訳し、ファイルに追記
$ i18n-tasks missing --locale ja --format yaml | tee -a config/locales/ja.yml
```

### 3. Google翻訳との連携 (`translate-missing`)

`i18n-tasks`の最も強力な機能の一つが、Google Cloud Translation APIとの連携です。APIキーを設定することで、不足している翻訳を自動で生成できます。

1.  **Google Cloud Translation APIの有効化**: Google Cloud PlatformでAPIを有効にし、APIキーを取得します。
2.  **APIキーの設定**: `i18n-tasks.yml`または環境変数でAPIキーを設定します。

    ```yaml
    # config/i18n-tasks.yml
    translation:
      google_api_key: "YOUR_GOOGLE_API_KEY"
    ```

3.  **自動翻訳の実行**:

    ```bash
    # 不足しているキーを、ベース言語（通常はen）から他の言語に自動翻訳
    $ i18n-tasks translate-missing
    ```

    これにより、`ja.yml`などのファイルに、Google翻訳による訳文が自動的に追加されます。機械翻訳なので完璧ではありませんが、翻訳作業の初稿としては非常に有用です。

### 4. 未使用の翻訳キーの削除 (`remove-unused`)

`health`コマンドで報告された未使用キーを、安全に削除します。

```bash
$ i18n-tasks remove-unused
```

このコマンドは、該当するキーを全てのロケールファイルから削除します。実行前に、Gitでコミットしておくなど、バックアップを取っておくと安心です。

### 5. 翻訳キーの正規化 (`normalize`)

YAMLファイル内のキーをアルファベット順にソートし、フォーマットを統一します。

```bash
$ i18n-tasks normalize
```

これにより、複数人での開発時にコンフリクトが起きにくくなり、可読性も向上します。

## CI/CDへの組み込み

Brakemanと同様に、`i18n-tasks`もCI/CDパイプラインに組み込むことで、翻訳漏れや不要なキーの混入を自動的に防ぐことができます。

### GitHub Actionsでの実行例

```yaml
# .github/workflows/i18n.yml

name: I18n Check

on:
  pull_request:

jobs:
  i18n-check:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Ruby
      uses: ruby/setup-ruby@v1
      with:
        ruby-version: '3.2'
        bundler-cache: true

    - name: Check for missing or unused i18n keys
      run: bundle exec i18n-tasks health
```

この設定により、Pull Requestが作成されるたびに`i18n-tasks health`が実行され、何か問題があればCIが失敗します。これにより、翻訳の品質を常に高く保つことができます。

## まとめ

`i18n-tasks`は、Railsのi18n対応における面倒な作業を自動化し、開発者の負担を大幅に軽減してくれる必須のツールです。

-   **健康診断**: `health`で翻訳ファイルの問題点を一目で把握。
-   **自動翻訳**: `translate-missing`でGoogle翻訳と連携し、作業を効率化。
-   **クリーンアップ**: `remove-unused`で不要なキーを安全に削除。
-   **コード品質**: `normalize`でフォーマットを統一し、`CI`連携で品質を維持。

多言語対応は多くのアプリケーションにとって重要な要件です。`i18n-tasks`を開発ワークフローに組み込み、効率的で質の高いi18n管理を実現しましょう。
