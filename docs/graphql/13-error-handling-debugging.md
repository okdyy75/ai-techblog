# 【第13回】GraphQLにおけるエラー処理とデバッグ技法 - エラーフォーマットからトレースまで

GraphQL連載、第13回へようこそ！

前回は「GraphQL FederationとSupergraph」について解説しました。大規模な組織で複数チームが協力してGraphQLを運用する際のアーキテクチャパターンを学びました。

今回は、日常の開発で必ず直面する「エラー処理」について深く掘り下げます。REST APIと比較して、GraphQLのエラーハンドリングには独特のパターンとベストプラクティスがあります。仕様から実装、デバッグまで、実務で役立つ知識を網羅的に解説します。

## はじめに：GraphQLのエラー処理の特殊性

GraphQLのエラー処理はRESTと根本的に異なります。

### REST vs GraphQL のエラーモデル

**REST API**の場合：
- HTTPステータスコード（200, 404, 500等）で成功・失敗を表現
- エンドポイントごとに個別のレスポンス形式

**GraphQL**の場合：
- HTTPステータスコードは基本的に200（単一エンドポイント）
- `data`と`errors`の両方が同時に返る可能性がある
- 部分的な成功（Partial Response）が存在する

この特性を理解しないと、適切なエラーハンドリングが実現できません。

## GraphQLのエラーフォーマット仕様

GraphQL仕様では、エラーは標準化された形式で返却されます。

### 基本的なエラー構造

```json
{
  "data": null,
  "errors": [
    {
      "message": "User not found",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": ["user", "profile"],
      "extensions": {
        "code": "USER_NOT_FOUND",
        "timestamp": "2024-01-15T10:30:00Z"
      }
    }
  ]
}
```

### 各フィールドの意味

| フィールド | 説明 |
|-----------|------|
| `message` | 人間が読めるエラーメッセージ（必須） |
| `locations` | エラーが発生したクエリ内の位置情報 |
| `path` | エラーが発生したフィールドのパス |
| `extensions` | 追加の機械可読なメタデータ |

### 部分的成功（Partial Success）の例

GraphQLの特徴として、一部のフィールドが成功し、一部が失敗するケースがあります。

```json
{
  "data": {
    "user": {
      "id": "123",
      "name": "田中太郎",
      "email": null  // ← このフィールドは取得失敗
    }
  },
  "errors": [
    {
      "message": "Permission denied for field 'email'",
      "path": ["user", "email"],
      "extensions": {
        "code": "FORBIDDEN"
      }
    }
  ]
}
```

この動作は、GraphQLの「可能な限りデータを返す」哲学に基づいています。

## エラーの種類と分類方法

エラーを適切に分類することで、クライアントでのハンドリングが容易になります。

### エラーの4分類

```
┌─────────────────────────────────────────────────────────┐
│                    エラーの分類                          │
├─────────────────┬───────────────────────────────────────┤
│ ビジネスロジック │ バリデーションエラー、業務ルール違反    │
│ エラー          │ （400 Bad Request相当）               │
├─────────────────┼───────────────────────────────────────┤
│ 認証・認可エラー │ 未ログイン、アクセス権限不足           │
│                 │ （401/403相当）                       │
├─────────────────┼───────────────────────────────────────┤
│ リソースエラー   │ 存在しないID指定、外部サービス障害      │
│                 │ （404/503相当）                       │
├─────────────────┼───────────────────────────────────────┤
│ システムエラー   │ バグ、予期しない例外、DB接続失敗        │
│                 │ （500相当）                           │
└─────────────────┴───────────────────────────────────────┘
```

### エラーコードの命名規則

一貫性のあるエラーコードを設計しましょう。

```typescript
// 推奨：カテゴリ別プレフィックス
const ErrorCodes = {
  // バリデーション
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_EMAIL_FORMAT: 'VALIDATION_INVALID_EMAIL',
  PASSWORD_TOO_SHORT: 'VALIDATION_PASSWORD_LENGTH',
  
  // 認証・認可
  UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  FORBIDDEN: 'AUTH_FORBIDDEN',
  
  // リソース
  NOT_FOUND: 'RESOURCE_NOT_FOUND',
  ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  
  // システム
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;
```

## 実装パターン：Apollo Serverでのエラー処理

Apollo Serverでは、カスタムエラークラスを定義して使うのが一般的です。

### カスタムエラークラスの定義

