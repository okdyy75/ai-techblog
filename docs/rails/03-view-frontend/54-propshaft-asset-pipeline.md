# Propshaftアセットパイプライン入門: Sprocketsからの移行とメリット

Rails 7では、アセットパイプラインの新しい選択肢として**Propshaft**が導入されました。これは、長年RailsのデフォルトであったSprocketsに代わる、よりシンプルで高速なアセット管理ライブラリです。

この記事では、Propshaftがどのようなもので、Sprocketsと何が違うのか、そして既存のアプリケーションをSprocketsからPropshaftへ移行する方法について解説します。

## Propshaftとは？

Propshaftは、本番環境（production）でのアセット配信に特化した、非常にシンプルなライブラリです。

その設計思想は「**速さと単純さ**」に集約されます。

### Sprocketsとの主な違い

| 機能 | Sprockets | Propshaft |
|:---|:---|:---|
| **目的** | アセットの変換・結合・圧縮 | アセットの配信（マッピング） |
| **アセット変換** | 対応 (Sass, CoffeeScript等) | **非対応** |
| **アセット結合** | 対応 (Asset Manifest) | **非対応** |
| **複雑さ** | 高機能で複雑 | 非常にシンプル |
| **パフォーマンス** | 比較的多機能な分、オーバーヘッドあり | 高速（ファイルシステムを直接参照） |

最大の違いは、**Propshaft自体にはアセットを変換・結合する機能がない**ことです。SprocketsはSassをCSSに、CoffeeScriptをJavaScriptに変換し、複数のファイルを一つにまとめる（concat）機能を持っていました。一方、Propshaftは、すでにビルド済みのCSSやJavaScriptファイルを、正しいダイジェスト付きのパス（例: `application-a1b2c3d4.css`）で配信することだけに責務を絞っています。

では、アセットのビルドは誰が行うのか？ それが、`jsbundling-rails`や`cssbundling-rails`といった、モダンなフロントエンドツール（esbuild, webpack, Rollup, Tailwind CSS CLI, Dart Sassなど）をRailsに統合するためのgemの役割です。

**Rails 7以降のモダンな構成:**

- **ビルド**: `jsbundling-rails` (esbuild) + `cssbundling-rails` (Dart Sass)
- **配信**: `Propshaft`

この構成により、それぞれのツールが自身の得意なことに専念するため、全体としてより高速でモダンな開発体験が得られます。

## Propshaftのメリット

1.  **高速な起動とアセット検索**: Sprocketsのように起動時にすべてのアセットパスをメモリにロードしないため、特に開発環境でのアプリケーション起動が速くなります。
2.  **シンプルな設定**: 設定ファイルが不要で、規約（`app/assets/builds`にビルド済みファイルを置く）に従うだけで動作します。
3.  **デプロイの簡素化**: `precompile`タスクが不要になり、`assets:precompile`の代わりにフロントエンドのビルドコマンド（例: `yarn build`）を実行するだけになります。

## SprocketsからPropshaftへの移行

既存のRailsアプリケーションをSprocketsからPropshaftへ移行する手順は、比較的簡単です。

### 1. `Gemfile`の変更

`Gemfile`から`sprockets-rails`を削除し、`propshaft`を追加します。

```ruby
# Gemfile

# gem "sprockets-rails"
gem "propshaft"
```

そして`bundle install`を実行します。

### 2. `config/application.rb`の変更

Sprocketsのアセットパイプラインを無効にします。

```ruby
# config/application.rb
# require "sprockets/railtie"
```

### 3. `config/environments/development.rb`と`production.rb`の確認

`config.assets.debug`のようなSprockets特有の設定が残っていれば削除します。

### 4. アセットの出力先を変更

Propshaftは、デフォルトで`app/assets/builds`ディレクトリにあるアセットを配信します。`jsbundling-rails`や`cssbundling-rails`を使っている場合、ビルドの出力先をこのディレクトリに変更する必要があります。

`package.json`の`scripts`セクションを修正します。

```json
// package.json
"scripts": {
  "build": "esbuild app/javascript/*.* --bundle --sourcemap --outdir=app/assets/builds",
  "build:css": "sass ./app/assets/stylesheets/application.sass.scss:./app/assets/builds/application.css --no-source-map --load-path=node_modules"
}
```

- `esbuild`の`--outdir`を`app/assets/builds`に変更。
- `sass`の出力先を`app/assets/builds/application.css`に変更。

### 5. `Procfile.dev`の確認

`Procfile.dev`（または`bin/dev`）でビルドコマンドを実行している場合、`--watch`オプションが有効になっていることを確認してください。これにより、開発中にJavaScriptやCSSファイルを変更すると自動的に再ビルドが実行されます。

```yaml
# Procfile.dev
web: bin/rails server -p 3000
js: yarn build --watch
css: yarn build:css --watch
```

### 6. `config/initializers/assets.rb`の削除

`config.assets.paths`や`config.assets.precompile`といった設定はPropshaftでは不要になるため、このイニシャライザファイルは削除できることが多いです。

### 7. 動作確認

`bin/dev`で開発サーバーを起動し、アセットが正しく読み込まれるかを確認します。本番環境での確認も忘れずに行いましょう。

## まとめ

Propshaftは、Rails 7以降のモダンなフロントエンド開発における、シンプルで高速なアセット配信の仕組みです。

- Sprocketsとは異なり、**アセットの変換や結合は行わない**。
- `jsbundling-rails`や`cssbundling-rails`と組み合わせて使うことが前提。
- **高速・シンプル・設定が容易**というメリットがある。

新規にRails 7でアプリケーションを始める場合は、デフォルトでPropshaftが使われるため、特に意識する必要はありません。しかし、古いバージョンのRailsからアップグレードした場合や、Sprocketsベースのプロジェクトをモダン化したい場合には、Propshaftへの移行を検討する価値は十分にあります。
