# 型レベルプログラミング（Type-Level Programming）

TypeScriptの型システムは非常に表現力豊かで、単に値の型をチェックするだけでなく、型そのものを操作し、計算するためのチューリング完全なプログラミング言語としての側面も持っています。これを「型レベルプログラミング」と呼びます。

型レベルプログラミングは、コンパイル時に実行され、実行時のコードが生成される前に型の安全性を最大限に高めるためのテクニックです。

## 型レベルプログラミングの構成要素

型レベルプログラミングは、いくつかの基本的な型機能の組み合わせによって実現されます。

- **ジェネリクス (`<T>`)**: 型レベルの「関数」の引数（パラメータ）として機能します。
- **条件型 (`T extends U ? X : Y`)**: 型レベルの「if/else」文のように、条件に基づいて型を分岐させます。
- **マップ型 (`{ [P in keyof T]: ... }`)**: 型レベルの「forループ」のように、型の各プロパティを反復処理します。
- **`infer` キーワード**: 条件型の中で新しい型変数を「宣言」し、型の一部をキャプチャして再利用します。
- **再帰的な型エイリアス**: 型定義の中で自分自身を参照することで、再帰的な処理、つまり複雑な反復や深い階層の操作を可能にします。

## 実践例：`DeepReadonly<T>`

これらの要素を組み合わせた実践的な例として、ネストされたオブジェクトのすべてのプロパティを再帰的に読み取り専用にする `DeepReadonly<T>` を考えてみましょう。

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object // 1. プロパティをループ
    ? T[P] extends Function // 2. 関数型は除外
      ? T[P]
      : DeepReadonly<T[P]> // 3. オブジェクトなら再帰的に適用
    : T[P]; // 4. プリミティブならそのまま
};
```

この型の動作を分解してみましょう。

1.  **`{ readonly [P in keyof T]: ... }`**:
    マップ型を使い、`T` のすべてのプロパティ `P` をループ処理します。`readonly` 修飾子により、トップレベルのプロパティは読み取り専用になります。

2.  **`T[P] extends object ? ... : ...`**:
    条件型を使い、プロパティの型 `T[P]` が `object` 型かどうかをチェックします。
    - `T[P] extends Function ? T[P]` というチェックを入れることで、メソッドのような関数は `object` として扱われるものの、再帰の対象から除外しています。

3.  **`DeepReadonly<T[P]>`**:
    プロパティ `T[P]` がオブジェクト（かつ関数でない）場合、`DeepReadonly` 型を自分自身に再帰的に適用します。これにより、ネストされたオブジェクトのプロパティも読み取り専用になります。

4.  **`: T[P]`**:
    プロパティがオブジェクトでない場合（`string`, `number` などのプリミティブ型）、その型をそのまま使用します。

### 使用例

```typescript
interface User {
  id: number;
  info: {
    name: string;
    address: {
      city: string;
      zip: number;
    };
  };
  greet: () => void;
}

const user: DeepReadonly<User> = {
  id: 1,
  info: {
    name: "John",
    address: {
      city: "New York",
      zip: 10001,
    },
  },
  greet: () => console.log("Hello"),
};

// Error: Cannot assign to 'id' because it is a read-only property.
// user.id = 2;

// Error: Cannot assign to 'name' because it is a read-only property.
// user.info.name = "Jane";

// Error: Cannot assign to 'city' because it is a read-only property.
// user.info.address.city = "London";

user.greet(); // OK
```

このように、型レベルプログラミングを駆使することで、非常に複雑で動的な型定義を作成し、コードの堅牢性を劇的に向上させることが可能です。ただし、型定義が複雑になりすぎると可読性やコンパイル時間に影響を与える可能性があるため、そのトレードオフを理解して使用することが重要です。
