# TypeScriptのプリミティブ型とリテラル型

TypeScriptにおける基本的なデータ型であるプリミティブ型と、より具体的な値を表現するリテラル型について詳しく解説します。

## プリミティブ型の概要

プリミティブ型は、JavaScriptの基本的なデータ型に対応するTypeScriptの型です。

### 1. number型

```typescript
// 整数
let integer: number = 42;
let negativeInt: number = -10;

// 浮動小数点数
let float: number = 3.14;
let scientific: number = 1e10;

// 特殊な数値
let infinity: number = Infinity;
let negativeInfinity: number = -Infinity;
let notANumber: number = NaN;

// 16進数、8進数、2進数
let hex: number = 0xff;
let octal: number = 0o744;
let binary: number = 0b1010;
```

### 2. string型

```typescript
// 基本的な文字列
let message: string = "Hello, TypeScript!";
let singleQuote: string = 'シングルクォート';

// テンプレートリテラル
let name: string = "太郎";
let age: number = 25;
let greeting: string = `こんにちは、${name}さん。${age}歳ですね。`;

// マルチライン文字列
let multiline: string = `
    これは
    複数行の
    文字列です
`;
```

### 3. boolean型

```typescript
let isComplete: boolean = true;
let isLoading: boolean = false;

// 論理演算の結果
let hasPermission: boolean = user.role === 'admin';
let isValid: boolean = input.length > 0 && input.length < 100;
```

### 4. null と undefined

```typescript
let nullValue: null = null;
let undefinedValue: undefined = undefined;

// 通常は、他の型との組み合わせで使用
let optionalName: string | null = null;
let maybeAge: number | undefined = undefined;
```

### 5. symbol型

```typescript
// ユニークなシンボル
let sym1: symbol = Symbol();
let sym2: symbol = Symbol("description");

// シンボルは常にユニーク
console.log(sym1 === sym2); // false

// オブジェクトのプロパティキーとして使用
const PRIVATE_KEY: symbol = Symbol("private");

class MyClass {
    [PRIVATE_KEY]: string = "秘密の値";
    
    getPrivateValue(): string {
        return this[PRIVATE_KEY];
    }
}
```

### 6. bigint型

```typescript
// 大きな整数を扱う
let bigNumber: bigint = 123456789012345678901234567890n;
let anotherBig: bigint = BigInt("987654321098765432109876543210");

// 通常のnumberとは互換性がない
let regularNumber: number = 42;
// let invalid: bigint = regularNumber; // Error
```

## リテラル型の活用

リテラル型は、特定の値のみを許可する型です。

### 1. 文字列リテラル型

```typescript
// 特定の文字列のみを許可
type Direction = "north" | "south" | "east" | "west";
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

function move(direction: Direction) {
    console.log(`${direction}に移動します`);
}

move("north"); // OK
// move("northeast"); // Error: Argument of type '"northeast"' is not assignable

// APIエンドポイントの定義
type ApiEndpoint = "/users" | "/posts" | "/comments";

function callApi(endpoint: ApiEndpoint, method: HttpMethod) {
    fetch(endpoint, { method });
}
```

### 2. 数値リテラル型

```typescript
// 特定の数値のみを許可
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;
type HttpStatusCode = 200 | 201 | 400 | 401 | 403 | 404 | 500;

function rollDice(): DiceRoll {
    return (Math.floor(Math.random() * 6) + 1) as DiceRoll;
}

function handleResponse(status: HttpStatusCode) {
    switch (status) {
        case 200:
        case 201:
            console.log("成功");
            break;
        case 400:
        case 401:
        case 403:
        case 404:
            console.log("クライアントエラー");
            break;
        case 500:
            console.log("サーバーエラー");
            break;
    }
}
```

### 3. ブール値リテラル型

```typescript
// 特定のブール値のみを許可
type AlwaysTrue = true;
type AlwaysFalse = false;

// 条件によって型が変わる関数
function createConfig(isDevelopment: true): DevConfig;
function createConfig(isDevelopment: false): ProdConfig;
function createConfig(isDevelopment: boolean): DevConfig | ProdConfig {
    if (isDevelopment) {
        return { debug: true, logLevel: "verbose" };
    }
    return { debug: false, logLevel: "error" };
}
```

## 実践的な使用例

### 1. 状態管理での活用

