---
title: "TypeScriptでのエラーハンドリング"
description: "TypeScriptを使った開発において、エラーハンドリングは品質と保守性を左右する重要な要素です。しかし、従来のtry-catchによる例外処理では、型システムの恩恵を十分に受けられない場合があります。"
---

# TypeScriptでのエラーハンドリング

## はじめに

TypeScriptを使った開発において、エラーハンドリングは品質と保守性を左右する重要な要素です。しかし、従来の`try-catch`による例外処理では、型システムの恩恵を十分に受けられない場合があります。この記事では、型安全なエラーハンドリングパターンを紹介し、より堅牢なコードを書く方法を解説します。

## 従来のtry-catchの問題点

JavaScript/TypeScriptで一般的なエラーハンドリングは`try-catch`文を使います：

```typescript
async function fetchUserData(userId: string) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    // errorはany型なので、どんなエラーか分からない
    console.error(error);
    throw error;
  }
}
```

このアプローチにはいくつかの問題があります：

1. **型安全性の欠如**: catch節の`error`はデフォルトで`unknown`または`any`型
2. **エラーの種類が不明**: 関数の戻り値からは成功時の型しかわからない
3. **制御フローの複雑化**: 例外がどこで投げられるか追跡困難

## Result型を使った関数型エラーハンドリング

関数型プログラミングでは、エラーを例外として投げるのではなく、戻り値として表現します。Result型（Either型）は、このアプローチを実現します：

```typescript
type Result<T, E> = 
  | { success: true; value: T }
  | { success: false; error: E };

// エラー型の定義
class NetworkError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'NetworkError';
  }
}

class ValidationError extends Error {
  constructor(message: string, public fields: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Result型を返す関数
async function fetchUserData(
  userId: string
): Promise<Result<User, NetworkError | ValidationError>> {
  try {
    const response = await fetch(`/api/users/${userId}`);
    
    if (!response.ok) {
      return {
        success: false,
        error: new NetworkError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        )
      };
    }

    const data = await response.json();
    
    if (!isValidUser(data)) {
      return {
        success: false,
        error: new ValidationError(
          'Invalid user data format',
          ['name', 'email']
        )
      };
    }

    return { success: true, value: data };
  } catch (error) {
    return {
      success: false,
      error: new NetworkError(
        error instanceof Error ? error.message : 'Unknown error',
        0
      )
    };
  }
}
```

Result型を使うことで：

- 関数のシグネチャから成功と失敗の両方が型として表現される
- コンパイル時にエラーハンドリングの漏れを検出できる
- エラーの種類に応じた処理が型安全に行える

## neverthrowライブラリの紹介

Result型を自作する代わりに、[neverthrow](https://github.com/supermacro/neverthrow)ライブラリを使うと便利です：

```bash
npm install neverthrow
```

### 基本的な使い方

```typescript
import { ok, err, Result } from 'neverthrow';

// 成功時
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return err('Division by zero');
  }
  return ok(a / b);
}

// 使用例
const result = divide(10, 2);

if (result.isOk()) {
  console.log('Result:', result.value); // 5
} else {
  console.error('Error:', result.error);
}
```

### mapとmapErrによる変換

```typescript
import { ok, err, Result } from 'neverthrow';

class ApiError extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}

async function fetchPrice(itemId: string): Promise<Result<number, ApiError>> {
  const response = await fetch(`/api/items/${itemId}/price`);
  
  if (!response.ok) {
    return err(new ApiError(response.status, 'Failed to fetch price'));
  }
  
  const data = await response.json();
  return ok(data.price);
}

// 関数の合成
async function calculateTotal(itemIds: string[]): Promise<Result<number, ApiError>> {
  let total = 0;
  
  for (const id of itemIds) {
    const priceResult = await fetchPrice(id);
    
    if (priceResult.isErr()) {
      return err(priceResult.error);
    }
    
    total += priceResult.value;
  }
  
  return ok(total);
}

// メソッドチェーンによる整形
const result = await fetchPrice('item-123')
  .map(price => price * 1.1) // 税込価格に変換
  .mapErr(error => {
    console.error(`API Error [${error.code}]: ${error.message}`);
    return error;
  });
```

### asyncResultによる非同期処理

```typescript
import { ResultAsync, okAsync, errAsync } from 'neverthrow';

function validateEmail(email: string): Result<string, string> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) 
    ? ok(email) 
    : err('Invalid email format');
}

function checkEmailExists(email: string): ResultAsync<boolean, string> {
  return ResultAsync.fromPromise(
    fetch(`/api/check-email?email=${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(data => data.exists),
    () => 'Network error'
  );
}

// チェーンによるバリデーション
const registrationResult = validateEmail('user@example.com')
  .asyncAndThen(email => 
    checkEmailExists(email).map(exists => ({ email, exists }))
  )
  .andThen(({ email, exists }) => {
    if (exists) {
      return errAsync('Email already registered');
    }
    return okAsync(email);
  });
```

## 実践的なエラーハンドリングパターン

### API呼び出しのラッパー

```typescript
import { Result, ResultAsync, ok, err } from 'neverthrow';

interface ApiClientConfig {
  baseUrl: string;
  headers?: Record<string, string>;
}

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public responseBody?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

