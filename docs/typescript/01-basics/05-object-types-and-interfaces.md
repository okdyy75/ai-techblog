# オブジェクト型とインターフェース

## 基本のオブジェクト型

```ts
type User = {
  id: string;
  name?: string;       // 任意プロパティ
  readonly role: "admin" | "user"; // 読み取り専用
};
```

## type と interface の使い分け

- interface: 拡張（extends）や宣言マージが可能
- type: ユニオン・インターセクションに強い、表現力が広い

```ts
interface Animal { name: string }
interface Dog extends Animal { bark(): void }

type A = { x: number } & { y: number }; // 交差（インターセクション）
```

## インデックスシグネチャとレコード

```ts
type StringMap = { [key: string]: string };
const env: Record<string, string> = { NODE_ENV: "development" };
```

## 過剰プロパティチェック

オブジェクトリテラルを直接代入すると追加プロパティがチェックされます。変数経由なら緩やかになります。

```ts
type Point = { x: number; y: number };
const p1: Point = { x: 0, y: 0, z: 1 }; // エラー
const tmp = { x: 0, y: 0, z: 1 };
const p2: Point = tmp; // OK
```

## 宣言マージ（interface）

```ts
interface Window { appVersion: string }
interface Window { user?: string }
// → Window は { appVersion: string; user?: string } へマージ
```

## まとめ

- `interface` は拡張やマージに強い
- `type` はユニオン/交差や複合的表現に強い
- 読み取り専用、任意、インデックスなど修飾子を活用