```typescript
// errors/CustomError.ts
import { GraphQLError } from 'graphql';

export class CustomError extends GraphQLError {
  constructor(
    message: string,
    code: string,
    extensions?: Record<string, any>
  ) {
    super(message, {
      extensions: {
        code,
        ...extensions,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// 特定のエラータイプを具象化
export class ValidationError extends CustomError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', { field });
  }
}

export class AuthenticationError extends CustomError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_UNAUTHORIZED');
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTH_FORBIDDEN');
  }
}

export class NotFoundError extends CustomError {
  constructor(resource: string, id?: string) {
    super(
      `${resource} not found${id ? ` (id: ${id})` : ''}`,
      'RESOURCE_NOT_FOUND',
      { resource, id }
    );
  }
}
```

### リゾルバでのエラーハンドリング

```typescript
// resolvers/userResolver.ts
import { AuthenticationError, ForbiddenError, NotFoundError, ValidationError } from '../errors';

export const userResolvers = {
  Query: {
    async user(_, { id }, { user, dataSources }) {
      // 認証チェック
      if (!user) {
        throw new AuthenticationError();
      }
      
      // IDバリデーション
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid user ID', 'id');
      }
      
      // ユーザー取得
      const foundUser = await dataSources.userAPI.getUserById(id);
      
      if (!foundUser) {
        throw new NotFoundError('User', id);
      }
      
      // 権限チェック（自分のデータか、管理者か）
      if (foundUser.id !== user.id && user.role !== 'ADMIN') {
        throw new ForbiddenError('You can only access your own profile');
      }
      
      return foundUser;
    },
  },
  
  Mutation: {
    async updateUser(_, { input }, { user, dataSources }) {
      if (!user) {
        throw new AuthenticationError();
      }
      
      // バリデーション
      if (input.email && !isValidEmail(input.email)) {
        throw new ValidationError('Invalid email format', 'email');
      }
      
      if (input.password && input.password.length < 8) {
        throw new ValidationError(
          'Password must be at least 8 characters',
          'password'
        );
      }
      
      try {
        const updatedUser = await dataSources.userAPI.updateUser(user.id, input);
        return updatedUser;
      } catch (error) {
        // 予期しないエラーのラップ
        throw new CustomError(
          'Failed to update user',
          'INTERNAL_ERROR',
          { originalError: error.message }
        );
      }
    },
  },
};
```

### グローバルエラーフォーマットのカスタマイズ

Apollo Server 4では、`formatError`オプションでエラーフォーマットを統一できます。

```typescript
// server.ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (error) => {
    // 本番環境ではスタックトレースを隠す
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // 基本的なエラー情報
    const formattedError = {
      message: error.message,
      locations: error.locations,
      path: error.path,
      extensions: {
        code: error.extensions?.code || 'INTERNAL_ERROR',
        // 開発環境のみ追加情報
        ...(isDevelopment && {
          stacktrace: error.extensions?.stacktrace,
          originalError: error.extensions?.originalError,
        }),
      },
    };
    
    // ログ出力（監視ツール連携）
    console.error('[GraphQL Error]', {
      message: error.message,
      path: error.path,
      code: error.extensions?.code,
      timestamp: new Date().toISOString(),
    });
    
    return formattedError;
  },
});
```

## エラーの継承と分類の実装

より高度なエラーハンドリングには、インターフェースによる分類が有効です。

```typescript
// errors/interfaces.ts
export interface UserFacingError {
  isUserFacing: true;
  displayMessage: string;
}

export interface RetryableError {
  isRetryable: true;
  retryAfter?: number; // 秒数
}

// 実装例
export class RateLimitError extends CustomError implements UserFacingError, RetryableError {
  isUserFacing = true;
  isRetryable = true;
  retryAfter: number;
  displayMessage: string;
  
  constructor(retryAfter: number) {
    super(
      'Rate limit exceeded',
      'RATE_LIMIT_EXCEEDED',
      { retryAfter }
    );
    this.retryAfter = retryAfter;
    this.displayMessage = `Too many requests. Please try again in ${retryAfter} seconds.`;
  }
}

// クライアントへの応答例
// {
//   "errors": [{
//     "message": "Rate limit exceeded",
//     "extensions": {
//       "code": "RATE_LIMIT_EXCEEDED",
//       "retryAfter": 60,
//       "isUserFacing": true,
//       "isRetryable": true,
//       "displayMessage": "Too many requests. Please try again in 60 seconds."
//     }
//   }]
// }
```

## クライアント側でのエラーハンドリング

フロントエンドでのエラー処理パターンを解説します。

### Apollo Clientのエラーハンドリング

