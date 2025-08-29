# 高度なジェネリクス

ジェネリクスの基本的な使い方をマスターしたら、次はTypeScriptの型システムをさらに活用するための高度なテクニックを見ていきましょう。これらは、型レベルでのプログラミング（型操作）の扉を開く強力なツールです。

## `keyof` とルックアップ型

`keyof` 演算子は、オブジェクトのキー（プロパティ名）を文字列リテラルユニオンとして取得します。

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

type UserKeys = keyof User; // "id" | "name" | "email"
```

そして、ルックアップ型 (`T[K]`) を使うと、オブジェクト `T` のプロパティ `K` の型を取得できます。

```typescript
type UserEmailType = User["email"]; // string
```

これらをジェネリクスと組み合わせることで、非常に強力な型安全性を実現できます。

### 例：プロパティを取得する関数

オブジェクトとそのプロパティ名を引数に取り、そのプロパティの値を返す関数を考えます。

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user: User = {
  id: 1,
  name: "John Doe",
  email: "john.doe@example.com",
};

const userName = getProperty(user, "name"); // string
const userEmail = getProperty(user, "email"); // string

// Error: Argument of type '"age"' is not assignable to parameter of type 'keyof User'.
// const userAge = getProperty(user, "age");
```
`K extends keyof T` というジェネリック制約により、`key` 引数には `obj` に実際に存在するプロパティ名しか渡せないようにコンパイラが保証してくれます。戻り値の型も `T[K]` となるため、取得した値の型も正確に推論されます。

## マップ型 (Mapped Types)

マップ型は、既存の型を基にして新しい型を生成する機能です。既存の型の各プロパティをループして、新しい型に変換します。`in keyof` という構文を使用します。

### `Partial<T>` の実装

例えば、すべてのプロパティをオプショナルにする `Partial<T>` というユーティリティ型は、マップ型で実装されています。

```typescript
type Partial<T> = {
  [P in keyof T]?: T[P];
};

interface Todo {
  title: string;
  completed: boolean;
}

// { title?: string; completed?: boolean; } と同じ型になる
type PartialTodo = Partial<Todo>;
```

### `Readonly<T>` の実装

同様に、すべてのプロパティを読み取り専用にする `Readonly<T>` もマップ型で実装できます。

```typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

// { readonly title: string; readonly completed: boolean; } と同じ型になる
type ReadonlyTodo = Readonly<Todo>;
```
マップ型を使うことで、既存の型から派生した型を DRY (Don't Repeat Yourself) の原則に従って効率的に作成できます。

## 条件型 (Conditional Types)

条件型は、型レベルの三項演算子のようなもので、型`T`が型`U`に代入可能かどうかに基づいて、2つの型のうちの1つを選択します。

構文は `T extends U ? X : Y` です。

```typescript
interface IdLabel {
  id: number;
}
interface NameLabel {
  name: string;
}

// T が number を継承していれば IdLabel、そうでなければ NameLabel を返す
type LabelType<T> = T extends number ? IdLabel : NameLabel;

let idLabel: LabelType<number>;   // IdLabel
let nameLabel: LabelType<string>; // NameLabel
```

### `infer` キーワード

条件型の中でも特に強力なのが `infer` キーワードです。これにより、条件式の中で新しい型変数を「推論」し、その後の型定義で使用できます。

関数の戻り値の型を抽出する `ReturnType<T>` は、この `infer` を使って実装されています。

```typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

type MyFunc = () => string;

// string 型が抽出される
type MyFuncReturnType = ReturnType<MyFunc>;
```

この例では、`T` が関数型にマッチする場合、その戻り値の型を新しい型変数 `R` として推論（`infer R`）し、結果として `R` を返しています。

これらの高度なジェネリクスを組み合わせることで、非常に柔軟で型安全なユーティリティやライブラリを構築することが可能になります。
