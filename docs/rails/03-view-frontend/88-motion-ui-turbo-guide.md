# Motion UIとTurboを連携させたリッチなUIアニメーション

## 概要

[Hotwire](https://hotwired.dev/) の [Turbo](https://turbo.hotwired.dev/) は、RailsアプリケーションにSPAのような高速なユーザー体験をもたらします。しかし、標準の機能だけでは、ページの一部が更新される際の味気ない表示切り替えになりがちです。ここに [Motion UI](https://get.foundation/sites/docs/motion-ui.html) のようなCSSアニメーションライブラリを組み合わせることで、UIの変更をより自然で魅力的なものにできます。

この記事では、TurboのStreamイベント（`turbo:before-stream-render`）をフックして、Motion UIによるアニメーションを適用する方法を解説します。具体的には、アイテム一覧に新しいアイテムが追加される際にフェードインするアニメーションを実装します。

## Motion UIのセットアップ

まず、Motion UIをRailsプロジェクトに導入します。

1.  **パッケージのインストール**:
    `yarn` または `npm` を使ってMotion UIをインストールします。

    ```bash
    yarn add motion-ui
    ```

2.  **CSSのインポート**:
    `app/assets/stylesheets/application.scss` でMotion UIのCSSをインポートします。

    ```scss
    // app/assets/stylesheets/application.scss

    @import "motion-ui/src/motion-ui";
    ```

    これにより、Motion UIが提供する組み込みのトランジション（`fade-in`, `slide-in-right` など）が利用可能になります。

## Turbo Streamと連携するStimulusコントローラ

次に、Turbo Streamのイベントをリッスンし、アニメーションを実行するStimulusコントローラを作成します。

```javascript
// app/javascript/controllers/stream_animation_controller.js

import { Controller } from "@hotwired/stimulus"
import { enter, leave } from "motion-ui"

export default class extends Controller {
  static values = {
    enterAnimation: { type: String, default: "fade-in" },
    leaveAnimation: { type: String, default: "fade-out" },
  }

  connect() {
    // ターゲット要素（Streamで追加/削除される要素）をリッスン
    this.element.addEventListener("turbo:before-stream-render", this.handleStream)
  }

  disconnect() {
    this.element.removeEventListener("turbo:before-stream-render", this.handleStream)
  }

  handleStream = (event) => {
    // 新しい要素が追加される場合
    if (event.target.action === "append" || event.target.action === "prepend") {
      const newElement = event.detail.newStream.firstElementChild
      if (newElement) {
        // アニメーションを実行
        enter(newElement, this.enterAnimationValue)
      }
    }
    // 要素が削除される場合
    else if (event.target.action === "remove") {
      const elementToRemove = document.getElementById(event.target.target)
      if (elementToRemove) {
        // デフォルトの削除処理をキャンセル
        event.preventDefault()
        // アニメーション付きで削除
        leave(elementToRemove, this.leaveAnimationValue, () => {
          elementToRemove.remove()
        })
      }
    }
  }
}
```

### コントローラの解説

-   **`static values`**:
    -   `enterAnimation`: 要素が追加される際のアニメーション名を指定します。デフォルトは `fade-in` です。
    -   `leaveAnimation`: 要素が削除される際のアニメーション名を指定します。デフォルトは `fade-out` です。
-   **`connect()` / `disconnect()`**:
    -   `turbo:before-stream-render` イベントをリスナーに登録・解除します。このイベントは、Turbo StreamがDOMを変更する直前に発火します。
-   **`handleStream(event)`**:
    -   `event.target.action` を見て、`append`（末尾追加）か `prepend`（先頭追加）かを判断します。
    -   `event.detail.newStream.firstElementChild` から、追加される新しいDOM要素を取得します。
    -   Motion UIの `enter()` 関数を呼び出し、指定されたアニメーション（`fade-in`）を適用します。
    -   `remove` アクションの場合は、`event.preventDefault()` でTurboのデフォルトの削除処理を止めます。
    -   `leave()` 関数で退場アニメーションを実行し、アニメーション完了後に要素をDOMから削除します。

## ビューでの利用

コントローラをビューで適用します。

```erb
<%# app/views/items/index.html.erb %>

<h1>アイテム一覧</h1>

<%= turbo_stream_from "items" %>

<div
  id="items"
  data-controller="stream-animation"
  data-stream-animation-enter-animation-value="fade-in"
  data-stream-animation-leave-animation-value="slide-out-right"
>
  <%= render @items %>
</div>

<%= link_to "新しいアイテムを追加", new_item_path %>
```

-   `turbo_stream_from "items"`: "items"チャネルからのStream更新を受け取ります。
-   `data-controller="stream-animation"`: Stimulusコントローラを `div#items` にアタッチします。
-   `data-stream-animation-enter-animation-value`: 追加時のアニメーションを `fade-in` に指定します。
-   `data-stream-animation-leave-animation-value`: 削除時のアニメーションを `slide-out-right` に指定します。

## コントローラとStreamテンプレート

アイテムを作成・削除するコントローラと、それに対応するTurbo Streamテンプレートです。

```ruby
# app/controllers/items_controller.rb

class ItemsController < ApplicationController
  def create
    @item = Item.create(item_params)

    respond_to do |format|
      format.turbo_stream
      format.html { redirect_to items_path }
    end
  end

  def destroy
    @item = Item.find(params[:id])
    @item.destroy

    respond_to do |format|
      format.turbo_stream
      format.html { redirect_to items_path }
    end
  end

  # ...
end
```

```erb
<%# app/views/items/create.turbo_stream.erb %>

<%= turbo_stream.append "items", @item %>
```

```erb
<%# app/views/items/destroy.turbo_stream.erb %>

<%= turbo_stream.remove @item %>
```

-   `create` アクションは、`items` というIDを持つ要素に新しい `@item` を追加（append）するStreamを返します。
-   `destroy` アクションは、対応するDOM IDを持つ要素を削除（remove）するStreamを返します。

## まとめ

TurboとMotion UIを組み合わせることで、RailsアプリケーションのUIを簡単かつ効果的にアニメーションさせることができます。`turbo:before-stream-render` イベントを活用すれば、DOMの変更を細かく制御し、ユーザーにとって心地よいフィードバックを提供できます。

今回紹介した `fade-in` や `slide-out-right` 以外にも、Motion UIは[豊富なアニメーション](https://get.foundation/sites/docs/motion-ui-transitions.html)を提供しています。ぜひ、ご自身のアプリケーションに最適なアニメーションを探してみてください。
