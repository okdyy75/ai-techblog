# 条件型 (Conditional Types)

条件型は、TypeScriptの型システムにおける強力なツールの一つで、型レベルで条件分岐を表現することができます。これにより、入力された型に応じて出力される型を動的に変更することが可能になります。

## 条件型の基本

条件型は、JavaScriptの三項演算子 (`condition ? trueValue : falseValue`) と非常によく似た構文を持ちます。

```typescript
T extends U ? X : Y
```

この構文は以下のように解釈されます。
- 「もし型 `T` が型 `U` に代入可能（`extends`）であれば、型 `X` を選択する。」
- 「そうでなければ、型 `Y` を選択する。」

### 簡単な例

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>; // true
type B = IsString<number>; // false
```
この例では、`IsString<T>` は型 `T` が `string` 型に代入可能かどうかをチェックし、その結果に応じて `true` 型または `false` 型を返します。

## 分配条件型 (Distributive Conditional Types)

条件型のチェック対象 `T` が「裸の型パラメータ」（他の型でラップされていないジェネリックな型）であり、かつユニオン型である場合、その条件はユニオンの各メンバーに対して個別に適用（分配）されます。

```typescript
type ToArray<T> = T extends any ? T[] : never;

// "string | number" の各メンバーに適用される
// (string extends any ? string[] : never) | (number extends any ? number[] : never)
// 結果: string[] | number[]
type StrOrNumArray = ToArray<string | number>;
```

この分配的な性質を利用して、ユニオン型から特定の型を除外するような操作が可能です。TypeScriptの標準ユーティリティ型である `Exclude<T, U>` はこの仕組みを利用しています。

```typescript
// T から U に代入可能な型を取り除く
type Exclude<T, U> = T extends U ? never : T;

type T0 = Exclude<"a" | "b" | "c", "a">; // "b" | "c"
type T1 = Exclude<"a" | "b" | "c", "a" | "b">; // "c"
type T2 = Exclude<string | number | (() => void), Function>; // string | number
```
`never` 型はユニオン型においては無視されるため、条件が真になった型が最終的なユニオンから取り除かれます。

## `infer` キーワードによる型推論

条件型の中で最も強力な機能の一つが `infer` キーワードです。`infer` を使うと、`extends` 節の内部で型を「推論」して新しい型変数としてキャプチャし、条件が真の場合のブランチでその型を利用できます。

### `ReturnType<T>` の実装

関数の戻り値の型を抽出する標準ユーティリティ型 `ReturnType<T>` は、`infer` の代表的な使用例です。

```typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;
```

この定義は以下のように動作します。
1. `T` が `(...args: any[]) => any` という関数シグネチャにマッチするかどうかをチェックします。
2. マッチする場合、その関数の戻り値の型を新しい型変数 `R` として**推論（infer）**します。
3. 結果として、推論された型 `R` を返します。
4. マッチしない場合は `any` 型を返します。

```typescript
type MyFunc = (name: string) => { id: number; name: string };

// { id: number; name: string } 型が抽出される
type User = ReturnType<MyFunc>;
```

### 配列の要素の型を抽出する

`infer` を使えば、配列の要素の型を抽出するようなユーティリティ型も簡単に作成できます。

```typescript
type Flatten<T> = T extends (infer Item)[] ? Item : T;

type Str = Flatten<string[]>; // string
type Num = Flatten<number[]>; // number
type Whatever = Flatten<boolean>; // boolean (配列ではないので T 自身が返る)
```

条件型と `infer` を組み合わせることで、TypeScriptの型システムを最大限に活用し、非常に高度で柔軟な型操作を実現できます。
