# 型エイリアスとタイプガード

TypeScriptを効果的に使用するには、型を再利用可能にしたり、特定のコードブロック内で型を絞り込んだりするテクニックが不可欠です。ここでは、`type` キーワードによる型エイリアスと、型の安全性を高めるタイプガードについて説明します。

## 型エイリアス (Type Aliases)

型エイリアスは、既存の型に新しい名前を付ける機能です。これにより、複雑な型を再利用しやすくなり、コードの可読性が向上します。

`type` キーワードを使って定義します。

```typescript
// プリミティブ型に別名を付ける
type UserID = string;

// オブジェクトリテラル型に別名を付ける
type User = {
  id: UserID;
  name: string;
  email?: string;
};

// ユニオン型に別名を付ける
type Status = "success" | "loading" | "error";

function processStatus(status: Status): void {
  // ...
}
```

### 型エイリアス vs インターフェース

型エイリアスはインターフェース（`interface`）と似ていますが、いくつかの重要な違いがあります。

| 機能 | インターフェース (`interface`) | 型エイリアス (`type`) |
| :--- | :--- | :--- |
| **拡張** | `extends` キーワードで拡張可能 | `&` (インターセクション型) を使って拡張可能 |
| **宣言のマージ** | 同じ名前で複数宣言すると自動的にマージされる | 同じ名前で複数宣言するとエラーになる |
| **表現できる型** | オブジェクトの形状の定義に特化 | プリミティブ、ユニオン、タプルなど、あらゆる型に別名を付けられる |

**推奨される使い分け:**
- オブジェクトの形状を定義する場合は、拡張やマージが可能な `interface` を使用するのが一般的です。
- ユニオン型やタプル型など、`interface` で表現できない型に名前を付けたい場合は `type` を使用します。

## タイプガード (Type Guards)

タイプガードは、特定のスコープ内で変数の型をより具体的な型に絞り込む（narrowing）ための式です。これにより、ユニオン型などで扱われる変数のプロパティやメソッドに安全にアクセスできるようになります。

### 1. `typeof` タイプガード

`typeof` 演算子は、プリミティブ型（`string`, `number`, `boolean`, `symbol`, `bigint`, `undefined`, `object`, `function`）をチェックするために使用できます。

```typescript
function printValue(value: string | number) {
  if (typeof value === "string") {
    // このブロック内では value は string 型として扱われる
    console.log(value.toUpperCase());
  } else {
    // このブロック内では value は number 型として扱われる
    console.log(value.toFixed(2));
  }
}
```

### 2. `instanceof` タイプガード

`instanceof` 演算子は、値が特定のクラスのインスタンスであるかどうかをチェックします。

```typescript
class Cat {
  meow() {
    console.log("Meow!");
  }
}
class Dog {
  bark() {
    console.log("Woof!");
  }
}

type Animal = Cat | Dog;

function makeSound(animal: Animal) {
  if (animal instanceof Cat) {
    // animal は Cat 型
    animal.meow();
  } else {
    // animal は Dog 型
    animal.bark();
  }
}
```

### 3. `in` タイプガード

`in` 演算子は、オブジェクトが特定のプロパティを持っているかどうかをチェックします。

```typescript
interface Car {
  drive(): void;
}
interface Bicycle {
  ride(): void;
}

type Vehicle = Car | Bicycle;

function move(vehicle: Vehicle) {
  if ("drive" in vehicle) {
    // vehicle は Car 型
    vehicle.drive();
  } else {
    // vehicle は Bicycle 型
    vehicle.ride();
  }
}
```

### 4. ユーザー定義タイプガード (Type Predicates)

より複雑なチェックのために、`is` キーワードを使った型述語（type predicate）を返す関数を定義できます。これは「ユーザー定義タイプガード」と呼ばれます。

関数の戻り値の型を `argument is Type` の形式で注釈します。

```typescript
interface Fish {
  swim(): void;
}
interface Bird {
  fly(): void;
}

type Pet = Fish | Bird;

// ユーザー定義タイプガード
function isFish(pet: Pet): pet is Fish {
  return (pet as Fish).swim !== undefined;
}

function feedPet(pet: Pet) {
  if (isFish(pet)) {
    // pet は Fish 型
    console.log("Feeding fish...");
  } else {
    // pet は Bird 型
    console.log("Feeding bird...");
  }
}
```
この `isFish` 関数が `true` を返した場合、TypeScriptコンパイラはそのスコープ内で `pet` 変数を `Fish` 型として扱います。これは、APIレスポンスの検証など、複雑なオブジェクトの型を判別する際に非常に役立ちます。
