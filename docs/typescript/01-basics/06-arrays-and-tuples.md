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

### ミュータブル vs イミュータブル操作

- `push`, `splice` はミュータブル。
- `map`, `filter`, `concat`, スプレッドはイミュータブルに新配列を返す。

```ts
const a = [1, 2];
const b = [...a, 3]; // a は不変、b は [1,2,3]
```

## タプル型

位置と長さが固定された配列です。

```ts
const pair: [number, string] = [1, "one"];
```

### タプルのラベルと分割代入

```ts
const point: [x: number, y: number] = [10, 20];
const [x, y] = point; // x: number, y: number
```

### 可変長（variadic）タプル

```ts
function concat<T extends unknown[]>(...xs: T): T {
  return xs;
}

const t = concat(1, "a", true); // [number, string, boolean]
```

先頭・末尾へ要素を追加する表現も可能です。

```ts
type Push<T extends unknown[], U> = [...T, U];

type T1 = Push<[1, 2], 3>; // [1, 2, 3]
```

### `as const` と readonly タプル

`as const` でタプルのリテラルを厳密化できます。

```ts
const POINT = [0, 0] as const; // readonly [0, 0]
```

### タプル長の推論

`as const` がないと配列リテラルは `number[]` などへ拡大し、長さ情報が失われます。

```ts
const rgb = [255, 255, 255];        // number[]
const rgbTuple = [255, 255, 255] as const; // readonly [255, 255, 255]
```

## まとめ

- `T[]` と `Array<T>` は同義
- 読み取り専用配列で不変性を高める
- タプルで位置情報を表現し、variadic と `as const` を活用