# TypeScriptで型安全なAPI設計パターン

モダンなWebアプリケーション開発において、フロントエンドとバックエンドの連携は型安全性が重要です。この記事では、TypeScriptを活用した実践的なAPI設計パターンを詳しく解説します。

## API設計の基本原則

### 1. スキーマファーストアプローチ

まず、APIの仕様を型として定義し、その型から実装を導出するアプローチです。

```typescript
// APIレスポンスの基本型
interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    errors?: string[];
}

// エラーレスポンス
interface ApiError {
    success: false;
    message: string;
    errors: string[];
    code: string;
}

// 成功レスポンス
interface ApiSuccess<T> {
    success: true;
    data: T;
}

type ApiResult<T> = ApiSuccess<T> | ApiError;
```

### 2. リソース指向の型設計

```typescript
// ユーザーリソース
interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    createdAt: string;
    updatedAt: string;
}

// ユーザー作成用の型（IDやタイムスタンプは除外）
type CreateUserRequest = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;

// ユーザー更新用の型（すべてオプショナル）
type UpdateUserRequest = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;

// ユーザー一覧取得用のクエリパラメータ
interface GetUsersQuery {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: keyof User;
    sortOrder?: 'asc' | 'desc';
}
```

## RESTful APIの型安全な実装

### エンドポイント定義

```typescript
// APIエンドポイントの型定義
interface ApiEndpoints {
    // ユーザー関連
    'GET /users': {
        query?: GetUsersQuery;
        response: ApiResult<{
            users: User[];
            total: number;
            page: number;
            totalPages: number;
        }>;
    };
    
    'GET /users/:id': {
        params: { id: string };
        response: ApiResult<User>;
    };
    
    'POST /users': {
        body: CreateUserRequest;
        response: ApiResult<User>;
    };
    
    'PUT /users/:id': {
        params: { id: string };
        body: UpdateUserRequest;
        response: ApiResult<User>;
    };
    
    'DELETE /users/:id': {
        params: { id: string };
        response: ApiResult<void>;
    };
    
    // 認証関連
    'POST /auth/login': {
        body: { email: string; password: string };
        response: ApiResult<{ user: User; token: string }>;
    };
    
    'POST /auth/refresh': {
        body: { refreshToken: string };
        response: ApiResult<{ token: string }>;
    };
}
```

### 型安全なAPIクライアント

```typescript
// HTTPメソッドの抽出
type HttpMethods = {
    [K in keyof ApiEndpoints]: K extends `${infer Method} ${string}` ? Method : never;
}[keyof ApiEndpoints];

// パスの抽出
type ApiPaths<Method extends HttpMethods> = {
    [K in keyof ApiEndpoints]: K extends `${Method} ${infer Path}` ? Path : never;
}[keyof ApiEndpoints];

// エンドポイントの詳細を取得
type GetEndpoint<Method extends HttpMethods, Path extends string> = 
    ApiEndpoints[`${Method} ${Path}`];

// APIクライアントクラス
class TypeSafeApiClient {
    constructor(private baseUrl: string, private defaultHeaders: Record<string, string> = {}) {}

    async request<Method extends HttpMethods, Path extends ApiPaths<Method>>(
        method: Method,
        path: Path,
        options?: {
            params?: GetEndpoint<Method, Path> extends { params: infer P } ? P : never;
            query?: GetEndpoint<Method, Path> extends { query: infer Q } ? Q : never;
            body?: GetEndpoint<Method, Path> extends { body: infer B } ? B : never;
            headers?: Record<string, string>;
        }
    ): Promise<GetEndpoint<Method, Path>['response']> {
        
        // パラメータの置換
        let url = path as string;
        if (options?.params) {
            Object.entries(options.params).forEach(([key, value]) => {
                url = url.replace(`:${key}`, String(value));
            });
        }

        // クエリパラメータの追加
        if (options?.query) {
            const searchParams = new URLSearchParams();
            Object.entries(options.query).forEach(([key, value]) => {
                if (value !== undefined) {
                    searchParams.append(key, String(value));
                }
            });
            url += `?${searchParams.toString()}`;
        }

        // リクエストの実行
        const response = await fetch(`${this.baseUrl}${url}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...this.defaultHeaders,
                ...options?.headers,
            },
            body: options?.body ? JSON.stringify(options.body) : undefined,
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }
}

// 使用例
const apiClient = new TypeSafeApiClient('https://api.example.com');

