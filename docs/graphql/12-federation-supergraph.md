# 【第12回】大規模開発を変えるGraphQL FederationとSupergraph：モノリスからの脱却

GraphQL連載、第12回へようこそ！

前回は「GraphQL Code Generator」を用いたスキーマ駆動開発について解説しました。単一のチーム、単一のリポジトリで開発している間は、このアプローチで十分に型安全かつ高速な開発が可能です。

しかし、組織が拡大し、複数のチームが1つの巨大なGraphQLスキーマ（モノリス）を触るようになると、新たな問題に直面します。「他チームの変更でコンフリクトが起きる」「デプロイの調整が大変」「スキーマが巨大すぎて誰も全容を把握できない」——これらを解決するのが、今回紹介する **GraphQL Federation（フェデレーション）** です。

今回は、GraphQLの拡張性を劇的に高める「Supergraph」アーキテクチャについて、基本概念から実装、運用上の注意点まで詳しく解説します。

## はじめに：なぜ Federation が必要なのか

GraphQLを採用した企業の多くが、成長とともに「モノリシックなGraphQLサーバー」の限界に突き当たります。

### モノリスの課題
- **開発のボトルネック**: 全チームが同じ `schema.graphql` とリゾルバを修正するため、マージ競合やデプロイ待ちが発生する。
- **認知負荷の増大**: 数千行のスキーマ定義を理解しないと安全に変更できなくなる。
- **ドメイン境界の曖昧化**: ユーザー機能と決済機能が密結合し、リファクタリングが困難になる。

### Federationによる解決
Federationは、**「グラフを機能（ドメイン）ごとのサブグラフに分割し、それを統合して1つのAPIとして提供する」** アーキテクチャです。

クライアント（フロントエンド）からは「1つのGraphQLエンドポイント」に見えますが、裏側では複数の独立したサービス（Subgraph）が協調して動作します。これにより、各チームは自分たちの担当領域（サブグラフ）の開発と運用に集中できます。

## Federation の主要概念

Federation v2系における重要な用語を整理します。

### 1. Subgraph（サブグラフ）
独立して動作するGraphQLサービスです。例えば「ユーザー管理サービス」「商品カタログサービス」などがこれに当たります。それぞれが自身のスキーマとリゾルバを持ちます。

### 2. Supergraph（スーパーグラフ）
全てのサブグラフを結合して作られる、仮想的な全体スキーマです。クライアントはこのSupergraphに対してクエリを投げます。

### 3. Gateway / Router
クライアントからのリクエストを受け付ける入り口です。
- クエリを解析し、「どのデータをどのサブグラフから取得するか」という**クエリプラン（Query Plan）**を作成します。
- 各サブグラフにリクエストを並列に投げ、結果を結合してクライアントに返します。
- 現在の主流は、高性能なRust製の **Apollo Router** ですが、Node.js製の **Apollo Gateway** も存在します。

### 4. Entity（エンティティ）と @key
Federationの魔法の中核です。異なるサブグラフ間でデータを結合するための仕組みです。
- **Entity**: 複数のサブグラフにまたがって定義される型（例: `User`）。
- **@key**: そのEntityを一意に識別するための主キー（例: `id`）を指定するディレクティブ。

## 実装例：Node.js + Apollo Server

実際に、**「ユーザーサービス（Accounts）」** と **「レビューサービス（Reviews）」** の2つのサブグラフを作り、それらを統合してみましょう。

### シナリオ
- **Accounts**: ユーザー情報（`id`, `username`）を持つ。
- **Reviews**: レビュー情報（`body`, `author`）を持つ。レビューの `author` は `User` 型であり、Accountsサービスのデータを参照する。

### 1. Subgraph A: Accounts Service

まず、ユーザー情報を管理するサブグラフです。

```javascript
// accounts.js
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const gql = require('graphql-tag');

const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  # @key でこの型が id で識別される Entity であることを宣言
  type User @key(fields: "id") {
    id: ID!
    username: String!
  }

  type Query {
    me: User
  }
`;

