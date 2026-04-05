# TSConfigの詳細設定 - 実務で使えるcompilerOptions完全ガイド

## はじめに

TypeScriptプロジェクトにおいて、`tsconfig.json`はコンパイラの動作を制御する中心的な設定ファイルです。適切な設定を行うことで、型安全性の向上、開発体験の改善、そしてコード品質の維持が可能になります。

この記事では、`tsconfig.json`の基本構造から、`compilerOptions`の詳細な解説、そして実務でよく使われる設定パターンまでを包括的に解説します。

## TSConfigファイルの基本構造

### 最小構成

```json
{
  "compilerOptions": {
    "target": "ES2022"
  }
}
```

これだけでもTypeScriptのコンパイルは可能ですが、実務ではより詳細な設定が必要です。

### 主要なトップレベルプロパティ

```json
{
  "compilerOptions": {
    // コンパイラの動作設定
  },
  "include": [
    // コンパイル対象のファイルパターン
  ],
  "exclude": [
    // コンパイルから除外するファイル
  ],
  "extends": "./base.json",
  "files": [
    // 明示的に含めるファイルリスト
  ]
}
```

## compilerOptionsの詳細解説

### 1. 型チェック関連オプション

型安全性を確保するための重要なオプション群です。

#### strict フラグ

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

`strict: true`を設定すると、以下のすべての厳格な型チェックオプションが有効になります：

- `noImplicitAny`
- `noImplicitThis`
- `strictNullChecks`
- `strictFunctionTypes`
- `strictBindCallApply`
- `strictPropertyInitialization`
- `alwaysStrict`

**推奨**: 新規プロジェクトでは必ず`true`に設定してください。

#### strictNullChecks

```json
{
  "compilerOptions": {
    "strictNullChecks": true
  }
}
```

`null`と`undefined`を全ての型に自動的に含まれないようにします。

```typescript
// strictNullChecks: false の場合
let name: string = null; // OK（問題！）

// strictNullChecks: true の場合
let name: string = null; // Error: Type 'null' is not assignable to type 'string'

// 正しい使い方
let name: string | null = null; // OK
```

#### noImplicitAny

```json
{
  "compilerOptions": {
    "noImplicitAny": true
  }
}
```

暗黙的な`any`型を禁止します。型推論できない場合は明示的に型を指定する必要があります。

```typescript
// noImplicitChecks: true の場合
function greet(name) {  // Error: Parameter 'name' implicitly has an 'any' type
  return `Hello, ${name}`;
}

// 修正版
function greet(name: string) {
  return `Hello, ${name}`;
}
```

### 2. 出力設定

#### target

```json
{
  "compilerOptions": {
    "target": "ES2022"
  }
}
```

出力するJavaScriptのバージョンを指定します。選択肢：

- `ES3` (古すぎて非推奨)
- `ES5`
- `ES2015` ～ `ES2023`
- `ESNext`

**推奨**: Node.js 18+やモダンブラウザ向けなら`ES2022`を使用。

#### module

```json
{
  "compilerOptions": {
    "module": "ESNext"
  }
}
```

モジュールシステムを指定します。

| 値 | 用途 |
|------|------|
| `CommonJS` | Node.js従来のモジュール |
| `ESNext` | ES Modules（推奨） |
| `NodeNext` | Node.jsのESM/CJS両対応 |
| `AMD` / `UMD` / `System` | レガシー環境 |

#### lib

```json
{
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

使用可能なAPIの型定義を指定します。`target`で自動的に含まれるものを上書きします。

```json
// フロントエンド向け
{
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable", "ScriptHost"]
  }
}

// Node.js向け
{
  "compilerOptions": {
    "lib": ["ES2022"]
  }
}
```

### 3. モジュール解決

#### moduleResolution

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

モジュールの解決戦略を指定します。

- `node`: Node.jsの従来の解決方法
- `node16` / `nodenext`: Node.js 16+のESM対応
- `bundler`: Vite、Webpack等のバンドラー向け（推奨）

#### baseUrl と paths

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

エイリアスによるインポートを実現します。

```typescript
// 従来の相対パス
import { Button } from "../../../../components/Button";