```typescript
// アプリケーションの状態を型安全に管理
type LoadingState = "idle" | "loading" | "success" | "error";

interface AppState {
    status: LoadingState;
    data: any[] | null;
    error: string | null;
}

function updateState(state: AppState, newStatus: LoadingState) {
    return {
        ...state,
        status: newStatus,
        data: newStatus === "success" ? state.data : null,
        error: newStatus === "error" ? state.error : null
    };
}
```

### 2. 設定オブジェクトでの活用

```typescript
// 設定の型安全性を確保
type LogLevel = "debug" | "info" | "warn" | "error";
type Environment = "development" | "staging" | "production";

interface Config {
    env: Environment;
    logLevel: LogLevel;
    port: 3000 | 8080 | 9000;
    enableCache: boolean;
}

function createServer(config: Config) {
    console.log(`Starting server on port ${config.port}`);
    console.log(`Environment: ${config.env}`);
    console.log(`Log level: ${config.logLevel}`);
}

// 型安全な設定
const config: Config = {
    env: "development",
    logLevel: "debug",
    port: 3000,
    enableCache: false
};
```

### 3. イベントハンドリングでの活用

```typescript
// イベントタイプを型安全に管理
type UserEvent = 
    | { type: "login"; userId: string; timestamp: number }
    | { type: "logout"; userId: string; timestamp: number }
    | { type: "purchase"; userId: string; productId: string; amount: number }
    | { type: "view"; userId: string; pageUrl: string };

function handleUserEvent(event: UserEvent) {
    switch (event.type) {
        case "login":
            console.log(`User ${event.userId} logged in at ${event.timestamp}`);
            break;
        case "logout":
            console.log(`User ${event.userId} logged out at ${event.timestamp}`);
            break;
        case "purchase":
            console.log(`User ${event.userId} purchased ${event.productId} for ${event.amount}`);
            break;
        case "view":
            console.log(`User ${event.userId} viewed ${event.pageUrl}`);
            break;
        default:
            // TypeScriptが網羅性をチェック
            const exhaustiveCheck: never = event;
            throw new Error(`Unhandled event type: ${exhaustiveCheck}`);
    }
}
```

## 型の絞り込み（Type Narrowing）

### typeof演算子を使った絞り込み

```typescript
function processValue(value: string | number) {
    if (typeof value === "string") {
        // この中では value は string 型
        console.log(value.toUpperCase());
    } else {
        // この中では value は number 型
        console.log(value.toFixed(2));
    }
}
```

### リテラル型での絞り込み

```typescript
type Animal = "dog" | "cat" | "bird";

function getSound(animal: Animal): string {
    switch (animal) {
        case "dog":
            return "ワンワン";
        case "cat":
            return "ニャーニャー";
        case "bird":
            return "チュンチュン";
        default:
            // すべてのケースを網羅しているかチェック
            const exhaustiveCheck: never = animal;
            throw new Error(`Unknown animal: ${exhaustiveCheck}`);
    }
}
```

## ベストプラクティス

### 1. 意味のあるリテラル型の使用

```typescript
// 良い例：意味が明確
type Theme = "light" | "dark";
type Size = "small" | "medium" | "large";

// 避けるべき例：魔法の文字列
type Status = "1" | "2" | "3"; // 何を意味するか不明
```

### 2. constアサーションの活用

```typescript
// as const を使用してリテラル型を保持
const colors = ["red", "green", "blue"] as const;
type Color = typeof colors[number]; // "red" | "green" | "blue"

const config = {
    apiUrl: "https://api.example.com",
    timeout: 5000,
    retries: 3
} as const;

// config.apiUrl は "https://api.example.com" 型（string型ではない）
```

### 3. 型ガードとの組み合わせ

```typescript
function isValidDirection(value: string): value is Direction {
    return ["north", "south", "east", "west"].includes(value as Direction);
}

function processDirection(input: string) {
    if (isValidDirection(input)) {
        // この中では input は Direction 型
        move(input);
    } else {
        console.error("Invalid direction");
    }
}
```

## まとめ

プリミティブ型とリテラル型は、TypeScriptの型システムの基礎となる重要な概念です：

- **プリミティブ型**: JavaScriptの基本的なデータ型に対応
- **リテラル型**: 特定の値のみを許可し、より厳密な型安全性を提供
- **実践的な活用**: 状態管理、設定、イベント処理などで威力を発揮
- **型の絞り込み**: 条件分岐によって型を絞り込み、より安全なコードを実現

次の記事では、オブジェクト型とインターフェースについて学習していきます。

## 参考資料

- [TypeScript Handbook - Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [TypeScript Handbook - Literal Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types)