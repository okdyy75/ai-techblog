Warning: 256-color support not detected. Using a terminal with at least 256-color support is recommended for a better visual experience.
YOLO mode is enabled. All tool calls will be automatically approved.
YOLO mode is enabled. All tool calls will be automatically approved.
Ripgrep is not available. Falling back to GrepTool.
---
title: 2026年のTypeScriptプロジェクト構成ガイド：保守性と拡張性を両立する設計パターン
---

# 2026年のTypeScriptプロジェクト構成ガイド：保守性と拡張性を両立する設計パターン

TypeScriptがフロントエンドおよびバックエンド開発の「標準言語」となって久しい2026年、プロジェクトの規模はかつてないほど巨大化し、複雑化しています。かつては「`src`ディレクトリにファイルを置く」だけで十分だった構成も、現在ではマイクロフロントエンド、モノレポ、そしてAIによるコード生成との親和性など、多角的な視点での設計が求められています。

本記事では、中級以上のエンジニアを対象に、モダンなTypeScriptプロジェクトにおける「正解に近い」ディレクトリ構成と、型安全性を最大化するためのアーキテクチャ設計について深く掘り下げます。

---

## 1. 現代的なプロジェクト構成の基本原則

2026年現在、プロジェクト構成を考える上で最も重要なのは「認知負荷の低減」と「境界の明示」です。

### 1.1 「関心の分離」から「機能の凝集」へ
従来の「`components`, `hooks`, `services`」といった役割ベースのレイヤードアーキテクチャ（Horizontal Slicing）は、プロジェクトが成長すると「ある機能に関連するファイルがどこにあるか分からない」という問題を引き起こします。

現代では、機能単位でディレクトリを分割する**Feature-based Architecture（Vertical Slicing）**が主流です。

### 1.2 依存関係のクリーン化
TypeScript 5.x〜6.xで強化された`Project References`や、ESModulesの完全移行により、モジュール間の依存関係を厳格に管理することが容易になりました。循環参照を避け、型定義のリークを防ぐことが、ビルド速度と開発体験（DX）の向上に直結します。

---

## 2. 推奨されるディレクトリ構造（ASCIIアート）

以下に、スケーラブルなTypeScriptプロジェクトの標準的なディレクトリ構造を示します。

```text
.
├── .github/              # CI/CDワークフロー（GitHub Actions）
├── .husky/               # Gitフック（commit-msg, pre-commit）
├── apps/                 # モノレポの場合のアプリケーション本体
│   └── web/
├── packages/             # 共有ライブラリ（ui, core, utils）
│   ├── database/         # Prisma/Drizzle等のスキーマ・クライアント
│   └── config/           # shared-eslint, shared-tsconfig
├── src/                  # (シングルレポの場合のメインソース)
│   ├── app/              # エントリーポイント、Router、Provider設定
│   ├── assets/           # 画像、フォント、静的ファイル
│   ├── components/       # プロジェクト全体で使い回す共通UI（Atomic Designの再解釈）
│   ├── features/         # 🚀 核心部：機能単位のモジュール
│   │   ├── auth/         # 認証機能
│   │   ├── user-profile/ # ユーザープロフィール機能
│   │   │   ├── api/      # APIクライアント（TanStack Query等）
│   │   │   ├── components/ # この機能専用のUI
│   │   │   ├── hooks/    # この機能専用のカスタムフック
│   │   │   ├── stores/   # 状態管理（Zustand, Jotai等）
│   │   │   ├── types/    # ドメイン固有の型定義
│   │   │   └── index.ts  # Public API（外部に公開するものだけをexport）
│   ├── hooks/            # 汎用的なカスタムフック（useBoolean, useWindowSize等）
│   ├── lib/              # 外部ライブラリのラッパー・設定（axios, dayjs等）
│   ├── services/         # 共通のビジネスロジック・外部通信
│   ├── stores/           # グローバルな状態管理
│   ├── types/            # アプリケーション共通の型定義
│   └── utils/            # 純粋関数ヘルパー
├── tests/                # E2Eテスト（Playwright）
├── tsconfig.json         # 基本設定
└── package.json
```

---

## 3. 実践的なコード例と設計手法

### 3.1 Feature-basedなモジュール設計（Public APIの隔離）

各機能（feature）ディレクトリの直下に`index.ts`を配置し、そこからのみ外部へのアクセスを許可します。これにより、機能内部のプライベートな実装詳細が外部に漏れ出すのを防ぎます。

```typescript
// src/features/user-profile/index.ts

// 必要なものだけをエクスポート
export { UserAvatar } from './components/UserAvatar';
export { UserSettingsForm } from './components/UserSettingsForm';
export { useUser } from './hooks/useUser';
export type { UserProfile } from './types';

// 内部でしか使わない hooks や api はエクスポートしない！
```

