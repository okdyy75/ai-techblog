# 46. StimulusReflex入門: Cable-readyを使ったリアクティブな体験

## はじめに

SPA (Single Page Application) のようなリッチでインタラクティブなUIを、フルスタックのRailsアプリケーションで実現したい。しかし、そのために重量級のJavaScriptフレームワーク（React, Vueなど）を導入するのは大げさだと感じる...。このジレンマを解決する強力な選択肢が **StimulusReflex** です。

StimulusReflexは、Action Cable (WebSocket) を通じて、ブラウザのDOMイベントをサーバーサイドのRailsメソッド（Reflexアクション）に直接結びつけます。そして、**CableReady** を使って、サーバーサイドからクライアントのDOMを効率的に更新します。これにより、ページ全体をリロードすることなく、UIの一部をリアクティブに変更する、いわゆる「魔法のような」体験を、最小限のJavaScriptで実現できます。

本記事では、StimulusReflexとCableReadyの基本的な概念と使い方を、簡単なカウンター機能を例に解説します。

## この記事で学べること

- StimulusReflexとCableReadyの基本的な仕組み
- ReflexクラスとStimulusコントローラの連携方法
- サーバーサイドからDOMを更新するCableReadyの操作
- ページリロードなしでインタラクティブなUIを構築する考え方

## 1. セットアップ

StimulusReflexのセットアップは、インストーラースクリプトを実行するのが最も簡単です。

1.  `stimulus_reflex` gemを `Gemfile` に追加し、`bundle install` します。
    Gemfile
    ```ruby
    gem 'stimulus_reflex'
    ```

2.  インストールタスクを実行します。これにより、必要な設定、npmパッケージの追加、ファイルの生成が自動的に行われます。
    ```bash
    bundle exec rails stimulus_reflex:install
    ```

3.  `yarn install` を実行します。

このプロセスで、Action Cable、Redis、Stimulus.jsなどが設定され、`CableReady` が使えるようになります。

## 2. 基本的な使い方: カウンターの実装

ボタンをクリックすると、サーバー側でカウントアップし、その結果をページに反映する簡単なカウンターを実装してみましょう。

### ステップ1: Reflexクラスの作成

Reflexクラスは、クライアントからのイベントを受け取り、サーバーサイドで処理を実行する場所です。`app/reflexes/counter_reflex.rb` を作成します。

app/reflexes/counter_reflex.rb
```ruby
class CounterReflex < ApplicationReflex
  def increment
    # `element` から data属性を取得
    @count = element.dataset[:count].to_i + 1
  end
end
```

- `ApplicationReflex` を継承します。
- `increment` メソッドが、クライアントから呼び出されるアクションです。
- `element` は、このReflexアクションをトリガーしたDOM要素を表すオブジェクトです。`dataset` を通じて `data-*` 属性にアクセスできます。
- インスタンス変数 `@count` は、この後ビューを再レンダリングするために使われます。

### ステップ2: Stimulusコントローラの接続

次に、フロントエンド側でこのReflexアクションを呼び出すためのStimulusコントローラを作成します。`app/javascript/controllers/counter_controller.js` を作成します。

app/javascript/controllers/counter_controller.js
```javascript
import ApplicationController from './application_controller'

export default class extends ApplicationController {
  connect () {
    super.connect()
  }

  increment (event) {
    event.preventDefault()
    this.stimulate('Counter#increment', event.currentTarget)
  }
}
```

- `ApplicationController` は `stimulus_reflex` によって生成され、`stimulate` メソッドを提供します。
- `stimulate` メソッドが、Reflexアクションを呼び出すためのキーとなります。
  - 第一引数: `'ReflexClassName#method_name'` の形式で、呼び出すサーバー側のメソッドを指定します。
  - 第二引数（任意）: トリガーとなった要素を渡します。これにより、Reflex側で `element` として参照できます。

### ステップ3: ビューの作成

