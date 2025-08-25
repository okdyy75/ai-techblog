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

実装は 1 つで、先に宣言したオーバーロードの組み合わせを満たす必要があります。具体的なシグネチャを先に、汎用を後に並べます。

## オーバーロードの代替: パラメータオブジェクト/ユニオン

```ts
type ParseOptions = { radix?: number };
function parse2(input: string | number, opts?: ParseOptions) {
  return typeof input === "string" ? Number.parseInt(input, opts?.radix) : String(input);
}
```

## ジェネリック関数

```ts
function identity<T>(value: T): T {
  return value;
}

const x = identity(42); // T=number
```

### 条件付き戻り値の表現（簡易）

```ts
function maybeArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}
```

## ユーザー定義タイプガードと assertion

```ts
type Fish = { swim: () => void };
function isFish(x: unknown): x is Fish {
  return typeof (x as any)?.swim === "function";
}

function assertIsFish(x: unknown): asserts x is Fish {
  if (!isFish(x)) throw new Error("Not a Fish");
}
```

- `x is T` は分岐内で絞り込み
- `asserts x is T` は失敗時に例外、成功時に以降の型が `T` として扱われる

## 関数の変性とコールバックの安全性

`--strictFunctionTypes` が無効だと、コールバック引数が双変（bivariant）になり危険な代入が通ることがあります。可能なら有効化しましょう。

```ts
interface Animal { name: string }
interface Dog extends Animal { bark(): void }

type Handler = (a: Animal) => void;
const handleDog: (d: Dog) => void = () => {};

let h: Handler = handleDog; // 非 strictFunctionTypes 下で許容され得る
```

## よくある落とし穴

- オーバーロードの実装シグネチャにユニオンを使うが、戻り値の絞り込みを忘れる
- メソッドを変数へ取り出すと `this` が失われる。`this` パラメータの注釈や `bind` を使う
- 可変長引数で `any[]` を使わず、ジェネリクスのタプルを活用

## まとめ

- 関数シグネチャを型で表し、ガード/アサートで安全に絞る
- オーバーロードは「具体→汎用」の順で宣言
- 変性ルールを理解し、strict モードで安全性を高める