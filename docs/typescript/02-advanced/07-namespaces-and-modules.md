# NamespaceとModule

TypeScriptでは、コードを整理し、グローバルスコープの汚染を防ぐために、**モジュール（Modules）** と **名前空間（Namespaces）** という2つの主要な方法が提供されています。現代のTypeScript開発では、**モジュールが標準的で推奨されるアプローチ**です。

## モジュール (ES Modules)

TypeScriptは、ECMAScript 2015（ES6）で標準化されたモジュールシステムを完全にサポートしています。`import` および `export` ステートメントを含むTypeScriptファイルは、それ自体が一つのモジュールと見なされます。

### 特徴
- **ファイル単位**: 各ファイルが独自のスコープを持つ独立したモジュールです。
- **明示的な依存関係**: `import` と `export` を使用して、モジュール間の依存関係を明示的に定義します。
- **標準仕様**: JavaScriptの標準的な方法であり、ブラウザやNode.jsで広くサポートされています。

### 例

`math.ts`:
```typescript
export function add(a: number, b: number): number {
  return a + b;
}
```

`app.ts`:
```typescript
import { add } from './math';

console.log(add(2, 3)); // 5
```
このアプローチは、コードの再利用性、保守性、およびツールによる解析（ツリーシェイキングなど）を容易にします。

## 名前空間 (Namespaces)

名前空間は、ESモジュールが普及する前にTypeScriptで使われていたコードのグループ化の方法です。`namespace` キーワード（以前は `internal module` と呼ばれていました）を使用します。

### 特徴
- **グローバルなオブジェクト**: 名前空間は、コンパイルされるとJavaScriptのネストされたオブジェクトになります。
- **論理的なグループ化**: 関連するコードを一つの名前付きオブジェクトにまとめるために使用されます。
- **宣言のマージ**: 同じ名前の複数の `namespace` 宣言は、コンパイラによって一つの宣言にマージされます。

### 例

```typescript
namespace Validation {
  export interface StringValidator {
    isAcceptable(s: string): boolean;
  }

  const lettersRegexp = /^[A-Za-z]+$/;

  export class LettersOnlyValidator implements StringValidator {
    isAcceptable(s: string) {
      return lettersRegexp.test(s);
    }
  }
}

// 使用例
let validator = new Validation.LettersOnlyValidator();
console.log(validator.isAcceptable("HelloWorld")); // true
```
`export` されていない `lettersRegexp` は、`Validation` 名前空間の外部からはアクセスできません。

## Namespace vs. Module: どちらを使うべきか？

**結論から言うと、常にモジュールを使用してください。**

- **モジュール**は、現代のJavaScriptエコシステムにおけるコード構成の標準です。Node.js、webpack、Viteなどのツールはすべてモジュールを前提に構築されています。
- **名前空間**は、主にレガシーコードを扱う場合や、特定の高度なユースケース（グローバルな型定義の拡張など）でのみ意味を持ちます。例えば、`Cypress` や `Express` のようなライブラリのグローバルな型定義にメソッドを追加するために、名前空間のマージ機能が使われることがあります。

```typescript
// global.d.ts
declare global {
  namespace Cypress {
    interface Chainable {
      myCustomCommand(): Chainable<Element>;
    }
  }
}
```

## まとめ

- 新規プロジェクトでは、**ESモジュール（`import`/`export`）** を使用してコードを構成します。
- **名前空間**は、TypeScriptの歴史的な機能であり、現代のアプリケーション開発での積極的な使用は推奨されません。ただし、その概念を理解しておくことは、古いコードベースや特定のライブラリの型定義を扱う際に役立ちます。
