# 【第9回】GraphQLのセキュリティとベストプラクティス - 脆弱性対策と安全な運用

GraphQLの柔軟性と強力さは、同時にセキュリティ上の課題も生み出します。クライアントが自由にクエリを構成できるため、悪意のあるクエリや不適切な使用によってサーバーに負荷をかけたり、機密データにアクセスしたりするリスクがあります。この記事では、GraphQLアプリケーションのセキュリティ脆弱性と対策を実践的なコード例とともに詳しく解説します。

## GraphQLにおける主要なセキュリティリスク

### 1. Query Depth Attack（クエリ深度攻撃）

GraphQLでは、ネストしたクエリを無制限に書くことができるため、極めて深いクエリでサーバーリソースを枯渇させる攻撃が可能です。

**攻撃例:**
```graphql
query MaliciousDeepQuery {
  user(id: "1") {
    posts {
      comments {
        author {
          posts {
            comments {
              author {
                posts {
                  # この構造が無制限に続く...
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**対策: クエリ深度制限**

深度制限を実装することで、ネストが深すぎるクエリを実行前に拒否できます：

```javascript
const depthLimit = require('graphql-depth-limit');
const { ApolloServer } = require('apollo-server-express');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  // バリデーションルールとして深度制限を追加
  validationRules: [depthLimit(10)], // 最大10階層まで許可
  
  // エラーハンドリングでユーザーフレンドリーなメッセージを提供
  formatError: (error) => {
    if (error.message.includes('exceeds maximum operation depth')) {
      // セキュリティログとして記録
      console.warn('Depth limit exceeded:', {
        message: error.message,
        timestamp: new Date().toISOString(),
        // 攻撃者の特定に役立つ情報を記録（IPアドレスなど）
      });
      
      // クライアントには簡潔なエラーメッセージを返す
      return new Error('クエリの階層が深すぎます');
    }
    return error;
  }
});
```

**深度制限の設定指針：**
- **一般的なWebアプリ**: 5-10階層
- **複雑なデータモデル**: 10-15階層
- **セキュリティ重視**: 3-7階層

適切な深度を見つけるには、実際のアプリケーションで使用される正当なクエリの深度を分析することが重要です。

### 2. Query Complexity Attack（クエリ複雑性攻撃）

深度だけでなく、計算量自体が問題となるケースです。浅いクエリでも、大量のデータを要求することでサーバーリソースを枯渇させる攻撃手法です。

**攻撃例:**
```graphql
query MaliciousComplexQuery {
  users(first: 1000) {      # 1,000人のユーザー
    posts(first: 100) {     # 各ユーザーの投稿100件 = 100,000件
      comments(first: 50) { # 各投稿のコメント50件 = 5,000,000件
        author {
          followers(first: 200) { # 各著者のフォロワー200人 = 1,000,000,000件
            name            # 最終的に10億件のデータ取得を要求
          }
        }
      }
    }
  }
}
```

**計算例**: 1,000 × 100 × 50 × 200 = 1,000,000,000 レコード

このようなクエリは一見正当に見えますが、データベースとサーバーに致命的な負荷をかけます。

**対策: クエリ複雑性分析**

各フィールドにコスト値を割り当て、クエリ全体のコストを計算して制限する手法：

```javascript
const costAnalysis = require('graphql-query-complexity').costAnalysisValidator;

