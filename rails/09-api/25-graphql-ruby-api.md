# GraphQL APIを`graphql-ruby` gemで構築する

## はじめに

RESTは長年にわたりAPI設計のデファクトスタンダードでしたが、クライアント側の要求が多様化・複雑化するにつれて、いくつかの課題が明らかになってきました。例えば、クライアントが必要なデータを一度に取得できずに複数のリクエストを送信しなければならない「アンダーフェッチング」や、逆に不要なデータまで取得してしまう「オーバーフェッチング」といった問題です。

**GraphQL**は、これらの課題を解決するためにFacebook（現Meta）によって開発された、APIのためのクエリ言語および実行環境です。クライアントが「必要なデータの構造」をリクエストとして送信し、サーバーはまさにその通りの構造でデータを返すという、非常に柔軟で効率的なAPIを実現します。

この記事では、Ruby on RailsでGraphQL APIを構築するための定番ライブラリである**`graphql-ruby`** gemを使い、基本的なAPI（クエリとミューテーション）を構築する手順を解説します。

## GraphQLの主な特徴

*   **クライアント主導のデータ取得**: クライアントが必要なフィールドを明示的に指定するため、オーバー/アンダーフェッチングが起こりません。
*   **単一のエンドポイント**: 通常、`/graphql`のような単一のエンドポイントにすべてのリクエストを`POST`します。リソースごとにURLが分かれているRESTとは対照的です。
*   **強力な型システム**: APIのスキーマ（データの構造）が厳密に型定義されます。これにより、APIの仕様が自己文書化され、開発ツールによる支援も受けやすくなります。

## 1. `graphql-ruby`のセットアップ

まず、`Gemfile`に`graphql-ruby`を追加してインストールします。

```ruby
# Gemfile
gem 'graphql'
```

```bash
bundle install
```

次に、`graphql-ruby`が提供するインストールジェネレータを実行します。

```bash
rails generate graphql:install
```

このコマンドは、GraphQL APIの骨格となる多数のファイルを生成します。

*   **`app/graphql/`**: GraphQL関連のコードがすべてここに配置されます。
*   **`app/graphql/types/query_type.rb`**: データの読み取り（Read）操作を定義するルートオブジェクトです。
*   **`app/graphql/types/mutation_type.rb`**: データの書き込み（Create, Update, Delete）操作を定義するルートオブジェクトです。
*   **`app/controllers/graphql_controller.rb`**: すべてのGraphQLリクエストを受け取る単一のエンドポイントとなるコントローラです。
*   **GraphiQLの組み込み**: 開発中にAPIを対話的にテストできる便利なWebインターフェース（`/graphiql`）が利用可能になります。

## 2. クエリ（Query）の構築: データを読み取る

それでは、ブログの記事（`Article`）を取得するクエリを作成してみましょう。（`Article`モデルは作成済みとします）

### ステップ1: Article Typeの作成

まず、`Article`モデルのデータをGraphQLの世界に公開するための「型（Type）」を定義します。ジェネレータを使うと便利です。

```bash
rails g graphql:object Article
```

生成された`app/graphql/types/article_type.rb`を編集します。

```ruby
# app/graphql/types/article_type.rb
module Types
  class ArticleType < Types::BaseObject
    field :id, ID, null: false
    field :title, String, null: true
    field :content, String, null: true
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false
  end
end
```

`field`メソッドを使って、クライアントに公開したいカラムとその型を定義します。

### ステップ2: Query Typeにフィールドを追加

次に、ルートクエリオブジェクトである`QueryType`に、記事を取得するためのフィールドを追加します。

```ruby
# app/graphql/types/query_type.rb
module Types
  class QueryType < Types::BaseObject
    # すべての記事を取得するフィールド
    field :articles, [Types::ArticleType], null: false

    def articles
      Article.all
    end

    # IDを指定して単一の記事を取得するフィールド
    field :article, Types::ArticleType, null: true do
      argument :id, ID, required: true
    end

    def article(id:)
      Article.find_by(id: id)
    end
  end
end
```

*   **`field :articles, [Types::ArticleType], null: false`**: `articles`という名前のフィールドを定義します。返り値は`ArticleType`の配列（`[]`で囲む）で、`null`は許可しません。
*   **`def articles`**: 上記フィールドがリクエストされたときに実行されるリゾルバメソッドです。ここで`Article.all`を返すことで、すべての記事がクライアントに渡されます。
*   **`field :article, ... do ... end`**: `article`フィールドを定義し、`argument`で`id`という必須の引数を取ることを示します。
*   **`def article(id:)`**: 引数付きで呼び出されるリゾルバメソッドです。

### ステップ3: GraphiQLでテスト

`rails s`でサーバーを起動し、ブラウザで`http://localhost:3000/graphiql`にアクセスします。左側のペインにクエリを書き、実行ボタンを押すと、右側に結果が表示されます。

**クエリ例1: 全記事のタイトルを取得**
```graphql
query {
  articles {
    id
    title
  }
}
```

**クエリ例2: IDが1の記事の内容を取得**
```graphql
query {
  article(id: "1") {
    title
    content
    createdAt
  }
}
```

## 3. ミューテーション（Mutation）の構築: データを変更する

次に、新しい記事を作成するためのミューテーションを実装します。

### ステップ1: Mutationの作成

ここでもジェネレータが便利です。

```bash
rails g graphql:mutation CreateArticle
```

生成された`app/graphql/mutations/create_article.rb`を編集します。

```ruby
# app/graphql/mutations/create_article.rb
module Mutations
  class CreateArticle < BaseMutation
    # 引数を定義
    argument :title, String, required: true
    argument :content, String, required: true

    # 返り値のフィールドを定義
    field :article, Types::ArticleType, null: false
    field :errors, [String], null: false

    # リゾルバメソッド
    def resolve(title:, content:)
      article = Article.new(title: title, content: content)
      if article.save
        # 成功した場合、作成された記事と空のエラー配列を返す
        { article: article, errors: [] }
      else
        # 失敗した場合、nilの記事とエラーメッセージを返す
        { article: nil, errors: article.errors.full_messages }
      end
    end
  end
end
```

### ステップ2: Mutation Typeにフィールドを追加

`app/graphql/types/mutation_type.rb`に、作成したミューテーションをフィールドとして追加します。

```ruby
# app/graphql/types/mutation_type.rb
module Types
  class MutationType < Types::BaseObject
    field :create_article, mutation: Mutations::CreateArticle
  end
end
```

### ステップ3: GraphiQLでテスト

GraphiQLで以下のミューテーションを実行してみましょう。

```graphql
mutation {
  createArticle(input: { title: "GraphQLはすごい", content: "ミューテーションも簡単！" }) {
    article {
      id
      title
    }
    errors
  }
}
```

成功すれば、新しく作成された記事の`id`と`title`が返ってきます。

## まとめ

`graphql-ruby` gemは、Railsアプリケーションに型安全で柔軟なGraphQL APIを導入するための堅牢な基盤を提供します。

*   **スキーマファースト**: `Types`を定義することで、APIの仕様が明確になります。
*   **クエリ**: `QueryType`にフィールドとリゾルバを追加して、データ読み取りAPIを構築します。
*   **ミューテーション**: `Mutation`クラスを作成し、`MutationType`に登録することで、データ書き込みAPIを構築します。
*   **GraphiQL**: 開発中にAPIを対話的に試せる、非常に強力なツールです。

REST APIの課題を感じている、あるいはよりモダンで柔軟なAPIをクライアントに提供したいと考えているなら、GraphQLと`graphql-ruby`は非常に有力な選択肢となるでしょう。
