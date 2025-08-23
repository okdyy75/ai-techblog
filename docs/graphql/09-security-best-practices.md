# 【第9回】GraphQLのセキュリティとベストプラクティス - 脆弱性対策と安全な運用

GraphQLアプリケーションには特有のセキュリティリスクがあります。この記事では、シンプルなコード例で主要なセキュリティ対策を解説します。

## GraphQLの主要セキュリティリスク

1. **Query Depth/Complexity Attack**: 深いネストや複雑なクエリによる負荷攻撃
2. **Introspection Attack**: スキーマ情報の不正取得
3. **認証・認可の不備**: 不適切なアクセス制御

## Query Depth制限

深いネストクエリを制限して、サーバーを保護します。

```javascript
const depthLimit = require('graphql-depth-limit');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(5)] // 最大5レベルまで
});
```

**悪意のあるクエリ例：**
```graphql
query {
  user {
    posts {
      author {
        posts {
          author {
            posts {  # 深すぎるネスト
              title
            }
          }
        }
      }
    }
  }
}
```

## Query Complexity制限

クエリの複雑さを制限して、リソース消費を抑制します。

```javascript
const costAnalysis = require('graphql-query-complexity').costAnalysisValidator;

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    costAnalysis({
      maximumCost: 1000,
      createError: (max, actual) => {
        return new Error(`クエリが複雑すぎます: ${actual}. 最大: ${max}`);
      }
    })
  ]
});
```

**スキーマでコスト定義：**
```graphql
type Query {
  users(limit: Int = 10): [User] # コスト: limit
  posts: [Post] # コスト: 10
}
```

## 認証と認可

### JWT認証の実装

```javascript
const jwt = require('jsonwebtoken');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    let user = null;
    if (token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        console.error('Invalid token:', error.message);
      }
    }
    
    return { user };
  }
});
```

### フィールドレベル認可

```javascript
const resolvers = {
  Query: {
    users: (parent, args, context) => {
      // 管理者のみアクセス可能
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('管理者権限が必要です');
      }
      return getUsers();
    },
    
    user: (parent, { id }, context) => {
      // 自分の情報または管理者のみアクセス可能
      if (!context.user) {
        throw new Error('認証が必要です');
      }
      
      if (context.user.id !== id && context.user.role !== 'admin') {
        throw new Error('このユーザー情報にアクセスする権限がありません');
      }
      
      return getUserById(id);
    }
  },

  User: {
    email: (user, args, context) => {
      // メールアドレスは本人のみ表示
      if (!context.user || context.user.id !== user.id) {
        return null;
      }
      return user.email;
    }
  }
};
```

## Introspection無効化

本番環境ではスキーマ情報の漏洩を防ぎます。

```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
  playground: process.env.NODE_ENV !== 'production'
});
```

## 入力値検証

### バリデーション関数

```javascript
const { UserInputError } = require('apollo-server-express');

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new UserInputError('無効なメールアドレスです');
  }
};

const validateInput = (input) => {
  if (!input || input.trim().length === 0) {
    throw new UserInputError('入力値が空です');
  }
  
  if (input.length > 255) {
    throw new UserInputError('入力値が長すぎます');
  }
};

const resolvers = {
  Mutation: {
    createUser: (parent, { name, email }) => {
      validateInput(name);
      validateEmail(email);
      
      return createUser({ name, email });
    }
  }
};
```

## レート制限

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100リクエスト
  message: 'リクエストが多すぎます。しばらく待ってからもう一度お試しください。'
});

app.use('/graphql', limiter);
```

## セキュリティヘッダー

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));
```

## ログとモニタリング

### セキュリティログ

```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    {
      requestDidStart() {
        return {
          didResolveOperation({ request, operationName }) {
            console.log(`Operation: ${operationName}`);
            console.log(`Query: ${request.query}`);
          },
          
          didEncounterErrors({ errors }) {
            errors.forEach(error => {
              console.error('GraphQL Error:', {
                message: error.message,
                path: error.path,
                timestamp: new Date().toISOString()
              });
            });
          }
        };
      }
    }
  ]
});
```

### 異常検知

```javascript
const suspiciousPatterns = [
  /introspection/i,
  /__schema/,
  /__type/
];

const detectSuspiciousQuery = (query) => {
  return suspiciousPatterns.some(pattern => pattern.test(query));
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    {
      requestDidStart() {
        return {
          didResolveOperation({ request }) {
            if (detectSuspiciousQuery(request.query)) {
              console.warn('Suspicious query detected:', request.query);
              // アラート送信やIP制限などの対応
            }
          }
        };
      }
    }
  ]
});
```

## ファイルアップロードのセキュリティ

```javascript
const { GraphQLUpload } = require('graphql-upload');

const resolvers = {
  Upload: GraphQLUpload,
  
  Mutation: {
    uploadFile: async (parent, { file }) => {
      const { createReadStream, filename, mimetype } = await file;
      
      // ファイルタイプ検証
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(mimetype)) {
        throw new Error('許可されていないファイルタイプです');
      }
      
      // ファイルサイズ制限
      const maxSize = 5 * 1024 * 1024; // 5MB
      const stream = createReadStream();
      
      return new Promise((resolve, reject) => {
        let size = 0;
        stream.on('data', chunk => {
          size += chunk.length;
          if (size > maxSize) {
            reject(new Error('ファイルサイズが大きすぎます'));
          }
        });
        
        stream.on('end', () => {
          resolve({ filename, size });
        });
      });
    }
  }
};
```

## まとめ

GraphQLセキュリティの要点：

1. **クエリ制限**: Depth/Complexity制限で負荷攻撃を防御
2. **認証・認可**: JWT認証とフィールドレベル認可で適切なアクセス制御
3. **入力検証**: バリデーションで不正な入力を防止
4. **本番設定**: Introspection無効化とセキュリティヘッダー設定
5. **監視**: ログとアラートで異常を早期検知

これらの対策により、GraphQLアプリケーションを安全に運用できます。