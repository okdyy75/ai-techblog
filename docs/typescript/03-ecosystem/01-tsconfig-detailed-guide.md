---
title: "TSConfig詳細設定ガイド：compilerOptionsからstrict系オプションまで徹底解説"
description: "TypeScriptのtsconfig.jsonの詳細設定を解説。compilerOptionsの主要オプション、strict系設定、モジュール解決、プロジェクト参照まで、実践的な設定例とともに学びます。"
date: 2026-04-25
---

# TSConfig詳細設定ガイド：compilerOptionsからstrict系オプションまで徹底解説

## はじめに

TypeScriptプロジェクトにおいて、`tsconfig.json`はコンパイラの動作を制御する中心的な設定ファイルです。基本的なセットアップは簡単ですが、本格的な開発では細かい設定調整が必要になります。

この記事では、中級TypeScript開発者を対象に、tsconfig.jsonの詳細設定について解説します。`compilerOptions`の主要オプションから、`strict`系の厳格な型チェック設定、モジュール解決の仕組み、そして大規模プロジェクトでのプロジェクト参照機能まで、実践的な知識を身につけましょう。

## TSConfigの基本構造

### 最小構成から始める

TypeScriptプロジェクトの設定ファイルは、基本的に以下の構造を持ちます：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

この最小構成でも十分に動作しますが、実際の開発ではより細かな制御が必要です。

### 主要なトップレベルオプション

```json
{
  "extends": "./base.json",
  "compilerOptions": { /* ... */ },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts"],
  "files": ["src/main.ts"],
  "references": [
    { "path": "../shared" }
  ]
}
```

| オプション | 説明 |
|-----------|------|
| `extends` | 別のtsconfig.jsonを継承 |
| `include` | コンパイル対象ファイルのパターン |
| `exclude` | コンパイルから除外するパターン |
| `files` | 明示的に含めるファイルリスト |
| `references` | プロジェクト参照の設定 |

## compilerOptionsの主要設定

### targetとlib：JavaScriptバージョンの制御

#### targetオプション

`target`は、TypeScriptがコンパイル後に出力するJavaScriptのバージョンを指定します：

```json
{
  "compilerOptions": {
    "target": "ES2022"
  }
}
```

利用可能な値と主な機能：

| ターゲット | 主な追加機能 |
|-----------|-------------|
| ES5 | 基本的な互換性（IE11対応） |
| ES2015/ES6 | Promise, Map, Set, アロー関数 |
| ES2017 | async/await, Object.entries |
| ES2020 | BigInt, 動的import, オプショナルチェーン |
| ES2022 | クラスフィールド, at() メソッド, Error cause |
| ESNext | 最新のECMAScript機能（変化する） |

**選択のポイント：**

- **Node.jsアプリケーション**: 使用するNode.jsバージョンに合わせる（Node 18+ならES2022）
- **ブラウザ向け**: サポート対象ブラウザの最古版に合わせる
- **ライブラリ開発**: 可能な限り低いバージョンで広い互換性を確保

#### libオプション

`lib`は、コンパイル時に利用可能なAPIの型定義を指定します：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

**よく使うlibの組み合わせ：**

```json
// フロントエンド開発
{
  "lib": ["ES2022", "DOM", "DOM.Iterable", "WebWorker"]
}

// Node.jsバックエンド
{
  "lib": ["ES2022"],
  "types": ["node"]
}

// 両方（フルスタック）
{
  "lib": ["ES2022", "DOM"]
}
```

`target`を設定すると、対応するlibが自動的に含まれます。追加のAPIが必要な場合のみ`lib`を明示します。

### moduleとmoduleResolution：モジュールシステム

#### moduleオプション

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

| モジュール形式 | 用途 |
|--------------|------|
| `CommonJS` | Node.js従来の形式（require/module.exports） |
| `ESNext` | 最新のES Modules（import/export） |
| `NodeNext` | Node.jsのESM/CJS両対応 |
| `Preserve` | 変換を行わない |

**Node.jsのESM対応プロジェクトでは：**

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

#### moduleResolutionオプション

モジュール解決戦略を指定します：

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

| 戦略 | 特徴 |
|-----|------|
| `classic` | 旧来のTypeScript方式（非推奨） |
| `node` | Node.js互換方式 |
| `node16`/`nodenext` | Node.jsのESM対応版 |
| `bundler` | Vite, Webpack等のバンドラー向け（推奨） |

