# プリミティブ型とリテラル型

## プリミティブ型

- string, number, boolean
- bigint, symbol
- null, undefined

```ts
const s: string = "text";
const n: number = 1.23;
const b: boolean = false;
const bi: bigint = 10n;
const sym: symbol = Symbol("id");
```

`null` と `undefined` は `strictNullChecks` 有効時にユニオンで明示します。

```ts
let name: string | undefined;
let maybe: number | null;
```

## リテラル型

特定の値だけを許容する型です。

```ts
let direction: "up" | "down";
direction = "up";   // OK
direction = "left"; // エラー
```

数値や boolean も同様です。

```ts
type OneOrZero = 0 | 1;
const flag: true = true;
```

## const アサーション

`as const` でリテラル型へ固定できます。

```ts
const CONFIG = {
  mode: "dev",
  retries: 3,
} as const; // mode は "dev"、retries は 3 のリテラル型
```

## リテラルの絞り込み

比較で自然に絞り込みます。

```ts
type Status = "idle" | "loading" | "success" | "error";

function render(status: Status) {
  if (status === "loading") {
    // status は "loading"
  }
}
```

## まとめ

- プリミティブ型は基本の土台
- リテラル型で許容値を厳密に
- `as const` で安全に固定