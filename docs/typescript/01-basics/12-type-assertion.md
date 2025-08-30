# 型アサーション (Type Assertion)

型アサーションは、コンパイラに対して「この値の型はあなたが推論したものとは違う、私が指定するこちらの型として扱いなさい」と伝えるための方法です。これは、開発者がTypeScriptコンパイラよりも特定の変数の型について詳しい情報を持っている場合に便利です。

型アサーションは、他の言語における「型キャスト」に似ていますが、実行時の特別なチェックは行いません。純粋にコンパイル時の構文であり、実行時のパフォーマンスに影響を与えません。

## 構文

型アサーションには2つの構文があります。

### 1. `as` 構文

```typescript
let someValue: unknown = "this is a string";

let strLength: number = (someValue as string).length;
```

`as` 構文は、TypeScriptの`.tsx`ファイル（Reactで使用）との互換性があるため、一般的に推奨されます。

### 2. 山括弧 (`<>`) 構文

```typescript
let someValue: unknown = "this is a string";

let strLength: number = (<string>someValue).length;
```

この構文は、`as`構文よりも先に存在していましたが、JSXの構文と競合するため、`.tsx`ファイルでは使用できません。

## 型アサーションの注意点

型アサーションは強力なツールですが、注意して使用する必要があります。コンパイラの型チェックを上書きするため、誤った型をアサートすると、実行時エラーにつながる可能性があります。

```typescript
let someValue: unknown = "this is a string";

// 間違ったアサーション（コンパイルエラーにはならない）
let num: number = someValue as number;

// console.log(num.toFixed(2)); // 実行時エラー: num.toFixed is not a function
```

型アサーションは、アサート先の型が元の型と互換性がある場合にのみ機能します。例えば、`string`を`number`に直接アサートすることはできません（`unknown`や`any`からのアサートを除く）。

```typescript
const x = "hello";

// const n: number = x as number; // Error: Conversion of type 'string' to type 'number' may be a mistake...
```

型アサーションは、本当に必要な場合にのみ使用し、可能な限り`if`文や`typeof`演算子などを用いた型ガードを使用することが推奨されます。