const resolvers = {
  Query: {
    me: () => ({ id: "1", username: "@gemini" }),
  },
  User: {
    // 外部からこのEntityが参照された時に呼ばれるリゾルバ
    __resolveReference(userReference) {
      // 実際はDBから取得する
      return { id: userReference.id, username: `@user_${userReference.id}` };
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

startStandaloneServer(server, { listen: { port: 4001 } }).then(({ url }) => {
  console.log(`🚀 Accounts subgraph ready at ${url}`);
});
```

### 2. Subgraph B: Reviews Service

次に、レビューを管理するサブグラフです。ここで `User` 型を拡張します。

```javascript
// reviews.js
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const gql = require('graphql-tag');

const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type Review {
    id: ID!
    body: String!
    author: User! # 別サブグラフのUser型を参照
  }

  # User型を拡張し、reviewsフィールドを追加（Stub）
  type User @key(fields: "id") {
    id: ID!
    reviews: [Review]
  }

  type Query {
    topReviews: [Review]
  }
`;

const resolvers = {
  Review: {
    // Review.author が要求されたら、Accountsサービスが解決できるよう
    // 必要なキー情報（__typenameとid）だけを返す
    author(review) {
      return { __typename: "User", id: review.authorId };
    },
  },
  User: {
    // Accounts側のUserに対して、Reviews側でフィールドを追加
    reviews(user) {
      // user.id に基づいてDBからレビューを取得する
      return [
        { id: "101", body: "Great article!", authorId: user.id },
        { id: "102", body: "Very helpful.", authorId: user.id },
      ];
    },
  },
  Query: {
    topReviews: () => [
      { id: "101", body: "Great article!", authorId: "1" },
    ],
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

startStandaloneServer(server, { listen: { port: 4002 } }).then(({ url }) => {
  console.log(`🚀 Reviews subgraph ready at ${url}`);
});
```

### 3. Gateway (Supergraph)

最後に、これらをまとめるゲートウェイです。本来は `Apollo Router` の利用が推奨されますが、Node.jsで簡易的に動作させるには `@apollo/gateway` を使います。

```javascript
// gateway.js
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { ApolloGateway, IntrospectAndCompose } = require('@apollo/gateway');

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'accounts', url: 'http://localhost:4001' },
      { name: 'reviews',  url: 'http://localhost:4002' },
    ],
  }),
});

const server = new ApolloServer({
  gateway,
});

startStandaloneServer(server, { listen: { port: 4000 } }).then(({ url }) => {
  console.log(`🚀 Gateway ready at ${url}`);
});
```

この状態でGatewayに対して以下のクエリを投げると、内部で2つのサブグラフへのリクエストが行われ、結合された結果が返ってきます。

```graphql
query {
  topReviews {
    body
    author {
      username # Accountsサービスから取得される！
    }
  }
}
```

## スキーマ分割の考え方とチーム分担

Federation導入時、最も重要なのは**「どこで切るか」**です。

### アンチパターン：データモデル（DBテーブル）単位で分割する
`User`テーブルがあるからUserサブグラフ、`Product`テーブルがあるからProductサブグラフ…と機械的に分割すると失敗します。GraphQLは「クライアントのためのグラフ」であり、RDBのミラーではありません。

### ベストプラクティス：ドメイン（関心事）で分割する
- **Accountsチーム**: 認証、基本プロフィールに関心がある → `User.username`, `User.email` を定義。
- **E-commerceチーム**: 購買履歴に関心がある → `User` を拡張して `User.purchases` を定義。
- **Socialチーム**: フォロー関係に関心がある → `User` を拡張して `User.followers` を定義。

このように、**「1つのEntity（User）を、複数のサブグラフがそれぞれの関心事に基づいて拡張する」** のがFederationの醍醐味です。

## 運用上の注意点

大規模運用における落とし穴と対策です。

### 1. N+1問題とネットワークレイテンシ
Federationでは、GatewayとSubgraph間のネットワーク通信が発生します。
不用意なスキーマ設計（例: リストの中でさらに別サービスへの参照を繰り返す）をすると、サービス間でのN+1問題（Network N+1）が発生し、レイテンシが激増します。
- **対策**: Gatewayの「Query Plan」を確認し、無駄なホップが発生していないか監視する。可能な限り1つのサブグラフ内で完結するようデータを設計する。

### 2. 破壊的変更の防止（Schema Checks）
あるサブグラフが `User.username` を削除した場合、それに依存している他のサブグラフやクライアントが壊れる可能性があります。
- **対策**: `Apollo Studio` や `GraphQL Hive` などのスキーマレジストリツールを導入し、CI/CDで `subgraph check` を実行する。これにより、他のサブグラフや既存のクエリに影響を与える変更をデプロイ前にブロックできます。

### 3. 認可（Authorization）
「誰がこのフィールドを見れるか」はどこで制御すべきでしょうか？
- **推奨**: 基本的なロジックは **各Subgraph** に持たせる。「Reviewsサービス」のデータはReviewsサービスが責任を持つべきです。Gatewayはあくまでルーティングに徹し、JWTの検証とUser Contextの受け渡しのみを行う構成が一般的です。

## 実務チェックリスト

Federationは強力ですが、複雑さも伴います。導入を検討する際の判断軸です。

- [ ] **チーム構成**: バックエンド開発チームが複数（3チーム以上〜）に分かれているか？
- [ ] **スキーマ規模**: 型定義が巨大になり、認知負荷が限界に来ているか？
- [ ] **独立性**: 各チームが異なるデプロイサイクルを持ちたいと考えているか？
- [ ] **インフラ**: 複数のサービスを運用・監視できるSRE体制があるか？
- [ ] **パフォーマンス**: 多少のネットワークオーバーヘッド（数ms〜）が許容されるユースケースか？

これらに「No」が多い場合、まだモノリスのままで良い、あるいは単なるスキーマ分割（Schema StitchingやModules）で十分な可能性があります。

## まとめ

GraphQL Federationは、単なる技術スタックではなく、**「組織のスケーラビリティ」** を解決するためのアーキテクチャです。

適切に設計されたSupergraphは、各チームに自律性をもたらし、組織が大きくなっても開発スピードを維持することを可能にします。まずは、特定の一部分（例えば独立性の高い「検索機能」や「通知機能」）だけをサブグラフとして切り出し、小さく始めてみることをお勧めします。

さて、全12回にわたるGraphQL連載、いかがでしたでしょうか？
基礎から始まり、クライアント実装、Code Generator、そしてFederationまで、現代的なGraphQL開発に必要な知識を一通り網羅しました。

この連載が、皆さんのプロダクト開発において「より良いAPI、より良い開発体験」を実現する一助となれば幸いです。

Happy Graphing!

## 参考リンク
- [Apollo Federation Documentation](https://www.apollographql.com/docs/federation/)
- [GraphQL Federation v2 Specification](https://specs.apollo.dev/federation/v2.0)
- [Apollo Router](https://www.apollographql.com/docs/router/)