// エイリアスを使用
import { Button } from "@components/Button";
```

#### resolveJsonModule

```json
{
  "compilerOptions": {
    "resolveJsonModule": true
  }
}
```

JSONファイルをインポート可能にします。

```typescript
import config from "./config.json";
console.log(config.apiUrl);
```

### 4. 開発支援オプション

#### sourceMap

```json
{
  "compilerOptions": {
    "sourceMap": true
  }
}
```

ソースマップを生成し、デバッグ時に元のTypeScriptコードを参照できるようにします。

#### declaration

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist"
  }
}
```

型定義ファイル（`.d.ts`）を生成します。ライブラリ開発時に必須です。

#### jsx

```json
{
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
```

JSXの変換方法を指定します。

- `preserve`: JSXを変換せず保持（Babel等で後処理）
- `react`: `React.createElement`に変換
- `react-jsx`: React 17+の新JSX変換（推奨）
- `react-native`: React Native用

### 5. エラーハンドリングと品質向上

#### noUnusedLocals / noUnusedParameters

```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

未使用の変数やパラメータをエラーとして検出します。クリーンなコードを維持するのに役立ちます。

#### noImplicitReturns

```json
{
  "compilerOptions": {
    "noImplicitReturns": true
  }
}
```

関数内の全てのパスで明示的に値を返すことを強制します。

```typescript
// Error: Not all code paths return a value
function getStatusCode(ok: boolean) {
  if (ok) {
    return 200;
  }
  // ここでreturnがない！
}
```

#### exactOptionalPropertyTypes

```json
{
  "compilerOptions": {
    "exactOptionalPropertyTypes": true
  }
}
```

オプショナルプロパティと`undefined`を厳密に区別します。

```typescript
interface Config {
  name?: string;
}

const config1: Config = { name: undefined }; // Error（厳密な区別）
const config2: Config = {}; // OK
const config3: Config = { name: "test" }; // OK
```

## よく使う設定パターン

### 1. Node.jsプロジェクト（ESM）

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
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 2. React + Viteプロジェクト

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 3. Next.jsプロジェクト

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 4. ライブラリ開発用

```json
{
  "compilerOptions": {
    "target": "ES2015",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

## プロジェクトごとの最適な設定方法

### 既存プロジェクトへの段階的導入

大規模な既存プロジェクトで`strict: true`を一気に適用するのは難しい場合があります。その場合は段階的なアプローチを推奨します：

```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

1. まず`noImplicitAny`と`strictNullChecks`から開始
2. 型エラーを段階的に修正
3. 最終的に`strict: true`を有効化

### 継承による設定の共通化

複数のパッケージや環境で共通設定を共有する場合：

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}

// tsconfig.json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext"
  }
}
```

### テストファイル用の設定

```json
// tsconfig.json
{
  "compilerOptions": {
    // メインの設定
  },
  "exclude": ["**/*.test.ts", "**/*.spec.ts"]
}

// tsconfig.test.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["**/*.test.ts", "**/*.spec.ts"]
}
```

## よくあるエラーと解決方法

### `Cannot find module` エラー

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

TypeScriptは認識していても、実行時に解決できない場合は、ビルドツール側（Vite、Webpack等）の設定も確認してください。

### `TS7016: Could not find a declaration file`

型定義がないパッケージの場合：

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": false
  }
}
```

または`@types/パッケージ名`をインストールしてください。

## まとめ

`tsconfig.json`の適切な設定は、TypeScriptプロジェクトの成功に不可欠です。以下のポイントを覚えておきましょう：

1. **新規プロジェクトでは`strict: true`を必ず有効化** - 初期から型安全性を確保
2. **`target`と`module`は実行環境に合わせて選択** - Node.jsなら`ES2022`+`NodeNext`、フロントエンドなら`ES2020`+`ESNext`
3. **パスエイリアスで保守性を向上** - `baseUrl`と`paths`を活用
4. **段階的な導入で既存プロジェクトも改善可能** - 一気に`strict`を適用する必要はない

適切な設定により、型安全性と開発体験の両方を最大化できるTypeScriptプロジェクトを構築できます。

## 参考リンク

- [TypeScript公式ドキュメント - TSConfig](https://www.typescriptlang.org/tsconfig/)
- [TypeScript公式ドキュメント - Compiler Options](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
