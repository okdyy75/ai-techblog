# Active Recordの基礎

Active Recordは、Ruby on Railsに組み込まれたORM（Object-Relational Mapping）ライブラリです。データベースのテーブルをRubyのクラスに、テーブルの行をRubyのオブジェクトにマッピングすることで、データベース操作を直感的に行うことができます。

## Active Recordの役割

-   **モデルとデータベースの関連付け**: `Post`モデルは`posts`テーブルに関連付けられます。
-   **CRUD操作**: `create`, `read`, `update`, `delete`といったデータベース操作をRubyのメソッドで実行できます。
-   **アソシエーション**: モデル間の関連（`has_many`, `belongs_to`など）を定義できます。
-   **バリデーション**: モデルの属性に対して、データの整合性を保つための検証ルールを設定できます。
-   **マイグレーション**: データベーススキーマの変更をバージョン管理できます。

## モデルの作成

Active Recordモデルを作成するには、`rails generate model`コマンドを使用します。

```bash
bin/rails generate model Post title:string body:text
```

これにより、`app/models/post.rb`ファイルと、`db/migrate`ディレクトリにマイグレーションファイルが生成されます。

```ruby
# app/models/post.rb
class Post < ApplicationRecord
end
```

## CRUD操作

### Create（作成）

```ruby
post = Post.new(title: "Hello World", body: "This is my first post.")
post.save

# または
Post.create(title: "Hello World", body: "This is my first post.")
```

### Read（読み取り）

```ruby
# すべての投稿を取得
posts = Post.all

# IDで投稿を検索
post = Post.find(1)

# 条件に一致する最初の投稿を検索
post = Post.find_by(title: "Hello World")

# 条件に一致するすべての投稿を検索
posts = Post.where(title: "Hello World")
```

### Update（更新）

```ruby
post = Post.find(1)
post.update(title: "New Title")
```

### Delete（削除）

```ruby
post = Post.find(1)
post.destroy
```

## アソシエーション

モデル間の関連を定義することで、関連するオブジェクトを簡単に操作できます。

```ruby
# app/models/author.rb
class Author < ApplicationRecord
  has_many :posts
end

# app/models/post.rb
class Post < ApplicationRecord
  belongs_to :author
end
```

これにより、`author.posts`や`post.author`のように、関連するオブジェクトにアクセスできます。

## まとめ

Active Recordは、データベース操作を抽象化し、Rubyライクなインターフェースを提供することで、開発の生産性を大幅に向上させます。