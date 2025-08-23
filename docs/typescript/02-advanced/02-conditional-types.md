# TypeScriptの条件型（Conditional Types）

TypeScript 2.8で導入された条件型は、型レベルでの条件分岐を可能にする強力な機能です。これにより、動的で表現豊かな型システムを構築できます。

## 条件型の基本構文

条件型は三項演算子に似た構文を使用します：

```typescript
T extends U ? X : Y
```

- `T extends U`が真の場合、型は`X`になる
- `T extends U`が偽の場合、型は`Y`になる

### 基本例

```typescript
type IsString<T> = T extends string ? true : false;

type Test1 = IsString<string>;  // true
type Test2 = IsString<number>;  // false
type Test3 = IsString<"hello">; // true（文字列リテラル型）
```

## 実用的な条件型の例

### 1. NonNullable型の実装

```typescript
// TypeScript組み込みのNonNullableの再実装
type MyNonNullable<T> = T extends null | undefined ? never : T;

type Example1 = MyNonNullable<string | null>;      // string
type Example2 = MyNonNullable<number | undefined>; // number
type Example3 = MyNonNullable<boolean | null | undefined>; // boolean
```

### 2. 関数の戻り値型を取得

```typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function getUserInfo() {
    return { name: "太郎", age: 25, email: "taro@example.com" };
}

type UserInfo = ReturnType<typeof getUserInfo>;
// { name: string; age: number; email: string; }
```

### 3. 配列の要素型を取得

```typescript
type ElementType<T> = T extends (infer U)[] ? U : never;

type StringArrayElement = ElementType<string[]>;     // string
type NumberArrayElement = ElementType<number[]>;     // number
type ObjectArrayElement = ElementType<{ id: number; name: string }[]>; 
// { id: number; name: string }
```

## infer キーワード

`infer`キーワードは、条件型内で型を推論して変数に格納するために使用されます。

### 基本的な使用法

```typescript
// 関数の引数の型を取得
type Parameters<T> = T extends (...args: infer P) => any ? P : never;

function example(a: string, b: number, c: boolean) {
    return { a, b, c };
}

type ExampleParams = Parameters<typeof example>; // [string, number, boolean]
```

### Promiseの中身を取得

```typescript
type Awaited<T> = T extends Promise<infer U> ? U : T;

type AsyncData = Promise<{ userId: number; userName: string }>;
type SyncData = Awaited<AsyncData>; // { userId: number; userName: string }

// ネストしたPromiseにも対応
type NestedPromise = Promise<Promise<string>>;
type UnwrappedNested = Awaited<NestedPromise>; // string
```

### 複雑な型推論

```typescript
// オブジェクトのキーと値の型を分離
type KeyValuePair<T> = T extends { [K in infer Keys]: infer Values } 
    ? { key: Keys; value: Values } 
    : never;

// より実用的な例：オブジェクトの値の型のユニオンを取得
type ValueOf<T> = T[keyof T];

interface User {
    id: number;
    name: string;
    isActive: boolean;
}

type UserValues = ValueOf<User>; // number | string | boolean
```

## 分散条件型（Distributive Conditional Types）

条件型がユニオン型に適用されると、各メンバーに対して分散的に適用されます。

```typescript
type ToArray<T> = T extends any ? T[] : never;

type StringOrNumber = string | number;
type ArrayType = ToArray<StringOrNumber>; // string[] | number[]

// 分散を防ぐ場合は、Tを配列で囲む
type ToArrayNonDistributive<T> = [T] extends [any] ? T[] : never;
type NonDistributive = ToArrayNonDistributive<string | number>; // (string | number)[]
```

### 実用例：特定の型を除外

```typescript
type Exclude<T, U> = T extends U ? never : T;

type PrimitiveTypes = string | number | boolean | null | undefined;
type WithoutNull = Exclude<PrimitiveTypes, null>; 
// string | number | boolean | undefined

type Extract<T, U> = T extends U ? T : never;
type OnlyStringsAndNumbers = Extract<PrimitiveTypes, string | number>; 
// string | number
```

## 高度な条件型のパターン

### 1. オブジェクトの特定プロパティのみを抽出

```typescript
type PickByType<T, U> = {
    [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

interface Person {
    name: string;
    age: number;
    isStudent: boolean;
    hobbies: string[];
}

type StringKeys = PickByType<Person, string>; // "name"
type NumberKeys = PickByType<Person, number>; // "age"
type ArrayKeys = PickByType<Person, any[]>;   // "hobbies"
```

### 2. 深いネストしたオブジェクトのパス

```typescript
type DeepKeys<T> = T extends object
    ? {
        [K in keyof T]: K extends string
            ? T[K] extends object
                ? `${K}` | `${K}.${DeepKeys<T[K]>}`
                : `${K}`
            : never;
    }[keyof T]
    : never;

interface NestedObject {
    user: {
        profile: {
            name: string;
            age: number;
        };
        settings: {
            theme: string;
        };
    };
    metadata: {
        version: string;
    };
}

type Paths = DeepKeys<NestedObject>;
// "user" | "metadata" | "user.profile" | "user.settings" | "user.profile.name" | 
// "user.profile.age" | "user.settings.theme" | "metadata.version"
```

### 3. 関数のオーバーロードを型安全に実装

