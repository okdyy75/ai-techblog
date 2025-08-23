# 配列とタプル型

## 配列の型注釈

```ts
const numbers: number[] = [1, 2, 3];
const strings: Array<string> = ["a", "b"]; // 同義
```

`readonly` 配列も用意されています。

```ts
const xs: readonly number[] = [1, 2, 3];
const ys: ReadonlyArray<number> = [1, 2, 3];
```

配列メソッドはジェネリクスで型安全に扱えます。

```ts
[1, 2, 3].map(n => n * 2); // number[]
```

## タプル型

位置と長さが固定された配列です。

```ts
const pair: [number, string] = [1, "one"];
```

可変長（variadic）なタプルも使えます。

```ts
function concat<T extends unknown[]>(...xs: T): T {
  return xs;
}

const t = concat(1, "a", true); // [number, string, boolean]
```

`as const` でタプルのリテラルを厳密化できます。

```ts
const POINT = [0, 0] as const; // readonly [0, 0]
```

## まとめ

- `T[]` と `Array<T>` は同義
- 読み取り専用配列で不変性を高める
- タプルで位置情報を表現し、必要に応じて可変長も活用