```typescript
// lib/apolloClient.ts
import { ApolloClient, InMemoryCache, from, HttpLink } from '@apollo/client';
import { onError } from '@apollo/client/link/error';

// エラーリンクの定義
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
      
      // エラーコードに基づく処理
      switch (extensions?.code) {
        case 'AUTH_UNAUTHORIZED':
        case 'AUTH_TOKEN_EXPIRED':
          // ログインページへリダイレクト
          window.location.href = '/login';
          break;
          
        case 'RATE_LIMIT_EXCEEDED':
          // リトライ処理（Exponential Backoff）
          const retryAfter = extensions?.retryAfter || 5;
          setTimeout(() => {
            forward(operation);
          }, retryAfter * 1000);
          break;
          
        case 'RESOURCE_NOT_FOUND':
          // 404ページへ
          window.location.href = '/404';
          break;
          
        default:
          // その他のエラーはグローバルエラーストアへ
          useErrorStore.getState().addError({
            message,
            code: extensions?.code,
            path,
          });
      }
    });
  }
  
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
    // オフライン検出や再接続ロジック
    if (!navigator.onLine) {
      useErrorStore.getState().setOffline(true);
    }
  }
});

const httpLink = new HttpLink({
  uri: '/graphql',
});

export const client = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache(),
});
```

### Reactコンポーネントでのエラーハンドリング

```typescript
// hooks/useUser.ts
import { useQuery, useMutation } from '@apollo/client';
import { GET_USER, UPDATE_USER } from './queries';

export function useUser(userId: string) {
  const { data, loading, error } = useQuery(GET_USER, {
    variables: { id: userId },
    errorPolicy: 'all', // 部分的成功を許可
    onError: (error) => {
      // コンポーネント固有のエラーハンドリング
      console.error('Failed to fetch user:', error);
    },
  });
  
  return {
    user: data?.user,
    loading,
    error,
    // 部分的なエラーの分離
    partialErrors: error?.graphQLErrors?.filter(
      e => e.path?.[0] === 'user' && e.path?.[1] !== 'id'
    ),
  };
}

// components/UserProfile.tsx
import { useUser } from '../hooks/useUser';

export function UserProfile({ userId }: { userId: string }) {
  const { user, loading, error, partialErrors } = useUser(userId);
  
  if (loading) return <LoadingSpinner />;
  
  // 致命的なエラー（完全に取得できなかった）
  if (error && !user) {
    return <ErrorMessage error={error} />;
  }
  
  // 部分的成功の場合
  return (
    <div>
      {partialErrors?.map((err, i) => (
        <ErrorBanner key={i} message={err.message} />
      ))}
      
      <h1>{user?.name}</h1>
      {user?.email ? (
        <p>Email: {user.email}</p>
      ) : (
        <p className="text-gray-500">Email unavailable</p>
      )}
    </div>
  );
}
```

### ミューテーションのエラーハンドリング

```typescript
// components/UpdateProfileForm.tsx
import { useMutation } from '@apollo/client';
import { UPDATE_USER } from '../queries';
import { useForm } from 'react-hook-form';

export function UpdateProfileForm() {
  const [updateUser, { loading }] = useMutation(UPDATE_USER);
  const { register, handleSubmit, setError, formState: { errors } } = useForm();
  
  const onSubmit = async (formData) => {
    try {
      await updateUser({
        variables: { input: formData },
      });
      // 成功通知
      showSuccessToast('Profile updated successfully');
    } catch (error) {
      // GraphQLエラーの処理
      if (error.graphQLErrors) {
        error.graphQLErrors.forEach((graphqlError) => {
          const { code, field } = graphqlError.extensions || {};
          
          switch (code) {
            case 'VALIDATION_ERROR':
              // フィールドエラーをフォームに設定
              if (field) {
                setError(field, {
                  type: 'manual',
                  message: graphqlError.message,
                });
              }
              break;
              
            case 'AUTH_UNAUTHORIZED':
              // グローバルエラー表示
              showErrorToast('Please log in again');
              break;
              
            default:
              showErrorToast(graphqlError.message);
          }
        });
      } else if (error.networkError) {
        showErrorToast('Network error. Please check your connection.');
      }
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
      
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Updating...' : 'Update Profile'}
      </button>
    </form>
  );
}
```

## デバッグ技法とツール活用

GraphQLの問題を効率的に解決するためのデバッグ手法です。

### Apollo Studio Explorer

Apollo StudioのExplorerはGraphQLクエリのデバッグに最適です。

**主な機能：**
- スキーマ参照とドキュメント表示
- クエリビルダー（自動補完付き）
- ヘッダー設定（認証トークン等）
- レスポンスの可視化

### ロギングとトレーシング

