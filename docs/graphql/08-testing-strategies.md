# 【第8回】GraphQLのテスト戦略 - スキーマとリゾルバの効果的なテスト手法

GraphQLアプリケーションの品質を保つには、包括的なテスト戦略が不可欠です。スキーマの設計からリゾルバの実装、さらにはSubscriptionのテストまで、GraphQL特有のテスト手法を理解することで、信頼性の高いAPIを構築できます。この記事では、実践的なテストコードとともに、GraphQLアプリケーションのテスト戦略を詳しく解説します。

## GraphQLテストの基本概念

GraphQLのテストは、従来のREST APIテストとは異なるアプローチが必要です。主要なテスト対象を整理してみましょう：

### テスト対象の分類

1. **スキーマレベル**: 型定義とスキーマ構造の検証
2. **リゾルバレベル**: ビジネスロジックとデータ取得の検証
3. **統合レベル**: クエリ実行とエンドツーエンドの動作検証
4. **Subscriptionレベル**: リアルタイム機能の検証

## 環境セットアップ

まず、テスト環境を構築しましょう。

```bash
npm install --save-dev jest @apollo/server apollo-server-testing graphql-tag supertest
```

### テスト用のGraphQLスキーマ

```javascript
// schema.js
const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    posts: [Post!]!
    createdAt: String!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
    published: Boolean!
    comments: [Comment!]!
    createdAt: String!
  }

  type Comment {
    id: ID!
    content: String!
    author: User!
    post: Post!
    createdAt: String!
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
    posts(published: Boolean): [Post!]!
    post(id: ID!): Post
  }

  type Mutation {
    createUser(name: String!, email: String!): User!
    createPost(title: String!, content: String!, authorId: ID!): Post!
    publishPost(id: ID!): Post!
    deletePost(id: ID!): Boolean!
  }

  type Subscription {
    postAdded: Post!
    postUpdated: Post!
  }
`;

module.exports = { typeDefs };
```

## 1. スキーマレベルのテスト

スキーマレベルのテストでは、GraphQLスキーマの構造的整合性を検証します。これは設計時のエラーを早期に発見するために重要です。

```javascript
// tests/schema.test.js
const { buildSchema } = require('graphql');
const { typeDefs } = require('../schema');

describe('GraphQL Schema', () => {
  let schema;

  beforeAll(() => {
    // スキーマを構築（構文エラーがあればここで検出される）
    schema = buildSchema(typeDefs);
  });

  test('スキーマが正常にビルドされること', () => {
    // 基本的なスキーマ構築のテスト
    expect(schema).toBeDefined();
  });

  test('必要な型が定義されていること', () => {
    // カスタム型の存在確認
    const typeMap = schema.getTypeMap();
    
    expect(typeMap.User).toBeDefined();
    expect(typeMap.Post).toBeDefined();
    expect(typeMap.Comment).toBeDefined();
  });

  test('Queryルートタイプに必要なフィールドがあること', () => {
    // Query型の必須フィールドの存在確認
    const queryType = schema.getQueryType();
    const fields = queryType.getFields();
    
    expect(fields.users).toBeDefined();
    expect(fields.user).toBeDefined();
    expect(fields.posts).toBeDefined();
    expect(fields.post).toBeDefined();
  });

  test('Mutationルートタイプに必要なフィールドがあること', () => {
    // Mutation型の必須フィールドの存在確認
    const mutationType = schema.getMutationType();
    const fields = mutationType.getFields();
    
    expect(fields.createUser).toBeDefined();
    expect(fields.createPost).toBeDefined();
    expect(fields.publishPost).toBeDefined();
    expect(fields.deletePost).toBeDefined();
  });

  test('Subscriptionルートタイプに必要なフィールドがあること', () => {
    // Subscription型の必須フィールドの存在確認
    const subscriptionType = schema.getSubscriptionType();
    const fields = subscriptionType.getFields();
    
    expect(fields.postAdded).toBeDefined();
    expect(fields.postUpdated).toBeDefined();
  });

  test('User型のフィールドが正しく定義されていること', () => {
    // 型のフィールド定義と必須/オプション設定の検証
    const userType = schema.getType('User');
    const fields = userType.getFields();
    
    // 型の文字列表現で必須性も含めて検証
    expect(fields.id.type.toString()).toBe('ID!');      // 必須のID
    expect(fields.name.type.toString()).toBe('String!'); // 必須の文字列
    expect(fields.email.type.toString()).toBe('String!'); // 必須の文字列
    expect(fields.posts.type.toString()).toBe('[Post!]!'); // 必須の配列（要素も必須）
  });
});
```

**スキーマテストの重要性：**
- **構文エラーの早期発見**: スキーマビルド時に文法的な誤りを検出
- **型安全性の保証**: フィールドの型定義が期待通りであることを確認
- **API契約の検証**: クライアントが期待するAPIインターフェースの存在を保証
- **リファクタリングの安全性**: スキーマ変更時の影響範囲を把握

## 2. リゾルバレベルのテスト

個別のリゾルバ関数の動作を検証します。

```javascript
// tests/resolvers.test.js
const { resolvers } = require('../resolvers');