最後に、HTMLを記述します。StimulusコントローラとReflexアクションを `data-*` 属性で結びつけます。

app/views/pages/counter.html.erb
```erb
<h1>StimulusReflex Counter</h1>

<div id="counter" data-controller="counter">
  <h2>Count: <%= @count || 0 %></h2>

  <a href="#"
     data-reflex="click->Counter#increment"
     data-count="<%= @count || 0 %>">
    Increment
  </a>
</div>
```

- `data-controller="counter"`: この `div` を `counter_controller.js` に接続します。
- `data-reflex="click->Counter#increment"`: これがStimulusReflexの最も基本的な使い方です。`click` イベントが発生したら、`CounterReflex` の `increment` メソッドを呼び出す、という宣言です。
- `data-count`: 現在のカウント数をReflexに渡すために設定しています。

### デフォルトの動作: Page Morph

この状態でボタンをクリックすると、以下の流れが起こります。

1.  `click` イベントが `CounterReflex#increment` を呼び出す。
2.  サーバー側で `@count` がインクリメントされる。
3.  **StimulusReflexが、現在のコントローラのアクション（このビューをレンダリングしたアクション）を再実行する。**
4.  新しい `@count` の値でビューが再レンダリングされる。
5.  **更新されたHTMLと現在のページのHTMLの差分が計算され、差分だけがDOMに適用（morph）される。**

これにより、ページ全体のリロードなしに `<h2>` タグの中身だけが更新されます。これが最もシンプルな **Page Morph** と呼ばれる更新方法です。

## 3. CableReadyによる高度なDOM操作

Page Morphは手軽ですが、常にビュー全体を再レンダリングするのは非効率な場合があります。「特定の要素の中身だけを書き換えたい」「CSSクラスを追加/削除したい」といった、より細かいDOM操作を行いたい場合は **CableReady** を使います。

`CounterReflex` をCableReadyを使うように書き換えてみましょう。

app/reflexes/counter_reflex.rb
```ruby
class CounterReflex < ApplicationReflex
  def increment
    @count = element.dataset[:count].to_i + 1

    # CableReadyを使って、特定の要素を直接更新する
    cable_ready['#counter'].text_content(
      selector: 'h2',
      text: "Count: #{@count}"
    )
    # リンクのdata-count属性も更新して、次のクリックに備える
    cable_ready['#counter'].set_attribute(
      selector: 'a',
      name: 'data-count',
      value: @count
    )
    cable_ready.broadcast # 更新をクライアントに送信
  end
end
```

- `cable_ready` オブジェクトを使って、実行したいDOM操作をキューに追加していきます。
- `['#counter']`: 操作の対象となるブロードキャストチャネルを指定します。通常はスコープとなるDOMのIDを指定します。
- `text_content(selector:, text:)`: 指定したセレクタの要素のテキストを書き換えます。
- `set_attribute(...)`: 要素の属性を設定します。
- `broadcast`: キューに追加された操作をクライアントに送信します。

この方法では、ビューの再レンダリングは行われず、指定したDOM操作だけがクライアントに送信されて実行されるため、より効率的です。CableReadyには、`inner_html`, `add_css_class`, `remove`, `insert_adjacent_html` など、非常に多くのDOM操作メソッドが用意されています。

## まとめ

StimulusReflexとCableReadyは、伝統的なフルスタックRails開発の生産性と、モダンなフロントエンドのリアクティブな体験を見事に融合させます。

- **StimulusReflex**: DOMイベントとサーバーサイドのRubyメソッドを直結させる。
- **CableReady**: サーバーサイドからクライアントのDOMをきめ細かく、効率的に操作する。

この組み合わせにより、JavaScriptのコード量を最小限に抑えながら、ユーザーの操作に即座に反応する動的なUIを構築できます。Hotwire (Turbo/Stimulus) とはまた違ったアプローチですが、Railsコミュニティで強力な支持を得ている技術スタックです。ぜひその「魔法」を体験してみてください。