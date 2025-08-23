# 関数型とオーバーロード

## 関数の型注釈

```ts
// 署名
type Formatter = (value: number) => string;

const format: Formatter = (v) => v.toFixed(2);
```

引数の任意・デフォルト・残余も型で表現します。

```ts
function greet(name: string, suffix: string = "!") {
  return `Hello, ${name}${suffix}`;
}

function sum(...nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}
```

`this` パラメータの注釈（最初のダミー引数）も可能です。

```ts
function fn(this: { id: string }) {
  return this.id;
}
```

## オーバーロード

複数の呼び出しシグネチャを持つ関数を定義できます。

```ts
function parse(input: string): number;
function parse(input: number): string;
function parse(input: string | number): string | number {
  if (typeof input === "string") return Number(input);
  return String(input);
}
```

実装は 1 つで、先に宣言したオーバーロードの組み合わせを満たす必要があります。

## ジェネリック関数

```ts
function identity<T>(value: T): T {
  return value;
}

const x = identity(42); // T=number
```

## まとめ

- 関数シグネチャを型で表す
- オーバーロードは宣言（複数）+ 実装（1つ）
- ジェネリックで再利用性と型安全性を両立