// モックデータ
const mockUsers = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' }
];

const mockPosts = [
  { id: '1', title: 'Post 1', content: 'Content 1', authorId: '1', published: true },
  { id: '2', title: 'Post 2', content: 'Content 2', authorId: '1', published: false },
  { id: '3', title: 'Post 3', content: 'Content 3', authorId: '2', published: true }
];

// データソースのモック
const mockDataSources = {
  userAPI: {
    getUsers: jest.fn().mockResolvedValue(mockUsers),
    getUser: jest.fn().mockImplementation((id) => 
      Promise.resolve(mockUsers.find(user => user.id === id))
    ),
    createUser: jest.fn().mockImplementation((userData) => 
      Promise.resolve({ id: '3', ...userData })
    )
  },
  postAPI: {
    getPosts: jest.fn().mockResolvedValue(mockPosts),
    getPost: jest.fn().mockImplementation((id) => 
      Promise.resolve(mockPosts.find(post => post.id === id))
    ),
    getPostsByAuthor: jest.fn().mockImplementation((authorId) =>
      Promise.resolve(mockPosts.filter(post => post.authorId === authorId))
    ),
    createPost: jest.fn().mockImplementation((postData) => 
      Promise.resolve({ id: '4', ...postData, published: false })
    )
  }
};

describe('GraphQL Resolvers', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    jest.clearAllMocks();
  });

  describe('Query resolvers', () => {
    test('users resolver が全ユーザーを返すこと', async () => {
      const context = { dataSources: mockDataSources };
      
      const result = await resolvers.Query.users(null, {}, context);
      
      expect(result).toEqual(mockUsers);
      expect(mockDataSources.userAPI.getUsers).toHaveBeenCalledTimes(1);
    });

    test('user resolver が指定されたIDのユーザーを返すこと', async () => {
      const context = { dataSources: mockDataSources };
      const args = { id: '1' };
      
      const result = await resolvers.Query.user(null, args, context);
      
      expect(result).toEqual(mockUsers[0]);
      expect(mockDataSources.userAPI.getUser).toHaveBeenCalledWith('1');
    });

    test('posts resolver が公開状態でフィルタリングすること', async () => {
      const context = { dataSources: mockDataSources };
      
      // 公開済み投稿のみ取得
      mockDataSources.postAPI.getPosts.mockResolvedValue(
        mockPosts.filter(post => post.published)
      );
      
      const result = await resolvers.Query.posts(null, { published: true }, context);
      
      expect(result).toHaveLength(2);
      expect(result.every(post => post.published)).toBe(true);
    });
  });

  describe('Mutation resolvers', () => {
    test('createUser resolver が新しいユーザーを作成すること', async () => {
      const context = { dataSources: mockDataSources };
      const args = { name: 'Charlie', email: 'charlie@example.com' };
      
      const result = await resolvers.Mutation.createUser(null, args, context);
      
      expect(result).toEqual({
        id: '3',
        name: 'Charlie',
        email: 'charlie@example.com'
      });
      expect(mockDataSources.userAPI.createUser).toHaveBeenCalledWith(args);
    });

    test('createPost resolver が認証されたユーザーで投稿を作成すること', async () => {
      const context = { 
        dataSources: mockDataSources,
        user: { id: '1' } // 認証されたユーザー
      };
      const args = { title: 'New Post', content: 'New Content', authorId: '1' };
      
      const result = await resolvers.Mutation.createPost(null, args, context);
      
      expect(result).toEqual({
        id: '4',
        title: 'New Post',
        content: 'New Content',
        authorId: '1',
        published: false
      });
    });

    test('createPost resolver が未認証ユーザーでエラーを投げること', async () => {
      const context = { 
        dataSources: mockDataSources,
        user: null // 未認証
      };
      const args = { title: 'New Post', content: 'New Content', authorId: '1' };
      
      await expect(
        resolvers.Mutation.createPost(null, args, context)
      ).rejects.toThrow('認証が必要です');
    });
  });

  describe('Type resolvers', () => {
    test('User.posts resolver がユーザーの投稿を返すこと', async () => {
      const context = { dataSources: mockDataSources };
      const parent = { id: '1' };
      
      const result = await resolvers.User.posts(parent, {}, context);
      
      expect(result).toEqual(
        mockPosts.filter(post => post.authorId === '1')
      );
      expect(mockDataSources.postAPI.getPostsByAuthor).toHaveBeenCalledWith('1');
    });

    test('Post.author resolver が投稿の著者を返すこと', async () => {
      const context = { dataSources: mockDataSources };
      const parent = { authorId: '1' };
      
      const result = await resolvers.Post.author(parent, {}, context);
      
      expect(result).toEqual(mockUsers[0]);
      expect(mockDataSources.userAPI.getUser).toHaveBeenCalledWith('1');
    });
  });
});
```

## 3. 統合テスト

実際のGraphQLクエリを実行してエンドツーエンドの動作を検証します。

```javascript
// tests/integration.test.js
const { ApolloServer } = require('apollo-server-express');
const { createTestClient } = require('apollo-server-testing');
const { gql } = require('apollo-server-express');
const { typeDefs } = require('../schema');
const { resolvers } = require('../resolvers');

