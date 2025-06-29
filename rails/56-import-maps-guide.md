# Import mapsを理解する: JavaScriptの依存関係をシンプルに管理

Rails 7では、JavaScriptの扱い方が大きく変わりました。これまでのWebpackerやSprocketsによるアセットのビルド・バンドルという考え方に加え、**Import maps**という新しいアプローチがデフォルトになりました。

Import mapsは、Node.jsやビルドツール（webpack, esbuildなど）に依存せずに、モダンなES Modules構文（`import` / `export`）をブラウザで直接利用するための仕組みです。

この記事では、Import mapsがどのように機能するのか、そしてRailsでどのように使われているのかを解説します。

## Import mapsとは？

Import mapsは、一言で言うと「**ブラウザにモジュールの名前と実際のURLパスを対応付けるための地図（map）を教える仕組み**」です。

通常、ブラウザでES Modulesを使う場合、`import`文には相対パスや絶対パスを指定する必要があります。

```javascript
// OK
import { something } from './lib/utils.js';
import { other } from '/modules/other.js';

// NG: ブラウザは'moment'がどこにあるか知らない
import moment from "moment";
```

`import moment from "moment"`のような「裸のモジュール指定子（bare module specifier）」は、Node.js環境では`node_modules`からライブラリを探してくれますが、ブラウザは`"moment"`という名前だけではファイルの場所が分からず、エラーになってしまいます。

この問題を解決するのがImport mapsです。HTMLの`<head>`内に`<script type="importmap">`タグを記述し、モジュール名とURLの対応表をJSON形式で定義します。

```html
<script type="importmap">
{
  "imports": {
    "moment": "/js/moment.js",
    "lodash": "https://unpkg.com/lodash-es@4.17.21/lodash.js"
  }
}
</script>
```

この定義があれば、ブラウザは`import moment from "moment"`という記述を見つけたときに、「`moment`は`/js/moment.js`のことだな」と解釈し、そのURLからファイルを読み込んでくれるようになります。

## RailsでのImport maps (`importmap-rails`)

Railsでは、`importmap-rails`というgemがこの仕組みを簡単に利用できるようにしてくれています。

### 主なファイルとコマンド

- **`config/importmap.rb`**: Import mapsの定義ファイル。ここで使いたいJavaScriptライブラリを「ピン留め（pin）」します。

  ```ruby
  # config/importmap.rb
  pin "application", preload: true
  pin "@hotwired/turbo-rails", to: "turbo.min.js", preload: true
  pin "@hotwired/stimulus", to: "stimulus.min.js", preload: true
  pin "@hotwired/stimulus-loading", to: "stimulus-loading.js", preload: true
  pin_all_from "app/javascript/controllers", under: "controllers"

  # ここにライブラリを追加していく
  pin "lodash", to: "https://ga.jspm.io/npm:lodash@4.17.21/lodash.js"
  ```

- **`app/javascript/application.js`**: JavaScriptのエントリーポイント。ここから他のモジュールを`import`します。

- **`./bin/importmap`コマンド**: ライブラリのピン留めを簡単に行うためのコマンドラインツール。

  ```bash
  # lodashをピン留めする
  ./bin/importmap pin lodash

  # ピン留めを外す
  ./bin/importmap unpin lodash

  # ピン留めされたライブラリの物理ファイルをダウンロードしてローカルで管理する
  ./bin/importmap pin lodash --download
  ```

`./bin/importmap pin`コマンドは、デフォルトでJSPM.ioというCDNサービスを使って、指定されたライブラリの最適なESMバージョンを探し、`config/importmap.rb`に追記してくれます。

### メリット

1.  **Node.js不要**: `node_modules`ディレクトリや`package.json`が不要になり、フロントエンドの依存関係がシンプルになります。
2.  **ビルドプロセス不要**: ファイルを変更しても「ビルド」や「バンドル」といった処理が必要ありません。ブラウザが直接個別のファイルを読み込むため、開発中のリロードが高速です。
3.  **デバッグの容易さ**: ブラウザの開発者ツールで、変換されていない元のJavaScriptファイルを直接デバッグできます。

### デメリットと注意点

1.  **ブラウザの互換性**: Import mapsはモダンなブラウザでしかサポートされていません。（IE11などは非対応）
2.  **HTTP/2推奨**: 多くの小さなJavaScriptファイルを個別に読み込むため、HTTP/1.1環境ではパフォーマンスが低下する可能性があります。HTTP/2が使える環境での利用が推奨されます。
3.  **JSXやTypeScript**: Import mapsはトランスパイル（変換）機能を持たないため、JSXやTypeScriptのように、ブラウザが直接解釈できない構文は使えません。これらを使いたい場合は、`jsbundling-rails`（esbuild, webpackなど）のアプローチを選択する必要があります。

## Import maps vs. jsbundling

Rails 7では、フロントエンドのアプローチを柔軟に選択できます。

| | `importmap-rails` | `jsbundling-rails` |
|:---|:---|:---|
| **ビルドツール** | 不要 | 必要 (esbuild, webpack等) |
| **`node_modules`** | 不要 | 必要 |
| **TypeScript/JSX** | 不可 | 可能 |
| **対象** | 標準的なJavaScript (ESM) | 高度なフロントエンド開発 |
| **複雑さ** | シンプル | 比較的複雑 |

**どちらを選ぶべきか？**

- **Hotwire (Turbo/Stimulus) を中心とした、標準的なRails開発**であれば、**Import maps**が最適です。シンプルで高速な開発体験を提供してくれます。
- **React, Vue, Svelteといったフロントエンドフレームワークを使いたい**、あるいは**TypeScriptやJSXを使いたい**場合は、**jsbundling-rails**を選択します。

これらは排他的な関係ではなく、`rails new`時に`--javascript` (`-j`) オプションで選択できます。

```bash
# Import maps (デフォルト)
rails new my_app

# esbuildを使ったjsbundling
rails new my_app -j esbuild
```

## まとめ

Import mapsは、RailsにおけるJavaScript開発の複雑さを軽減し、「Railsらしい」シンプルさを取り戻すための優れたアプローチです。

- ブラウザにモジュール名とURLの対応を教える仕組み。
- `importmap-rails` gemと`./bin/importmap`コマンドで簡単に管理できる。
- Node.jsやビルドツールが不要で、開発がシンプルかつ高速になる。
- TypeScriptやJSXには対応していないため、その場合はjsbundlingを選択する。

多くのRailsアプリケーションにとって、Import mapsは十分強力であり、フロントエンドの重いツールチェーンから解放される大きなメリットをもたらします。まずはデフォルトのImport mapsで開発を始め、必要になったらjsbundlingへの移行を検討するという進め方が良いでしょう。
