# 高度な型 (Advanced Types)

TypeScriptの型システムは非常に強力で、基本的な型以外にも多くの高度な機能を提供します。ここでは、その中でも特に重要なものをいくつか紹介します。

## マップ型 (Mapped Types)

マップ型は、既存の型を元にして新しい型を生成するための機能です。プロパティのキーを再マッピングし、値を変換することができます。

構文は `[K in T]: U` のようになります。`T`は通常、`keyof`演算子によって得られるキーのユニオン型です。

例えば、ある型のすべてのプロパティをオプショナル（`?`）にする`Partial<T>`や、読み取り専用（`readonly`）にする`Readonly<T>`は、マップ型を使って実装されています。

```typescript
type Options = {
  width: number;
  height: number;
};

// すべてのプロパティをオプショナルにする
type OptionalOptions = Partial<Options>;
// type OptionalOptions = {
//   width?: number;
//   height?: number;
// };

// すべてのプロパティを読み取り専用にする
type ReadonlyOptions = Readonly<Options>;
// type ReadonlyOptions = {
//   readonly width: number;
//   readonly height: number;
// };
```

## 条件型 (Conditional Types)

条件型は、型レベルの三項演算子のようなもので、特定の条件に基づいて型を選択することができます。

構文は `T extends U ? X : Y` です。`T`が`U`に代入可能であれば`X`型、そうでなければ`Y`型になります。

これは、ジェネリクスと組み合わせることで非常に強力になります。例えば、`T`が`string`か`number`かに応じて異なる型を返す型を定義できます。

```typescript
type TypeName<T> =
  T extends string ? "string" :
  T extends number ? "number" :
  T extends boolean ? "boolean" :
  T extends undefined ? "undefined" :
  T extends Function ? "function" :
  "object";

type T0 = TypeName<string>;  // "string"
type T1 = TypeName<"a">;    // "string"
type T2 = TypeName<true>;   // "boolean"
type T3 = TypeName<() => void>; // "function"
```

## テンプレートリテラル型 (Template Literal Types)

テンプレートリテラル型は、文字列リテラル型をテンプレートリテラル構文（バッククォート `` ` ``）を使って構築する機能です。これにより、より具体的で動的な文字列リテラル型を定義できます。

```typescript
type World = "world";

type Greeting = `hello ${World}`; // "hello world"

type EmailLocaleIDs = "welcome_email" | "email_heading";
type FooterLocaleIDs = "footer_title" | "footer_sendoff";

type AllLocaleIDs = `${EmailLocaleIDs | FooterLocaleIDs}_id`;
// "welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id"

type Lang = "en" | "ja" | "fr";
type LocaleMessageIDs = `${Lang}_${AllLocaleIDs}`;
// "en_welcome_email_id" | "en_email_heading_id" | ...
// "ja_welcome_email_id" | "ja_email_heading_id" | ...
```

これらの高度な型を組み合わせることで、非常に柔軟で堅牢な型定義を作成することが可能になります。
