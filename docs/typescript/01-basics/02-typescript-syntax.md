# TypeScriptの基本構文

TypeScriptの基本的な構文と型システムの使い方を学びます。

## 変数の宣言と型注釈

### 基本的な型注釈

```typescript
// プリミティブ型
let name: string = "John";
let age: number = 30;
let isActive: boolean = true;
let value: null = null;
let data: undefined = undefined;

// 型推論（型注釈を省略）
let autoName = "Jane"; // string型として推論
let autoAge = 25;      // number型として推論
```

### let、const、varの使い分け

```typescript
// const: 再代入不可
const PI: number = 3.14159;

// let: ブロックスコープ、再代入可能
let counter: number = 0;
counter = 1; // OK

// var: 関数スコープ（非推奨）
var oldStyle: string = "avoid using var";
```

## 配列と配列型

```typescript
// 配列の型注釈の方法
let numbers: number[] = [1, 2, 3, 4, 5];
let strings: Array<string> = ["apple", "banana", "orange"];

// 混合型の配列
let mixed: (string | number)[] = ["hello", 42, "world"];

// 読み取り専用配列
let readOnlyNumbers: readonly number[] = [1, 2, 3];
// readOnlyNumbers.push(4); // エラー: readonly配列には要素を追加できない
```

## オブジェクトと型定義

### インライン型定義

```typescript
let user: { name: string; age: number; email?: string } = {
  name: "Alice",
  age: 28
  // emailは省略可能（?マーク）
};
```

### インターフェースの定義

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  isAdmin?: boolean; // オプショナルプロパティ
  readonly createdAt: Date; // 読み取り専用
}

const newUser: User = {
  id: 1,
  name: "Bob",
  email: "bob@example.com",
  createdAt: new Date()
};

// newUser.createdAt = new Date(); // エラー: readonlyプロパティ
```

## 関数と関数型

### 関数の型注釈

```typescript
// 関数宣言
function add(a: number, b: number): number {
  return a + b;
}

// 関数式
const multiply = (a: number, b: number): number => {
  return a * b;
};

// アロー関数（短縮形）
const divide = (a: number, b: number): number => a / b;
```

### オプション引数とデフォルト引数

```typescript
// オプション引数
function greet(name: string, greeting?: string): string {
  return `${greeting || "Hello"}, ${name}!`;
}

// デフォルト引数
function createUser(name: string, role: string = "user"): User {
  return {
    id: Math.random(),
    name,
    email: `${name}@example.com`,
    role,
    createdAt: new Date()
  };
}
```

### 関数のオーバーロード

```typescript
// オーバーロードシグネチャ
function format(value: string): string;
function format(value: number): string;
function format(value: boolean): string;

// 実装
function format(value: string | number | boolean): string {
  return String(value);
}

console.log(format("hello"));   // OK
console.log(format(42));        // OK
console.log(format(true));      // OK
```

## 型エイリアス

```typescript
// 型エイリアスの定義
type Status = "pending" | "approved" | "rejected";
type UserRole = "admin" | "user" | "moderator";

// 複雑な型の再利用
type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

type UserApiResponse = ApiResponse<User>;
```

## ユニオン型とインターセクション型

### ユニオン型（OR）

```typescript
type StringOrNumber = string | number;

function processValue(value: StringOrNumber): string {
  if (typeof value === "string") {
    return value.toUpperCase();
  } else {
    return value.toString();
  }
}
```

### インターセクション型（AND）

```typescript
interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

interface Identifiable {
  id: string;
}

type Entity = User & Timestamped & Identifiable;

const entity: Entity = {
  id: "123",
  name: "John",
  email: "john@example.com",
  createdAt: new Date(),
  updatedAt: new Date()
};
```

## 型ガード

```typescript
// typeof型ガード
function isString(value: unknown): value is string {
  return typeof value === "string";
}

// instanceof型ガード
class Dog {
  breed: string;
  constructor(breed: string) {
    this.breed = breed;
  }
}

function isDog(animal: unknown): animal is Dog {
  return animal instanceof Dog;
}

// カスタム型ガード
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "name" in obj &&
    "email" in obj
  );
}
```

## クラスの基本

```typescript
class Animal {
  protected name: string;
  private age: number;
  public species: string;

  constructor(name: string, age: number, species: string) {
    this.name = name;
    this.age = age;
    this.species = species;
  }

  public makeSound(): void {
    console.log("Some generic sound");
  }

  protected getName(): string {
    return this.name;
  }

  // getter/setter
  get animalAge(): number {
    return this.age;
  }

  set animalAge(value: number) {
    if (value > 0) {
      this.age = value;
    }
  }
}

class Dog extends Animal {
  constructor(name: string, age: number) {
    super(name, age, "dog");
  }

  public makeSound(): void {
    console.log("Woof!");
  }

  public showName(): void {
    console.log(this.getName()); // protectedメソッドにアクセス可能
  }
}
```

## エラーハンドリング

```typescript
// 例外の型定義
class CustomError extends Error {
  constructor(
    message: string,
    public code: number
  ) {
    super(message);
    this.name = "CustomError";
  }
}

// try-catch文
function riskyOperation(): string {
  try {
    // 何らかの処理
    throw new CustomError("Something went wrong", 500);
  } catch (error) {
    if (error instanceof CustomError) {
      console.log(`Error ${error.code}: ${error.message}`);
      return "fallback value";
    }
    throw error; // 予期しないエラーは再スロー
  }
}
```

## 非同期処理

```typescript
// Promise
async function fetchUser(id: string): Promise<User | null> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const user: User = await response.json();
    return user;
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return null;
  }
}

// Promiseの型定義
type PromiseResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

async function safeApiCall<T>(
  operation: () => Promise<T>
): Promise<PromiseResult<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
```

## モジュールとインポート/エクスポート

```typescript
// named export
export interface User {
  id: string;
  name: string;
}

export function createUser(name: string): User {
  return {
    id: crypto.randomUUID(),
    name
  };
}

// default export
export default class UserService {
  async getUser(id: string): Promise<User | null> {
    // 実装
    return null;
  }
}

// インポート
import UserService, { User, createUser } from "./userService";
import * as UserModule from "./userService";
```

## まとめ

TypeScriptの基本構文のポイント：

1. **型注釈**: 変数や関数の型を明示的に指定
2. **型推論**: TypeScriptが自動的に型を推測
3. **インターフェース**: オブジェクトの型を定義
4. **ユニオン型**: 複数の型のいずれかを許可
5. **型ガード**: 実行時に型を確認
6. **クラス**: オブジェクト指向プログラミングのサポート
7. **非同期処理**: Promise とasync/await の型安全な使用

これらの基本を理解することで、型安全なTypeScriptコードを書くことができるようになります。