**bundlerの利点：**

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true
  }
}
```

`bundler`解決戦略では、拡張子なしのインポートやTypeScript拡張子（.ts）での直接インポートが可能になります。

### outDirとrootDir：出力構造の制御

```json
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "declaration": true,
    "declarationDir": "./dist/types"
  }
}
```

**ディレクトリ構造の例：**

```
project/
├── src/
│   ├── utils/
│   │   └── helpers.ts
│   └── main.ts
├── dist/
│   ├── utils/
│   │   └── helpers.js
│   ├── types/
│   │   ├── utils/
│   │   │   └── helpers.d.ts
│   │   └── main.d.ts
│   └── main.js
└── tsconfig.json
```

## strict系オプション：厳格な型チェック

### strictオプションの全体像

`strict: true`を設定すると、以下のすべての厳格チェックが有効になります：

```json
{
  "compilerOptions": {
    "strict": true
    /* 以下が全て有効化される：
     * noImplicitAny: true
     * noImplicitReturns: true
     * noImplicitThis: true
     * strictBindCallApply: true
     * strictFunctionTypes: true
     * strictNullChecks: true
     * strictPropertyInitialization: true
     * alwaysStrict: true
     * useUnknownInCatchVariables: true
     */
  }
}
```

### strictNullChecks：null/undefinedの厳格チェック

最も影響の大きいオプションの一つです：

```json
{
  "compilerOptions": {
    "strictNullChecks": true
  }
}
```

**有効時の動作：**

```typescript
// strictNullChecks: false（緩い設定）
let name: string = null;      // OK（実は問題）
name.toUpperCase();           // ランタイムエラー！

// strictNullChecks: true（厳格な設定）
let name: string = null;      // エラー：Type 'null' is not assignable to type 'string'
let nullableName: string | null = null;  // OK：明示的にunion型で宣言

// 安全な使用法
if (nullableName !== null) {
  nullableName.toUpperCase(); // OK：nullチェック済み
}
nullableName?.toUpperCase();   // OK：オプショナルチェーン
```

### noImplicitAny：暗黙的anyの禁止

```json
{
  "compilerOptions": {
    "noImplicitAny": true
  }
}
```

**暗黙的anyの例と対策：**

```typescript
// エラー：Parameter 'data' implicitly has an 'any' type
function processData(data) {
  return data.value;
}

// 修正：明示的な型を指定
function processData(data: { value: string }) {
  return data.value;
}

// またはジェネリクスを使用
function processData<T extends { value: string }>(data: T) {
  return data.value;
}
```

### strictFunctionTypes：関数型の厳格チェック

```json
{
  "compilerOptions": {
    "strictFunctionTypes": true
  }
}
```

**コントラバリアンスの厳格化：**

```typescript
interface Animal { name: string; }
interface Dog extends Animal { breed: string; }

type AnimalFunc = (animal: Animal) => void;
type DogFunc = (dog: Dog) => void;

// strictFunctionChecks: true の場合
let dogFunc: DogFunc = (dog) => console.log(dog.breed);
let animalFunc: AnimalFunc = dogFunc;  // エラー！
// Animalを受け取る関数に、Dogが必要な関数を代入できない
```

### strictPropertyInitialization：プロパティ初期化の厳格化

```json
{
  "compilerOptions": {
    "strictPropertyInitialization": true
  }
}
```

**クラスプロパティの初期化チェック：**

```typescript
class User {
  // エラー：Property 'name' has no initializer
  name: string;
  
  // OK：初期値あり
  age: number = 0;
  
  // OK：コンストラクタで初期化
  email: string;
  
  // OK：definite assignment assertion（確実に代入されることを明示）
  id!: string;
  
  constructor(email: string) {
    this.email = email;
  }
}
```

### useUnknownInCatchVariables：catch節の型をunknownに

```json
{
  "compilerOptions": {
    "useUnknownInCatchVariables": true
  }
}
```

**安全なエラーハンドリング：**

```typescript
try {
  riskyOperation();
} catch (error) {
  // errorはunknown型
  // error.message;  // エラー：'error' is of type 'unknown'
  
  // 型ガードで絞り込む
  if (error instanceof Error) {
    console.error(error.message);  // OK
  }
  
  // または型アサーション（慎重に使用）
  const message = (error as Error).message;
}
```

## モジュール解決の詳細設定

### baseUrlとpaths：インポートパスのエイリアス

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
```

**実際の使用例：**

```typescript
// 絶対パスでのインポート
import { Button } from '@components/Button';
import { User } from '@types/user';
import { formatDate } from '@utils/date';

// 相対パスよりも明確で、リファクタリングも容易
```

**pathsの解決例：**

| インポートパス | 解決先 |
|-------------|--------|
| `@/config` | `./src/config` |
| `@components/ui/Button` | `./src/components/ui/Button` |
| `@utils/helpers` | `./src/utils/helpers` |

### resolveJsonModule：JSONファイルのインポート

```json
{
  "compilerOptions": {
    "resolveJsonModule": true,
    "esModuleInterop": true
  }
}
```

```typescript
import config from './config.json';
// configは型付きで利用可能
console.log(config.apiEndpoint);
```

### typeRootsとtypes：型定義の制御

```json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./src/types"],
    "types": ["node", "jest"]
  }
}
```

- `typeRoots`: 型定義ファイルを探すディレクトリ
- `types`: 明示的に含める型定義（未指定時はすべての`@types/*`を含む）

**注意：** `types`を指定すると、指定したパッケージのみが含まれ、自動検出は行われなくなります。

