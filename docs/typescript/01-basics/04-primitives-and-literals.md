# プリミティブ型とリテラル型

本章では、TypeScript の基本的なプリミティブ型とリテラル型、そしてそれらに関連する挙動を解説します。

## プリミティブ型概要

- number: 浮動小数点数と整数 (NaN, Infinity を含む)
- string: 文字列
- boolean: 真偽値
- bigint: 任意精度整数 (末尾に n)
- symbol: 一意の識別子
- null / undefined: 空値
- unknown: 「不明」な値 (安全な any)
- any: 何でもあり (安全性低)
- never: 到達不能/返らない

```ts
let n: number = 42;
let s: string = 'hello';
let b: boolean = false;
let big: bigint = 9007199254740993n;
let sym: symbol = Symbol('id');
```

## リテラル型と拡大

```ts
const v1 = 1;   // 型は 1 (リテラル)
let v2 = 1;     // 型は number に拡大

const hello = 'hello'; // 'hello'
let msg = 'hello';     // string
```

リテラルの集合をユニオンとして表せます。

```ts
type Direction = 'up' | 'down' | 'left' | 'right';

function move(dir: Direction) {}
move('up');   // OK
// move('north'); // エラー
```

## const アサーション

```ts
const config = {
  env: 'prod',
  retry: 3,
} as const;
// 型: { readonly env: 'prod'; readonly retry: 3 }
```

## テンプレートリテラル型 (概要)

```ts
type HexColor = `#${string}`;
const ok: HexColor = '#ffcc00';
// const ng: HexColor = 'ffcc00'; // エラー
```

## null/undefined と厳格モード

strictNullChecks 有効時、null/undefined は明示的に扱います。

```ts
function len(s: string | null | undefined) {
  if (s == null) return 0; // null/undefined をまとめて排除
  return s.length;
}
```

## まとめ

- const でリテラル型を維持
- ユニオンで限定列挙を表現
- strictNullChecks で安全性を向上