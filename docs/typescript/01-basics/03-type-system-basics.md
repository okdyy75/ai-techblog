# 型システムの基礎

TypeScript の型システムは JavaScript に静的型付けを与え、開発体験と信頼性を大きく向上させます。この章では、推論、構造的部分型、代入可能性、絞り込み、厳格モードといった基礎を押さえます。

## 型推論と明示的注釈

TypeScript は多くの場合で型を自動的に推論します。必要な時のみ注釈を追加しましょう。

```ts
// 推論される型: number
let count = 1;

// 明示的注釈
let total: number = 1;

// コンテキスト型付け (コールバックから推論)
const numbers = [1, 2, 3];
numbers.forEach(n => {
  // n は number と推論される
});
```

## 構造的部分型 (Structural Typing)

型の互換性は「名前」ではなく「構造」で判断されます。

```ts
interface HasId { id: string }

const user = { id: 'u_1', name: 'Alice' };
const acceptsHasId = (x: HasId) => x.id;

acceptsHasId(user); // OK: 構造的に互換
```

## 代入可能性と拡大/縮小 (Widening / Narrowing)

```ts
// 拡大 (widening)
let s = "hello"; // string に拡大
const s2 = "hello"; // リテラル型 "hello"

// 絞り込み (narrowing)
function printLen(value: string | string[] | null) {
  if (value == null) return; // null/undefined を除外
  if (typeof value === 'string') {
    console.log(value.length);
  } else {
    console.log(value.join(', ').length);
  }
}
```

## ユニオンと割当ての方向

ユニオン型は「いずれか」を表します。代入可能性は「より具体的→より抽象的」に流れます。

```ts
let u: string | number;
let sOnly = 'x';

u = sOnly; // OK (string は string|number に代入可)
sOnly = u; // エラー (u は number かもしれない)
```

## 厳格モードの主要フラグ

- strict: 代表フラグ。以下を含む厳格チェックを有効化
- strictNullChecks: null/undefined の扱いを厳密化
- noImplicitAny: 暗黙の any を禁止
- noUncheckedIndexedAccess: インデックスアクセスの未定義を安全に

```jsonc
// tsconfig.json の例
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

## 型ガードとユーザー定義述語

```ts
function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

function square(value: unknown) {
  if (isNumber(value)) {
    // ここでは value は number
    return value * value;
  }
  throw new Error('number が必要です');
}
```

## まとめ

- TypeScript は構造的部分型で互換性を判断
- 推論を活用し、必要に応じて注釈
- 厳格モードを有効化して安全性を高める