// スキーマでコストを定義（実行時間とリソース使用量に基づく）
const typeDefs = gql`
  type Query {
    users(first: Int): [User] # 複雑性: first * 2
    posts(first: Int): [Post] # 複雑性: first * 3
  }

  type User {
    id: ID! # 複雑性: 1
    name: String! # 複雑性: 1
    posts(first: Int): [Post] # 複雑性: first * 5
    followers(first: Int): [User] # 複雑性: first * 10（重い処理）
  }

  type Post {
    id: ID! # 複雑性: 1
    title: String! # 複雑性: 1
    comments(first: Int): [Comment] # 複雑性: first * 3
  }
`;

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    costAnalysis({
      maximumCost: 1000, // 最大コスト
      scalarCost: 1,     // スカラー値のコスト
      objectCost: 2,     // オブジェクト型のコスト
      listFactor: 10,    // リスト型の乗数
      introspectionCost: 1000, // Introspectionクエリのコスト
      createError: (max, actual) => {
        return new Error(`クエリが複雑すぎます。コスト: ${actual}, 最大: ${max}`);
      }
    })
  ]
});
```

### 3. Query Timeout（クエリタイムアウト）

実行時間の長いクエリからサーバーを保護します。

```javascript
const { ApolloServer } = require('apollo-server-express');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    {
      requestDidStart() {
        return {
          willSendResponse(requestContext) {
            // タイムアウト制御
            const timeout = 30000; // 30秒
            const timer = setTimeout(() => {
              throw new Error('クエリがタイムアウトしました');
            }, timeout);

            // レスポンス送信時にタイマーをクリア
            clearTimeout(timer);
          }
        };
      }
    }
  ]
});
```

## 認証と認可のセキュリティ

### 1. JWT トークンベースの認証

```javascript
const jwt = require('jsonwebtoken');
const { AuthenticationError, ForbiddenError } = require('apollo-server-express');

// JWT検証ミドルウェア
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new AuthenticationError('無効なトークンです');
  }
};

// コンテキスト関数での認証
const createContext = ({ req }) => {
  let user = null;
  
  if (req.headers.authorization) {
    const token = req.headers.authorization.replace('Bearer ', '');
    user = verifyToken(token);
  }
  
  return {
    user,
    isAuthenticated: !!user,
    requireAuth: () => {
      if (!user) {
        throw new AuthenticationError('認証が必要です');
      }
      return user;
    }
  };
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: createContext
});
```

### 2. フィールドレベルの認可

```javascript
const { shield, rule, and, or, not } = require('graphql-shield');

// 認可ルールを定義
const isAuthenticated = rule({ cache: 'contextual' })(
  async (parent, args, context) => {
    return context.user !== null;
  }
);

const isOwner = rule({ cache: 'strict' })(
  async (parent, args, context) => {
    return context.user && parent.userId === context.user.id;
  }
);

const isAdmin = rule({ cache: 'contextual' })(
  async (parent, args, context) => {
    return context.user && context.user.role === 'admin';
  }
);

const isPublishedPost = rule({ cache: 'strict' })(
  async (parent, args, context) => {
    return parent.published === true;
  }
);

// 認可ポリシーを適用
const permissions = shield(
  {
    Query: {
      users: isAuthenticated,
      user: isAuthenticated,
      adminUsers: isAdmin
    },
    Mutation: {
      createPost: isAuthenticated,
      updatePost: and(isAuthenticated, isOwner),
      deletePost: or(and(isAuthenticated, isOwner), isAdmin),
      publishPost: isAdmin
    },
    User: {
      email: isOwner, // メールアドレスは本人のみ閲覧可能
      privateData: isOwner
    },
    Post: {
      content: or(isPublishedPost, isOwner), // 公開済みまたは著者のみ
      drafts: isOwner
    }
  },
  {
    allowExternalErrors: true,
    fallbackError: new ForbiddenError('アクセス権限がありません')
  }
);

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: createContext,
  plugins: [permissions]
});
```

## データ検証とサニタイゼーション

### 1. 入力値の検証

```javascript
const Joi = require('joi');
const { UserInputError } = require('apollo-server-express');

// バリデーションスキーマ
const userValidationSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  age: Joi.number().integer().min(0).max(120).optional()
});

const postValidationSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  content: Joi.string().min(1).max(10000).required(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional()
});

