# TypeScript型システムの基礎

TypeScriptの最大の特徴である型システムについて、基本概念から実用的な使い方まで詳しく解説します。

## 型システムとは

型システムは、プログラムの値に対して「型」という分類を付与し、その型に基づいてコンパイル時にエラーを検出する仕組みです。TypeScriptの型システムは以下の特徴を持ちます：

- **構造的型システム（Structural Type System）**: 型の互換性を形状（構造）で判断
- **漸進的型付け（Gradual Typing）**: JavaScriptコードを段階的に型付けできる
- **型推論（Type Inference）**: 明示的な型注釈がなくても型を推測

## 基本的な型注釈

### 変数の型注釈

```typescript
// 基本的な型注釈
let name: string = "TypeScript";
let age: number = 5;
let isActive: boolean = true;

// 型推論を活用（推奨）
let inferredName = "TypeScript"; // string型として推論
let inferredAge = 5; // number型として推論
let inferredActive = true; // boolean型として推論
```

### 関数の型注釈

```typescript
// 関数の引数と戻り値に型を指定
function greet(name: string): string {
    return `Hello, ${name}!`;
}

// アロー関数での型注釈
const add = (a: number, b: number): number => {
    return a + b;
};

// 戻り値の型推論
const multiply = (a: number, b: number) => a * b; // number型として推論
```

## 構造的型システムの理解

TypeScriptは「duck typing」の概念に基づいています。つまり、「アヒルのように歩き、アヒルのように鳴くなら、それはアヒルである」という考え方です。

```typescript
interface User {
    name: string;
    age: number;
}

interface Employee {
    name: string;
    age: number;
    employeeId: string;
}

function printUser(user: User) {
    console.log(`${user.name} (${user.age}歳)`);
}

const employee: Employee = {
    name: "田中太郎",
    age: 30,
    employeeId: "EMP001"
};

// Employeeは、Userが要求するプロパティをすべて持っているため、互換性がある
printUser(employee); // OK
```

## 型の互換性

### 関数の互換性

```typescript
type ClickHandler = (event: MouseEvent) => void;
type GenericHandler = (event: Event) => void;

// より具体的な型を、より汎用的な型に代入可能
const clickHandler: ClickHandler = (event) => {
    console.log(`クリック位置: ${event.clientX}, ${event.clientY}`);
};

const genericHandler: GenericHandler = clickHandler; // OK

// 逆は不可
// const anotherClickHandler: ClickHandler = genericHandler; // Error
```

### オブジェクトの互換性

```typescript
interface Point2D {
    x: number;
    y: number;
}

interface Point3D {
    x: number;
    y: number;
    z: number;
}

function calculateDistance2D(point: Point2D): number {
    return Math.sqrt(point.x ** 2 + point.y ** 2);
}

const point3D: Point3D = { x: 1, y: 2, z: 3 };

// Point3DはPoint2Dのすべてのプロパティを含むため互換性がある
const distance = calculateDistance2D(point3D); // OK
```

## 型の安全性を高めるベストプラクティス

### 1. 明示的な型注釈を適切に使用

```typescript
// APIレスポンスなど、外部から来るデータには明示的な型を指定
interface ApiResponse {
    data: User[];
    status: 'success' | 'error';
    message?: string;
}

async function fetchUsers(): Promise<ApiResponse> {
    const response = await fetch('/api/users');
    return response.json(); // any型だが、戻り値の型で制約
}
```

### 2. 型ガードの活用

```typescript
function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function processValue(value: unknown) {
    if (isString(value)) {
        // この中では value は string 型として扱われる
        console.log(value.toUpperCase());
    }
}
```

### 3. 厳格な型チェックの有効化

```json
// tsconfig.json
{
    "compilerOptions": {
        "strict": true, // 以下のオプションをすべて有効化
        "noImplicitAny": true,
        "strictNullChecks": true,
        "strictFunctionTypes": true,
        "strictBindCallApply": true,
        "strictPropertyInitialization": true,
        "noImplicitReturns": true,
        "noImplicitThis": true,
        "alwaysStrict": true
    }
}
```

## よくある型エラーと解決方法

### 1. Object is possibly 'null' or 'undefined'

```typescript
// 問題のあるコード
function getName(user: User | null): string {
    return user.name; // Error: Object is possibly 'null'
}

// 解決方法1: 条件分岐
function getName(user: User | null): string {
    if (user === null) {
        return "Unknown";
    }
    return user.name; // OK
}

// 解決方法2: オプショナルチェーニング
function getName(user: User | null): string {
    return user?.name ?? "Unknown"; // OK
}
```

### 2. Type 'X' is not assignable to type 'Y'

```typescript
// 問題のあるコード
interface ReadonlyUser {
    readonly name: string;
    readonly age: number;
}

interface MutableUser {
    name: string;
    age: number;
}

const readonlyUser: ReadonlyUser = { name: "太郎", age: 25 };
const mutableUser: MutableUser = readonlyUser; // OK

// const anotherReadonlyUser: ReadonlyUser = mutableUser; // Error
```

## まとめ

TypeScriptの型システムは以下の利点を提供します：

- **コンパイル時エラー検出**: ランタイムエラーを事前に防ぐ
- **IDE支援**: 自動補完やリファクタリング機能の向上
- **コードの自己文書化**: 型情報がコードの仕様を表現
- **リファクタリングの安全性**: 大規模な変更時の信頼性向上

次の記事では、プリミティブ型とリテラル型について詳しく学習していきます。

## 参考資料

- [TypeScript Handbook - Basic Types](https://www.typescriptlang.org/docs/handbook/basic-types.html)
- [TypeScript Handbook - Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)