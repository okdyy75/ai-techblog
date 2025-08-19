# 【第3回】GraphQLのスキーマを徹底解説！型、リゾルバ、モックサーバー

前回はNode.jsとApollo Serverで簡単なGraphQLサーバーを構築しました。その中で登場した「スキーマ」と「リゾルバ」は、GraphQLサーバー開発の核となる要素です。今回は、この2つをさらに深く掘り下げ、より実践的なAPIを設計するための知識を学びます。

## スキーマ駆動開発という考え方

GraphQL開発は「**スキーマ駆動開発 (Schema-Driven Development)**」というアプローチを取ります。これは、まずAPIの仕様であるスキーマを定義し、そのスキーマを「唯一の信頼できる情報源 (Single Source of Truth)」として、フロントエンドとバックエンドの開発を並行して進める手法です。

スキーマさえ決まっていれば、バックエンドはリゾルバの実装に集中でき、フロントエンドは実際のAPIが完成する前から、モックデータを使ってUI開発を進めることができます。

## スキーマ定義言語 (SDL) をマスターする

スキーマはSDL (Schema Definition Language) を使って記述します。主要な要素を見ていきましょう。

### 1. 型 (Type)

APIで扱えるデータの単位を定義します。最も基本的なのは `type` キーワードで定義するオブジェクト型です。

```graphql
type Post {
  id: ID!
  title: String!
  content: String
  isPublished: Boolean!
}
```

### 2. スカラー型 (Scalar Types)

これ以上分解できない最小単位のデータ型です。GraphQLにはデフォルトで5つのスカラー型が組み込まれています。

- `Int`: 符号付き32ビット整数
- `Float`: 符号付き浮動小数点数
- `String`: UTF-8文字列
- `Boolean`: `true` または `false`
- `ID`: 一意な識別子を表す文字列。`String`と似ていますが、キャッシュ機構などで特別扱いされることがあります。

### 3. 修飾子 (Modifiers)

型の末尾につけることで、挙動を修飾します。

- **`!` (Non-Null)**: フィールドが必ず値を返さなければならないことを示します。`null`を許容しません。
- **`[]` (List)**: フィールドがその型の配列（リスト）を返すことを示します。

```graphql
# titleは必須（null不可）
# commentsはPostの配列を返す。配列自体はnullでも良い
type Post {
  title: String!
  comments: [Comment]
}

# commentsはPostの配列を返し、配列もその要素もnull不可
type Post {
  comments: [Comment!]!
}
```

### 4. クエリとミューテーション (Query & Mutation)

`Query`と`Mutation`は特別なオブジェクト型で、それぞれAPIの**読み取り**と**書き込み**の入り口（エントリーポイント）を定義します。

```graphql
type Query {
  # 投稿をIDで取得
  post(id: ID!): Post
  # 公開済みの投稿を全て取得
  publishedPosts: [Post!]!
}

type Mutation {
  # 新しい投稿を作成
  createPost(title: String!, content: String): Post!
}
```

## リゾルバの役割と親子関係

リゾルバは、スキーマで定義されたフィールドの値を返す関数です。前回は`Query`直下のフィールドに対するリゾルバのみを定義しましたが、**スキーマの全てのフィールドは対応するリゾルバを持つことができます**。

### 型のリレーションを解決する

前回作成したスキーマとリゾルバを拡張して、投稿（Post）と著者（User）の関連付けを実装してみましょう。

**1. スキーマの更新**
まず、`User`型を追加し、`Post`型に`author`フィールドを追加します。

```graphql
# index.js (typeDefs)
const typeDefs = `#graphql
  type Post {
    id: ID!
    title: String
    content: String
    author: User # Postに著者を追加
  }

  type User {
    id: ID!
    name: String
  }

  type Query {
    allPosts: [Post]
  }
`;
```

**2. ダミーデータの更新**
`User`のダミーデータを追加します。

```javascript
// index.js (ダミーデータ)
const users = [
  { id: '101', name: 'Alice' },
  { id: '102', name: 'Bob' },
];
// postsデータに `authorId` を追加しておく
const posts = [
  { id: '1', title: 'GraphQL入門', authorId: '101' },
  { id: '2', title: 'Apollo Server', authorId: '102' },
];
```

**3. リゾルバの更新**
`Query.allPosts`が呼ばれると、`posts`配列が返されます。しかし、`posts`配列には`author`オブジェクトそのものは含まれていません。クライアントが`author`フィールドを要求したときに、どうやって`User`オブジェクトを解決すればよいでしょうか？

ここで、`Post`型のためのリゾルバを定義します。

```javascript
// index.js (resolvers)
const resolvers = {
  Query: {
    allPosts: () => posts,
  },
  // Post型のリゾルバを追加
  Post: {
    // Post.authorフィールドが要求されたときの処理
    author: (parent) => {
      // 親オブジェクト(この場合はPost)のauthorIdを使って、
      // users配列から該当するユーザーを探して返す
      return users.find(user => user.id === parent.authorId);
    },
  },
};
```
リゾルバ関数は第一引数に `parent` を受け取ります。これは、**親フィールドのリゾルバが返したオブジェクト**です。`Post.author`リゾルバの場合、`parent`は`Query.allPosts`リゾルバが返した`posts`配列の各要素、つまり個々の`Post`オブジェクトになります。

このように、リゾルバをネストさせることで、GraphQLはグラフ構造のデータを効率的に解決していきます。

## モックサーバーで開発を加速する

スキーマさえあれば、Apollo Serverは自動でモックデータ（ダミーデータ）を生成して返す機能を持っています。これは、バックエンドの実装が完了する前に、フロントエンドチームが開発を始めるのに非常に便利です。

Apollo Serverにモック機能を追加するには、`addMocksToSchema`を使います。

```javascript
// mock-server.js
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { addMocksToSchema } from '@graphql-tools/mock';
import { makeExecutableSchema } from '@graphql-tools/schema';

// スキーマ定義 (前回と同じ)
const typeDefs = `#graphql
  type Post { ... }
  type User { ... }
  type Query { ... }
`;

// 1. 実行可能なスキーマを作成
const schema = makeExecutableSchema({ typeDefs });

// 2. スキーマにモックを追加
const schemaWithMocks = addMocksToSchema({ schema });

// 3. モック付きスキーマでサーバーを起動
const server = new ApolloServer({
  schema: schemaWithMocks,
});

const { url } = await startStandaloneServer(server);
console.log(`🚀 Mock Server ready at ${url}`);
```
このサーバーを起動してクエリを投げると、Apollo Serverがスキーマの型情報（`String`, `Int`など）に基づいて、もっともらしいダミーデータを自動で生成して返してくれます。

## まとめ

今回は、GraphQL開発の中心であるスキーマとリゾルバについて、その詳細な機能と関連性を解説しました。
- スキーマはAPIの厳格な「契約」であること。
- リゾルバはスキーマのフィールドとデータソースを結びつける関数であること。
- 親子関係を持つリゾルバによって、グラフ構造のデータが解決されること。
- モックサーバーを使えば、スキーマ定義後すぐにフロントエンド開発を開始できること。

これらの概念を理解することで、より複雑で実用的なGraphQL APIを設計・実装する準備が整いました。次回は、フロントエンドに焦点を当て、**ReactとApollo Clientを使ってGraphQL APIを利用する方法**を学びます。