## 高度なコンパイラオプション

### declarationとdeclarationMap：型定義ファイルの生成

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "declarationDir": "./dist/types"
  }
}
```

**ライブラリ開発時の設定：**

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": false,
    "outDir": "./dist",
    "declarationDir": "./dist/types"
  }
}
```

### isolatedModules：単一ファイルコンパイルの強制

```json
{
  "compilerOptions": {
    "isolatedModules": true
  }
}
```

Babelやesbuildなどのトランスパイラーと互換性を持たせるために、各ファイルを独立してコンパイルできるようにします。

**制限：** 型のみのインポートを明示する必要があります

```typescript
// エラー：'SomeType' is a type and must be imported using a type-only import
import { SomeType } from './types';

// 修正
import type { SomeType } from './types';
// または
import { type SomeType } from './types';
```

### verbatimModuleSyntax：正確なインポート文の保持

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true
  }
}
```

TypeScript 5.0で追加されたオプションで、`import type`と`import`を明確に区別します。

```typescript
// 型のみのインポート（実行時に削除される）
import type { Config } from './config';

// 値のインポート（実行時に保持される）
import { initialize } from './app';
```

## プロジェクト参照（Project References）

### compositeオプションとプロジェクト参照の基本

大規模プロジェクトでは、コードを複数のサブプロジェクトに分割し、ビルドを高速化できます：

```json
// tsconfig.json（ルート）
{
  "files": [],
  "references": [
    { "path": "./src/shared" },
    { "path": "./src/server" },
    { "path": "./src/client" }
  ]
}
```

```json
// src/shared/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "outDir": "../../dist/shared"
  },
  "include": ["./**/*"]
}
```

```json
// src/server/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "outDir": "../../dist/server"
  },
  "references": [
    { "path": "../shared" }
  ],
  "include": ["./**/*"]
}
```

### プロジェクト参照の利点

1. **インクリメンタルビルド**: 変更のあったプロジェクトのみ再ビルド
2. **並列ビルド**: 依存関係のないプロジェクトを並列処理
3. **明確な境界**: サブプロジェクト間の依存関係を明示

### 依存関係の管理

```json
// packages/core/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist"
  }
}

// packages/app/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist"
  },
  "references": [
    { "path": "../core" }
  ]
}
```

```typescript
// packages/app/src/index.ts
// 参照先の型定義を自動的に解決
import { CoreService } from '../core';
```

## 実践的な設定例

### フロントエンド開発向け（Vite + React）

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Node.jsバックエンド向け

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts"]
}
```

### ライブラリ開発向け

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "emitDeclarationOnly": false,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src"],
  "exclude": ["**/*.test.ts", "node_modules"]
}
```

## よくある問題とトラブルシューティング

### 問題1：モジュール解決エラー

**症状：**
```
Cannot find module '@/components/Button' or its corresponding type declarations.
```

**解決策：**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

エディタ（VS Code）でも認識させるためには、プロジェクトルートにtsconfig.jsonを配置する必要があります。

### 問題2：型定義ファイルが見つからない

**症状：**
```
Could not find a declaration file for module 'some-package'.
```

**解決策：**

```bash
# 型定義パッケージをインストール
npm install --save-dev @types/some-package
```

または型定義ファイルを作成：

```typescript
// src/types/some-package.d.ts
declare module 'some-package' {
  export function doSomething(): void;
}
```

### 問題3：厳格な型チェックによる既存コードのエラー

**症状：** strictモード有効化後に大量のエラーが発生

**段階的な移行アプローチ：**

```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": true,  // まずこれだけ有効化
    "strictNullChecks": false  // 後で有効化
  }
}
```

1. `noImplicitAny`を有効化 → すべての関数パラメータと戻り値に型を付与
2. `strictNullChecks`を有効化 → null/undefinedの扱いを修正
3. 最終的に`strict: true`へ

### 問題4：循環参照によるビルドエラー

**症状：**
```
error TS6202: Project references may not form a circular graph.
```

**解決策：**

プロジェクト構造を見直し、共通の型定義を`shared`プロジェクトに抽出：

```
packages/
├── shared/      # 共通の型とユーティリティ
├── server/      # sharedに依存
└── client/      # sharedに依存（serverには依存しない）
```

## まとめ

TypeScriptのtsconfig.json設定は、プロジェクトの品質と開発体験に大きな影響を与えます。

**重要なポイント：**

1. **strict: trueを目指す** - 型安全性を確保し、潜在的なバグを防ぐ
2. **プロジェクトに合わせたtarget/moduleの選択** - 実行環境に応じた設定
3. **pathsによるエイリアス活用** - 可読性とメンテナンス性の向上
4. **プロジェクト参照による分割** - 大規模プロジェクトのビルド高速化

設定を調整する際は、常にチーム全体での合意を取り、段階的に導入していくことをお勧めします。適切に設定されたtsconfig.jsonは、TypeScriptの強みを最大限に活かし、堅牢なアプリケーション開発を支援してくれます。
