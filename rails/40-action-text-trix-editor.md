# 40. Action Text入門: Trix Editorを使ったリッチテキスト編集機能

## はじめに

ブログ記事や商品詳細ページ、コメント機能など、Webアプリケーションではリッチテキスト（太字、斜体、リスト、画像埋め込みなど）を扱いたい場面が頻繁にあります。これを自前で実装するのは非常に複雑ですが、Rails 6から導入された **Action Text** を使えば、驚くほど簡単に高機能なリッチテキスト編集機能をアプリケーションに統合できます。

Action Textは、WYSIWYG（What You See Is What You Get）エディタである **Trix Editor** をバックエンドのActive Recordモデルとシームレスに連携させ、画像のアップロードや管理（Active Storageを利用）までを一括で提供します。

本記事では、Action Textを導入し、モデルにリッチテキストコンテンツを持たせ、Trix Editorで編集する基本的な方法を解説します。

## この記事で学べること

- Action Textのインストールとセットアップ方法
- モデルにリッチテキスト属性を追加する方法
- `rich_text_area` フォームヘルパーを使ったTrix Editorの表示
- リッチテキストコンテンツの安全な表示方法

## 1. Action Textのインストール

Action Textは、内部でActive Storageを使用して画像のアップロードや添付を管理します。そのため、先にActive Storageのセットアップが必要です。

1.  **Active Storageのインストール**: まだ設定していない場合は、以下のコマンドを実行します。
    ```bash
    rails active_storage:install
    rails db:migrate
    ```

2.  **Action Textのインストール**: 次に、Action Textをインストールします。
    ```bash
    rails action_text:install
    rails db:migrate
    ```
    このコマンドは、Action Textが必要とするテーブル（`action_text_rich_texts`）を作成し、JavaScriptのエントリーポイント（`app/javascript/application.js`）に必要なモジュールをインポートします。

    `action_text:install` は、`@rails/actiontext` と `trix` というnpmパッケージへの依存関係を `package.json` に追加します。`yarn install` を実行して、これらのパッケージをインストールしてください。

    ```bash
    yarn install
    ```

## 2. モデルへのリッチテキスト属性の追加

モデルにリッチテキストの機能を追加するのは非常に簡単です。例として、`Article` モデルに `content` というリッチテキスト属性を追加してみましょう。

`app/models/article.rb` を編集します。

```ruby:app/models/article.rb
class Article < ApplicationRecord
  has_rich_text :content
end
```

たったこれだけです。`has_rich_text` メソッドを呼び出すだけで、`content` という名前のリッチテキスト属性が `Article` モデルに関連付けられます。`articles` テーブル自体にカラムを追加する必要はありません。Action Textは、`ActionText::RichText` という専用のモデルを介して、ポリモーフィック関連を使ってコンテンツを `action_text_rich_texts` テーブルに保存します。

## 3. フォームでのTrix Editorの利用

次に、記事の作成・編集フォームでTrix Editorを使えるようにします。`form_with` の中で、`text_area` の代わりに `rich_text_area` ヘルパーを使用します。

`app/views/articles/_form.html.erb` を編集します。

```erb:app/views/articles/_form.html.erb
<%= form_with(model: article) do |form| %>
  <%# ... error messages ... %>

  <div class="field">
    <%= form.label :title %>
    <%= form.text_field :title %>
  </div>

  <div class="field">
    <%= form.label :content %>
    <%= form.rich_text_area :content %>
  </div>

  <div class="actions">
    <%= form.submit %>
  </div>
<% end %>
```

コントローラ側では、`Strong Parameters` で `:content` を許可することを忘れないでください。

```ruby:app/controllers/articles_controller.rb
def article_params
  params.require(:article).permit(:title, :content)
end
```

これで、記事のフォームを開くと、ツールバー付きのTrix Editorが表示されるようになります。ユーザーはテキストを装飾したり、画像をドラッグ＆ドロップでアップロードしたりできます。

## 4. リッチテキストコンテンツの表示

保存されたリッチテキストコンテンツをビューに表示するのは、通常の属性と同じです。

`app/views/articles/show.html.erb` を編集します。

```erb:app/views/articles/show.html.erb
<h1><%= @article.title %></h1>

<div class="trix-content">
  <%= @article.content %>
</div>
```

Action Textは、コンテンツを表示する際にサニタイズ（危険なHTMLタグの除去）を自動的に行ってくれるため、XSS（クロスサイトスクリプティング）攻撃のリスクなしに安全にコンテンツを描画できます。

`trix-content` クラスを持つ `div` で囲むと、Trix Editorのデフォルトスタイルが適用され、リストや見出しなどが編集時と同じように表示されます。このスタイルは `actiontext.css` で定義されており、`action_text:install` によって `app/assets/stylesheets/actiontext.css` にコピーされるので、必要に応じてカスタマイズも可能です。

## 5. 画像の扱い

ユーザーがTrix Editorに画像をドラッグ＆ドロップすると、Action Textは裏側でActive Storageを使って画像をアップロードし、`ActiveStorage::Blob` レコードを作成します。そして、そのBlobへの参照を `<action-text-attachment>` というカスタムタグを使ってリッチテキスト内に埋め込みます。

表示時には、このカスタムタグが画像を表示するための `<img>` タグに変換されます。この一連の流れがすべて自動で行われるため、開発者は画像アップロードの複雑なロジックを意識する必要がありません。

## まとめ

Action Textは、Railsに高機能なリッチテキスト編集機能を驚くほど簡単に追加できる、非常に強力なフレームワークです。

- **簡単なセットアップ**: いくつかのコマンドを実行し、モデルに1行追加するだけで導入できる。
- **Trix Editorの統合**: シンプルで使いやすいWYSIWYGエディタがすぐに使える。
- **Active Storageとの連携**: 画像のアップロード、保存、表示がシームレスに行われる。
- **セキュリティ**: コンテンツは自動でサニタイズされ、安全に表示される。

これまで外部のJavaScriptライブラリや自前の実装で苦労していたリッチテキスト機能が、Railsの標準機能としてここまでシンプルに実装できるようになったのは画期的です。ぜひAction Textを活用して、表現力豊かなアプリケーションを構築してください。