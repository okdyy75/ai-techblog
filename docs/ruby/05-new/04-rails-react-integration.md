# Ruby on RailsとReactの連携

Ruby on RailsとReactを連携させる方法はいくつかありますが、ここでは`jsbundling-rails` Gemを使ったモダンな連携方法を紹介します。

## 1. `jsbundling-rails`のセットアップ

Rails 7以降では、`jsbundling-rails`が標準的なJavaScriptのバンドル方法の一つとして提供されています。`esbuild`, `webpack`, `rollup`のいずれかを選択できます。

**Rails新規作成時に設定する場合:**
```bash
$ rails new my_app -d postgresql -j esbuild
```
`-j esbuild`オプションで`jsbundling-rails`が`esbuild`と共にセットアップされます。

**既存のRailsアプリに導入する場合:**
`Gemfile`に`jsbundling-rails`を追加し、インストールコマンドを実行します。
```ruby
# Gemfile
gem "jsbundling-rails"
```
```bash
$ bundle install
$ ./bin/bundle exec jsbundling-rails:install
```

## 2. Reactの導入

Reactをプロジェクトに追加します。

```bash
$ yarn add react react-dom
```

## 3. Reactコンポーネントの作成

`app/javascript/components`ディレクト��を作成し、そこにReactコンポーネントを配置します。

**`app/javascript/components/HelloWorld.js`**
```jsx
import React from 'react';

const HelloWorld = ({ greeting }) => {
  return <h1>{greeting}</h1>;
};

export default HelloWorld;
```

## 4. コンポーネントのマウント

`app/javascript/application.js`で、Railsのビューから呼び出せるようにコンポーネントをグローバルに登録するか、各ページで個別にマウントします。ここでは、`react-on-rails`のようなヘルパーを使わずに、シンプルな方法でマウントします。

まず、マウント用のスクリプトを作成します。

**`app/javascript/mount.js`**
```jsx
import React from 'react';
import ReactDOM from 'react-dom';
import HelloWorld from './components/HelloWorld';

const mountComponents = {
  HelloWorld,
};

document.addEventListener('DOMContentLoaded', () => {
  const mountPoints = document.querySelectorAll('[data-react-component]');
  mountPoints.forEach(mountPoint => {
    const componentName = mountPoint.dataset.reactComponent;
    const props = JSON.parse(mountPoint.dataset.props || '{}');
    const Component = mountComponents[componentName];
    if (Component) {
      ReactDOM.render(<Component {...props} />, mountPoint);
    }
  });
});
```

`app/javascript/application.js`からこのファイルをインポートします。
```js
// app/javascript/application.js
import "./mount";
```

## 5. Railsビューでの呼び出し

Railsのビューファイルで、`data`属性を使ってReactコンポーネントを指定します。

**`app/views/pages/home.html.erb`**
```erb
<h1>Rails View</h1>
<div
  data-react-component="HelloWorld"
  data-props="<%= { greeting: 'Hello from Rails!' }.to_json %>"
></div>
```

## 6. 開発サーバーの起動

`./bin/dev`コマンドでRailsサーバーとJavaScriptのビルドプロセスを同時に起動します。

```bash
$ ./bin/dev
```

これにより、`app/javascript`以下のファイルが変更されると自動的に再ビルドされ、モダンなフロントエンド開発の体験が得られます。この方法は、Railsの強力なバックエンド機能とReactの豊富なUI機能をスムーズに連携させるための一つのベストプラクティスです。