// バリデーション関数
const validateInput = (schema, input) => {
  const { error, value } = schema.validate(input, { stripUnknown: true });
  
  if (error) {
    throw new UserInputError('入力値が無効です', {
      validationErrors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  
  return value;
};

// リゾルバでの使用
const resolvers = {
  Mutation: {
    createUser: async (parent, args, context) => {
      context.requireAuth();
      
      // 入力値を検証
      const validatedData = validateInput(userValidationSchema, args);
      
      // HTMLタグをエスケープ
      const sanitizedData = {
        ...validatedData,
        name: escapeHtml(validatedData.name)
      };
      
      return await userService.create(sanitizedData);
    },
    
    createPost: async (parent, args, context) => {
      const user = context.requireAuth();
      
      const validatedData = validateInput(postValidationSchema, args);
      
      // SQLインジェクション対策（ORMを使用している場合は自動的に対策済み）
      const sanitizedData = {
        ...validatedData,
        title: escapeHtml(validatedData.title),
        content: sanitizeHtml(validatedData.content, {
          allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
          allowedAttributes: {}
        }),
        authorId: user.id
      };
      
      return await postService.create(sanitizedData);
    }
  }
};
```

### 2. ファイルアップロードのセキュリティ

```javascript
const { GraphQLUpload } = require('graphql-upload');
const path = require('path');
const fs = require('fs').promises;

const typeDefs = gql`
  scalar Upload
  
  type Mutation {
    uploadFile(file: Upload!): UploadResult!
  }
  
  type UploadResult {
    filename: String!
    mimetype: String!
    encoding: String!
    url: String!
  }
`;

const resolvers = {
  Upload: GraphQLUpload,
  
  Mutation: {
    uploadFile: async (parent, { file }, context) => {
      context.requireAuth();
      
      const { createReadStream, filename, mimetype, encoding } = await file;
      
      // ファイル検証
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png', 
        'image/gif',
        'application/pdf'
      ];
      
      if (!allowedMimeTypes.includes(mimetype)) {
        throw new UserInputError('サポートされていないファイル形式です');
      }
      
      // ファイルサイズ制限（5MB）
      const maxSize = 5 * 1024 * 1024;
      const stream = createReadStream();
      
      let size = 0;
      stream.on('data', (chunk) => {
        size += chunk.length;
        if (size > maxSize) {
          stream.destroy();
          throw new UserInputError('ファイルサイズが大きすぎます');
        }
      });
      
      // 安全なファイル名を生成
      const ext = path.extname(filename);
      const safeFilename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
      const uploadPath = path.join(process.env.UPLOAD_DIR, safeFilename);
      
      // ファイルを保存
      const writeStream = require('fs').createWriteStream(uploadPath);
      stream.pipe(writeStream);
      
      return new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
          resolve({
            filename: safeFilename,
            mimetype,
            encoding,
            url: `/uploads/${safeFilename}`
          });
        });
        
        writeStream.on('error', reject);
      });
    }
  }
};
```

## レート制限とDDoS対策

### 1. Apollo Serverでのレート制限

```javascript
const { shield, rule } = require('graphql-shield');
const { RateLimiterMemory } = require('rate-limiter-flexible');

// レート制限設定
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (root, args, context) => context.user?.id || context.ip,
  points: 100, // 100ポイント/時間
  duration: 3600, // 1時間
});

const rateLimitRule = rule({ cache: 'no-cache' })(
  async (parent, args, context) => {
    try {
      await rateLimiter.consume(context.user?.id || context.ip);
      return true;
    } catch (rejRes) {
      throw new Error(`レート制限に達しました。${Math.round(rejRes.msBeforeNext / 1000)}秒後に再試行してください`);
    }
  }
);

// 重い操作に対する特別なレート制限
const heavyOperationLimiter = new RateLimiterMemory({
  points: 10, // 10回/時間
  duration: 3600,
});

const heavyOperationRule = rule({ cache: 'no-cache' })(
  async (parent, args, context) => {
    try {
      await heavyOperationLimiter.consume(context.user?.id || context.ip);
      return true;
    } catch (rejRes) {
      throw new Error('重い操作のレート制限に達しました');
    }
  }
);

const permissions = shield({
  Query: {
    '*': rateLimitRule,
    expensiveQuery: heavyOperationRule
  },
  Mutation: {
    '*': rateLimitRule,
    uploadFile: heavyOperationRule,
    sendEmail: heavyOperationRule
  }
});
```

### 2. IPベースのレート制限

```javascript
const express = require('express');
const rateLimit = require('express-rate-limit');

const app = express();

