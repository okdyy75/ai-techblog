# ユニオン型とインターセクション型

TypeScriptでは、既存の型を組み合わせて新しい型を作成するための強力な機能として、ユニオン型（Union Types）とインターセクション型（Intersection Types）が提供されています。

## ユニオン型 (Union Types)

ユニオン型は、複数の型のうちのいずれか一つであることを許容する型です。縦棒 (`|`) を使って型を区切ります。

### 基本的な使い方

ある変数が `string` または `number` のいずれかの型を受け入れるようにしたい場合、ユニオン型が役立ちます。

```typescript
function printId(id: number | string) {
  console.log("Your ID is: " + id);
}

// OK
printId(101);

// OK
printId("202");

// Error
// Argument of type '{ myID: number; }' is not assignable to parameter of type 'string | number'.
// printId({ myID: 22342 });
```

### ユニオン型のプロパティへのアクセス

ユニオン型の変数のプロパティやメソッドにアクセスする場合、そのユニオンを構成する**すべての型に共通して存在する**メンバーにしかアクセスできません。

```typescript
interface Bird {
  fly(): void;
  layEggs(): void;
}

interface Fish {
  swim(): void;
  layEggs(): void;
}

declare function getSmallPet(): Fish | Bird;

let pet = getSmallPet();

// 両方の型に共通する `layEggs` は呼び出せる
pet.layEggs();

// `swim` は Fish にしか存在しないため、コンパイルエラーになる
// Property 'swim' does not exist on type 'Bird | Fish'.
// pet.swim();
```

この問題を解決するためには、**型の絞り込み（Narrowing）** を行い、特定の型であることをコンパイラに伝える必要があります。

### Discriminating Unions (判別可能なユニオン型)

共通のプロパティ（通常はリテラル型）を判別材料として使用することで、ユニオン型を安全に扱うことができます。これは非常に強力なパターンです。

```typescript
type NetworkState =
  | { state: "loading" }
  | { state: "failed"; code: number }
  | { state: "success"; response: { title: string } };

function logger(state: NetworkState): void {
  switch (state.state) {
    case "loading":
      console.log("Loading...");
      break;
    case "failed":
      console.error(`Failed with error code ${state.code}`);
      break;
    case "success":
      console.log(`Success: ${state.response.title}`);
      break;
  }
}
```
`state.state` の値によって、TypeScriptは `state` の型を正確に推論し、それぞれのケースで固有のプロパティ（`code` や `response`）に安全にアクセスできるようになります。

## インターセクション型 (Intersection Types)

インターセクション型は、複数の型を一つに結合します。これにより、複数の型のすべてのメンバーを持つ単一の型を作成できます。アンパサンド (`&`) を使って型を結合します。

```typescript
interface Colorful {
  color: string;
}

interface Circle {
  radius: number;
}

type ColorfulCircle = Colorful & Circle;

const myCircle: ColorfulCircle = {
  color: "red",
  radius: 10,
};
```

この例では、`ColorfulCircle` 型は `Colorful` と `Circle` の両方のプロパティ（`color` と `radius`）を持つ必要があります。

インターセクション型は、既存の型を拡張して、新しい一貫した機能を追加する際などに特に便利です。

```typescript
interface ErrorHandling {
  success: boolean;
  error?: { message: string };
}

interface ArtistsData {
  artists: { name: string }[];
}

// ArtistsData と ErrorHandling を結合して、APIレスポンスの型を定義
type ArtistsResponse = ArtistsData & ErrorHandling;

const handleArtistsResponse = (response: ArtistsResponse) => {
  if (response.error) {
    console.error(response.error.message);
    return;
  }
  console.log(response.artists);
};
```
これにより、データ部分の型とエラーハンドリング部分の型を分離し、再利用可能な形で組み合わせることができます。
