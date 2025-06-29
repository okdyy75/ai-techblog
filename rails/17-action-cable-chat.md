# Action Cableを使ってリアルタイムなチャット機能を実装する

## はじめに

通知、ライブコメント、株価の更新、そしてチャット。現代のWebアプリケーションでは、ページをリロードすることなくサーバーからの情報をリアルタイムに受け取る機能がますます重要になっています。この双方向の継続的な通信を実現する技術が**WebSocket**です。

Ruby on Railsでは、**Action Cable**というフレームワークが標準で統合されており、WebSocketを使ったリアルタイム機能をRailsの流儀でエレガントに実装することができます。この記事では、Action Cableの基本的な仕組みを解説し、ステップ・バイ・ステップで簡単なリアルタイムチャットアプリケーションを構築します。

## Action Cableの構成要素

Action Cableは、サーバーサイドとクライアントサイドの両方で連携して動作します。主に以下の要素で構成されています。

*   **Connections（接続）**: サーバーとクライアント間のWebSocket接続全体を管理します。ユーザー認証や認可はここで行われます。1ユーザーにつき1つのコネクションが確立されます。
*   **Channels（チャネル）**: 特定のロジックをカプセル化する単位で、コントローラに似た役割を持ちます。例えば、「チャットルームA」「通知」といった単位でチャネルを作成します。クライアントは特定のチャネルを「購読（subscribe）」します。
*   **Pub/Sub（出版/購読）**: Action Cableは、バックエンドでRedisのPub/Sub機能を利用して、特定のチャネルにメッセージをブロードキャスト（出版）し、そのチャネルを購読しているすべてのクライアントにメッセージを配信します。
*   **Client-Side JavaScript**: Railsが提供するJavaScriptライブラリを使って、クライアント（ブラウザ）側でWebSocketサーバーに接続し、チャネルを購読し、データを受信・送信します。

## チャットアプリケーションの実装

それでは、特定のチャットルームに入室したユーザー間でリアルタイムにメッセージを交換できる機能を実装していきましょう。

### ステップ1: Channelの生成

まず、Railsのジェネレータを使って、チャットルーム用のチャネルを作成します。

```bash
rails generate channel Room
```

このコマンドは、2つのファイルを生成します。

1.  **`app/channels/room_channel.rb`**: サーバーサイドのチャネルクラス。
2.  **`app/javascript/channels/room_channel.js`**: クライアントサイドでこのチャネルに接続するためのJavaScriptファイル。

### ステップ2: サーバーサイドチャネルの設定 (`room_channel.rb`)

`RoomChannel`は、クライアントがこのチャネルを購読したときや、クライアントからデータが送られてきたときに何をするかを定義します。

```ruby
# app/channels/room_channel.rb
class RoomChannel < ApplicationCable::Channel
  # クライアントがチャネルの購読を開始したときに呼ばれる
  def subscribed
    # "room_channel" という名前のストリームからブロードキャストを受信する
    stream_from "room_channel"
  end

  # クライアントがチャネルの購読を停止したときに呼ばれる
  def unsubscribed
    # Any cleanup needed when channel is unsubscribed
  end

  # クライアント側から呼び出されるメソッド
  def speak(data)
    # 受け取ったデータをそのまま "room_channel" ストリームにブロードキャストする
    ActionCable.server.broadcast "room_channel", message: data['message']
  end
end
```

*   **`subscribed`**: クライアントが接続すると、`stream_from "room_channel"`が実行されます。これにより、このクライアントは`"room_channel"`という名前のストリームで配信されるすべてのメッセージを受け取るようになります。
*   **`speak(data)`**: 後述するクライアントサイドJSから`speak`アクションが呼び出されると、このメソッドが実行されます。受け取った`data`（メッセージ内容）を、`ActionCable.server.broadcast`を使って、`"room_channel"`を購読しているすべてのクライアントに送信します。

### ステップ3: クライアントサイドJavaScriptの設定 (`room_channel.js`)

次に、クライアント側でチャネルに接続し、メッセージの送受信を行うためのJavaScriptを記述します。

```javascript
// app/javascript/channels/room_channel.js
import consumer from "./consumer"

const roomChannel = consumer.subscriptions.create("RoomChannel", {
  connected() {
    // サーバーとの接続が確立したときに呼ばれる
    console.log("Connected to the room channel!");
  },

  disconnected() {
    // サーバーとの接続が切断されたときに呼ばれる
  },

  received(data) {
    // サーバーからデータがブロードキャストされたときに呼ばれる
    // 受け取ったメッセージをチャットエリアに追加する
    const messages = document.getElementById('messages');
    messages.innerHTML += `<p>${data.message}</p>`;
  },

  speak: function(message) {
    // サーバーサイドのspeakメソッドを呼び出す
    return this.perform('speak', { message: message });
  }
});

// DOMが読み込まれた後でイベントリスナーを設定
window.addEventListener("load", () => {
  const input = document.getElementById('chat-input');
  const button = document.getElementById('send-button');

  const sendMessage = () => {
    const message = input.value;
    if (message.trim() !== '') {
      roomChannel.speak(message);
      input.value = '';
    }
  };

  button.addEventListener("click", sendMessage);
  input.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  });
});
```

*   **`consumer.subscriptions.create("RoomChannel", { ... })`**: `RoomChannel`を購読します。
*   **`received(data)`**: サーバーからメッセージがブロードキャストされると、この関数が実行されます。引数`data`には、`speak`メソッドでブロードキャストされたハッシュ（`{ message: ... }`）が入っています。ここでは、受け取ったメッセージを画面に表示する処理を記述します。
*   **`speak(message)`**: `this.perform('speak', ...)`を使って、サーバーサイドの`RoomChannel#speak`メソッドを呼び出し、メッセージデータを送信します。
*   **イベントリスナー**: 入力フィールドでEnterキーが押されるか、送信ボタンがクリックされたときに、`roomChannel.speak()`を呼び出してメッセージを送信します。

### ステップ4: ビューの作成

最後に、チャットのUIとなる簡単なHTMLを用意します。

**`app/views/rooms/show.html.erb`** (このビューを表示するためのコントローラとルートは別途作成してください)
```erb
<h1>Chat Room</h1>

<div id="messages" style="height: 200px; border: 1px solid #ccc; overflow-y: scroll; padding: 10px;">
  <%# メッセージはここにリアルタイムで追加される %>
</div>

<div id="input-area" style="margin-top: 10px;">
  <input type="text" id="chat-input" size="50">
  <button id="send-button">Send</button>
</div>
```

## 動作確認

1.  `rails server`でPumaサーバーを起動します。
2.  ブラウザのタブを2つ開き、両方でチャットページ（例: `http://localhost:3000/room/show`）にアクセスします。
3.  片方のタブでメッセージを入力して送信すると、もう片方のタブにもメッセージがリアルタイムで表示されるはずです。

## まとめ

Action Cableは、WebSocketの複雑な詳細を隠蔽し、Rails開発者が慣れ親しんだ方法でリアルタイム機能を構築できるようにしてくれます。

*   **`rails g channel`** でサーバーとクライアントの雛形を作成する。
*   **サーバーサイド (`..._channel.rb`)**: `stream_from`で購読を開始し、`broadcast`でメッセージを配信する。
*   **クライアントサイド (`..._channel.js`)**: `create`で購読し、`received`でデータを受け取り、`perform`でデータを送信する。

この基本的な流れを理解すれば、チャットだけでなく、様々なリアルタイム機能をあなたのRailsアプリケーションに加えることができるようになります。
