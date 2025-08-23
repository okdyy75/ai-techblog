# 大規模TypeScriptプロジェクトの構成

大規模なTypeScriptプロジェクトにおけるディレクトリ構造、アーキテクチャ、ベストプラクティスを解説します。

## プロジェクト構造の基本原則

### 1. 関心の分離 (Separation of Concerns)

各モジュールが単一の責任を持つように構成します。

### 2. スケーラビリティ

新機能追加時に既存コードへの影響を最小限に抑える構造。

### 3. 再利用性

共通のロジックやコンポーネントを効率的に再利用できる構造。

### 4. テスタビリティ

単体テストやインテグレーションテストが容易に実装できる構造。

## ディレクトリ構造例

### フロントエンド（React + TypeScript）

```
src/
├── components/           # 再利用可能なコンポーネント
│   ├── ui/              # 基本UIコンポーネント
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   ├── Button.stories.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   └── Modal/
│   ├── forms/           # フォーム関連コンポーネント
│   └── layout/          # レイアウトコンポーネント
├── features/            # 機能別モジュール
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   └── index.ts
│   ├── dashboard/
│   ├── users/
│   └── products/
├── hooks/               # 共通カスタムフック
├── services/            # API呼び出し・外部サービス
├── stores/              # 状態管理（Redux、Zustand等）
├── types/               # 共通型定義
├── utils/               # ユーティリティ関数
├── constants/           # 定数定義
├── styles/              # スタイル関連
├── assets/              # 静的ファイル
└── App.tsx
```

### バックエンド（Node.js + TypeScript）

```
src/
├── controllers/         # ルートハンドラー
├── services/           # ビジネスロジック
├── repositories/       # データアクセス層
├── models/             # データモデル
├── middleware/         # Express ミドルウェア
├── routes/             # ルート定義
├── types/              # 型定義
├── utils/              # ユーティリティ
├── config/             # 設定ファイル
├── db/                 # データベース関連
│   ├── migrations/
│   ├── seeds/
│   └── connection.ts
├── validators/         # バリデーション
├── tests/              # テストファイル
└── app.ts
```

## 機能別モジュール構成

### Feature-Based Architecture

```typescript
// features/users/index.ts
export { UserList } from './components/UserList';
export { UserDetail } from './components/UserDetail';
export { useUsers } from './hooks/useUsers';
export { userService } from './services/userService';
export type { User, CreateUserRequest } from './types';

// features/users/types/index.ts
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  role: UserRole;
}

export type UserRole = 'admin' | 'user' | 'moderator';

// features/users/services/userService.ts
import { ApiClient } from '@/services/apiClient';
import { User, CreateUserRequest } from '../types';

class UserService {
  constructor(private apiClient: ApiClient) {}

  async getUsers(): Promise<User[]> {
    return this.apiClient.get<User[]>('/users');
  }

  async getUserById(id: string): Promise<User> {
    return this.apiClient.get<User>(`/users/${id}`);
  }

  async createUser(user: CreateUserRequest): Promise<User> {
    return this.apiClient.post<User>('/users', user);
  }

  async updateUser(id: string, user: Partial<User>): Promise<User> {
    return this.apiClient.put<User>(`/users/${id}`, user);
  }

  async deleteUser(id: string): Promise<void> {
    return this.apiClient.delete(`/users/${id}`);
  }
}

export const userService = new UserService(new ApiClient());
```

## 型定義の管理

### 共通型定義の構造

```typescript
// types/api.ts
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// types/database.ts
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface AuditableEntity extends BaseEntity {
  createdBy: string;
  updatedBy: string;
}

// types/auth.ts
export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}
```

### 型の階層化と拡張

```typescript
// types/entities/user.ts
import { BaseEntity } from '../database';

export interface User extends BaseEntity {
  name: string;
  email: string;
  role: UserRole;
}

export interface AdminUser extends User {
  role: 'admin';
  permissions: AdminPermission[];
}

export interface RegularUser extends User {
  role: 'user';
  lastLoginAt?: Date;
}

// DTOの定義
export interface CreateUserDTO {
  name: string;
  email: string;
  role: UserRole;
}

export interface UpdateUserDTO {
  name?: string;
  email?: string;
  role?: UserRole;
}

export interface UserResponseDTO {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}
```

## 状態管理の構造

### Zustand を使用した状態管理

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AuthUser, AuthToken } from '@/types/auth';

interface AuthState {
  user: AuthUser | null;
  token: AuthToken | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        user: null,
        token: null,
        isLoading: false,
        error: null,

        // Actions
        login: async (email: string, password: string) => {
          set({ isLoading: true, error: null });
          try {
            const response = await authService.login(email, password);
            set({ 
              user: response.user, 
              token: response.token, 
              isLoading: false 
            });
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Login failed',
              isLoading: false 
            });
          }
        },

        logout: () => {
          set({ user: null, token: null, error: null });
        },

        refreshToken: async () => {
          const { token } = get();
          if (!token?.refreshToken) return;

          try {
            const newToken = await authService.refreshToken(token.refreshToken);
            set({ token: newToken });
          } catch (error) {
            set({ user: null, token: null });
          }
        },

        clearError: () => set({ error: null })
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({ 
          user: state.user, 
          token: state.token 
        })
      }
    ),
    { name: 'auth-store' }
  )
);
```

## サービス層の設計

### API クライアントの実装

```typescript
// services/apiClient.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiResponse, ApiError } from '@/types/api';