```typescript
// plugins/loggingPlugin.ts
import { ApolloServerPlugin } from '@apollo/server';

export const loggingPlugin: ApolloServerPlugin = {
  async requestDidStart() {
    const startTime = Date.now();
    
    return {
      async didEncounterErrors(requestContext) {
        const { errors, request, contextValue } = requestContext;
        
        errors.forEach(error => {
          console.error('GraphQL Error:', {
            query: request.query,
            variables: request.variables,
            error: error.message,
            path: error.path,
            user: contextValue.user?.id,
            duration: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          });
        });
      },
      
      async willSendResponse(requestContext) {
        const duration = Date.now() - startTime;
        console.log('GraphQL Request:', {
          query: requestContext.request.query?.substring(0, 100),
          duration,
          hasErrors: !!requestContext.errors?.length,
        });
      },
    };
  },
};

// server.ts
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [loggingPlugin],
});
```

### OpenTelemetryによる分散トレーシング

```typescript
// telemetry/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { GraphQLInstrumentation } from '@opentelemetry/instrumentation-graphql';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: 'http://localhost:14268/api/traces',
  }),
  instrumentations: [
    new GraphQLInstrumentation({
      allowValues: true, // 変数値もトレース
      depth: 5,
    }),
  ],
});

sdk.start();
```

### クライアントサイドデバッグ

```typescript
// 開発環境でのデバッグ用リンク
const errorLink = onError(({ graphQLErrors, operation }) => {
  if (process.env.NODE_ENV === 'development' && graphQLErrors) {
    const query = operation.query.loc?.source.body;
    const variables = JSON.stringify(operation.variables);
    
    // Apollo StudioのURLを生成
    const studioUrl = `https://studio.apollographql.com/sandbox/explorer?query=${encodeURIComponent(query)}&variables=${encodeURIComponent(variables)}`;
    
    console.group('🚀 Debug in Apollo Studio');
    console.log('Click to open:', studioUrl);
    console.groupEnd();
  }
});
```

## エラーハンドリングのベストプラクティス

実務での推奨パターンをまとめます。

### ✅ Do

- **エラーコードを使う** - メッセージ文字列比較は避ける
- **user-facingフラグを設定** - ユーザーに見せるべきエラーの区別
- **path情報を活用** - どのフィールドでエラーが起きたか特定
- **エラーを分類する** - リトライ可能か、認証エラーか等
- **構造化ログを出力** - 監視・分析のための機械可読なログ

### ❌ Don't

- **機密情報をエラーメッセージに含めない** - スタックトレース、DB接続情報等
- **エラーを無視しない** - `errorPolicy: 'ignore'`は慎重に使用
- **HTTPステータスコードに依存しない** - GraphQLは原則200を返す
- **すべてを500で返さない** - 適切な分類を心がける

### チェックリスト

運用前に確認すべき項目です。

- [ ] エラーコードの定義と一貫性が確保されているか
- [ ] 認証エラーのハンドリングが実装されているか
- [ ] 部分的な成功に対応しているか
- [ ] エラーログが適切に出力されているか
- [ ] 本番環境でスタックトレースが漏れていないか
- [ ] クライアント側でエラー表示が実装されているか
- [ ] リトライロジックが必要な箇所に実装されているか

## まとめ

GraphQLのエラー処理は、RESTと比較して柔軟性が高い一方、適切な設計が求められます。

**今回学んだポイント：**

1. **標準仕様を理解する** - `errors`配列の構造と部分的成功の概念
2. **カスタムエラーを定義する** - 一貫性のあるエラーハンドリングの基盤
3. **クライアント側での処理を分離する** - エラーコードに基づく適切なUI制御
4. **デバッグツールを活用する** - Apollo Studioやトレーシングによる問題解決
5. **セキュリティを考慮する** - 本番環境での情報漏洩防止

エラーは避けられないものですが、適切な設計と実装により、ユーザー体験と開発効率の両方を向上させることができます。

GraphQL連載はこれで13回目。次回は「GraphQLスキーマのデザインパターン」について解説する予定です。どのようなスキーマ設計が拡張性と保守性を高めるのか、実践的なパターンを紹介します。

それでは、Happy GraphQLing!

## 参考リンク

- [GraphQL Specification - Errors](https://spec.graphql.org/October2021/#sec-Errors)
- [Apollo Server Error Handling](https://www.apollographql.com/docs/apollo-server/data/errors/)
- [Apollo Client Error Policies](https://www.apollographql.com/docs/react/data/error-handling/)
- [Production Error Tracking in GraphQL](https://www.apollographql.com/blog/announcement/platform/a-guide-to-error-tracking-in-graphql/)
