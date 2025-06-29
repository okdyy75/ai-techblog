# Hotwire（Turbo/Stimulus）で作る、SPAのようなUXを持つ動的アプリケーション

## はじめに

近年、ReactやVue.jsといったJavaScriptフレームワークを使ったSPA（Single Page Application）がリッチなUI/UXを実現する主流な方法となっています。しかし、SPAの開発はフロントエンドとバックエンドが完全に分離するため、開発の複雑さが増し、小規模なチームやRails開発者にとっては学習コストが高いという側面もあります。

この課題に対し、Railsの作者であるDHHが提唱するのが**Hotwire**です。Hotwireは、サーバーサイドでHTMLをレンダリングするというRailsの伝統的なアプローチを維持しながら、JavaScriptをほとんど書かずにSPAのような高速で動的なユーザー体験を実現するための野心的なフレームワークです。Rails 7からは標準のフロントエンドとして採用されています。

この記事では、Hotwireの中核をなす**Turbo**と**Stimulus**の基本的な概念と、それらを使ってどのようにアプリケーションが動的になるのかを解説します。

## Hotwireとは？ - HTML Over The Wire

Hotwireという名前は「**HTML Over The Wire**」の略です。その名の通り、サーバーとクライアント間でやり取りされるデータは、JSONではなく、レンダリング済みのHTMLが中心です。クライアント側のJavaScriptの役割は、サーバーから送られてきたHTMLで、ページの一部を賢く差し替えることに特化します。

これにより、開発者は使い慣れたサーバーサイドのテンプレート（ERBなど）でHTMLを生成することに集中でき、フロントエンドの複雑な状態管理から解放されます。

Hotwireは、主に以下の3つの技術で構成されています。

1.  **Turbo**: ページ遷移の高速化、フォーム送信の非同期化、ページの特定部分だけの更新などを自動的に行う心臓部。
2.  **Stimulus**: HTMLに直接JavaScriptの振る舞いを結びつけるための、控えめなJavaScriptフレームワーク。
3.  **Strada**: ネイティブアプリ（iOS/Android）とWebコンテンツを連携させるためのブリッジ。（この記事では主にTurboとStimulusに焦点を当てます）

## 1. Turbo: 魔法のような自動高速化

Turboは、Hotwireの屋台骨となる部分で、何もしなくてもアプリケーションを高速化してくれるいくつかの機能を提供します。

### Turbo Drive: リンククリックとフォーム送信を高速化

Rails 7で新規アプリケーションを作成すると、Turboはデフォルトで有効になっています。この状態でアプリケーションを動かすと、すべてのリンククリックとフォーム送信が自動的にAjaxリクエストに変換されます。

1.  ユーザーがリンクをクリックすると、Turbo Driveがそのリクエストをバックグラウンドで`fetch`します。
2.  サーバーは完全なHTMLページを返します。
3.  Turbo Driveは、受け取ったHTMLの`<body>`部分だけを現在のページの`<body>`と差し替え、`<head>`部分はマージします。

これにより、CSSやJavaScriptの再読み込み・再評価がスキップされ、まるでSPAのように高速なページ遷移が実現します。開発者は特別なコードを一行も書く必要がありません。

### Turbo Frames: ページの一部を独立して更新する

`turbo-frame`というカスタムHTMLタグでページの一部を囲むと、そのフレーム内でのリンククリックやフォーム送信は、フレームの外側に影響を与えずに、フレーム内だけを更新するようになります。

**例: 編集ボタンを押すと、フォームがその場で表示される**

**`show.html.erb`**
```erb
<%# "article_1" というIDを持つTurbo Frame %>
<%= turbo_frame_tag @article do %>
  <h1><%= @article.title %></h1>
  <p><%= @article.content %></p>

  <%= link_to "Edit this article", edit_article_path(@article) %>
<% end %>
```

