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

キープロパティ型は `string | number | symbol` のいずれか。数値キーは内部的に文字列化される点に注意。

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

## ユーティリティ型で設計を簡潔に

```ts
type Profile = { id: string; name: string; email?: string };

type ReadonlyProfile = Readonly<Profile>;
type PartialProfile = Partial<Profile>;
type RequiredProfile = Required<Profile>;
type PublicProfile = Pick<Profile, "id" | "name">;
type PrivateProfile = Omit<Profile, "name">;
```

`Record<K, T>` は「キー集合 K から値 T」へマップする型。`NonNullable<T>` や `ReturnType<F>` も頻出。

## 可変性と readonly の使い分け

- 変更を禁止したい公開 API では `readonly` を積極的に
- 内部実装ではミュータブルでも良いが、返すときに `Readonly<T>` で包む

## オプショナルと `undefined` の違い

- `name?: string` は「存在しない」か「存在して string」
- `name: string | undefined` は「必ずキーはあるが値は undefined 可」

```ts
type A = { name?: string };
type B = { name: string | undefined };
```

## 判別可能ユニオンの設計

```ts
type Event =
  | { type: "click"; x: number; y: number }
  | { type: "keydown"; key: string };

function handle(e: Event) {
  if (e.type === "click") {
    e.x; // OK
  }
}
```

## ジェネリックなインターフェース

```ts
interface Box<T> { value: T }
const sBox: Box<string> = { value: "hi" };
```

## ベストプラクティス

- DTO など外部公開の型は `readonly` で防御的に
- `any` より `unknown`、型ガードで絞り込む
- `Object` や `{}` より具象的な形を定義

## まとめ

- `interface` は拡張やマージに強い
- `type` はユニオン/交差や複合的表現に強い
- ユーティリティ型と判別可能ユニオンで保守性を高める