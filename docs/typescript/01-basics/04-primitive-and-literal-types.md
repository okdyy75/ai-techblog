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

### number の注意点

- `NaN` は `number`。比較は常に false（`NaN !== NaN`）。`Number.isNaN` を使用。
- 数値区切り: `1_000_000` は可読性向上。

### bigint の注意点

- `number` と混在演算不可。`BigInt(1)` などで変換する。

### symbol の注意点

- `Symbol()` は一意。`Symbol.for(key)` はグローバルレジストリ共有。

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

### リテラルの拡大（widening）

`let x = "a"` は `string` に拡大。拡大を防ぎたい場合は `const` または `as const` を使用。

```ts
let x = "a";     // string
const y = "a";   // "a"

const cfg = { mode: "dev" };         // mode: string
const cfg2 = { mode: "dev" } as const; // mode: "dev"
```

## const アサーション

`as const` でリテラル型へ固定できます。配列やオブジェクトは深く `readonly` になります。

```ts
const CONFIG = {
  mode: "dev",
  retries: 3,
} as const; // mode は "dev"、retries は 3 のリテラル型、かつ readonly
```

## テンプレートリテラル型（入門）

文字列の形を型で表現できます。

```ts
type Env = "dev" | "prod";
type Endpoint = `/api/${Env}/${string}`;
const e: Endpoint = "/api/dev/users"; // OK
```

## Enum よりリテラルユニオン

多くのケースでは `enum` よりユニオン型が軽量で相互運用性が高い。

```ts
type Role = "admin" | "user" | "guest";
```

## 代表的な落とし穴

- `toString()` を `null/undefined` に対して呼ぶとクラッシュ。ユニオンで扱う。
- `parseInt` は基数を指定（`parseInt("08", 10)`）。数値化は `Number()` も検討。

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

- プリミティブ型の挙動（NaN, bigint, symbol）を理解
- リテラル型で許容値を厳密に、拡大を制御
- `as const` とテンプレートリテラル型で表現力を高める