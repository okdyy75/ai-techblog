# 42. WebpackerからShakapackerへの移行ガイド

## はじめに

Rails 5と6の時代、JavaScriptのビルドとバンドルは **Webpacker** gemによって担われていました。しかし、Rails 7のリリースに伴い、フロントエンドのアセット管理は `jsbundling-rails` や `cssbundling-rails` を使った、よりWebpackから独立したアプローチが標準となりました。

この変化の中で、既存のWebpackerベースのRailsプロジェクトを維持・更新する必要がある開発者のために、コミュニティはWebpackerのフォークである **Shakapacker** を開発しました。Shakapackerは、WebpackerのAPIとの互換性を保ちつつ、最新のWebpackやJavaScriptエコシステムに対応するためのアップデートが継続されています。

本記事では、既存のRails 6プロジェクトでWebpackerを使用している状況から、Shakapacker v6へと移行するための具体的な手順を解説します。

## この記事で学べること

- WebpackerからShakapackerへの移行が必要な理由
- `Gemfile` と `package.json` の依存関係の更新方法
- 設定ファイル（`webpacker.yml`, `webpack/`）の変更点
- 移行後に発生しがちな問題とその対処法

## なぜ移行が必要か？

- **メンテナンスの終了**: `webpacker` gemの公式メンテナンスは終了しており、セキュリティアップデートや最新のWebpackへの追従は行われません。
- **最新エコシステムへの対応**: Shakapackerは、Webpack 5や最新のローダー、プラグインに対応しており、モダンなフロントエンド開発を継続できます。
- **コミュニティによるサポート**: Shakapackerは活発なコミュニティによって維持されており、問題が発生した際のサポートが期待できます。

## 移行手順 (Webpacker v5/v6 → Shakapacker v6)

### ステップ1: Gemの入れ替え

`Gemfile` を開き、`webpacker` を `shakapacker` に変更します。

Gemfile
```ruby
# 変更前
# gem 'webpacker', '~> 5.4'

# 変更後
gem 'shakapacker', '~> 6.5'
```

`bundle install` を実行して、gemを更新します。

```bash
bundle install
```

### ステップ2: npmパッケージの入れ替え

`package.json` を開き、`@rails/webpacker` を `shakapacker` に変更します。また、関連するローダーなども更新が必要になる場合があります。

package.json
```json
{
  "dependencies": {
    // ...
  },
  "devDependencies": {
    // 変更前
    // "@rails/webpacker": "^5.4.3",
    // "webpack-dev-server": "^3.11.2"

    // 変更後
    "shakapacker": "^6.5.0",
    "webpack-dev-server": "^4.7.4"
    // ... 他のローダーも必要に応じて更新
  }
}
```

`yarn install` を実行して、パッケージを更新します。

```bash
yarn install
```

### ステップ3: 設定ファイルの名称変更と内容の更新

ShakapackerはWebpackerとの互換性を重視していますが、設定ファイルの名前と一部の内容を変更する必要があります。

1.  **`webpacker.yml` → `shakapacker.yml`**

    `config/webpacker.yml` ファイルを `config/shakapacker.yml` にリネームします。

    ```bash
    mv config/webpacker.yml config/shakapacker.yml
    ```

    ファイルの内容は基本的にそのままで動作することが多いですが、`source_path` が `source_entry_path` を含まないように変更されている点に注意が必要です。Shakapackerでは、`source_path` はエントリーポイントの親ディレクトリを指します。

    `config/shakapacker.yml`:
    ```yaml
    default: &default
      source_path: app/javascript
      source_entry_path: packs # source_pathからの相対パス
      # ...
    ```

2.  **`config/webpack/` ディレクトリの調整**

    `config/webpack/environment.js` はそのまま使えますが、`webpack-dev-server` のバージョンを4に上げた場合、`config/webpack/development.js` の設定変更が必要になることがあります。

    また、Shakapackerは `webpack.config.js` を生成するようになりました。古い `webpacker` のbinstubが残っている場合は削除し、`shakapacker` のbinstubを使うようにします。

### ステップ4: binstubの更新

古いWebpackerのbinstub（`bin/webpack` と `bin/webpack-dev-server`）を削除し、Shakapackerのインストールタスクを実行して新しいbinstubを生成します。

```bash
rm bin/webpack bin/webpack-dev-server
bundle exec shakapacker:install
```

これにより、`shakapacker` の設定を読み込む新しい `bin/webpack` と `bin/webpack-dev-server` が生成されます。

### ステップ5: ビューのヘルパーメソッドの確認

ShakapackerはWebpackerのヘルパーメソッド（`javascript_pack_tag`, `stylesheet_pack_tag`）との後方互換性を維持しています。そのため、基本的にはビューのコードを変更する必要はありません。

```erb
<%= javascript_pack_tag 'application' %>
<%= stylesheet_pack_tag 'application' %>
```

これらのヘルパーは引き続き動作します。

### ステップ6: 動作確認

以上の手順が完了したら、開発サーバーを起動して動作を確認します。

```bash
./bin/dev # foremanなどを使っている場合
# または
./bin/webpack-dev-server
# 別のターミナルで
rails s
```

アプリケーションが正しく表示され、JavaScriptが正常に動作することを確認します。コンパイルエラーが発生した場合は、ターミナルのログを確認し、ローダーのバージョン互換性などを中心に調査します。

## まとめ

WebpackerからShakapackerへの移行は、いくつかの手順を伴いますが、基本的にはファイル名の変更と依存関係の更新が中心です。移行することにより、セキュリティの脅威からアプリケーションを守り、モダンなJavaScriptエコシステムの恩恵を受け続けることができます。

**移行のキーポイント**:

1.  **Gem**: `webpacker` → `shakapacker`
2.  **npm Package**: `@rails/webpacker` → `shakapacker`
3.  **Config File**: `webpacker.yml` → `shakapacker.yml`
4.  **Binstubs**: 古いものを削除し、`shakapacker:install` で再生成

Rails 6 + Webpacker構成のプロジェクトを運用している場合は、将来的なメンテナンス性とセキュリティのために、Shakapackerへの移行を計画的に進めることを強くお勧めします.