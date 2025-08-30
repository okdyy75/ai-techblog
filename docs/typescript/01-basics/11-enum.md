# Enum

Enum（列挙型）は、特定の名前付き定数のセットを定義するための機能です。TypeScriptでは、数値Enumと文字列Enumがサポートされています。

## 数値Enum (Numeric Enums)

デフォルトでは、Enumは0から始まる数値のインデックスを持ちます。

```typescript
enum Direction {
  Up,    // 0
  Down,  // 1
  Left,  // 2
  Right, // 3
}

let dir: Direction = Direction.Up;
console.log(dir); // 0
```

初期値を設定することもできます。

```typescript
enum Direction {
  Up = 1,
  Down,  // 2
  Left,  // 3
  Right, // 4
}
```

## 文字列Enum (String Enums)

Enumの各メンバーに文字列値を割り当てることもできます。

```typescript
enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}

let dir: Direction = Direction.Up;
console.log(dir); // "UP"
```

文字列Enumは、デバッグ時に値が読みやすくなるという利点があります。

## 異種混合Enum (Heterogeneous Enums)

数値と文字列の値を混在させることも可能ですが、特別な理由がない限りは推奨されません。

```typescript
enum Mixed {
  No = 0,
  Yes = "YES",
}
```

## 計算されたメンバーと定数メンバー (Computed and constant members)

Enumのメンバーは、定数または計算された値を持つことができます。

```typescript
enum FileAccess {
  // 定数メンバー
  None,
  Read = 1 << 1,
  Write = 1 << 2,
  ReadWrite = Read | Write,
  // 計算されたメンバー
  G = "123".length,
}
```

`ReadWrite`は定数メンバーです。`G`は計算されたメンバーです。定数メンバーの後に計算されたメンバーでないメンバーが来た場合、そのメンバーは初期化子を持つ必要があります。

## リバースマッピング (Reverse mappings)

数値Enumには、Enumの値からメンバー名を取得できる「リバースマッピング」という特性があります。

```typescript
enum Enum {
  A,
}

let a = Enum.A; // a = 0
let nameOfA = Enum[a]; // "A"
```

文字列Enumにはこの機能はありません。
