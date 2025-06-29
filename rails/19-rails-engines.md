# Rails Engineを作成して、再利用可能なコンポーネントを開発する

## はじめに

複数のRailsプロジェクトを管理していると、「この認証システム、別のプロジェクトでも使いたいな」「このブログ機能、コンポーネントとして切り出せないだろうか」といった状況に直面することがあります。このような課題を解決するための強力な仕組みが**Rails Engine**です。

Rails Engineとは、一言で言えば「**親アプリケーションに組み込むことができる、ミニチュア版のRailsアプリケーション**」です。Engine自体がモデル、ビュー、コントローラ、ルーティングなどを持ち、独立した機能群を提供します。DeviseやForemといった多くの有名なgemも、実はRails Engineとして構築されています。

この記事では、簡単な「お知らせ」機能を持つRails Engineをゼロから作成し、それをホストとなるRailsアプリケーションに組み込むまでの手順を解説します。Engineの作成を通じて、Railsアプリケーションのモジュール化と再利用性を高める方法を学びましょう。

## 1. Engineの新規作成

まず、Railsのプラグインジェネレータを使って、Engineの雛形を作成します。`--mountable`オプションを付けるのがポイントです。

```bash
# Railsアプリケーションのディレクトリの外で実行
rails plugin new simple_announcer --mountable
```

*   **`--mountable`**: このオプションを付けると、Engineが自身の名前空間で隔離された「マウント可能」なEngineとして作成されます。これにより、親アプリケーションのコードとの名前衝突を防ぐことができます。ブログ機能など、自己完結した機能をカプセル化する場合は、このオプションがほぼ必須です。

コマンドを実行すると、`simple_announcer`というディレクトリが作成されます。中身は`app`, `config`, `lib`など、見慣れたRailsアプリケーションの構造によく似ています。

## 2. Engine内で機能を開発する

次に、作成したEngineのディレクトリに移動し、通常のRailsアプリケーションと同じように機能を開発していきます。ここでは、タイトルと本文を持つ`Announcement`モデルをScaffoldで作成してみましょう。

```bash
cd simple_announcer
rails g scaffold Announcement title:string body:text published:boolean
```

これにより、Engine内にモデル、ビュー、コントローラ、マイグレーションが生成されます。

*   **モデル**: `app/models/simple_announcer/announcement.rb`
*   **コントローラ**: `app/controllers/simple_announcer/announcements_controller.rb`
*   **ビュー**: `app/views/simple_announcer/announcements/`

すべてのクラス名やモジュール名が`SimpleAnnouncer::`という名前空間でラップされ、親アプリケーションの同名のクラス（例えば`Announcement`）との衝突が避けられている点に注目してください。

Engineのルーティングファイルも自動で更新されます。

```ruby
# simple_announcer/config/routes.rb
SimpleAnnouncer::Engine.routes.draw do
  resources :announcements
end
```

## 3. 親アプリケーションにEngineを組み込む

開発したEngineを、実際に利用する側のRailsアプリケーション（ホストアプリケーション）に組み込みます。

### ステップ1: GemfileでEngineを指定

ホストアプリケーションの`Gemfile`に、開発中のEngineを`path`オプションで指定します。

```ruby
# Gemfile
gem 'simple_announcer', path: '../simple_announcer'
```

`bundle install`を実行して、Engineをインストールします。

### ステップ2: Engineをマウント

ホストアプリケーションのルーティングファイル（`config/routes.rb`）を編集し、Engineを特定のエンドポイントに「マウント」します。

```ruby
# config/routes.rb
Rails.application.routes.draw do
  # ... 他のルート ...

  # "/announcements" というパスに、SimpleAnnouncer Engineをマウントする
  mount SimpleAnnouncer::Engine => "/announcements"
end
```

これにより、`/announcements`以下のURLへのリクエストが、`SimpleAnnouncer` Engineによって処理されるようになります。

### ステップ3: マイグレーションの実行

Engineが持つデータベースのマイグレーションを、ホストアプリケーションにコピーして実行する必要があります。

まず、以下のコマンドでマイグレーションファイルをコピーします。

```bash
rails simple_announcer:install:migrations
```

このコマンドは、Engineの`db/migrate`ディレクトリから、ホストアプリケーションの`db/migrate`ディレクトリにマイグレーションファイルをコピーします。

コピーが完了したら、通常通りマイグレーションを実行します。

```bash
rails db:migrate
```

これで、ホストアプリケーションのデータベースに`simple_announcer_announcements`テーブルが作成されます。

## 4. 動作確認

すべての設定が完了しました。ホストアプリケーションのサーバーを起動します。

```bash
rails server
```

ブラウザで `http://localhost:3000/announcements` にアクセスしてみてください。Engineで作成したScaffoldの画面が表示され、お知らせの作成、表示、編集、削除ができるはずです。

この「お知らせ」機能は、完全に自己完結したコンポーネントとして、他のどのRailsアプリケーションにも同じ手順で簡単に組み込むことができます。

## Engineのカスタマイズ

Rails Engineの強力な点の一つは、ホストアプリケーション側でEngineのビューやコントローラを簡単に上書き（オーバーライド）できることです。例えば、Engineが提供するお知らせ一覧ページのデザインを、ホストアプリケーションのレイアウトに合わせたい場合、ホストアプリケーション側の`app/views/simple_announcer/announcements/index.html.erb`に新しいビューファイルを作成するだけで、Engineのデフォルトのビューが上書きされます。

## まとめ

Rails Engineは、Railsアプリケーションのコードをモジュール化し、再利用性を高めるためのパワフルなツールです。

*   **`rails plugin new --mountable`** で再利用可能なEngineの雛形を作成する。
*   Engine内でモデル、ビュー、コントローラを開発する。
*   ホストアプリケーションの`Gemfile`でEngineを読み込み、`routes.rb`で**マウント**する。
*   Engineのマイグレーションをホストアプリケーションにコピーして実行する。

複数のアプリケーションで共通して利用する機能や、巨大なアプリケーションを機能単位で分割したい場合に、Rails Engineの導入は非常に有効な選択肢となります。独自の認証システムやCMS機能など、再利用可能なコンポーネントをEngineとして開発・管理することで、開発効率を大幅に向上させることができるでしょう。
