# モジュール (Modules)

TypeScriptでは、コードを再利用可能な独立した単位に分割するためにモジュールシステムが採用されています。TypeScriptはECMAScript 2015（ES6）のモジュール構文を共有しており、`import`と`export`キーワードを使用します。

ファイルにトップレベルの`import`または`export`文が含まれている場合、そのファイルはモジュールとして扱われます。モジュール内の変数、関数、クラスなどは、そのモジュールのローカルスコープに属します。

## エクスポート (`export`)

他のモジュールからアクセスできるようにしたい変数、関数、クラス、型エイリアスなどには`export`キーワードを付けます。

```typescript
// strings.ts
export const GREETING = "Hello, world";

export function sayHello(name: string) {
  return `Hello, ${name}`;
}
```

### デフォルトエクスポート (`export default`)

各モジュールは、一つの`export default`を持つことができます。これは、モジュールの「主要な」エクスポート対象を示します。

```typescript
// MyClass.ts
export default class MyClass {
  // ...
}
```

## インポート (`import`)

他のモジュールからエクスポートされた機能を使用するには、`import`キーワードを使用します。

```typescript
// main.ts
import { GREETING, sayHello } from "./strings.ts";
import MyClass from "./MyClass.ts"; // デフォルトエクスポートをインポート

console.log(GREETING); // "Hello, world"
const message = sayHello("TypeScript");
const instance = new MyClass();
```

`import * as <alias>`構文を使うと、モジュールのすべてのエクスポートを一つのオブジェクトにまとめてインポートできます。

```typescript
// main.ts
import * as stringUtils from "./strings.ts";

console.log(stringUtils.GREETING);
```

## TypeScriptにおけるモジュール

TypeScriptは、`tsconfig.json`の`module`オプションで指定されたモジュール形式（`CommonJS`, `AMD`, `ES2015`, `ESNext`など）にコードをコンパイルします。これにより、Node.jsやブラウザなど、さまざまな環境で動作するモジュールを作成できます。

## 名前空間 (`namespace`)

ESモジュールが標準になる前、TypeScriptには`namespace`（旧称「内部モジュール」）という独自のモジュールシステムがありました。これは、グローバルスコープを汚染せずにコードをグループ化するための方法でした。

```typescript
namespace MyNamespace {
  export const value = 10;
  export function doSomething() {
    // ...
  }
}

console.log(MyNamespace.value);
```

現在では、新しいプロジェクトではESモジュールを使用することが強く推奨されています。`namespace`は、主に古いコードベースや、特定のビルドツールとの連携のために使用されます。
