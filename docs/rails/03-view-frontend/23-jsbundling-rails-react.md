# Rails 7の`jsbundling-rails`を使ってReactやVue.jsをモダンに統合する方法

## はじめに

Rails 7は、フロントエンドの扱い方に大きな変革をもたらしました。かつての標準だったWebpackerは廃止され、よりシンプルでモダンなJavaScriptのエコシステムと直接連携するアプローチが採用されました。その中心となるのが**`jsbundling-rails`** gemです。

`jsbundling-rails`は、esbuild, Rollup, WebpackといったモダンなJavaScriptバンドラをRailsアプリケーションに統合するための橋渡し役となります。これにより、開発者はRailsの流儀に縛られることなく、JavaScriptコミュニティで標準となっているツールチェインを使って、ReactやVue.js、Svelteといったコンポーネントベースのライブラリを効率的に利用できるようになりました。

この記事では、`jsbundling-rails`の基本的な仕組みを解説し、新しいRails 7アプリケーションにReactを導入する具体的な手順を紹介します。

## `jsbundling-rails`の役割

`jsbundling-rails`は、それ自体がJavaScriptをバンドル（複数のJSファイルを一つにまとめること）するわけではありません。その役割は非常にシンプルです。

1.  `package.json`で定義された`build`スクリプト（例: `"build": "esbuild app/javascript/*.* --bundle --sourcemap --outdir=app/assets/builds"`）を、`rails assets:precompile`タスク実行時や、開発サーバー起動時に自動で実行する。
2.  バンドルされた成果物（`app/assets/builds`ディレクトリに出力される）を、RailsのAsset Pipelineから参照できるようにする。

つまり、JavaScriptのバンドル処理そのものはesbuildやWebpackといった専門のツールに完全に任せ、Railsはそれを呼び出して結果を受け取るだけ、というクリーンな関心の分離が実現されています。

## Rails 7 + Reactのセットアップ手順

それでは、`rails new`コマンドを使って、Reactを統合した新しいRailsアプリケーションを作成してみましょう。

### ステップ1: `rails new`コマンドの実行

`rails new`時に、`--javascript`（または`-j`）オプションで利用したいバンドラを指定します。ここでは、デフォルトで最も高速な`esbuild`を選択します。Reactを導入する場合、`--css`オプションで`bootstrap`や`tailwind`などを指定しておくと、後のスタイリングが楽になります。

```bash
# esbuildとBootstrapを使って新しいRailsアプリを作成
rails new my_react_app -j esbuild --css bootstrap
```

このコマンドを実行すると、`jsbundling-rails`と`cssbundling-rails`が`Gemfile`に追加され、`package.json`には`esbuild`や`@hotwired/stimulus`などが設定された状態でプロジェクトが初期化されます。

### ステップ2: Reactのインストール

次に、作成されたRailsアプリケーションのディレクトリに移動し、`npm`（または`yarn`）を使ってReactと関連ライブラリをインストールします。

```bash
cd my_react_app

npm install react react-dom
```

### ステップ3: Reactコンポーネントの作成

JavaScriptのエントリーポイントは`app/javascript/application.js`です。ここにReactコンポーネントをマウント（描画）するためのコードを記述します。

まず、Reactコンポーネントを作成しましょう。

```bash
mkdir -p app/javascript/components
touch app/javascript/components/HelloWorld.js
```

**`app/javascript/components/HelloWorld.js`**
```jsx
import React from 'react';

const HelloWorld = ({ greeting }) => {
  return (
    <div className="container py-4">
      <h1>{greeting}</h1>
      <p>This is a React component rendered by Rails!</p>
    </div>
  );
};

export default HelloWorld;
```

### ステップ4: エントリーポイントでのコンポーネントの登録

次に、`application.js`からこの`HelloWorld`コンポーネントを呼び出し、Railsのビューに描画するための「糊」となるコードを書きます。

```javascript
// app/javascript/application.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import HelloWorld from './components/HelloWorld';

// Railsのビュー側にある <div id="react-root"></div> にコンポーネントを描画する
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('react-root');
  if (container) {
    const root = createRoot(container);
    // Railsのビューから渡されたデータをpropsとしてコンポーネントに渡す
    const props = JSON.parse(container.getAttribute('data-props'));
    root.render(<HelloWorld {...props} />);
  }
});
```

React 17以前を使用している場合は `react-dom` の `ReactDOM.render` を使って同様
にマウントできます。

```javascript
// React 17までの例
import ReactDOM from 'react-dom';
ReactDOM.render(<HelloWorld {...props} />, container);
```

このコードは、`DOMContentLoaded`イベント（ページのHTMLが完全に読み込まれたとき）を待ち、ページ内に`id="react-root"`という要素があれば、その要素をReactのコンポーネントで置き換える、という処理を行っています。

### ステップ5: Railsビューからの呼び出し

最後に、Railsのビューファイルに、ReactコンポーネントをマウントするためのDOM要素を設置します。

**`app/views/static_pages/home.html.erb`** (このビューを表示するためのコントローラとルートは別途作成してください)
```erb
<%# Reactコンポーネントに渡したいデータをJSON形式でdata-props属性に設定 %>
<div id="react-root" data-props="<%= { greeting: 'Hello from Rails View!' }.to_json %>"></div>
```

*   `id="react-root"`: `application.js`がコンポーネントをマウントする場所の目印です。
*   `data-props`属性: ビューからReactコンポーネントにデータを渡すための一般的な方法です。ハッシュを`.to_json`でJSON文字列に変換して埋め込み、JavaScript側で`JSON.parse`して利用します。

### ステップ6: 開発サーバーの起動

準備は完了です。`bin/dev`コマンドで開発サーバーを起動します。

```bash
./bin/dev
```

このコマンドは、`foreman`（または`overmind`）を使って、RailsサーバーとJavaScriptのビルドプロセス（`npm run build -- --watch`）を同時に起動してくれます。`app/javascript`以下のファイルを変更すると、esbuildが自動で再バンドルを行い、ブラウザをリロードすれば変更が反映されます。

指定したページにアクセスすると、"Hello from Rails View!"というメッセージがReactコンポーネントによって描画されているはずです。

## まとめ

`jsbundling-rails`は、RailsとモダンなJavaScript開発の間の溝を埋める、シンプルかつ強力な接着剤です。

*   **`rails new -j [esbuild|rollup|webpack]`** で好みのバンドラを選択してプロジェクトを開始できる。
*   JavaScriptの依存関係は`package.json`で、ビルド方法は`build`スクリプトで管理する、というJavaScriptの標準的な作法に従う。
*   `./bin/dev`コマンドがRailsサーバーとJSのビルドプロセスをまとめて管理してくれる。

このアプローチにより、Rails開発者はフロントエンドの技術選定において高い自由度を得ることができます。Railsの堅牢なバックエンドと、ReactやVueが提供する豊かなコンポーネントエコシステムを組み合わせ、生産性とユーザー体験の両方を最大化させましょう。
