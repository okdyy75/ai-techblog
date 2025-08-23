# 関数型とオーバーロード

関数の型付け、this パラメータ、ジェネリック関数、オーバーロードを扱います。

## 関数の型注釈

```ts
// 宣言式
function add(a: number, b: number): number {
  return a + b;
}

// 関数式
const mul: (a: number, b: number) => number = (a, b) => a * b;
```

## オプショナル・デフォルト・レスト引数

```ts
function greet(name: string, title?: string) {
  return title ? `${title} ${name}` : name;
}

function pow(base: number, exp = 2) {
  return base ** exp;
}

function sum(...nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}
```

## this パラメータの型

```ts
function onClick(this: HTMLElement, ev: MouseEvent) {
  this.classList.add('clicked');
}

const btn = document.createElement('button');
btn.addEventListener('click', onClick);
```

## ジェネリック関数

```ts
function identity<T>(value: T): T {
  return value;
}

const v1 = identity(123);      // number
const v2 = identity('hello');  // string
```

## オーバーロード

異なる呼び出しシグネチャを 1 実装で扱えます。

```ts
function parse(input: string): string[];
function parse(input: string[]): string;
function parse(input: string | string[]): string | string[] {
  return Array.isArray(input) ? input.join(',') : input.split(',');
}

const a = parse('a,b,c');  // string[]
const b = parse(['a', 'b']); // string
```

## 戻り値の void と never

```ts
function log(message: string): void {
  console.log(message);
}

function fail(msg: string): never {
  throw new Error(msg);
}
```

## まとめ

- 関数の型は宣言式/関数式どちらでも表現可
- this パラメータ、ジェネリック、オーバーロードで表現力を高める