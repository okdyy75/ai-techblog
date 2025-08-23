# TSConfigの詳細設定完全ガイド

tsconfig.jsonは、TypeScriptプロジェクトの心臓部とも言える設定ファイルです。この記事では、実際の開発で役立つ設定項目から高度な最適化まで、詳しく解説します。

## tsconfig.jsonの基本構造

```json
{
  "compilerOptions": {
    // コンパイラのオプション設定
  },
  "include": [
    // コンパイル対象に含めるファイル/ディレクトリ
  ],
  "exclude": [
    // コンパイル対象から除外するファイル/ディレクトリ
  ],
  "files": [
    // 個別に指定するファイル
  ],
  "extends": [
    // 継承する設定ファイル
  ],
  "compileOnSave": true,
  "typeAcquisition": {
    // 型定義の自動取得設定
  }
}
```

## 基本的なコンパイラオプション

### 言語とランタイムターゲット

```json
{
  "compilerOptions": {
    // 出力するJavaScriptのバージョン
    "target": "ES2022",
    
    // 使用するライブラリの型定義
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    
    // モジュールシステム
    "module": "ESNext",
    
    // モジュール解決方法
    "moduleResolution": "bundler",
    
    // JSXの処理方法
    "jsx": "react-jsx"
  }
}
```

### ファイル出力設定

```json
{
  "compilerOptions": {
    // 出力ディレクトリ
    "outDir": "./dist",
    
    // ルートディレクトリ
    "rootDir": "./src",
    
    // 宣言ファイル（.d.ts）を生成
    "declaration": true,
    
    // 宣言ファイルの出力先
    "declarationDir": "./types",
    
    // ソースマップを生成
    "sourceMap": true,
    
    // インラインソースマップ
    "inlineSourceMap": false,
    
    // ソースを埋め込み
    "inlineSources": false,
    
    // 出力前にディレクトリをクリア
    "emitDeclarationOnly": false
  }
}
```

## 厳格な型チェック設定

### 推奨：strict モード

```json
{
  "compilerOptions": {
    // すべての厳格チェックを有効化
    "strict": true,
    
    // または個別に設定
    "noImplicitAny": true,           // any の暗黙的使用を禁止
    "strictNullChecks": true,        // null/undefined の厳格チェック
    "strictFunctionTypes": true,     // 関数型の厳格チェック
    "strictBindCallApply": true,     // bind/call/apply の厳格チェック
    "strictPropertyInitialization": true, // プロパティ初期化の厳格チェック
    "noImplicitThis": true,          // this の暗黙的 any を禁止
    "alwaysStrict": true,            // 厳格モードでのコンパイル
    "exactOptionalPropertyTypes": true, // オプションプロパティの厳密な型チェック
    "noImplicitReturns": true,       // 関数のすべてのパスで return を要求
    "noFallthroughCasesInSwitch": true, // switch文のフォールスルーを禁止
    "noUncheckedIndexedAccess": true,   // インデックスアクセスで undefined を考慮
    "noImplicitOverride": true       // override キーワードを強制
  }
}
```

### プロジェクト別設定例

#### React プロジェクト

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": [
    "src"
  ],
  "exclude": [
    "node_modules",
    "build"
  ]
}
```

#### Node.js プロジェクト

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

#### ライブラリ開発

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "esnext",
    "lib": ["ES2018"],
    "outDir": "./lib",
    "rootDir": "./src",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "noEmitOnError": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  },
  "include": ["src"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "node_modules"]
}
```

## パス解決と模块設定

### ベースURL とパスマッピング

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"],
      "@config/*": ["src/config/*"],
      "@assets/*": ["src/assets/*"]
    }
  }
}
```

### 高度なパス解決

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      // ワイルドカードを使用した複雑なマッピング
      "@app/*": ["src/app/*"],
      "@shared/*": ["src/shared/*", "shared/*"],
      
      // 外部パッケージのマッピング
      "lodash": ["node_modules/@types/lodash/index.d.ts"],
      
      // 条件付きパス
      "@env": ["src/env/development.ts"],
      "@env/*": ["src/env/*"]
    },
    
    // JSON ファイルのインポートを許可
    "resolveJsonModule": true,
    
    // .js ファイルのインポートを許可
    "allowJs": true,
    
    // .js ファイルの型チェック
    "checkJs": false,
    
    // TypeScript ファイルから .js をインポート可能
    "allowSyntheticDefaultImports": true,
    
    // ES モジュールの相互運用
    "esModuleInterop": true
  }
}
```

## パフォーマンス最適化

### コンパイル速度の向上

```json
{
  "compilerOptions": {
    // 型ライブラリのチェックをスキップ
    "skipLibCheck": true,
    
    // 分離したモジュールとして扱う（Babel等との併用時）
    "isolatedModules": true,
    
    // インクリメンタルコンパイル
    "incremental": true,
    
    // コンパイル情報の保存場所
    "tsBuildInfoFile": "./buildcache/typescript.tsbuildinfo",
    
    // 型チェックのみ実行（emit なし）
    "noEmit": true,
    
    // エラー時のemitを停止
    "noEmitOnError": true
  }
}
```

