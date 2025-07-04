# Ruby on Railsの基礎

Ruby on Railsは、Rubyで書かれたオープンソースのWebアプリケーションフレームワークです。MVC（Model-View-Controller）アーキテクチャに基づいており、迅速な開発を促進するための規約を提供します。

## Railsの哲学

Railsは「設定より規約（CoC）」と「Don't Repeat Yourself（DRY）」という2つの重要な哲学に基づいています。

-   **設定より規約（Convention over Configuration）**: 開発者は、規約に従うことで、設定ファイルを書く手間を省くことができます。例えば、`posts`という名前のコントローラは、自動的に`Post`という名前のモデルと`posts`という名前のビューディレクトリにマッピングされます。
-   **Don't Repeat Yourself（DRY）**: 同じコードを繰り返し書くことを避け、コードの再利用性を高めることを目指します。

## Railsの主要コンポーネント

Railsは、以下の主要なコンポーネントで構成されています。

-   **Action Pack**: Action ControllerとAction Viewを含み、リクエストの処理とレスポンスの生成を担当します。
-   **Active Record**: データベースとのやり取りを抽象化するORM（Object-Relational Mapping）ライブラリです。
-   **Action Mailer**: メールの送信と受信を処理します。
-   **Active Job**: バックグラウンドジョブの実行をサポートします。
-   **Action Cable**: WebSocketを介したリアルタイム通信を可能にします。
-   **Active Storage**: ファイルのアップロードと管理を容易にします。

## Railsアプリケーションの作成

新しいRailsアプリケーションを作成するには、以下のコマンドを実行します。

```bash
gem install rails
rails new myapp
cd myapp
```

## サーバーの起動

Railsアプリケーションを起動するには、以下のコマンドを実行します。

```bash
bin/rails server
```

これにより、デフォルトで`http://localhost:3000`でアクセス可能なWebサーバーが起動します。

## まとめ

Ruby on Railsは、強力な規約と豊富な機能セットにより、Webアプリケーション開発を効率化します。この基礎を理解することで、より複雑なアプリケーションの開発に進むことができます。
