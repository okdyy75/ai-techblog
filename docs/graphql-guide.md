# GraphQL完全ガイド：ゼロから実践まで

Web API開発の世界では、長らくRESTが主流でした。しかし、アプリケーションが複雑化する中で、その課題を解決する技術として「GraphQL」が登場しました。

このガイドでは、GraphQLの基本的な概念から、サーバーサイド・フロントエンドでの実践的な実装、そして高度なテクニックまでを網羅的に解説します。この1つの記事を読み終える頃には、GraphQLを使ったモダンなAPI開発の全体像を掴むことができるでしょう。

---

## 第1部: GraphQLの基本を理解する

まずは、GraphQLがどのような技術で、なぜ注目されているのか、その中心的な概念から学んでいきましょう。

### 1.1. GraphQLとは？

GraphQLは、Facebook（現Meta）社が2012年に社内で開発を始め、2015年にオープンソースとして公開した**APIのためのクエリ言語**であり、そのクエリを実行するためのサーバーサイドランタイムです。

最大の特徴は、クライアントが必要なデータの構造をクエリとして定義し、サーバーからその通りのレスポンスを受け取れる点にあります。これにより、APIの柔軟性と効率が劇的に向上します。

### 1.2. REST APIが抱える課題

GraphQLの利点を理解するために、まずは従来のREST APIが抱える代表的な課題を振り返ってみましょう。

- **オーバーフェッチング (Over-fetching)**: APIから必要以上のデータを取得してしまう問題です。例えば、記事のタイトル一覧だけが欲しいのに、本文や著者情報まで含まれたエンドポイントを叩いてしまうケースがこれにあたります。
- **アンダーフェッチング (Under-fetching)**: 逆に1つのエンドポイントではデータが足りず、複数のリクエストを送信しなければならない問題です。例えば、ユーザー情報とそのユーザーの投稿一覧を取得するために、`/users/:id`と`/users/:id/posts`の2つのAPIを呼び出す必要があるケースです。

### 1.3. GraphQLの主な特徴とメリット

- **必要なデータだけを取得**: クライアントがクエリで指定したデータだけが返されるため、オーバーフェッチングが起こりません。
- **一度のリクエストで完結**: 関連するデータを一度のリクエストでまとめて取得できるため、アンダーフェッチングが解消されます。
- **強力な型システム**: スキーマによってAPIの仕様が厳密に定義され、開発者はAPIの構造を容易に把握できます。
- **進化するAPI**: エンドポイントが一つ（通常は `/graphql`）であるため、APIの変更が容易です。

### 1.4. GraphQLの基本的な構成要素

GraphQLは主に3つの要素で構成されています。

- **クエリ (Query)**: データの**読み取り**を行うリクエストです。
  ```graphql
  query { post(id: "1") { title, author { name } } }
  ```
- **ミューテーション (Mutation)**: データの**書き込み**（作成、更新、削除）を行うリクエストです。
  ```graphql
  mutation { createPost(title: "新しい記事") { id, title } }
  ```
- **スキーマ (Schema)**: APIで送受信できるデータの構造を定義した「設計図」です。SDL (Schema Definition Language) を使って記述します。
  ```graphql
  type Post { id: ID!, title: String! }
  type Query { post(id: ID!): Post }
  ```

---

## 第2部: バックエンド構築（サーバーサイド実践）

概念を理解したところで、次は実際に手を動かしてGraphQLサーバーを構築してみましょう。ここではNode.jsと、デファクトスタンダードであるApollo Serverを利用します。

### 2.1. 開発環境の準備 (Node.js)

1.  **プロジェクト初期化**:
    ```bash
    mkdir graphql-server-example && cd graphql-server-example
    npm init -y
    ```
2.  **パッケージのインストール**:
    ```bash
    npm install @apollo/server graphql
    ```

### 2.2. Apollo Serverでサーバーを構築する

サーバー構築は3つのステップで行います。プロジェクトルートに`index.js`を作成して進めましょう。

1.  **スキーマ (Schema) の定義**: APIの設計図をコードに落とし込みます。
2.  **リゾルバ (Resolver) の作成**: スキーマの各フィールドに対応するデータ操作を記述します。
3.  **サーバーの起動**: スキーマとリゾルバをApollo Serverに渡して起動します。

```javascript
// index.js
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

// ダミーデータ
const posts = [{ id: '1', title: 'GraphQL入門', authorId: '101' }];
const users = [{ id: '101', name: 'Alice' }];

// 1. スキーマ定義
const typeDefs = `#graphql
  type Post { id: ID!, title: String, author: User }
  type User { id: ID!, name: String }
  type Query { allPosts: [Post], post(id: ID!): Post }
`;

// 2. リゾルバ定義
const resolvers = {
  Query: {
    allPosts: () => posts,
    post: (parent, args) => posts.find(post => post.id === args.id),
  },
  // Post型のauthorフィールドが要求されたときの処理
  Post: {
    author: (parent) => users.find(user => user.id === parent.authorId),
  },
};

// 3. サーバー起動
const server = new ApolloServer({ typeDefs, resolvers });
const { url } = await startStandaloneServer(server, { listen: { port: 4000 } });
console.log(`🚀 Server ready at: ${url}`);
```
`package.json`に`"type": "module"`を追加し、`npm start` (node index.js) でサーバーを起動します。`http://localhost:4000`にアクセスすると、Apollo Sandboxが開き、クエリを試すことができます。