### プロジェクト参照（Project References）

#### 親プロジェクト

```json
{
  "files": [],
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/ui" },
    { "path": "./packages/utils" }
  ]
}
```

#### 子プロジェクト

```json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src"],
  "references": [
    { "path": "../utils" }
  ]
}
```

## 高度な設定とデバッグ

### デバッグとトレース

```json
{
  "compilerOptions": {
    // モジュール解決の詳細ログ
    "traceResolution": true,
    
    // 型の詳細ログ
    "extendedDiagnostics": true,
    
    // ファイル監視の詳細ログ
    "diagnostics": true,
    
    // コンパイル統計
    "generateCpuProfile": "profile.cpuprofile",
    
    // 詳細なエラーメッセージ
    "pretty": true,
    
    // エラーメッセージの最大数
    "maxNodeModuleJsDepth": 0
  }
}
```

### 実験的機能

```json
{
  "compilerOptions": {
    // デコレータの実験的サポート
    "experimentalDecorators": true,
    
    // デコレータのメタデータ
    "emitDecoratorMetadata": true,
    
    // Import Assertions
    "allowImportingTsExtensions": true,
    
    // bundler 向けの設定
    "moduleResolution": "bundler",
    "allowArbitraryExtensions": true,
    
    // Node.js ESM サポート
    "verbatimModuleSyntax": true
  }
}
```

## 環境別設定管理

### 設定の継承

#### base.json

```json
{
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

#### tsconfig.json（開発用）

```json
{
  "extends": "./configs/base.json",
  "compilerOptions": {
    "target": "ES2020",
    "sourceMap": true,
    "noEmit": true,
    "incremental": true
  },
  "include": ["src", "tests"]
}
```

#### tsconfig.build.json（本番用）

```json
{
  "extends": "./configs/base.json",
  "compilerOptions": {
    "target": "ES2018",
    "outDir": "./dist",
    "sourceMap": false,
    "removeComments": true,
    "declaration": true
  },
  "exclude": ["**/*.test.ts", "**/*.spec.ts"]
}
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. モジュールが見つからない

```json
{
  "compilerOptions": {
    // Node.js のモジュール解決を使用
    "moduleResolution": "node",
    
    // 型定義を検索するディレクトリ
    "typeRoots": ["./node_modules/@types", "./src/types"],
    
    // 自動的に型定義を含める
    "types": ["node", "jest"]
  }
}
```

#### 2. パフォーマンスの問題

```json
{
  "compilerOptions": {
    // 不要なファイルの除外
    "skipLibCheck": true,
    
    // 型チェックのレベル調整
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "exclude": [
    "node_modules",
    "**/*.test.ts",
    "coverage",
    "dist",
    ".next",
    "out"
  ]
}
```

#### 3. 型定義の競合

```json
{
  "compilerOptions": {
    // 特定の型定義のみ使用
    "types": ["node"],
    
    // DOM型定義を除外
    "lib": ["ES2020"],
    
    // skipLibCheck でライブラリの型エラーを無視
    "skipLibCheck": true
  }
}
```

## ベストプラクティス

### 1. プロジェクト構造に応じた設定

```
project/
├── packages/
│   ├── core/
│   │   └── tsconfig.json
│   ├── ui/
│   │   └── tsconfig.json
│   └── utils/
│       └── tsconfig.json
├── apps/
│   ├── web/
│   │   └── tsconfig.json
│   └── api/
│       └── tsconfig.json
├── tsconfig.base.json
└── tsconfig.json
```

### 2. チーム開発での統一設定

```json
{
  "compilerOptions": {
    // 必須の厳格設定
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    
    // コードスタイルの統一
    "forceConsistentCasingInFileNames": true,
    "exactOptionalPropertyTypes": true,
    
    // 未使用コードの検出
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false
  }
}
```

### 3. CI/CD での設定

```json
{
  "compilerOptions": {
    // エラー時の停止
    "noEmitOnError": true,
    
    // 詳細なエラー情報
    "pretty": false,
    
    // パフォーマンス最適化
    "skipLibCheck": true,
    "incremental": false
  }
}
```

## まとめ

TSConfigの適切な設定は、TypeScriptプロジェクトの成功に不可欠です：

- **プロジェクトの性質に応じた設定**: React、Node.js、ライブラリ開発など
- **厳格な型チェック**: バグの早期発見と高品質なコードの実現
- **パフォーマンス最適化**: 開発体験の向上
- **チーム開発での統一**: 一貫性のあるコードベース

設定は一度決めて終わりではなく、プロジェクトの成長に合わせて継続的に見直すことが重要です。

次の記事では、型安全なAPI設計パターンについて学習していきます。

## 参考資料

- [TypeScript Handbook - tsconfig.json](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
- [TSConfig Reference](https://www.typescriptlang.org/tsconfig)