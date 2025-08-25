# 型システムの基礎

TypeScript は構造的部分型（structural typing）に基づいた静的型付け言語です。ここでは「型注釈」「型推論」「代入互換性」「トップ/ボトム型」「null/undefined」「絞り込み（narrowing）」の基礎を押さえます。

## 型注釈と型推論

```ts
let count: number = 0;      // 型注釈
const title = "Hello";      // 型推論 => string
```

- 明示的に注釈を書くのは「公開 API」や「複雑な式」で有効。
- ローカル変数は可能な限り推論に任せて簡潔に。

## 構造的部分型と代入互換性

型の互換性は「メンバーの形」で判断されます。

```ts
type Point = { x: number; y: number };
const p: Point = { x: 1, y: 2, z: 3 }; // 追加プロパティがあっても代入は可能（変数経由の場合）
```

ただしリテラル直接代入時には「過剰プロパティチェック」が働きます。

```ts
// エラー: オブジェクトリテラルを直接代入すると余計な z がチェックされる
const p2: Point = { x: 1, y: 2, z: 3 };

// 回避: 変数にいったん格納する
const tmp = { x: 1, y: 2, z: 3 };
const p3: Point = tmp; // OK
```

## Top/Bottom 型: any, unknown, never

- any: 何でも可。安全性を下げるので最小限に。
- unknown: 「何か」だが使うには絞り込みが必要。安全。
- never: 到達不能・値が存在しない型（例: 常に例外を投げる関数）

```ts
function fail(message: string): never {
  throw new Error(message);
}
```

## null と undefined, strictNullChecks

`strictNullChecks` が有効だと `null` と `undefined` は明示的に扱う必要があります。

```ts
let name: string | undefined;
if (name !== undefined) {
  console.log(name.toUpperCase());
}
```

## 絞り込み (Narrowing) と制御フロー解析

`typeof`, `in`, `instanceof`, リテラル比較などで型を絞り込みます。

```ts
function printId(id: string | number) {
  if (typeof id === "string") {
    console.log(id.toUpperCase());
  } else {
    console.log(id.toFixed(2));
  }
}
```

ユーザー定義タイプガードも使えます。

```ts
type Fish = { swim: () => void };
type Bird = { fly: () => void };

function isFish(animal: Fish | Bird): animal is Fish {
  return (animal as Fish).swim !== undefined;
}
```

## リテラルの拡大（widening）と縮小（narrowing）

`let` で初期化したリテラルは広い型へ拡大され、`const` はリテラル型のまま保持します。

```ts
let v = "ok";      // string に拡大
const c = "ok";    // "ok" のまま

const obj = { mode: "dev" };        // mode: string
const obj2 = { mode: "dev" } as const; // mode: "dev"
```

## non-null アサーションと確定代入アサーション

- `!`（non-null）: 値が null/undefined ではないと主張。乱用は危険。
- クラスフィールドの `!`: コンストラクタ外で初期化することをコンパイラに約束。

```ts
function getLen(s?: string) {
  return s!.length; // 実行時に s が undefined ならクラッシュ
}

class Repo {
  private url!: string; // 後で必ず代入すると約束
  init(u: string) { this.url = u; }
}
```

## アサーション vs 型ガード

`as` はコンパイラを黙らせるだけ。可能ならタイプガードを用意して安全に絞り込む。

```ts
function hasId(x: unknown): x is { id: string } {
  return typeof (x as any)?.id === "string";
}
```

## 関数の互換性と（双）変性の落とし穴

コールバック引数はデフォルトで双変（bivariant）として扱われ、広く受け取れてしまいます。安全性を高めるには `--strictFunctionTypes` を有効化。

```ts
type Handler = (a: Animal) => void;
const handleDog: (a: Dog) => void = (d) => {};

let h: Handler = handleDog; // 非 strictFunctionTypes では許容され得る
```

## 列挙型より判別可能ユニオン

判別プロパティで安全に分岐し、網羅性チェックを `never` で担保。

```ts
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.radius ** 2;
    case "square": return s.size * s.size;
    default: {
      const _exhaustive: never = s; // 新ケース追加時にエラー
      return _exhaustive;
    }
  }
}
```

## おすすめのコンパイラオプション（抜粋）

- `strict: true`（まとめて有効化）
- `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `noUncheckedIndexedAccess`

## まとめ

- 型注釈は公開面、推論は実装面で活用
- 構造的部分型と過剰プロパティチェックの違いを理解
- `unknown` を優先し、`any` は最後の手段
- 絞り込みと網羅性チェックで安全に分岐