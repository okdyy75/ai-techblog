# マップ型（Mapped Types）

マップ型は、TypeScriptの強力な機能の一つで、既存の型を基にして新しい型を生成するために使用されます。ある型の各プロパティを反復処理し、それらを新しい方法で変換することで、DRY（Don't Repeat Yourself）の原則に従った、保守性の高いコードを書くのに役立ちます。

## 基本構文

マップ型の基本的な構文は、`[P in K]` という形式です。ここで `K` は通常、`keyof T` のようなキーの集合を表す型です。

```typescript
type MappedType<T> = {
  [P in keyof T]: T[P]; // Tの各プロパティPに対して、型T[P]を持つプロパティを定義
};
```

## 標準ユーティリティ型の実装例

TypeScriptに組み込まれている多くのユーティリティ型は、マップ型を使用して実装されています。

### `Readonly<T>`

`Readonly<T>` は、型 `T` のすべてのプロパティを読み取り専用（`readonly`）にします。

```typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

interface User {
  name: string;
  age: number;
}

const readonlyUser: Readonly<User> = {
  name: "John",
  age: 30,
};

// Error: Cannot assign to 'name' because it is a read-only property.
// readonlyUser.name = "Jane";
```

### `Partial<T>`

`Partial<T>` は、型 `T` のすべてのプロパティをオプショナル（`?`）にします。

```typescript
type Partial<T> = {
  [P in keyof T]?: T[P];
};

const partialUser: Partial<User> = {
  name: "John", // ageはなくてもOK
};
```

## マッピング修飾子（Mapping Modifiers）

マップ型では、`readonly` や `?` といった修飾子を追加または削除できます。`+` や `-` をプレフィックスとして使用します。`+` はデフォルトなので、通常は省略されます。

### `?` 修飾子の削除

例えば、すべてのプロパティを必須にする `Required<T>` は、`-?` を使用して実装されます。

```typescript
type Required<T> = {
  [P in keyof T]-?: T[P];
};

interface PartialUser {
  name?: string;
  age?: number;
}

// { name: string; age: number; } と同じ型になる
type RequiredUser = Required<PartialUser>;
```

## キーの再マッピング（Key Remapping via `as`）

マップ型では `as` 句を使用して、プロパティ名を変更することも可能です。これにより、さらに柔軟な型変換が実現できます。

### 例：Getterメソッドの型を生成

オブジェクトの各プロパティに対して、`get<PropertyName>` という形式のgetterメソッドを持つ新しい型を生成する例です。

```typescript
type Getter<T> = {
  [P in keyof T as `get${Capitalize<string & P>}`]: () => T[P];
};

interface Person {
  name: string;
  age: number;
}

// { getName: () => string; getAge: () => number; } という型になる
type PersonGetters = Getter<Person>;
```

この例では、`Capitalize` ユーティリティ型とテンプレートリテラル型を組み合わせて、プロパティ名を `name` から `getName` に変換しています。

マップ型は、型の変換や再利用性を高めるための非常に強力なツールであり、高度な型定義を行う上で不可欠な機能です。
