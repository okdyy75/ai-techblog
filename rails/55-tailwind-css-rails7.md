# Tailwind CSSをRails 7で使うためのモダンなセットアップ

Tailwind CSSは、ユーティリティファースト（Utility-First）のアプローチでUIを構築する、非常に人気のあるCSSフレームワークです。あらかじめ定義されたクラス（例: `text-lg`, `font-bold`, `p-4`, `flex`）をHTMLに直接記述していくことで、CSSファイルをほとんど書かずに、高速にUIをデザインできます。

Rails 7では、`cssbundling-rails` gemを通じて、Tailwind CSSのようなモダンなCSSツールとの連携が非常にスムーズになりました。

この記事では、Rails 7アプリケーションでTailwind CSSをセットアップし、開発を始めるための手順を解説します。

## なぜTailwind CSSなのか？

- **開発スピードの向上**: CSSファイルとHTMLファイルを行き来する必要がなく、HTML内でスタイリングが完結します。
- **デザインの一貫性**: あらかじめ定義されたデザインシステム（スペーシング、カラーパレットなど）に従うため、UIに一貫性が生まれます。
- **パフォーマンス**: 本番ビルド時に、実際に使用されているクラスだけを抽出してCSSファイルを生成（Purge/JIT）するため、最終的なファイルサイズが非常に小さくなります。
- **カスタマイズ性**: `tailwind.config.js`ファイルで、カラー、フォント、ブレークポイントなど、あらゆる要素を自由にカスタマイズできます。

## セットアップ方法

Rails 7で`cssbundling-rails`を使ってTailwind CSSを導入するのは非常に簡単です。`rails new`時にオプションを指定する方法と、既存のアプリケーションに追加する方法があります。

### 新規アプリケーションの場合

`rails new`コマンドを実行する際に、`-c tailwind`オプションを付けるだけです。

```bash
rails new my_app -c tailwind
```

これだけで、必要なgemの追加、`package.json`へのライブラリの追加、設定ファイルの生成、`Procfile.dev`のセットアップなど、すべての作業が自動的に行われます。

### 既存のアプリケーションに追加する場合

1.  **`cssbundling-rails`のインストール**: `Gemfile`に`cssbundling-rails`を追加して`bundle install`します。

    ```ruby
    # Gemfile
    gem "cssbundling-rails"
    ```

2.  **インストールタスクの実行**: `cssbundling-rails`が提供するインストールタスクを実行します。

    ```bash
    ./bin/rails css:install:tailwind
    ```

このタスクが、以下の作業を自動で行ってくれます。

- `tailwindcss`や必要なプラグインを`package.json`に追加し、`yarn install`を実行。
- `tailwind.config.js`と`app/assets/stylesheets/application.tailwind.css`という設定ファイルと入力用CSSファイルを生成。
- `Procfile.dev`（または`bin/dev`）に、Tailwindのwatchプロセスを追加。
- `build`スクリプトを`package.json`に追加。

## ファイル構成と開発フロー

セットアップが完了すると、以下のようなファイルが構成されます。

- **`app/assets/stylesheets/application.tailwind.css`**: Tailwind CSSのディレクティブ（`@tailwind base;`など）を記述する入力ファイル。カスタムCSSを追加したい場合は、このファイルに記述します。

  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  /* カスタムコンポーネントなどを追加できる */
  .btn-primary {
    @apply py-2 px-4 bg-blue-500 text-white font-semibold rounded-lg shadow-md;
  }
  ```

- **`app/assets/builds/application.css`**: Tailwind CLIによってコンパイルされた**出力ファイル**。このファイルは直接編集してはいけません。`.gitignore`にも追加されます。

- **`tailwind.config.js`**: Tailwind CSSのカスタマイズを行う設定ファイル。

  ```javascript
  module.exports = {
    content: [
      './app/views/**/*.html.erb',
      './app/helpers/**/*.rb',
      './app/javascript/**/*.js'
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  }
  ```
  `content`には、Tailwindのクラスが記述される可能性のあるファイルを指定します。これにより、JITコンパイラがどのクラスをCSSに含めるべきかを判断します。

- **`Procfile.dev`**: 開発サーバーを起動するためのファイル。

  ```yaml
  web: bin/rails server -p 3000
  css: yarn build:css --watch
  ```

### 開発フロー

1.  `bin/dev`コマンドで開発サーバーを起動します。これにより、RailsサーバーとTailwindのwatchプロセスが同時に起動します。
2.  `app/views/**/*.html.erb`ファイルに、Tailwindのユーティリティクラスを直接記述してUIを構築します。
    ```html
    <div class="bg-slate-100 p-8 rounded-xl shadow-lg">
      <h1 class="text-2xl font-bold text-gray-800">こんにちは、Tailwind CSS!</h1>
    </div>
    ```
3.  ファイルを保存すると、`css: yarn build:css --watch`プロセスが変更を検知し、`app/assets/builds/application.css`を自動的に再生成します。
4.  ブラウザをリロードすると、スタイルが適用された画面が表示されます。

## 本番環境での動作

デプロイ時には、`rails assets:precompile`タスクが実行されます。このタスクは、`package.json`の`build:css`スクリプト（`yarn build:css`）をフックして実行します。

`build:css`スクリプトは、JITコンパイラを使って`content`で指定されたファイルをスキャンし、**実際に使用されているクラスのみ**を含む最適化された`application.css`を`app/assets/builds`に生成します。その後、PropshaftやSprocketsがこのファイルにダイジェストを付与して`public/assets`に配置します。

この仕組みにより、開発中はすべてのユーティリティクラスが使えて便利でありながら、本番環境では非常に軽量なCSSファイルだけが配信されるという、両者の良いとこ取りが実現されています。

## まとめ

Rails 7と`cssbundling-rails`のおかげで、Tailwind CSSの導入と利用は驚くほど簡単になりました。

- `rails new -c tailwind`または`./bin/rails css:install:tailwind`で一瞬でセットアップが完了する。
- `bin/dev`で起動すれば、ファイルの変更を監視して自動でCSSがビルドされる。
- 本番環境では、不要なスタイルがすべて削除された最適化済みのCSSが生成される。

ユーティリティファーストのアプローチは、コンポーネントベースの開発とも相性が良く、ViewComponentなどと組み合わせることで、再利用可能でメンテナンス性の高いUI部品を効率的に作成できます。ぜひ、次のプロジェクトでTailwind CSSのパワフルな開発体験を試してみてください。
