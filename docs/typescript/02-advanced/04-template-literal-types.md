# テンプレートリテラル型（Template Literal Types）

テンプレートリテラル型は、TypeScript 4.1で導入された機能で、JavaScriptのテンプレートリテラル（バッククォート `` ` `` で囲まれた文字列）を型レベルで表現するものです。これにより、文字列リテラル型をより動的に、そして強力に構築することができます。

## 基本的な使い方

テンプレートリテラル型は、具体的な文字列リテラル型を結合して新しい型を生成します。

```typescript
type World = "world";
type Greeting = `hello ${World}`; // "hello world" 型

const message: Greeting = "hello world"; // OK
// const invalidMessage: Greeting = "hello typescript"; // Error
```

## ユニオン型との組み合わせ

テンプレートリテラル型は、ユニオン型と組み合わせることで真価を発揮します。ユニオンの各メンバーに対してテンプレートが適用され、新しいユニオン型が生成されます。

```typescript
type EmailLocale = "en" | "ja" | "fr";
type FooterLocale = "en" | "ja";

type EmailFooter = `${EmailLocale}_${FooterLocale}`;
// "en_en" | "en_ja" | "ja_en" | "ja_ja" | "fr_en" | "fr_ja"
```
これにより、考えられるすべての文字列の組み合わせを型として表現できます。

## 型推論への応用

この機能は、APIのレスポンスやイベント名など、特定のパターンを持つ文字列を型安全に扱うのに非常に便利です。

```typescript
type EventName<T extends string> = `${T}Changed`;

type UserEvent = EventName<"name" | "email">; // "nameChanged" | "emailChanged"

function listen(event: UserEvent, callback: () => void) {
  // ...
}

listen("nameChanged", () => {}); // OK
// listen("ageChanged", () => {}); // Error
```

## 組み込みの文字列操作型（Intrinsic String Manipulation Types）

TypeScriptは、テンプレートリテラル型をさらに活用するために、いくつかの組み込みの文字列操作ユーティリティ型を提供しています。

- `Uppercase<S>`: 文字列`S`を大文字に変換します。
- `Lowercase<S>`: 文字列`S`を小文字に変換します。
- `Capitalize<S>`: 文字列`S`の先頭文字を大文字に変換します。
- `Uncapitalize<S>`: 文字列`S`の先頭文字を小文字に変換します。

### 例：`Capitalize`

```typescript
type LoudGreeting = Capitalize<"hello">; // "Hello"
```

これらのユーティリティは、特にキーの再マッピング（Key Remapping）と組み合わせると強力です。

### 例：Setterメソッドの生成

```typescript
type Setter<T> = {
  [P in keyof T & string as `set${Capitalize<P>}`]: (value: T[P]) => void;
};

interface Person {
  name: string;
  age: number;
}

// { setName: (value: string) => void; setAge: (value: number) => void; }
type PersonSetters = Setter<Person>;
```
この例では、`Person` 型の各プロパティ（`name`, `age`）に対して、`setName`、`setAge` というセッターメソッドの型を動的に生成しています。

テンプレートリテラル型は、文字列ベースのAPIを扱う際の開発者体験を劇的に向上させ、より堅牢な型定義を可能にする重要な機能です。
