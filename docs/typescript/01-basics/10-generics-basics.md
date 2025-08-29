# ジェネリクスの基礎

ジェネリクス（Generics）は、再利用可能で型安全なコンポーネント（関数、クラス、インターフェースなど）を作成するためのTypeScriptの重要な機能です。これにより、単一の型だけでなく、さまざまな型に対して機能するコンポーネントを定義できます。

## ジェネリクスとは？

ジェネリクスは、型を「変数」として扱うことを可能にします。コンポーネントを定義する時点では型を固定せず、利用する時点で具体的な型を指定します。

### ジェネリクスの利点

- **再利用性**: さまざまな型に対応できるため、同じロジックを何度も書く必要がなくなります。
- **型安全性**: `any` を使うのとは異なり、コンポーネントを利用する際に指定された型情報を保持するため、コンパイル時の型チェックの恩恵を受けることができます。

## はじめてのジェネリクス： `identity` 関数

最もシンプルな例は、渡された引数をそのまま返す `identity` （恒等）関数です。

`any` を使うと、どのような型が返ってくるかの情報が失われてしまいます。

```typescript
function identity(arg: any): any {
  return arg;
}

let output = identity("myString"); // output の型は any になってしまう
```

そこでジェネリクスを使います。型引数 `<Type>` を導入し、引数と戻り値の型を関連付けます。

```typescript
function identity<Type>(arg: Type): Type {
  return arg;
}

// 型を明示的に指定する場合
let output1 = identity<string>("myString"); // output1 は string 型

// 型推論に任せる場合（より一般的）
let output2 = identity("myString"); // output2 は string 型
```
`Type` は型引数（type parameter）と呼ばれ、この関数が呼び出されるときに実際の型（この場合は `string`）に置き換えられます。

## ジェネリックな型

ジェネリクスは関数だけでなく、インターフェースやクラスにも適用できます。

### ジェネリックインターフェース

```typescript
interface GenericBox<Type> {
  value: Type;
}

let stringBox: GenericBox<string> = { value: "hello" };
let numberBox: GenericBox<number> = { value: 123 };
```

### ジェネリッククラス

```typescript
class GenericNumber<NumType> {
  zeroValue: NumType;
  add: (x: NumType, y: NumType) => NumType;
}

let myGenericNumber = new GenericNumber<number>();
myGenericNumber.zeroValue = 0;
myGenericNumber.add = function (x, y) {
  return x + y;
};

let myGenericString = new GenericNumber<string>();
myGenericString.zeroValue = "";
myGenericString.add = function (x, y) {
  return x + y;
};
```

## ジェネリック制約 (Generic Constraints)

ジェネリクスを使用する際、型引数が特定のプロパティやメソッドを持つことを保証したい場合があります。その場合は `extends` キーワードを使って制約を追加します。

例えば、引数の `length` プロパティにアクセスしたい関数を考えます。

```typescript
// このままでは Type が .length を持つか不明なためエラーになる
// function loggingIdentity<Type>(arg: Type): Type {
//   console.log(arg.length); // Error: Property 'length' does not exist on type 'Type'.
//   return arg;
// }
```

`length` プロパティを持つ型に制約します。

```typescript
interface Lengthwise {
  length: number;
}

function loggingIdentity<Type extends Lengthwise>(arg: Type): Type {
  console.log(arg.length); // エラーにならない
  return arg;
}

// OK
loggingIdentity("hello"); // string は length プロパティを持つ
loggingIdentity([1, 2, 3]); // array は length プロパティを持つ
loggingIdentity({ length: 10, value: 3 }); // オブジェクトも length プロパティを持つ

// Error
// Argument of type 'number' is not assignable to parameter of type 'Lengthwise'.
// loggingIdentity(3);
```
`Type extends Lengthwise` とすることで、この関数に渡せる型は `Lengthwise` インターフェースの要件（`length: number` を持つこと）を満たすものに限定され、関数内で安全に `arg.length` にアクセスできるようになります。