class TimeoutError extends Error {
  constructor(public timeoutMs: number) {
    super(`Request timeout after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

type ApiClientError = ApiError | NetworkError | TimeoutError;

class ApiClient {
  constructor(private config: ApiClientConfig) {}

  async get<T>(path: string, timeoutMs = 10000): Promise<Result<T, ApiClientError>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        method: 'GET',
        headers: this.config.headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const body = await response.json().catch(() => undefined);
        return err(new ApiError(response.status, response.statusText, body));
      }

      const data: T = await response.json();
      return ok(data);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return err(new TimeoutError(timeoutMs));
        }
        return err(new NetworkError(error.message));
      }
      
      return err(new NetworkError('Unknown network error'));
    }
  }
}

// 使用例
const api = new ApiClient({
  baseUrl: 'https://api.example.com',
  headers: { 'Authorization': 'Bearer token123' }
});

const userResult = await api.get<User>('/users/123');

userResult
  .map(user => console.log('User:', user.name))
  .mapErr(error => {
    if (error instanceof TimeoutError) {
      showToast('Request timed out. Please try again.');
    } else if (error instanceof ApiError && error.statusCode === 404) {
      showToast('User not found');
    } else {
      showToast('An error occurred');
    }
  });
```

### バリデーションの統合

```typescript
import { Result, ok, err } from 'neverthrow';
import { z } from 'zod';

// Zodとneverthrowの統合
function validateWithZod<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Result<T, z.ZodError> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return ok(result.data);
  }
  
  return err(result.error);
}

// ユーザースキーマ
const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
});

type User = z.infer<typeof userSchema>;

// バリデーション付きのパース
const parseUser = (data: unknown): Result<User, z.ZodError> =>
  validateWithZod(userSchema, data);

// エラーメッセージの整形
const parseUserWithCustomError = (data: unknown): Result<User, string> =>
  validateWithZod(userSchema, data).mapErr(formatZodError);

function formatZodError(error: z.ZodError): string {
  return error.errors
    .map(e => `${e.path.join('.')}: ${e.message}`)
    .join(', ');
}

// 実践的な使用例
const userData = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
};

const user = parseUser(userData)
  .map(user => {
    console.log('Valid user:', user);
    return user;
  })
  .mapErr(error => {
    console.error('Validation failed:', formatZodError(error));
    return error;
  });
```

## エラー型の設計ベストプラクティス

### 階層的なエラー設計

```typescript
// 基底エラー型
abstract class AppError extends Error {
  abstract readonly type: string;
  abstract readonly isRetryable: boolean;
  
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// ドメイン固有のエラー
class ValidationError extends AppError {
  readonly type = 'VALIDATION';
  readonly isRetryable = false;
  
  constructor(
    message: string,
    public readonly fields: Record<string, string[]>
  ) {
    super(message);
  }
}

class NotFoundError extends AppError {
  readonly type = 'NOT_FOUND';
  readonly isRetryable = false;
  
  constructor(
    message: string,
    public readonly resource: string,
    public readonly id: string
  ) {
    super(message);
  }
}

class ExternalServiceError extends AppError {
  readonly type = 'EXTERNAL_SERVICE';
  readonly isRetryable = true;
  
  constructor(
    message: string,
    public readonly service: string,
    public readonly originalError: unknown
  ) {
    super(message);
  }
}

// エラーハンドリングの統一
function handleError(error: AppError): void {
  // ログ出力
  console.error(`[${error.type}] ${error.message}`);
  
  // ユーザーフィードバック
  switch (error.type) {
    case 'VALIDATION':
      showValidationErrors((error as ValidationError).fields);
      break;
    case 'NOT_FOUND':
      showNotFoundPage();
      break;
    case 'EXTERNAL_SERVICE':
      if (error.isRetryable) {
        showRetryButton();
      } else {
        showErrorMessage('Service temporarily unavailable');
      }
      break;
  }
}
```

### Result型のエイリアス

プロジェクト全体で統一されたエラー型を使うためのエイリアス：

```typescript
// types/result.ts
import { Result as NeverthrowResult, ResultAsync as NeverthrowResultAsync } from 'neverthrow';
import { AppError } from './errors';

// プロジェクト固有のResult型
export type Result<T> = NeverthrowResult<T, AppError>;
export type ResultAsync<T> = NeverthrowResultAsync<T, AppError>;

// エラーの型推論ヘルパー
export type ResultError<T> = T extends NeverthrowResult<infer _, infer E> ? E : never;
```

## まとめ

TypeScriptでのエラーハンドリングを改善するためのポイント：

1. **Result型を活用する**: 例外ではなく戻り値としてエラーを表現し、型安全性を確保する
2. **neverthrowライブラリを使う**: 標準化されたResult型の実装で、コードの一貫性を保つ
3. **エラー型を設計する**: 階層的で意味のあるエラー型を定義し、適切なハンドリングを可能にする
4. **バリデーションと統合する**: Zodなどのライブラリと組み合わせ、入力検証も型安全に行う

これらのパターンを導入することで、ランタイムエラーの発生を減らし、コードの可読性と保守性を大幅に向上させることができます。
