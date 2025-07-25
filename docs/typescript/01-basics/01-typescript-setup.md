# TypeScriptのインストールとセットアップ

TypeScriptの開発環境を構築する方法を解説します。

## 前提条件

- Node.js (バージョン 14 以上推奨)
- npm または yarn

## TypeScriptのインストール

### グローバルインストール

```bash
# npm を使用
npm install -g typescript

# yarn を使用
yarn global add typescript
```

### プロジェクトローカルインストール（推奨）

```bash
# npm を使用
npm install --save-dev typescript
npm install --save-dev @types/node

# yarn を使用
yarn add --dev typescript
yarn add --dev @types/node
```

## プロジェクトの初期化

### TypeScriptプロジェクトの作成

```bash
# プロジェクトディレクトリを作成
mkdir my-typescript-project
cd my-typescript-project

# package.json を初期化
npm init -y

# TypeScript設定ファイルを生成
npx tsc --init
```

### tsconfig.jsonの基本設定

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
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

## 開発環境の構築

### VS Code の設定

```json
// .vscode/settings.json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "typescript.suggest.autoImports": true,
  "typescript.updateImportsOnFileMove.enabled": "always",
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

### package.jsonのスクリプト設定

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js",
    "clean": "rm -rf dist"
  }
}
```

## 開発サーバーの設定

### ts-node を使用した開発環境

```bash
npm install --save-dev ts-node nodemon
```

```json
// package.json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### nodemon.jsonの設定

```json
{
  "watch": ["src"],
  "ext": "ts,json",
  "ignore": ["src/**/*.spec.ts"],
  "exec": "ts-node src/index.ts"
}
```

## 最初のTypeScriptファイル

```typescript
// src/index.ts
interface User {
  id: number;
  name: string;
  email: string;
}

const createUser = (name: string, email: string): User => {
  return {
    id: Math.floor(Math.random() * 1000),
    name,
    email
  };
};

const user = createUser("John Doe", "john@example.com");
console.log(`Created user: ${user.name} (${user.email})`);
```

## ビルドと実行

```bash
# TypeScriptをコンパイル
npm run build

# 実行
npm start

# 開発モード（ファイル変更を監視）
npm run dev
```

## 型定義ファイルの管理

### よく使われる型定義パッケージ

```bash
# Node.js
npm install --save-dev @types/node

# Express.js
npm install --save-dev @types/express

# Jest
npm install --save-dev @types/jest

# Lodash
npm install --save-dev @types/lodash
```

## プロジェクト構造の例

```
my-typescript-project/
├── src/
│   ├── index.ts
│   ├── types/
│   │   └── user.ts
│   ├── utils/
│   │   └── helpers.ts
│   └── services/
│       └── userService.ts
├── dist/           # コンパイル後のファイル
├── tests/
│   └── index.test.ts
├── .vscode/
│   └── settings.json
├── tsconfig.json
├── package.json
└── README.md
```

## トラブルシューティング

### よくあるエラーと解決方法

1. **モジュールが見つからない**
   ```bash
   npm install --save-dev @types/node
   ```

2. **型定義が見つからない**
   ```typescript
   // declare文で型を宣言
   declare module 'my-module';
   ```

3. **パス解決の問題**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "baseUrl": "./src",
       "paths": {
         "@/*": ["*"]
       }
     }
   }
   ```

## まとめ

TypeScriptの開発環境構築は以下の手順で行います：

1. Node.js環境の準備
2. TypeScriptのインストール
3. tsconfig.jsonの設定
4. 開発ツールの設定
5. プロジェクト構造の構築

適切なセットアップにより、型安全で効率的な開発が可能になります。