**ESLintルールでの強制:**
`eslint-plugin-import`などを使用して、他のfeatureが内部ファイルを直接参照するのを禁止します。

### 3.2 厳格な型安全性を確保する「Branded Types」

2026年のTypeScript開発では、単なる`string`や`number`ではなく、ドメインに特化した「Branded Types（Nominal Types）」を活用して、IDの取り違えなどのバグをコンパイル時に防ぎます。

```typescript
// src/types/branded.ts
export type Brand<K, T> = T & { __brand: K };

// src/features/user-profile/types/index.ts
import { Brand } from '@/types/branded';

export type UserId = Brand<'UserId', string>;
export type OrderId = Brand<'OrderId', string>;

export interface User {
  id: UserId;
  name: string;
}

// 使用例
const userId = '123' as UserId;
const orderId = '456' as OrderId;

function fetchUser(id: UserId) { /* ... */ }

fetchUser(userId); // OK
// fetchUser(orderId); // Error: Argument of type 'OrderId' is not assignable to parameter of type 'UserId'.
```

### 3.3 tsconfig.json の最適化（2026年版）

モダンなプロジェクトでは、`moduleResolution: "bundler"` と `verbatimModuleSyntax: true` の使用が推奨されます。

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true,
    "verbatimModuleSyntax": true, // 型のみのインポートを強制
    "noUncheckedIndexedAccess": true, // 配列アクセスの安全性を向上
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 4. 依存関係管理とモノレポ戦略

2026年、中規模以上のプロジェクトでは**Turborepo**や**Nx**を用いたモノレポ構成が標準となっています。

### 4.1 パッケージ構成のベストプラクティス

モノレポにおける`packages/`配下は、以下のように役割を明確に分けます。

| パッケージ名 | 内容 | 備考 |
| :--- | :--- | :--- |
| `@repo/ui` | 共通UIコンポーネント | デザインシステムに基づいたコンポーネント |
| `@repo/core` | ビジネスロジック・ドメインモデル | フレームワークに依存しない純粋なTS |
| `@repo/db` | データベースクライアント | Prisma/Drizzle等 |
| `@repo/tsconfig` | 共通のtsconfig設定 | 設定の重複を排除 |
| `@repo/eslint` | 共通のLinter設定 | コーディング規約の統一 |

### 4.2 依存関係の逆転（Dependency Inversion）
フロントエンドの機能が特定のAPIクライアントに依存するのではなく、インターフェースに依存するように設計します。これにより、テスト時のモック化が容易になります。

---

## 5. 状態管理の棲み分け

2026年のトレンドは「状態の分散化」です。巨大な一つのStore（Redux等）を作るのではなく、用途に応じてツールを使い分けます。

1.  **Server State:** `TanStack Query (React Query)`。サーバーからのデータ取得、キャッシュ、ローディング状態。
2.  **Global UI State:** `Zustand` または `Jotai`。認証情報、テーマ、モーダルの開閉など。
3.  **Local State:** `useState`, `useReducer`。コンポーネント内だけで完結する状態。
4.  **Form State:** `React Hook Form`。バリデーションを含むフォーム操作。

---

## 6. テスト戦略：ピラミッドからトロフィーへ

現代のTypeScriptプロジェクトでは、単体テスト（Vitest）よりも統合テストとE2Eテスト（Playwright）に重点を置く「Testing Trophy」モデルが推奨されます。

- **Static Analysis (TypeScript, ESLint, Biome):** 型チェックと静的解析でバグの8割を未然に防ぐ。
- **Integration Tests:** 複数のコンポーネントやHookが正しく連携するかを確認。
- **E2E Tests:** Playwrightを使用し、ユーザーの実際のフロー（ログイン → 投稿 → ログアウト）をテスト。

---

## 7. まとめ

TypeScriptプロジェクトの構成に「唯一の正解」はありませんが、2026年現在のベストプラクティスをまとめると以下の通りです。

1.  **機能単位（Feature-based）で分割する:** 関連するコードを近くに配置し、認知負荷を下げる。
2.  **境界を厳格にする:** `index.ts`によるPublic APIの隔離と、Branded Typesによるドメイン型の強化。
3.  **モノレポを検討する:** Turborepo等を用いて、共通ロジックとアプリ本体を適切に分離する。
4.  **ツールチェーンの最新化:** `tsconfig`の最適化、Biomeによる高速なLint/Formatの導入。
5.  **テストは統合・E2E重視:** 型安全性を信じつつ、実際のユーザー挙動を担保する。

適切なディレクトリ構成は、単なるファイルの整理整頓ではありません。それは**「チームの思考の地図」**であり、プロジェクトが数年後に「レガシー」と呼ばれるか「メンテナンス可能な資産」と呼ばれるかの分かれ道となります。

本ガイドを参考に、あなたのプロジェクトに最適な構成を構築してください。

---
