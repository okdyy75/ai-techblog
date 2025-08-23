# 【第8回】GraphQLのテスト戦略 - スキーマとリゾルバの効果的なテスト手法

GraphQLアプリケーションの品質を保つには、適切なテスト戦略が重要です。この記事では、シンプルなテストコードでGraphQLの基本的なテスト手法を説明します。

## GraphQLテストの基本

GraphQLのテストは以下の3つのレベルで行います：

1. **スキーマレベル**: 型定義の検証
2. **リゾルバレベル**: ビジネスロジックの検証  
3. **統合レベル**: エンドツーエンドの検証

## 環境セットアップ

```bash
npm install --save-dev jest @apollo/server-testing graphql-tag
```

### テスト用スキーマ

```javascript
// schema.js
const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
  }

  type Post {
    id: ID!
    title: String!
    author: User!
  }

  type Query {
    user(id: ID!): User
    posts: [Post!]!
  }

  type Mutation {
    createUser(name: String!, email: String!): User!
  }
`;

const resolvers = {
  Query: {
    user: (_, { id }) => ({ id, name: 'John', email: 'john@example.com' }),
    posts: () => [{ id: '1', title: 'GraphQL Test', authorId: '1' }]
  },
  Mutation: {
    createUser: (_, { name, email }) => ({ id: '1', name, email })
  },
  Post: {
    author: (post) => ({ id: post.authorId, name: 'John', email: 'john@example.com' })
  }
};

module.exports = { typeDefs, resolvers };
```

## スキーマレベルのテスト

```javascript
// tests/schema.test.js
const { buildSchema } = require('graphql');
const { typeDefs } = require('../schema');

describe('GraphQL Schema', () => {
  test('スキーマが正常にビルドされること', () => {
    const schema = buildSchema(typeDefs);
    expect(schema).toBeDefined();
  });

  test('必須フィールドが存在すること', () => {
    const schema = buildSchema(typeDefs);
    const queryType = schema.getQueryType();
    const fields = queryType.getFields();
    
    expect(fields.user).toBeDefined();
    expect(fields.posts).toBeDefined();
  });
});
```

## リゾルバレベルのテスト

```javascript
// tests/resolvers.test.js
const { resolvers } = require('../resolvers');

describe('GraphQL Resolvers', () => {
  test('user リゾルバが正しく動作すること', async () => {
    const result = await resolvers.Query.user(null, { id: '1' });
    
    expect(result).toEqual({
      id: '1',
      name: 'John',
      email: 'john@example.com'
    });
  });

  test('createUser ミューテーションが正しく動作すること', async () => {
    const result = await resolvers.Mutation.createUser(
      null, 
      { name: 'Alice', email: 'alice@example.com' }
    );
    
    expect(result.name).toBe('Alice');
    expect(result.email).toBe('alice@example.com');
  });
});
```

## 統合テスト

```javascript
// tests/integration.test.js
const { ApolloServer } = require('apollo-server-testing');
const { typeDefs, resolvers } = require('../schema');

describe('GraphQL Integration Tests', () => {
  let server;

  beforeAll(() => {
    server = new ApolloServer({ typeDefs, resolvers });
  });

  test('ユーザー取得クエリが正しく動作すること', async () => {
    const query = `
      query GetUser($id: ID!) {
        user(id: $id) {
          id
          name
          email
        }
      }
    `;

    const result = await server.executeOperation({
      query,
      variables: { id: '1' }
    });

    expect(result.errors).toBeUndefined();
    expect(result.data.user.name).toBe('John');
  });

  test('投稿一覧クエリが正しく動作すること', async () => {
    const query = `
      query GetPosts {
        posts {
          id
          title
          author {
            name
          }
        }
      }
    `;

    const result = await server.executeOperation({ query });

    expect(result.errors).toBeUndefined();
    expect(result.data.posts).toHaveLength(1);
    expect(result.data.posts[0].title).toBe('GraphQL Test');
  });
});
```

## Subscriptionのテスト

```javascript
// tests/subscription.test.js
const { PubSub } = require('graphql-subscriptions');

describe('GraphQL Subscription Tests', () => {
  test('Subscriptionイベントが正しく発行されること', async () => {
    const pubsub = new PubSub();
    const MESSAGE_ADDED = 'MESSAGE_ADDED';

    // Subscriptionを購読
    const asyncIterator = pubsub.asyncIterator([MESSAGE_ADDED]);
    
    // イベントを発行
    pubsub.publish(MESSAGE_ADDED, { 
      messageAdded: { id: '1', content: 'テストメッセージ' }
    });

    // イベントを受信
    const result = await asyncIterator.next();
    expect(result.value.messageAdded.content).toBe('テストメッセージ');
  });
});
```

## エラーハンドリングのテスト

```javascript
// tests/errors.test.js
describe('GraphQL Error Handling', () => {
  test('不正なクエリでエラーが返されること', async () => {
    const query = `
      query {
        nonExistentField
      }
    `;

    const result = await server.executeOperation({ query });
    
    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toContain('nonExistentField');
  });

  test('必須パラメータが不足している場合のエラー', async () => {
    const query = `
      query {
        user {
          id
          name
        }
      }
    `;

    const result = await server.executeOperation({ query });
    
    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toContain('id');
  });
});
```

## まとめ

GraphQLテストの要点：

1. **スキーマテスト**: 型定義の構造的正当性を検証
2. **リゾルバテスト**: 個別の関数のビジネスロジックを検証
3. **統合テスト**: クエリ全体の動作をエンドツーエンドで検証
4. **エラーテスト**: 異常系のケースを確実にテスト

適切なテスト戦略により、GraphQLアプリケーションの品質と信頼性を向上させることができます。