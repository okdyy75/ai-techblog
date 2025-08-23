# オブジェクト型とインターフェース

オブジェクトの形を表現する方法、`interface` と `type` の使い分け、読み取り専用・任意プロパティ、拡張と合成を扱います。

## 基本形

```ts
interface User {
  id: string;
  name: string;
  isActive: boolean;
}

const u: User = { id: 'u1', name: 'Alice', isActive: true };
```

## 任意/読み取り専用プロパティ

```ts
interface Options {
  readonly id: string;
  name?: string; // 任意
}

function create(opts: Options) {
  // opts.id = 'x'; // エラー: readonly
}
```

## インデックスシグネチャとユーティリティ型

```ts
interface Dictionary {
  [key: string]: number;
}

const scores: Dictionary = { alice: 10, bob: 20 };

// 代替として Record を活用
type ScoreMap = Record<string, number>;
```

## interface と type の使い分け

- interface: 拡張 (extends) が自然。公開 API にも適する
- type: 合成 (Union/Intersection) や条件型と相性が良い

```ts
interface A { a: number }
interface B { b: string }

interface C extends A, B {
  c: boolean;
}

type D = A & B & { d: Date };
```

## Excess Property Checks

オブジェクトリテラルは余剰プロパティチェックの対象です。

```ts
interface Person { name: string }

const ok: Person = { name: 'Alice' };
// const ng: Person = { name: 'Alice', age: 20 }; // エラー

// 対応策: 変数にいったん格納 (幅を緩める)
const tmp = { name: 'Alice', age: 20 };
const ok2: Person = tmp; // OK
```

## 交差と拡張の注意

衝突するプロパティ型の交差は never になることがあります。設計時に整合性を確認しましょう。

## まとめ

- interface は拡張に強く、type は合成に強い
- optional / readonly / index signature を使い分け
- Excess Property Checks を理解してエラーを回避
