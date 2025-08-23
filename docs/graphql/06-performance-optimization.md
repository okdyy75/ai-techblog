# 【第6回】GraphQLのパフォーマンス最適化 - N+1問題とDataLoaderの活用

GraphQLでは「N+1問題」というパフォーマンス問題が発生しやすく、適切な対策が必要です。この記事では、DataLoaderを使った効果的な解決策をシンプルなコード例で説明します。

## N+1問題とは？

投稿とその著者を取得するクエリで問題を見てみましょう：

```graphql
query {
  posts {
    title
    author { name }
  }
}
```

**問題のあるリゾルバ：**
```javascript
const resolvers = {
  Query: {
    posts: () => db.posts.findAll()  // 1回
  },
  Post: {
    author: (post) => db.users.findById(post.authorId)  // N回
  }
};
```

投稿が100件あると、データベースクエリが101回実行されます（1 + 100 = N+1問題）。

## DataLoaderによる解決策

DataLoaderは複数のデータ取得要求をまとめて、1回のクエリで効率的に処理します。

```bash
npm install dataloader
```

**基本的な実装：**
```javascript
const DataLoader = require('dataloader');

// バッチ関数：複数のIDを一度に取得
const userLoader = new DataLoader(async (userIds) => {
  const users = await db.users.findByIds(userIds);
  return userIds.map(id => users.find(user => user.id === id));
});

// 最適化されたリゾルバ
const resolvers = {
  Post: {
    author: (post) => userLoader.load(post.authorId)  // バッチ処理
  }
};
```

**結果：** 101回のクエリが2回に削減されます（投稿取得1回 + 著者一括取得1回）。

## シンプルなキャッシュ戦略

```javascript
// リクエストレベルキャッシュ（DataLoaderが自動で実行）
const context = {
  userLoader: new DataLoader(batchUsers)
};

// アプリケーションレベルキャッシュ（Redis使用）
const redis = require('redis').createClient();

const userLoaderWithCache = new DataLoader(async (userIds) => {
  const cached = await redis.mget(userIds.map(id => `user:${id}`));
  const uncachedIds = userIds.filter((id, i) => !cached[i]);
  
  if (uncachedIds.length > 0) {
    const users = await db.users.findByIds(uncachedIds);
    users.forEach(user => 
      redis.setex(`user:${user.id}`, 300, JSON.stringify(user))
    );
  }
  
  return userIds.map(id => /* マージ処理 */);
});
## クエリの複雑さ制限

GraphQLでは深いネストや複雑なクエリによる負荷を制限する必要があります。

```javascript
const depthLimit = require('graphql-depth-limit');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(7)]  // 最大7レベルまで
});
```

## パフォーマンス監視

```javascript
const { ApolloServerPluginUsageReporting } = require('apollo-server-core');

const server = new ApolloServer({
  plugins: [
    {
      requestDidStart() {
        return {
          willSendResponse({ response, context }) {
            const executionTime = Date.now() - context.requestStartTime;
            console.log(`Query execution time: ${executionTime}ms`);
          }
        };
      }
    }
  ]
});
```

## まとめ

GraphQLのパフォーマンス最適化の要点：

1. **DataLoader**でN+1問題を解決
2. **クエリ制限**で悪意のあるクエリを防止  
3. **キャッシュ戦略**でレスポンス時間を改善
4. **監視**でパフォーマンス問題を早期発見

## まとめ

GraphQLのパフォーマンス最適化の要点：

1. **DataLoader**でN+1問題を解決
2. **クエリ制限**で悪意のあるクエリを防止  
3. **キャッシュ戦略**でレスポンス時間を改善
4. **監視**でパフォーマンス問題を早期発見

適切な最適化により、GraphQLアプリケーションのパフォーマンスを大幅に改善できます。