// 一般的なレート制限
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 1000, // 最大1000リクエスト/15分
  message: {
    error: 'リクエストが多すぎます。しばらく待ってから再試行してください。'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// GraphQLエンドポイント専用のレート制限
const graphqlLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分
  max: 60, // 最大60クエリ/分
  keyGenerator: (req) => {
    // 認証されたユーザーはユーザーID、そうでなければIPアドレス
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // Introspectionクエリは制限を緩める
    return req.body?.query?.includes('__schema');
  }
});

app.use(generalLimiter);
app.use('/graphql', graphqlLimiter);
```

## セキュリティヘッダーとCORS

```javascript
const helmet = require('helmet');
const cors = require('cors');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // GraphQL Playgroundのため
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false // GraphQL Playgroundのため
}));

// CORS設定
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://yourapp.com',
      'https://admin.yourapp.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

## Introspectionの無効化

本番環境では、GraphQLのIntrospection機能を無効にすることが重要です。

```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
  playground: process.env.NODE_ENV !== 'production',
  plugins: [
    {
      requestDidStart() {
        return {
          didResolveOperation(requestContext) {
            if (process.env.NODE_ENV === 'production') {
              // 本番環境でIntrospectionクエリを検出
              if (requestContext.request.query?.includes('__schema') ||
                  requestContext.request.query?.includes('__type')) {
                throw new Error('Introspectionは本番環境では無効です');
              }
            }
          }
        };
      }
    }
  ]
});
```

## ログ記録と監視

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    {
      requestDidStart() {
        return {
          didResolveOperation(requestContext) {
            // クエリのログ記録
            logger.info('GraphQL Query', {
              query: requestContext.request.query,
              variables: requestContext.request.variables,
              user: requestContext.context.user?.id,
              ip: requestContext.request.ip
            });
          },
          
          didEncounterErrors(requestContext) {
            // エラーのログ記録
            requestContext.errors.forEach(error => {
              logger.error('GraphQL Error', {
                error: error.message,
                stack: error.stack,
                query: requestContext.request.query,
                variables: requestContext.request.variables,
                user: requestContext.context.user?.id,
                ip: requestContext.request.ip
              });
            });
          },
          
          willSendResponse(requestContext) {
            // パフォーマンス監視
            const executionTime = Date.now() - requestContext.request.http.startTime;
            
            if (executionTime > 5000) { // 5秒以上
              logger.warn('Slow GraphQL Query', {
                executionTime,
                query: requestContext.request.query,
                user: requestContext.context.user?.id
              });
            }
          }
        };
      }
    }
  ]
});
```

## セキュリティチェックリスト

### 開発時のチェックポイント

- [ ] クエリ深度制限の実装
- [ ] クエリ複雑性分析の設定
- [ ] 適切な認証・認可の実装
- [ ] 入力値検証とサニタイゼーション
- [ ] レート制限の設定
- [ ] セキュリティヘッダーの設定
- [ ] エラー情報の適切な処理

### 本番環境のチェックポイント

- [ ] Introspectionの無効化
- [ ] HTTPS の強制
- [ ] セキュリティログの記録
- [ ] 監視・アラートの設定
- [ ] 定期的なセキュリティ監査
- [ ] 依存関係の脆弱性チェック

### 継続的なセキュリティ管理

```javascript
// package.json
{
  "scripts": {
    "security-audit": "npm audit",
    "security-check": "snyk test",
    "dependency-update": "npm update && npm audit fix"
  }
}
```

```yaml
# .github/workflows/security.yml
name: Security Audit

on:
  schedule:
    - cron: '0 2 * * *' # 毎日深夜2時実行
  push:
    branches: [ main ]

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Snyk security test
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

## まとめ

GraphQLのセキュリティは多層防御が重要です：

1. **クエリレベル**: 深度制限、複雑性分析、タイムアウト
2. **認証・認可**: JWT認証、フィールドレベル認可
3. **入力検証**: バリデーション、サニタイゼーション
4. **レート制限**: ユーザー・IP単位での制限
5. **インフラレベル**: HTTPS、セキュリティヘッダー、監視

次回は、GraphQLアプリケーションの**運用・監視・デバッグ**について詳しく解説します。本番環境での実践的な管理手法を学び、安定したGraphQLサービスを運用する方法を探求しましょう！