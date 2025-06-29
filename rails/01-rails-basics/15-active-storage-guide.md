# Active Storage徹底活用: ローカルとクラウド（S3）へのファイルアップロード

## はじめに

現代のWebアプリケーションにおいて、ユーザーによるファイルアップロード機能（プロフィール画像、投稿写真、PDFドキュメントなど）はごく一般的です。Rails 5.2から標準機能として導入された**Active Storage**は、これらのファイルアップロードと添付を驚くほど簡単かつエレガントに実現してくれます。

この記事では、Active Storageの基本的な使い方から、開発環境でのローカルストレージ設定、そして本番環境で不可欠となるAmazon S3のようなクラウドストレージへの切り替えまで、実践的な手順を詳しく解説します。

## Active Storageとは？

Active Storageは、ファイルをクラウドストレージ（Amazon S3, Google Cloud Storage, Microsoft Azure Storageなど）やローカルディスクにアップロードし、そのファイルをActive Recordのモデルに添付するためのフレームワークです。

以前のRails開発でファイルアップロードによく使われていたCarrierWaveやPaperclipといったgemの機能を、Rails本体が公式にサポートするものと考えることができます。

### Active Storageの仕組み

Active Storageは、主に2つのテーブルを使ってファイルのメタデータを管理します。

*   **`active_storage_blobs`**: ファイルそのものの情報（ファイル名、コンテントタイプ、サイズ、チェックサムなど）を格納します。`blob`は"Binary Large Object"の略です。
*   **`active_storage_attachments`**: どのレコード（例: `User`モデルのインスタンス）にどの`blob`が添付されているか、という関連情報を格納する中間テーブルです。

この設計により、1つのファイル（blob）を複数のレコードに添付する、といった柔軟な運用も可能になっています。

## 1. セットアップ

Active Storageを使い始めるのは非常に簡単です。まず、ターミナルで以下のコマンドを実行します。

```bash
rails active_storage:install
```

このコマンドは、上記の`active_storage_blobs`と`active_storage_attachments`テーブルを作成するためのマイグレーションファイルを生成します。

次に、データベースにテーブルを作成します。

```bash
rails db:migrate
```

これだけで、Active Storageを利用するための基本的な準備は完了です。

## 2. ファイルをモデルに添付する

ここでは、`User`モデルにプロフィール画像（`avatar`）を添付する例を見ていきましょう。

### モデルの修正

`User`モデルに、ファイルが1つ添付されることを示す`has_one_attached`マクロを追加します。

```ruby
# app/models/user.rb
class User < ApplicationRecord
  has_one_attached :avatar
end
```

もし複数のファイルを添付したい場合（例: 1つの投稿に複数の写真）、`has_many_attached`を使います。

### コントローラとビューの修正

次に、ユーザー登録・編集フォームでアバター画像をアップロードできるようにします。

**コントローラ (`users_controller.rb`)**

Strong Parametersに`:avatar`を追加して、フォームからのファイルアップロードを許可します。

```ruby
private

def user_params
  params.require(:user).permit(:name, :email, :password, :password_confirmation, :avatar)
end
```

**ビュー (`_form.html.erb`)**

フォームに`file_field`を追加します。

```erb
<%= form_with(model: @user) do |form| %>
  <%# ... name, emailなどのフィールド ... %>

  <div class="field">
    <%= form.label :avatar %>
    <%= form.file_field :avatar %>
  </div>

  <div class="actions">
    <%= form.submit %>
  </div>
<% end %>
```

これだけで、ユーザーはフォームから画像ファイルを選択し、アップロードできるようになります。

## 3. 添付ファイルの表示

アップロードされた画像を表示するのも簡単です。ビューファイルで`image_tag`ヘルパーを使います。

```erb
<%# app/views/users/show.html.erb %>

<p>
  <strong>Name:</strong>
  <%= @user.name %>
</p>

<% if @user.avatar.attached? %>
  <p>
    <strong>Avatar:</strong>
    <%= image_tag @user.avatar, size: "100x100" %>
  </p>
<% end %>
```

*   **`@user.avatar.attached?`**: アバターが添付されているかどうかを確認します。
*   **`image_tag @user.avatar`**: Active Storageは、`image_tag`にモデルの添付ファイルを渡すと、適切な画像URLを自動的に生成してくれます。

## 4. クラウドストレージ（Amazon S3）への切り替え

開発中はローカルディスクへの保存で十分ですが、本番環境ではHerokuのようなPaaS上でファイルを永続化できない、あるいはスケーラビリティの問題から、Amazon S3のようなクラウドストレージを利用するのが一般的です。

Active Storageの素晴らしい点は、このストレージサービスの切り替えが非常にスムーズに行えることです。

### ステップ1: `aws-sdk-s3` gemの追加

`Gemfile`にAWS SDK for Rubyを追加します。

```ruby
# Gemfile
gem "aws-sdk-s3", require: false
```

`bundle install`を実行します。

### ステップ2: `storage.yml`の設定

`config/storage.yml`ファイルに、S3への接続情報を記述します。

```yaml
# config/storage.yml
test: ...
local: ...

amazon:
  service: S3
  access_key_id: ""
  secret_access_key: ""
  region: ap-northeast-1 # 例: 東京リージョン
  bucket: your-s3-bucket-name # あなたのS3バケット名
```

**重要**: `access_key_id`と`secret_access_key`をこのファイルに直接書き込むのはセキュリティ上非常に危険です。Rails 6から標準になった`credentials`（暗号化された資格情報管理）を使いましょう。

```bash
rails credentials:edit
```

エディタが開くので、以下のようにキーを記述します。

```yaml
aws:
  access_key_id: YOUR_AWS_ACCESS_KEY_ID
  secret_access_key: YOUR_AWS_SECRET_ACCESS_KEY
```

そして、`storage.yml`を以下のように修正します。

```yaml
amazon:
  service: S3
  access_key_id: <%= Rails.application.credentials.aws[:access_key_id] %>
  secret_access_key: <%= Rails.application.credentials.aws[:secret_access_key] %>
  region: ap-northeast-1
  bucket: your-s3-bucket-name
```

### ステップ3: 環境ごとの設定

最後に、どの環境でどのストレージサービスを利用するかを設定します。

**`config/environments/development.rb`** (開発環境)
```ruby
config.active_storage.service = :local
```

**`config/environments/production.rb`** (本番環境)
```ruby
config.active_storage.service = :amazon
```

これだけで設定は完了です。本番環境にデプロイすれば、ファイルは自動的にS3にアップロードされ、S3から配信されるようになります。アプリケーションのコード（モデル、ビュー、コントローラ）は一切変更する必要がありません。

## まとめ

Active Storageは、Railsにおけるファイルアップロードのデファクトスタンダードです。

*   **簡単なセットアップ**: `rails active_storage:install`ですぐに始められる。
*   **直感的なAPI**: `has_one_attached`や`file_field`で簡単にモデルとフォームを連携できる。
*   **柔軟なストレージ戦略**: `storage.yml`を設定するだけで、ローカルとクラウドストレージの切り替えが容易に行える。

ファイルアップロード機能の実装で悩んだら、まずはActive Storageの利用を検討してみてください。そのシンプルさとパワフルさが、開発体験を大きく向上させてくれるはずです。