// 型安全なAPI呼び出し
async function fetchUser(userId: string) {
    const result = await apiClient.request('GET', '/users/:id', {
        params: { id: userId }
    });
    
    if (result.success) {
        // result.data は User 型として推論される
        console.log(result.data.name);
    } else {
        // result は ApiError 型として推論される
        console.error(result.message);
    }
}
```

## GraphQLライクなAPI設計

### スキーマベースのアプローチ

```typescript
// GraphQLライクなクエリ型
type Query<T, Fields extends keyof T = keyof T> = {
    [K in Fields]: T[K] extends object 
        ? Query<T[K]> | boolean
        : boolean;
};

// ユーザークエリの例
interface UserQuery extends Query<User> {
    id: boolean;
    email: boolean;
    name: boolean;
    avatar?: boolean;
    posts?: Query<Post>;
}

// 投稿の型
interface Post {
    id: string;
    title: string;
    content: string;
    authorId: string;
    createdAt: string;
}

// クエリ結果の型生成
type QueryResult<T, Q extends Query<T>> = {
    [K in keyof Q]: Q[K] extends true 
        ? T[K]
        : Q[K] extends Query<infer U>
            ? QueryResult<U, Q[K]>
            : never;
};

// クエリ実行関数
async function queryUser<Q extends UserQuery>(
    id: string, 
    query: Q
): Promise<QueryResult<User, Q>> {
    // 実装は省略
    return {} as QueryResult<User, Q>;
}

// 使用例
const userWithPosts = await queryUser('123', {
    id: true,
    name: true,
    posts: {
        id: true,
        title: true,
    }
});

// userWithPosts の型は { id: string; name: string; posts: { id: string; title: string; }[] }
```

## バリデーション統合パターン

### Zodとの統合

```typescript
import { z } from 'zod';

// Zodスキーマの定義
const UserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().min(1).max(100),
    avatar: z.string().url().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

const CreateUserSchema = UserSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

// スキーマから型を生成
type User = z.infer<typeof UserSchema>;
type CreateUserRequest = z.infer<typeof CreateUserSchema>;

// バリデーション付きAPIハンドラー
interface ValidatedApiHandler<TInput, TOutput> {
    inputSchema: z.ZodSchema<TInput>;
    outputSchema: z.ZodSchema<TOutput>;
    handler: (input: TInput) => Promise<TOutput>;
}

function createValidatedHandler<TInput, TOutput>(
    config: ValidatedApiHandler<TInput, TOutput>
) {
    return async (rawInput: unknown): Promise<ApiResult<TOutput>> => {
        try {
            // 入力のバリデーション
            const input = config.inputSchema.parse(rawInput);
            
            // ハンドラーの実行
            const output = await config.handler(input);
            
            // 出力のバリデーション
            const validatedOutput = config.outputSchema.parse(output);
            
            return {
                success: true,
                data: validatedOutput,
            };
        } catch (error) {
            if (error instanceof z.ZodError) {
                return {
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
                    code: 'VALIDATION_ERROR',
                };
            }
            
            return {
                success: false,
                message: 'Internal server error',
                errors: [String(error)],
                code: 'INTERNAL_ERROR',
            };
        }
    };
}

// 使用例
const createUserHandler = createValidatedHandler({
    inputSchema: CreateUserSchema,
    outputSchema: UserSchema,
    handler: async (input: CreateUserRequest): Promise<User> => {
        // ユーザー作成ロジック
        return {
            id: generateId(),
            ...input,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    },
});
```

## リアルタイムAPI設計

### WebSocketベースのAPI

```typescript
// WebSocketメッセージの型定義
interface WebSocketMessages {
    // クライアントからサーバーへ
    'subscribe': { channel: string; filters?: Record<string, any> };
    'unsubscribe': { channel: string };
    'user.update': { data: UpdateUserRequest };
    'chat.send': { message: string; roomId: string };
    
    // サーバーからクライアントへ
    'user.created': { data: User };
    'user.updated': { data: User };
    'user.deleted': { id: string };
    'chat.message': { message: string; userId: string; roomId: string; timestamp: string };
    'error': { message: string; code: string };
}

// 型安全なWebSocketクライアント
class TypeSafeWebSocketClient {
    private ws: WebSocket;
    private listeners: Map<keyof WebSocketMessages, Set<Function>> = new Map();

    constructor(url: string) {
        this.ws = new WebSocket(url);
        this.setupEventHandlers();
    }

    send<T extends keyof WebSocketMessages>(
        type: T,
        data: WebSocketMessages[T]
    ) {
        this.ws.send(JSON.stringify({ type, data }));
    }

    on<T extends keyof WebSocketMessages>(
        type: T,
        callback: (data: WebSocketMessages[T]) => void
    ) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type)!.add(callback);
    }

    off<T extends keyof WebSocketMessages>(
        type: T,
        callback: (data: WebSocketMessages[T]) => void
    ) {
        this.listeners.get(type)?.delete(callback);
    }

    private setupEventHandlers() {
        this.ws.onmessage = (event) => {
            try {
                const { type, data } = JSON.parse(event.data);
                const callbacks = this.listeners.get(type);
                if (callbacks) {
                    callbacks.forEach(callback => callback(data));
                }
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };
    }
}