```typescript
type ApiEndpoint = 
    | { path: "/users"; method: "GET"; response: User[] }
    | { path: "/users"; method: "POST"; body: CreateUserRequest; response: User }
    | { path: "/users/:id"; method: "GET"; params: { id: string }; response: User }
    | { path: "/users/:id"; method: "DELETE"; params: { id: string }; response: void };

type GetEndpoint<Path extends string, Method extends string> = Extract<
    ApiEndpoint,
    { path: Path; method: Method }
>;

// 型安全なAPI呼び出し関数
function apiCall<Path extends string, Method extends string>(
    path: Path,
    method: Method,
    options?: GetEndpoint<Path, Method> extends { body: infer B } ? { body: B } :
             GetEndpoint<Path, Method> extends { params: infer P } ? { params: P } :
             {}
): Promise<GetEndpoint<Path, Method>["response"]> {
    // 実装...
    return Promise.resolve({} as any);
}

// 使用例（型安全）
apiCall("/users", "GET"); // Promise<User[]>
apiCall("/users", "POST", { body: { name: "太郎", email: "taro@example.com" } });
apiCall("/users/:id", "GET", { params: { id: "123" } }); // Promise<User>
```

## 条件型を使ったユーティリティ型

### 1. 型安全なイベントエミッター

```typescript
type EventMap = {
    click: { x: number; y: number };
    keypress: { key: string; altKey: boolean };
    resize: { width: number; height: number };
};

type EventNames = keyof EventMap;

type EventListener<T extends EventNames> = (event: EventMap[T]) => void;

class TypeSafeEventEmitter {
    private listeners: {
        [K in EventNames]?: EventListener<K>[];
    } = {};

    on<T extends EventNames>(eventName: T, listener: EventListener<T>) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName]!.push(listener);
    }

    emit<T extends EventNames>(
        eventName: T, 
        event: EventMap[T]
    ) {
        const listeners = this.listeners[eventName];
        if (listeners) {
            listeners.forEach(listener => listener(event));
        }
    }
}

// 使用例
const emitter = new TypeSafeEventEmitter();

emitter.on("click", (event) => {
    console.log(`クリック位置: ${event.x}, ${event.y}`); // 型安全
});

emitter.emit("click", { x: 100, y: 200 });
```

### 2. 型安全な状態管理

```typescript
type StateUpdater<T> = {
    [K in keyof T]: T[K] extends object 
        ? StateUpdater<T[K]> & ((value: T[K]) => void)
        : (value: T[K]) => void;
} & ((value: Partial<T>) => void);

interface AppState {
    user: {
        name: string;
        preferences: {
            theme: "light" | "dark";
            language: string;
        };
    };
    ui: {
        isLoading: boolean;
        notifications: string[];
    };
}

// 実装は省略...
declare function createStateManager<T>(): StateUpdater<T>;

const stateManager = createStateManager<AppState>();

// 型安全な状態更新
stateManager.user.name("新しい名前");
stateManager.user.preferences.theme("dark");
stateManager.ui.isLoading(false);
```

## パフォーマンスとベストプラクティス

### 1. 複雑な条件型の分割

```typescript
// 避けるべき：複雑すぎる条件型
type ComplexType<T> = T extends string 
    ? T extends `${infer Prefix}_${infer Suffix}` 
        ? Prefix extends "user"
            ? { type: "user"; data: Suffix }
            : Prefix extends "admin"
                ? { type: "admin"; data: Suffix }
                : never
        : { type: "simple"; data: T }
    : never;

// 推奨：段階的に分割
type ParsePrefix<T> = T extends `${infer Prefix}_${infer Suffix}` 
    ? { prefix: Prefix; suffix: Suffix }
    : never;

type CreateUserType<T> = T extends { prefix: "user"; suffix: infer S }
    ? { type: "user"; data: S }
    : never;

type CreateAdminType<T> = T extends { prefix: "admin"; suffix: infer S }
    ? { type: "admin"; data: S }
    : never;

type BetterType<T> = T extends string
    ? ParsePrefix<T> extends never
        ? { type: "simple"; data: T }
        : CreateUserType<ParsePrefix<T>> | CreateAdminType<ParsePrefix<T>>
    : never;
```

### 2. 型の循環参照の回避

```typescript
// 潜在的な問題：無限再帰
type DeepReadonly<T> = {
    readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// 改善版：深度制限付き
type DeepReadonlyWithLimit<T, Depth extends readonly number[] = []> = 
    Depth['length'] extends 10 
        ? T
        : {
            readonly [K in keyof T]: T[K] extends object 
                ? DeepReadonlyWithLimit<T[K], [...Depth, 1]>
                : T[K];
        };
```

## まとめ

条件型は TypeScript の最も強力な機能の一つです：

- **動的な型生成**: 入力型に基づいて出力型を決定
- **型安全な API**: より表現豊かで安全な API 設計が可能
- **高度な型操作**: 複雑な型変換と推論が可能
- **実用的な応用**: 実際の開発で威力を発揮する多くのユーティリティ型

ただし、複雑になりすぎないよう注意し、可読性とのバランスを保つことが重要です。

次の記事では、TSConfigの詳細設定について学習していきます。

## 参考資料

- [TypeScript Handbook - Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [TypeScript 公式 Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)