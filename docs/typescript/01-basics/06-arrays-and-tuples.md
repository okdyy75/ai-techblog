# 配列とタプル型

配列とタプルは両方とも順序付きコレクションですが、表現力と使い所が異なります。

## 配列表現と読み取り専用

```ts
const a1: number[] = [1, 2, 3];
const a2: Array<number> = [1, 2, 3];

function sum(xs: readonly number[]) {
  // xs.push(4); // エラー: 読み取り専用
  return xs.reduce((acc, n) => acc + n, 0);
}

const ro: ReadonlyArray<string> = ['a', 'b'];
```

## タプルの基本

```ts
// 固定長・位置に意味がある
let pair: [string, number] = ['id', 42];

// オプショナル要素を含むタプル
let tri: [string, number?, boolean?];
tri = ['x'];
tri = ['x', 1, true];
```

## 可変長タプル (Variadic Tuple)

```ts
type LogArgs = [level: 'info' | 'warn' | 'error', ...data: unknown[]];

function log(...args: LogArgs) {
  const [level, ...data] = args;
}
```

## as const とタプル推論

```ts
const config = [200, 'OK'] as const;
// 型: readonly [200, 'OK']

function handle([code, message]: readonly [number, string]) {}
```

## 配列メソッドと型の流れ

```ts
const names = ['a', 'b', 'c'];
const lengths = names.map(n => n.length); // number[]
const filtered = names.filter(n => n !== 'b'); // string[]
```

## まとめ

- 配列は可変/不変を使い分ける
- タプルで位置に意味を与え、API の曖昧さを減らす
- 可変長タプルと as const で表現力を高める