export class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = process.env.REACT_APP_API_URL!) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        const apiError: ApiError = {
          code: error.response?.data?.code || 'UNKNOWN_ERROR',
          message: error.response?.data?.message || 'An error occurred',
          details: error.response?.data?.details
        };
        return Promise.reject(apiError);
      }
    );
  }

  private getAuthToken(): string | null {
    // 認証トークンの取得ロジック
    return localStorage.getItem('authToken');
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.get<never, T>(url, config);
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.client.post<never, T>(url, data, config);
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.client.put<never, T>(url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.delete<never, T>(url, config);
  }
}
```

### ドメインサービスの実装

```typescript
// services/domainServices/userService.ts
import { ApiClient } from '../apiClient';
import { User, CreateUserDTO, UpdateUserDTO } from '@/types/entities/user';
import { PaginatedResponse } from '@/types/api';

export interface UserServiceInterface {
  getUsers(params?: GetUsersParams): Promise<PaginatedResponse<User>>;
  getUserById(id: string): Promise<User>;
  createUser(user: CreateUserDTO): Promise<User>;
  updateUser(id: string, user: UpdateUserDTO): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export class UserService implements UserServiceInterface {
  constructor(private apiClient: ApiClient) {}

  async getUsers(params: GetUsersParams = {}): Promise<PaginatedResponse<User>> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    return this.apiClient.get<PaginatedResponse<User>>(
      `/users?${queryParams.toString()}`
    );
  }

  async getUserById(id: string): Promise<User> {
    return this.apiClient.get<User>(`/users/${id}`);
  }

  async createUser(user: CreateUserDTO): Promise<User> {
    return this.apiClient.post<User>('/users', user);
  }

  async updateUser(id: string, user: UpdateUserDTO): Promise<User> {
    return this.apiClient.put<User>(`/users/${id}`, user);
  }

  async deleteUser(id: string): Promise<void> {
    return this.apiClient.delete(`/users/${id}`);
  }
}
```

## 設定管理

### 環境設定の型安全な管理

```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform((val) => parseInt(val, 10)),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REDIS_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.string().transform((val) => parseInt(val, 10)).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform((val) => parseInt(val, 10)).default('100')
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);

// config/database.ts
import { env } from './env';

export const databaseConfig = {
  url: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production',
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    directory: './src/db/migrations'
  },
  seeds: {
    directory: './src/db/seeds'
  }
};
```

## エラーハンドリング

### 統一されたエラー処理

```typescript
// utils/errorHandler.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

// Global error handler for Express
export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      }
    });
  }

  // Unexpected errors
  console.error('Unexpected error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong'
    }
  });
};
```

## テスト構造

### テストファイルの組織化

```typescript
// tests/helpers/testHelpers.ts
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
};

export const renderWithProviders = (
  ui: React.ReactElement,
  { queryClient = createTestQueryClient(), ...options } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

// tests/mocks/userService.ts
import { User } from '@/types/entities/user';

export const mockUser: User = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'user',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01')
};

export const userServiceMock = {
  getUsers: jest.fn(),
  getUserById: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn()
};
```

## パフォーマンス最適化

### 動的インポートとコード分割

```typescript
// routes/lazyRoutes.ts
import { lazy } from 'react';

export const Dashboard = lazy(() => import('@/features/dashboard/Dashboard'));
export const UserList = lazy(() => import('@/features/users/UserList'));
export const UserDetail = lazy(() => import('@/features/users/UserDetail'));
export const Settings = lazy(() => import('@/features/settings/Settings'));

// hooks/usePreloadRoute.ts
import { useEffect } from 'react';

export const usePreloadRoute = (routeName: string) => {
  useEffect(() => {
    const preloadComponent = async () => {
      switch (routeName) {
        case 'dashboard':
          await import('@/features/dashboard/Dashboard');
          break;
        case 'users':
          await import('@/features/users/UserList');
          break;
        default:
          break;
      }
    };

    const timer = setTimeout(preloadComponent, 2000);
    return () => clearTimeout(timer);
  }, [routeName]);
};
```

## まとめ

大規模TypeScriptプロジェクトを成功させるポイント：

1. **明確な構造**: 機能別・レイヤー別の明確な分離
2. **型安全性**: 厳密な型定義とバリデーション
3. **スケーラビリティ**: 機能追加に対応できる柔軟な設計
4. **保守性**: 理解しやすく変更しやすいコード
5. **テスタビリティ**: 包括的なテスト戦略
6. **パフォーマンス**: 効率的なバンドルサイズとロード時間

これらの原則に従うことで、長期的に保守可能な大規模TypeScriptアプリケーションを構築できます。