// テスト用のサーバーセットアップ
const createTestServer = (dataSources = {}, context = {}) => {
  return new ApolloServer({
    typeDefs,
    resolvers,
    dataSources: () => dataSources,
    context: () => context
  });
};

describe('GraphQL Integration Tests', () => {
  describe('Query operations', () => {
    test('全ユーザー取得クエリが正常に動作すること', async () => {
      const server = createTestServer({
        userAPI: {
          getUsers: () => Promise.resolve([
            { id: '1', name: 'Alice', email: 'alice@example.com' }
          ])
        }
      });

      const { query } = createTestClient(server);

      const GET_USERS = gql`
        query GetUsers {
          users {
            id
            name
            email
          }
        }
      `;

      const result = await query({ query: GET_USERS });

      expect(result.errors).toBeUndefined();
      expect(result.data.users).toEqual([
        { id: '1', name: 'Alice', email: 'alice@example.com' }
      ]);
    });

    test('ネストしたクエリが正常に動作すること', async () => {
      const server = createTestServer({
        userAPI: {
          getUser: (id) => Promise.resolve({ id, name: 'Alice', email: 'alice@example.com' })
        },
        postAPI: {
          getPostsByAuthor: (authorId) => Promise.resolve([
            { id: '1', title: 'Post 1', content: 'Content 1', authorId }
          ])
        }
      });

      const { query } = createTestClient(server);

      const GET_USER_WITH_POSTS = gql`
        query GetUserWithPosts($id: ID!) {
          user(id: $id) {
            id
            name
            posts {
              id
              title
              content
            }
          }
        }
      `;

      const result = await query({
        query: GET_USER_WITH_POSTS,
        variables: { id: '1' }
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.user).toEqual({
        id: '1',
        name: 'Alice',
        posts: [
          { id: '1', title: 'Post 1', content: 'Content 1' }
        ]
      });
    });

    test('存在しないユーザーIDでエラーが返されること', async () => {
      const server = createTestServer({
        userAPI: {
          getUser: () => Promise.resolve(null)
        }
      });

      const { query } = createTestClient(server);

      const GET_USER = gql`
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            name
          }
        }
      `;

      const result = await query({
        query: GET_USER,
        variables: { id: 'nonexistent' }
      });

      expect(result.data.user).toBeNull();
    });
  });

  describe('Mutation operations', () => {
    test('ユーザー作成ミューテーションが正常に動作すること', async () => {
      const server = createTestServer({
        userAPI: {
          createUser: (userData) => Promise.resolve({
            id: '1',
            ...userData,
            createdAt: '2024-01-01T00:00:00Z'
          })
        }
      });

      const { mutate } = createTestClient(server);

      const CREATE_USER = gql`
        mutation CreateUser($name: String!, $email: String!) {
          createUser(name: $name, email: $email) {
            id
            name
            email
            createdAt
          }
        }
      `;

      const result = await mutate({
        mutation: CREATE_USER,
        variables: {
          name: 'Alice',
          email: 'alice@example.com'
        }
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.createUser).toEqual({
        id: '1',
        name: 'Alice',
        email: 'alice@example.com',
        createdAt: '2024-01-01T00:00:00Z'
      });
    });

    test('無効なデータでバリデーションエラーが発生すること', async () => {
      const server = createTestServer({
        userAPI: {
          createUser: () => {
            throw new Error('メールアドレスが無効です');
          }
        }
      });

      const { mutate } = createTestClient(server);

      const CREATE_USER = gql`
        mutation CreateUser($name: String!, $email: String!) {
          createUser(name: $name, email: $email) {
            id
            name
            email
          }
        }
      `;

      const result = await mutate({
        mutation: CREATE_USER,
        variables: {
          name: 'Alice',
          email: 'invalid-email'
        }
      });

      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toBe('メールアドレスが無効です');
    });
  });
});
```

## 4. Subscriptionのテスト

リアルタイム機能のテストは特別な考慮が必要です。

```javascript
// tests/subscriptions.test.js
const { execute, subscribe } = require('graphql');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { PubSub } = require('graphql-subscriptions');
const { gql } = require('apollo-server-express');

const pubsub = new PubSub();

const subscriptionTypeDefs = gql`
  type Post {
    id: ID!
    title: String!
    content: String!
  }

  type Subscription {
    postAdded: Post!
  }
`;

const subscriptionResolvers = {
  Subscription: {
    postAdded: {
      subscribe: () => pubsub.asyncIterator(['POST_ADDED'])
    }
  }
};

const schema = makeExecutableSchema({
  typeDefs: subscriptionTypeDefs,
  resolvers: subscriptionResolvers
});

describe('GraphQL Subscriptions', () => {
  test('postAdded subscription が新しい投稿を受信すること', async () => {
    const subscription = gql`
      subscription {
        postAdded {
          id
          title
          content
        }
      }
    `;

    // Subscriptionを実行
    const asyncIterator = await subscribe(schema, subscription);
    
    // テストデータをPublish
    const testPost = {
      id: '1',
      title: 'Test Post',
      content: 'Test Content'
    };

    setTimeout(() => {
      pubsub.publish('POST_ADDED', { postAdded: testPost });
    }, 100);

    // Subscriptionからの最初のメッセージを取得
    const { value } = await asyncIterator.next();

    expect(value.data.postAdded).toEqual(testPost);
    
    // リソースをクリーンアップ
    await asyncIterator.return();
  });

  test('複数のSubscriberが同じイベントを受信すること', async () => {
    const subscription = gql`
      subscription {
        postAdded {
          id
          title
        }
      }
    `;

    // 複数のSubscriptionを作成
    const subscriber1 = await subscribe(schema, subscription);
    const subscriber2 = await subscribe(schema, subscription);

    const testPost = {
      id: '2',
      title: 'Broadcast Post',
      content: 'Broadcast Content'
    };

    // イベントをPublish
    pubsub.publish('POST_ADDED', { postAdded: testPost });

    // 両方のSubscriberがイベントを受信することを確認
    const [result1, result2] = await Promise.all([
      subscriber1.next(),
      subscriber2.next()
    ]);

    expect(result1.value.data.postAdded.id).toBe('2');
    expect(result2.value.data.postAdded.id).toBe('2');

    // クリーンアップ
    await subscriber1.return();
    await subscriber2.return();
  });
});
```

## 5. パフォーマンステスト

GraphQLクエリのパフォーマンスと最適化を検証します。

```javascript
// tests/performance.test.js
const { performance } = require('perf_hooks');

describe('GraphQL Performance Tests', () => {
  test('大量データのクエリが合理的な時間で実行されること', async () => {
    // 1000件のユーザーデータを生成
    const users = Array.from({ length: 1000 }, (_, i) => ({
      id: String(i + 1),
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`
    }));

    const server = createTestServer({
      userAPI: {
        getUsers: () => Promise.resolve(users)
      }
    });

    const { query } = createTestClient(server);

    const GET_ALL_USERS = gql`
      query GetAllUsers {
        users {
          id
          name
          email
        }
      }
    `;

    const startTime = performance.now();
    const result = await query({ query: GET_ALL_USERS });
    const endTime = performance.now();

    const executionTime = endTime - startTime;

    expect(result.errors).toBeUndefined();
    expect(result.data.users).toHaveLength(1000);
    expect(executionTime).toBeLessThan(1000); // 1秒以内
  });

  test('N+1問題が発生していないことを確認', async () => {
    const getUserCallCount = jest.fn();
    
    const server = createTestServer({
      userAPI: {
        getUsers: () => Promise.resolve([
          { id: '1', name: 'Alice' },
          { id: '2', name: 'Bob' }
        ]),
        getUser: (id) => {
          getUserCallCount();
          return Promise.resolve({ id, name: `User ${id}` });
        }
      },
      postAPI: {
        getPostsByAuthor: (authorId) => Promise.resolve([
          { id: '1', title: `Post by ${authorId}`, authorId }
        ])
      }
    });

    const { query } = createTestClient(server);

    const GET_USERS_WITH_POSTS = gql`
      query GetUsersWithPosts {
        users {
          id
          name
          posts {
            id
            title
            author {
              id
              name
            }
          }
        }
      }
    `;

    await query({ query: GET_USERS_WITH_POSTS });

    // DataLoaderが正しく実装されていれば、
    // getUser は呼ばれないはず（既にusersクエリで取得済み）
    expect(getUserCallCount).not.toHaveBeenCalled();
  });
});
```

## 6. モックとテストデータ管理

効率的なテストのため、再利用可能なモックとテストデータを作成します。

```javascript
// tests/helpers/testData.js
const createTestUser = (overrides = {}) => ({
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides
});

const createTestPost = (overrides = {}) => ({
  id: '1',
  title: 'Test Post',
  content: 'Test Content',
  authorId: '1',
  published: false,
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides
});

const createMockDataSources = () => ({
  userAPI: {
    getUsers: jest.fn(),
    getUser: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn()
  },
  postAPI: {
    getPosts: jest.fn(),
    getPost: jest.fn(),
    getPostsByAuthor: jest.fn(),
    createPost: jest.fn(),
    updatePost: jest.fn(),
    deletePost: jest.fn()
  }
});

module.exports = {
  createTestUser,
  createTestPost,
  createMockDataSources
};
```

```javascript
// tests/helpers/testServer.js
const { ApolloServer } = require('apollo-server-express');
const { createTestClient } = require('apollo-server-testing');
const { typeDefs } = require('../../schema');
const { resolvers } = require('../../resolvers');

const createTestServerWithAuth = (dataSources = {}, user = null) => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    dataSources: () => dataSources,
    context: () => ({
      user,
      // テスト用のコンテキスト
      isTest: true
    })
  });

  return createTestClient(server);
};

module.exports = { createTestServerWithAuth };
```

## CI/CDでのテスト実行

```yaml
# .github/workflows/test.yml
name: GraphQL Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run GraphQL Schema tests
      run: npm run test:schema
    
    - name: Run Resolver tests
      run: npm run test:resolvers
    
    - name: Run Integration tests
      run: npm run test:integration
    
    - name: Run Performance tests
      run: npm run test:performance
    
    - name: Generate test coverage
      run: npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v1
```

## ベストプラクティス

### 1. テストの構造化

```javascript
describe('GraphQL API', () => {
  describe('User Management', () => {
    describe('Queries', () => {
      test('should return all users');
      test('should return user by ID');
      test('should handle non-existent user');
    });
    
    describe('Mutations', () => {
      test('should create new user');
      test('should update existing user');
      test('should delete user');
    });
  });
});
```

### 2. エラーケースのテスト

```javascript
test('認証エラーが適切に処理されること', async () => {
  const { mutate } = createTestServerWithAuth({}, null); // 未認証

  const result = await mutate({
    mutation: CREATE_POST,
    variables: { title: 'Test', content: 'Test' }
  });

  expect(result.errors).toBeDefined();
  expect(result.errors[0].extensions.code).toBe('UNAUTHENTICATED');
});
```

### 3. テストデータの分離

```javascript
beforeEach(async () => {
  // 各テスト前にデータベースをリセット
  await testDb.clear();
  await testDb.seed();
});
```

## まとめ

GraphQLアプリケーションの包括的なテスト戦略には以下が重要です：

1. **多層テスト**: スキーマ、リゾルバ、統合レベルでの検証
2. **パフォーマンステスト**: N+1問題やクエリ最適化の確認
3. **Subscriptionテスト**: リアルタイム機能の動作確認
4. **エラーハンドリング**: 適切なエラー処理の検証
5. **継続的テスト**: CI/CDパイプラインでの自動実行

次回は、**GraphQLのセキュリティとベストプラクティス**について詳しく解説します。脆弱性対策から安全な運用まで、セキュアなGraphQLアプリケーションを構築するための実践的な知識を学びましょう！