// 使用例
const wsClient = new TypeSafeWebSocketClient('ws://localhost:8080');

wsClient.on('user.created', (data) => {
    // data は User 型として推論される
    console.log('New user created:', data.data.name);
});

wsClient.send('subscribe', { channel: 'users' });
```

## エラーハンドリングパターン

### 結果型パターン

```typescript
// Result型の定義
type Result<T, E = Error> = 
    | { success: true; data: T }
    | { success: false; error: E };

// API関数の例
async function fetchUserSafely(id: string): Promise<Result<User, ApiError>> {
    try {
        const response = await apiClient.request('GET', '/users/:id', {
            params: { id }
        });
        
        if (response.success) {
            return { success: true, data: response.data };
        } else {
            return { 
                success: false, 
                error: {
                    success: false,
                    message: response.message,
                    errors: response.errors,
                    code: response.code,
                }
            };
        }
    } catch (error) {
        return {
            success: false,
            error: {
                success: false,
                message: 'Network error',
                errors: [String(error)],
                code: 'NETWORK_ERROR',
            }
        };
    }
}

// 使用例
const result = await fetchUserSafely('123');

if (result.success) {
    // result.data は User 型
    console.log(result.data.name);
} else {
    // result.error は ApiError 型
    console.error(result.error.message);
}
```

## APIクライアントの状態管理

### React Queryとの統合

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// クエリキーの型安全な生成
const queryKeys = {
    users: {
        all: () => ['users'] as const,
        lists: (filters?: GetUsersQuery) => ['users', 'list', filters] as const,
        detail: (id: string) => ['users', 'detail', id] as const,
    },
} as const;

// カスタムフック
function useUser(id: string) {
    return useQuery({
        queryKey: queryKeys.users.detail(id),
        queryFn: async () => {
            const result = await apiClient.request('GET', '/users/:id', {
                params: { id }
            });
            
            if (!result.success) {
                throw new Error(result.message);
            }
            
            return result.data;
        },
    });
}

function useUsers(query?: GetUsersQuery) {
    return useQuery({
        queryKey: queryKeys.users.lists(query),
        queryFn: async () => {
            const result = await apiClient.request('GET', '/users', { query });
            
            if (!result.success) {
                throw new Error(result.message);
            }
            
            return result.data;
        },
    });
}

function useCreateUser() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async (userData: CreateUserRequest) => {
            const result = await apiClient.request('POST', '/users', {
                body: userData
            });
            
            if (!result.success) {
                throw new Error(result.message);
            }
            
            return result.data;
        },
        onSuccess: (newUser) => {
            // ユーザー一覧のキャッシュを無効化
            queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
            
            // 新しいユーザーをキャッシュに追加
            queryClient.setQueryData(
                queryKeys.users.detail(newUser.id),
                newUser
            );
        },
    });
}
```

## まとめ

型安全なAPI設計は、以下の利点をもたらします：

- **コンパイル時エラー検出**: APIの仕様変更を即座に検知
- **自動補完とインテリセンス**: 開発効率の大幅向上
- **リファクタリングの安全性**: 大規模な変更も安心して実行
- **ドキュメントの自動生成**: 型情報がそのまま仕様書になる

TypeScriptの型システムを最大限活用することで、堅牢で保守性の高いAPIアーキテクチャを構築できます。

## 参考資料

- [tRPC - End-to-end typesafe APIs](https://trpc.io/)
- [Zod - TypeScript-first schema declaration and validation library](https://zod.dev/)
- [TanStack Query - Powerful data synchronization for TypeScript](https://tanstack.com/query/latest)