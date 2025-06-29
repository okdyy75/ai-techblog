# Rails7対応！`rails new`から始めるブログアプリケーション開発チュートリアル

## はじめに

この記事では、Ruby on Rails 7を使用して、ゼロから簡単なブログアプリケーションを作成する手順を解説します。Railsの基本を学びながら、モダンなWebアプリケーション開発の流れを体験していきましょう。

### 対象読者

*   Ruby on Railsを学び始めたばかりの方
*   `rails new`コマンドの基本的な使い方を理解したい方
*   CRUD（Create, Read, Update, Delete）機能を持つアプリケーションの作り方を知りたい方

### 開発環境

*   Ruby 3.1.2 (またはそれ以降)
*   Rails 7.0.4 (またはそれ以降)
*   SQLite3

## 1. Railsプロジェクトの新規作成

まず、ターミナルを開き、以下のコマンドを実行して新しいRailsアプリケーションを作成します。

```bash
rails new simple_blog
```

このコマンドにより、`simple_blog`という名前のディレクトリが作成され、Railsアプリケーションの基本的なファイル群が生成されます。

完了したら、作成されたディレクトリに移動します。

```bash
cd simple_blog
```

## 2. Articleモデルの作成

次に、ブログ記事を保存するための`Article`モデルを作成します。Railsでは`scaffold`ジェネレータを使うと、モデル、ビュー、コントローラ、ルーティングを一度に生成できて便利です。

```bash
rails generate scaffold Article title:string content:text
```

このコマンドは以下のものを生成します。

*   **`Article`モデル**: `title`（文字列）と`content`（テキスト）という2つの属性を持つ。
*   **`ArticlesController`**: 記事のCRUD操作（作成、一覧表示、詳細表示、更新、削除）を行うためのアクションを持つ。
*   **ビューファイル**: 記事の入力フォームや一覧ページなどのHTMLテンプレート。
*   **データベースのマイグレーションファイル**: `articles`テーブルを作成するための設計図。
*   **ルーティング**: `config/routes.rb`に`resources :articles`が追加され、記事に関連するURLが定義される。

## 3. データベースのマイグレーション

`scaffold`で作成されたマイグレーションファイルを使って、データベースに`articles`テーブルを作成します。

```bash
rails db:migrate
```

このコマンドを実行すると、`db/migrate/`ディレクトリ内のまだ実行されていないマイグレーションが実行され、データベースのスキーマが更新されます。

## 4. アプリケーションの起動と確認

これでブログアプリケーションの基本的な機能が整いました。Railsサーバーを起動して、実際に動作を確認してみましょう。

```bash
rails server
```

サーバーが起動したら、Webブラウザで `http://localhost:3000/articles` にアクセスしてください。

以下のような画面が表示されるはずです。

*   **記事一覧ページ** (`/articles`)
*   **"New article"** リンクをクリックすると、新しい記事を作成するフォームが表示されます。

実際に記事をいくつか作成、編集、削除してみて、CRUD機能が正しく動作することを確認しましょう。

## 5. ルートURLの設定

現在、アプリケーションのトップページ（`http://localhost:3000`）にはRailsのデフォルトページが表示されます。これを、作成したブログの記事一覧ページに変更しましょう。

`config/routes.rb` ファイルを開き、以下のように編集します。

```ruby
Rails.application.routes.draw do
  # この行を追加
  root "articles#index"

  resources :articles
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  # root "articles#index"
end
```

`root "articles#index"` を追加することで、`ArticlesController`の`index`アクション（記事一覧ページ）がアプリケーションのルートURLに設定されます。

ファイルを保存してブラウザで `http://localhost:3000` にアクセスし直すと、記事一覧ページが表示されるようになります。

## まとめ

お疲れ様でした！本記事では、`rails new`から始めて、`scaffold`を使い、簡単なブログアプリケーションを素早く立ち上げる方法を学びました。

ここからさらに、以下のような機能拡張に挑戦してみるのも良いでしょう。

*   記事にコメントを追加する機能
*   ユーザー認証機能（Devise gemなど）
*   デザインをCSSフレームワーク（Bootstrapなど）で整える

この記事が、あなたのRails学習の第一歩となれば幸いです。