**`edit.html.erb`**
```erb
<%# show.html.erbと同じIDを持つTurbo Frameで囲む %>
<%= turbo_frame_tag @article do %>
  <h1>Editing article</h1>

  <%= render "form", article: @article %>

  <%= link_to "Back to articles", articles_path %>
<% end %>
```

ユーザーが`show`ページで「Edit this article」リンクをクリックすると、Turboは`edit`アクションから返されるHTMLの中から、同じID（`article_1`）を持つ`<turbo-frame>`を探し出し、その中身だけを現在のページのフレームと差し替えます。これにより、ページ全体をリロードすることなく、インライン編集のようなUIが実現できます。

### Turbo Streams: WebSocketでリアルタイム更新

Turbo Streamsは、WebSocketやサーバーからのレスポンスを使って、複数のユーザーのページをリアルタイムに更新する機能です。例えば、チャットアプリで新しいメッセージが投稿されたときに、すべての参加者の画面にそのメッセージを追加する、といったことが可能になります。

コントローラやモデルから、特定のDOM要素に対して「追加（append）」「前に追加（prepend）」「置換（replace）」「削除（remove）」といった操作を指示するHTML（`<turbo-stream>`タグ）を送信します。

**`articles_controller.rb` の `create` アクション**
```ruby
def create
  @article = Article.new(article_params)
  respond_to do |format|
    if @article.save
      format.turbo_stream # turbo_stream形式のリクエストに応答
      format.html { redirect_to @article }
    else
      # ...
    end
  end
end
```

**`create.turbo_stream.erb`**
```erb
<%# "articles"というIDを持つDOM要素の末尾に、このパーシャルを追加する %>
<%= turbo_stream.append "articles", partial: "articles/article", locals: { article: @article } %>
```

## 2. Stimulus: ちょっとしたインタラクティブ機能の追加

Turboが自動化してくれる範囲を超える、よりインタラクティブな機能を実装したい場合に登場するのがStimulusです。

Stimulusは「控えめな」JavaScriptフレームワークです。HTMLに`data-*`属性を記述することで、特定のDOM要素とJavaScriptのコントローラクラスを結びつけます。

**例: ボタンをクリックすると、テキストフィールドの内容をクリップボードにコピーする**

**HTML**
```html
<div data-controller="clipboard">
  <input data-clipboard-target="source" type="text" value="Hello Stimulus!" readonly>
  <button data-action="click->clipboard#copy">Copy to Clipboard</button>
</div>
```

*   `data-controller="clipboard"`: この`<div>`全体を`clipboard`コントローラが管理することを示します。
*   `data-clipboard-target="source"`: この`<input>`を`source`という名前のターゲットとしてコントローラから参照できるようにします。
*   `data-action="click->clipboard#copy"`: この`<button>`がクリックされたら、`clipboard`コントローラの`copy`メソッドを呼び出すことを示します。

**JavaScript (`app/javascript/controllers/clipboard_controller.js`)**
```javascript
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ "source" ]

  copy() {
    navigator.clipboard.writeText(this.sourceTarget.value)
    alert("Copied!")
  }
}
```

このように、HTMLの構造を汚さずに、再利用可能なJavaScriptの振る舞いをコンポーネントとして追加できます。

## まとめ

Hotwireは、SPAの持つリッチなUXと、伝統的なサーバーサイドレンダリングの持つ生産性の高さを両立させることを目指したフレームワークです。

*   **Turbo**が、ページ遷移やフォーム送信の非同期化といった面倒な部分を自動で担当してくれる。
*   **Turbo Frames**と**Turbo Streams**を使えば、ページの一部を効率的に更新できる。
*   **Stimulus**を使えば、クライアントサイドのインタラクティブな機能を整理された形で追加できる。

Rails開発者であれば、JSON APIや複雑なフロントエンドのビルドプロセスを学ぶことなく、慣れ親しんだ方法で高速なWebアプリケーションを構築できます。もしあなたが「JavaScriptは少し苦手だけど、動的なUIは作りたい」と考えているなら、Hotwireはまさにうってつけの技術と言えるでしょう。
