---
title: TypeScript徹底解説: Conditional Typesと`infer`キーワードで型を自由自在に操る！
description: TypeScriptのConditional Typesとinferキーワードの基礎から実践的な活用パターンまでを徹底解説
author: Gemini
---

# TypeScript徹底解説: Conditional Typesと`infer`キーワードで型を自由自在に操る！

## はじめに

TypeScriptの型システムは、その表現力の高さから多くの開発者に愛されています。中でも「Conditional Types（条件型）」と、それに組み合わせて使う「`infer`キーワード」は、非常に強力な機能でありながら、その真価が理解されにくい側面もあります。本記事では、TypeScript中級者の皆さんを対象に、これら二つの機能の基礎から、実践的な活用パターンまでを、豊富なコード例とともに徹底的に解説します。これらの機能を使いこなすことで、より柔軟で、かつ堅牢な型定義が可能になり、あなたのTypeScriptコーディングは次のレベルへと進化するでしょう。

## Conditional Typesの基礎

Conditional Typesは、型が特定の条件を満たすかどうかに基づいて異なる型を選択できる機能です。JavaScriptの三項演算子（`condition ? trueType : falseType`）の型レベル版と考えると理解しやすいでしょう。

### 構文

```typescript
SomeType extends OtherType ? TrueType : FalseType;
```

`SomeType`が`OtherType`に割り当て可能（assignable）であれば`TrueType`を、そうでなければ`FalseType`を返します。

### 基本的な例

特定の型が`string`かどうかを判定する例を見てみましょう。

#### コード

```typescript
type IsString<T> = T extends string ? "Yes" : "No";

type A = IsString<string>; // A: "Yes"
type B = IsString<number>; // B: "No"
type C = IsString<"hello">; // C: "Yes" (literal string is assignable to string)
type D = IsString<any>;    // D: "Yes" (any is assignable to string)
type E = IsString<unknown>; // E: "No" (unknown is not assignable to string directly)
```

#### 実行結果 (型推論)

*   `A` は `"Yes"`
*   `B` は `"No"`
*   `C` は `"Yes"`
*   `D` は `"Yes"`
*   `E` は `"No"`

この例では、`string`型に割り当て可能な型が与えられた場合にのみ`"Yes"`というリテラル型を返しています。

## `infer`キーワードの解説

`infer`キーワードは、Conditional Typesの`extends`句内で使用され、推論された型を変数のように捕捉するために使われます。これにより、型の「一部」を取り出して再利用することが可能になります。

### 構文

```typescript
SomeType extends OtherType<infer InferredType> ? InferredType : FallbackType;
```

`SomeType`が`OtherType`のパターンにマッチした場合、そのパターンの中から`infer InferredType`で指定された部分の型を抽出し、`InferredType`として利用できます。マッチしない場合は`FallbackType`となります。

### 基本的な例

`Promise`が解決する値の型を抽出する例を通じて`infer`の動作を見てみましょう。

#### コード

```typescript
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type PromiseA = Promise<string>;
type PromiseB = Promise<number[]>;
type NonPromise = boolean;

type ResultA = UnwrapPromise<PromiseA>;    // ResultA: string
type ResultB = UnwrapPromise<PromiseB>;    // ResultB: number[]
type ResultC = UnwrapPromise<NonPromise>;  // ResultC: boolean (T goes to T)
type ResultD = UnwrapPromise<Promise<Promise<string>>>; // ResultD: Promise<string> (only unwraps one level)
```

#### 実行結果 (型推論)

*   `ResultA` は `string`
*   `ResultB` は `number[]`
*   `ResultC` は `boolean`
*   `ResultD` は `Promise<string>`

`UnwrapPromise`型は、もし与えられた型`T`が`Promise<U>`の形であれば、その`U`型（Promiseが解決する値の型）を`infer`によって抽出し、それを返します。そうでなければ、元の型`T`をそのまま返します。`ResultD`のように、Promiseがネストしている場合は、一度に一つの階層しかアンラップされないことに注意してください。

## 実践的活用パターン

Conditional Typesと`infer`キーワードは、特定のユースケースで非常に強力な型操作を可能にします。いくつかの実践的なパターンを見ていきましょう。

### 1. 関数シグネチャからの型抽出

関数の引数型や戻り値型を抽出することは、高階関数やユーティリティ関数の型定義において非常に役立ちます。

#### 引数型の抽出

##### コード

```typescript
type FunctionParams<T extends (...args: any) => any> =
  T extends (...args: infer P) => any ? P : never;

function greet(name: string, age: number): string {
  return `Hello, ${name}! You are ${age} years old.`;
}

type GreetParams = FunctionParams<typeof greet>; // GreetParams: [name: string, age: number]

// 例: GreetParamsを使って新しい関数を定義
function logAndGreet(...args: GreetParams): string {
  console.log("Logging arguments:", args);
  return greet(...args);
}

const message = logAndGreet("Alice", 30);
console.log(message);
```

##### 実行結果

```
Logging arguments: [ 'Alice', 30 ]
Hello, Alice! You are 30 years old.
```

`FunctionParams`型は、関数`T`の引数の型をタプルとして抽出します。`typeof greet`で関数の型を取得し、`FunctionParams`に渡すことで、`[name: string, age: number]`というタプル型が得られます。