### 2.3. スキーマとリゾルバの深掘り

GraphQL開発は、まずスキーマを定義する「**スキーマ駆動開発**」が基本です。スキーマでAPIの型や構造を厳密に定義します。

- **スカラー型**: `Int`, `Float`, `String`, `Boolean`, `ID`
- **修飾子**:
    - `!`: Non-Null (必須) を示す。例: `String!`
    - `[]`: List (配列) を示す。例: `[Post]`

リゾルバは、スキーマのフィールドとデータソースを結びつける関数です。`parent`引数を受け取ることで、`Post`リゾルバがその親である`Query`リゾルバの結果（個々のPostオブジェクト）にアクセスできるように、リゾルバチェーンを形成してグラフ構造のデータを解決します。

---

## 第3部: フロントエンド連携

サーバーが完成したら、次はフロントエンドから利用する方法を学びます。ここではReactと、高機能なクライアントライブラリであるApollo Clientを使用します。

### 3.1. 開発環境の準備 (React)

1.  **プロジェクト作成**: `npx create-react-app my-graphql-app`
2.  **パッケージインストール**: `npm install @apollo/client graphql`

### 3.2. Apollo Client入門

`src/index.js`でクライアントを初期化し、アプリケーションを`ApolloProvider`でラップします。

```javascript
// src/index.js
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';

const client = new ApolloClient({
  uri: 'http://localhost:4000/', // サーバーのエンドポイント
  cache: new InMemoryCache(),
});

// <ApolloProvider client={client}><App /></ApolloProvider> でラップする
```

### 3.3. データの取得と表示 (`useQuery`)

コンポーネント内で`useQuery`フックを使い、宣言的にデータを取得します。

```javascript
// src/components/Posts.js
import { useQuery, gql } from '@apollo/client';

const GET_ALL_POSTS = gql`
  query GetAllPosts { allPosts { id, title } }
`;

function Posts() {
  const { loading, error, data } = useQuery(GET_ALL_POSTS);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <ul>
      {data.allPosts.map(({ id, title }) => <li key={id}>{title}</li>)}
    </ul>
  );
}
```
`useQuery`は`loading`, `error`, `data`の状態を自動で管理し、コンポーネントを再レンダリングしてくれます。

### 3.4. データの作成・更新 (`useMutation`)

データの書き込みには`useMutation`フックを使います。

```javascript
const CREATE_POST = gql`
  mutation CreatePost($title: String!) {
    createPost(title: $title) { id, title }
  }
`;

function AddPost() {
  const [createPost, { loading }] = useMutation(CREATE_POST, {
    refetchQueries: [{ query: GET_ALL_POSTS }], // 実行後、投稿一覧を再取得
  });

  // formのonSubmitイベントで
  // createPost({ variables: { title: input.value } }) を呼び出す
}
```

---

## 第4部: 発展的なトピック

最後に、実世界のアプリケーション開発で不可欠となる、より高度なテクニックを3つ紹介します。

### 4.1. ページネーション (Pagination)

大量のデータを効率的に扱うための機能です。`limit`/`offset`を使うシンプルな方法と、より堅牢な**カーソルベース・ページネーション**があります。

- **カーソルベース・ページネーションのスキーマ例**:
  ```graphql
  type Query {
    posts(first: Int, after: String): PostConnection!
  }
  type PostConnection {
    edges: [PostEdge]
    pageInfo: PageInfo!
  }
  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }
  ```
Apollo Clientには`fetchMore`関数など、この方式を便利に扱うヘルパーが用意されています。

### 4.2. キャッシュの最適化

Apollo Clientは取得したデータを正規化してキャッシュしますが、`fetchPolicy`オプションで挙動を制御できます。
- `cache-first` (デフォルト): キャッシュ優先
- `network-only`: 常にネットワークリクエスト
- `cache-and-network`: キャッシュを返しつつ、裏側でネットワークリクエストを実行してデータを更新

また、ミューテーションの`update`オプションを使えば、ネットワークを介さずにキャッシュを直接書き換えることができ、非常に高速なUI更新が可能です。

### 4.3. 認証・認可

- **認証 (Authentication)**: 「あなたは誰か？」
  - 一般的に、ログイン用ミューテーションでJWT等のトークンを発行し、以降のリクエストではHTTPヘッダーにトークンを添付します。
  - サーバーはリクエストを受け取るたびにトークンを検証し、ユーザー情報を**コンテキスト**オブジェクトに詰めてリゾルバに渡します。

- **認可 (Authorization)**: 「あなたは何ができるか？」
  - リゾルバはコンテキストからユーザー情報を受け取り、そのユーザーが要求された操作を実行する権限を持っているかチェックします。
  ```javascript
  editPost: (parent, args, context) => {
    if (!context.user) throw new Error('Not authenticated');
    // ... 権限チェック処理 ...
  }
  ```

## まとめ

このガイドでは、GraphQLの基本概念から、Node.jsとReactを使った具体的な実装、そしてページネーションや認証といった実践的なテクニックまでを駆け足で見てきました。GraphQLはクライアントとサーバー間のコミュニケーションを効率化し、モダンなアプリケーション開発を加速させる強力なツールです。このガイドが、あなたのプロジェクトにGraphQLを導入する一助となれば幸いです。
