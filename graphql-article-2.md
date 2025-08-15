# 【第2回】実践！Node.jsとApollo ServerでGraphQLサーバーを構築しよう

前回はGraphQLの基本的な概念について学びました。今回は、いよいよ手を動かして、Node.js環境で実際にGraphQLサーバーを構築していきます。サーバーライブラリには、デファクトスタンダードとも言える「Apollo Server」を利用します。

## Apollo Serverとは？

Apollo Serverは、GraphQLサーバーを簡単に構築・運用するためのオープンソースライブラリです。スキーマとリゾルバ（後述）を定義するだけで、基本的なサーバー機能が完成します。また、開発に便利なWeb UI（Apollo Sandbox）が組み込まれており、クエリのテストやスキーマの確認をブラウザ上で簡単に行えます。

## 開発環境の準備

まずは、Node.jsプロジェクトをセットアップしましょう。

1.  **プロジェクトディレクトリの作成と初期化**
    ```bash
    mkdir graphql-server-example
    cd graphql-server-example
    npm init -y
    ```

2.  **必要なパッケージのインストール**
    `apollo-server`と、GraphQLのコア機能を提供する`graphql`をインストールします。
    ```bash
    npm install @apollo/server graphql
    ```

## サーバーを構築する3つのステップ

GraphQLサーバーの構築は、大きく分けて3つのステップで進めます。

1.  **スキーマ（Schema）の定義**: APIの設計図をコードに落とし込みます。
2.  **リゾルバ（Resolver）の作成**: スキーマの各フィールドに対応するデータ操作を記述します。
3.  **サーバーの起動**: スキーマとリゾルバをApollo Serverに渡して起動します。

### ステップ1: スキーマを定義する

まず、APIの仕様を定義するスキーマを作成します。今回は、シンプルなブログ記事のデータを扱うスキーマを考えてみましょう。プロジェクトのルートに `index.js` ファイルを作成し、以下のコードを記述します。

```javascript
// index.js
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

// ダミーデータ
const posts = [
  {
    id: '1',
    title: 'GraphQL入門',
    content: 'GraphQLはAPIのためのクエリ言語です。',
    authorId: '101',
  },
  {
    id: '2',
    title: 'Apollo Serverを使ってみよう',
    content: 'Apollo Serverを使うと簡単にGraphQLサーバーを構築できます。',
    authorId: '102',
  },
];

// 1. スキーマ定義 (SDL: Schema Definition Language)
const typeDefs = `#graphql
  # 投稿を表す型
  type Post {
    id: ID!
    title: String
    content: String
  }

  # APIの入り口となるクエリを定義
  type Query {
    # 全ての投稿を取得する
    allPosts: [Post]
    # IDを指定して単一の投稿を取得する
    post(id: ID!): Post
  }
`;
```
ここでは、`Post`という型と、2つのクエリ（`allPosts` と `post`）を定義しました。

### ステップ2: リゾルバを作成する

次に、スキーマで定義したクエリが実行されたときに、**実際に何をするか**を記述する「リゾルバ」を作成します。リゾルバは、スキーマの構造に対応したオブジェクトです。`index.js` に追記します。

```javascript
// index.js (続き)

// 2. リゾルバの定義
const resolvers = {
  Query: {
    // allPostsクエリが呼ばれたら、全ての投稿データを返す
    allPosts: () => posts,
    // post(id: ...)クエリが呼ばれたら、引数のidに一致する投稿を返す
    post: (parent, args) => {
      const { id } = args;
      return posts.find(post => post.id === id);
    },
  },
};
```
- `allPosts`リゾルバは、単純に`posts`配列を返します。
- `post`リゾルバは、クエリ実行時に渡される引数（`args`）から`id`を取り出し、該当する投稿を検索して返します。

### ステップ3: Apollo Serverを起動する

最後に、定義したスキーマ（`typeDefs`）とリゾルバ（`resolvers`）を使って、Apollo Serverのインスタンスを作成し、起動します。`index.js` にさらに追記しましょう。

```javascript
// index.js (さらに続き)

// 3. Apollo Serverのインスタンスを作成
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// サーバーを起動
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`🚀  Server ready at: ${url}`);
```
`startStandaloneServer` を使うことで、追加のWebフレームワーク（Expressなど）なしで簡単にサーバーを起動できます。

## サーバーを起動して試してみよう

`package.json` に `start` スクリプトを追加して、Node.jsがESM（`import`構文）を解釈できるように設定します。

**package.json**
```json
{
  ...
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  ...
}
```

ターミナルでサーバーを起動します。

```bash
npm start
```

成功すると、`🚀 Server ready at: http://localhost:4000/` と表示されます。

ブラウザで `http://localhost:4000/` にアクセスすると、**Apollo Sandbox**というWebインターフェースが開きます。ここで、以下のようなクエリを左側のパネルに入力して実行（▶ボタン）してみてください。

**クエリ1: 全ての投稿を取得**
```graphql
query {
  allPosts {
    id
    title
  }
}
```

**クエリ2: IDを指定して投稿を取得**
```graphql
query {
  post(id: "1") {
    id
    title
    content
  }
}
```
右側のパネルに、クエリで指定した通りのデータがJSON形式で返ってくるはずです。

## まとめ

今回は、Node.jsとApollo Serverを使って、実際に動作するGraphQLサーバーを構築しました。スキーマでAPIの形を定義し、リゾルバでその振る舞いを記述するという基本的な流れを体験できたかと思います。

次回は、この**スキーマ定義とリゾルバの役割**についてさらに深く掘り下げ、より複雑なリレーションを持つデータを扱う方法や、開発を効率化するモックサーバーについて解説します。