#### 戻り値型の抽出

##### コード

```typescript
type FunctionReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : any;

function calculateSum(a: number, b: number): number {
  return a + b;
}

type SumResult = FunctionReturnType<typeof calculateSum>; // SumResult: number

async function fetchData(): Promise<{ data: string }> {
  return { data: "Some data" };
}

type FetchResult = FunctionReturnType<typeof fetchData>; // FetchResult: Promise<{ data: string }>
```

##### 実行結果 (型推論)

*   `SumResult` は `number`
*   `FetchResult` は `Promise<{ data: string }>`

`FunctionReturnType`型は、関数`T`の戻り値の型を抽出します。これは組み込みの`ReturnType<T>`ユーティリティ型と同様の機能です。

### 2. Promiseの解決型抽出 (再帰的なアンラップ)

先に示した`UnwrapPromise`は1段階しかアンラップしませんでしたが、`infer`と再帰を組み合わせることで、ネストしたPromiseも完全に解決する型を抽出できます。

#### コード

```typescript
type DeepUnwrapPromise<T> = T extends Promise<infer U>
  ? DeepUnwrapPromise<U>
  : T;

type NestedPromise = Promise<Promise<Promise<string>>>;
type ArrayOfPromises = Promise<Array<Promise<number>>>;

type DeepResultA = DeepUnwrapPromise<NestedPromise>;    // DeepResultA: string
type DeepResultB = DeepUnwrapPromise<ArrayOfPromises>; // DeepResultB: number[]
type DeepResultC = DeepUnwrapPromise<boolean>;         // DeepResultC: boolean
```

#### 実行結果 (型推論)

*   `DeepResultA` は `string`
*   `DeepResultB` は `number[]`
*   `DeepResultC` は `boolean`

`DeepUnwrapPromise`は、もし型`T`が`Promise`であれば、その内部型`U`を`infer`し、`DeepUnwrapPromise<U>`を再帰的に呼び出します。これにより、全てのPromise層が剥がされ、最終的な解決型が得られます。

### 3. 配列要素の型抽出

配列型からその要素の型を抽出するのも一般的なユースケースです。

#### コード

```typescript
type ArrayElementType<T> = T extends (infer U)[] ? U : T;

type StringArray = string[];
type NumberArray = Array<number>;
type NotAnArray = { a: number };

type ElementA = ArrayElementType<StringArray>;   // ElementA: string
type ElementB = ArrayElementType<NumberArray>;   // ElementB: number
type ElementC = ArrayElementType<NotAnArray>;    // ElementC: { a: number }
```

#### 実行結果 (型推論)

*   `ElementA` は `string`
*   `ElementB` は `number`
*   `ElementC` は `{ a: number }`

`ArrayElementType`型は、もし型`T`が`U[]`の形であれば、`infer U`で要素の型`U`を抽出し、それを返します。そうでなければ元の型`T`を返します。これは組み込みの`Awaited<T>`ユーティリティ型や`Parameters<T>`, `InstanceType<T>`などと似た概念です。

### 4. オブジェクトプロパティの型抽出 (特定のキーを持つ場合)

特定のキーを持つオブジェクト型から、そのキーの型を抽出する例です。

#### コード

```typescript
type PropertyType<T, K extends PropertyKey> = T extends Record<K, infer U> ? U : never;

type User = {
  id: number;
  name: string;
  email: string;
};

type UserId = PropertyType<User, 'id'>;    // UserId: number
type UserName = PropertyType<User, 'name'>;  // UserName: string
type UserAddress = PropertyType<User, 'address'>; // UserAddress: never (key 'address' does not exist)

// 別のオブジェクト
type Product = {
  name: string;
  price: number;
};

type ProductName = PropertyType<Product, 'name'>; // ProductName: string
```

#### 実行結果 (型推論)

*   `UserId` は `number`
*   `UserName` は `string`
*   `UserAddress` は `never`
*   `ProductName` は `string`

`PropertyType`は、型`T`がキー`K`を持ち、その値が`U`型である`Record<K, U>`のパターンにマッチする場合に、`infer U`でそのプロパティの型を抽出します。マッチしない場合（例えば、指定したキーが存在しない場合）は`never`型を返します。これは組み込みの`T[K]`インデックスアクセス型と似ていますが、Conditional Typesと組み合わせることでより複雑な条件分岐が可能になります。

## まとめ

本記事では、TypeScriptのConditional Typesと`infer`キーワードについて、その基本的な仕組みから具体的な活用例までを解説しました。

*   **Conditional Types**：型の条件分岐を可能にし、より柔軟な型定義を実現します。
*   **`infer`キーワード**：Conditional Types内で型の一部を「推論・捕捉」し、その型を再利用することで、高度な型操作を可能にします。

これらの機能を組み合わせることで、関数シグネチャの分析、Promiseの解決型の深掘り、配列要素の抽出、特定のプロパティ型の抽出など、多岐にわたる型変換を安全かつ効率的に行うことができます。最初は難しく感じるかもしれませんが、実例を追うことで徐々にその強力さと応用範囲が理解できるはずです。ぜひ、日々のTypeScript開発でこれらのパターンを活用し、より表現豊かで堅牢なコードベースを構築してください。
