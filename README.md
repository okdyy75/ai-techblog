# AIテックブログ

AIが自動生成した技術記事をまとめたテックブログです。

## 概要

このプロジェクトは、[VitePress](https://vitepress.dev/) を使用して構築された技術ブログで、AI、Ruby、Rails、TypeScript、GraphQL、PostgreSQL、インフラなど、様々な技術トピックに関する記事を含んでいます。

## 技術スタック

- **静的サイトジェネレーター**: VitePress 1.6.3
- **ランタイム**: Node.js (推奨: 18以上)
- **マークダウン処理**: markdown-it-task-lists
- **サイドバー生成**: vitepress-sidebar
- **設定言語**: TypeScript (config.mts)

## プロジェクト構造

```
ai-techblog/
├── .github/               # GitHub設定とワークフロー
│   └── copilot-instructions.md
├── .vitepress/            # VitePress設定（廃止予定）
├── docs/                  # ドキュメントルート
│   ├── .vitepress/       # VitePress設定（現行）
│   │   └── config.mts    # サイト設定ファイル
│   ├── ai/               # AI関連記事
│   ├── ruby/             # Ruby関連記事
│   ├── rails/            # Rails関連記事
│   ├── typescript/       # TypeScript関連記事
│   ├── graphql/          # GraphQL関連記事
│   ├── postgres/         # PostgreSQL関連記事
│   ├── infrastructure/   # インフラ関連記事
│   ├── public/           # 静的ファイル
│   └── index.md          # ホームページ
├── issues/               # issueの管理用メモ
├── package.json          # 依存関係とスクリプト
└── README.md             # このファイル
```

## セットアップ

### 前提条件

- Node.js (推奨バージョン: 18以上)
- npm

### インストール

1. リポジトリをクローンします：
   ```bash
   git clone https://github.com/okdyy75/ai-techblog.git
   cd ai-techblog
   ```

2. 依存関係をインストールします：
   ```bash
   npm install
   ```

## 開発コマンド

### 開発サーバーの起動

```bash
npm run docs:dev
```

ブラウザで `http://localhost:5173` にアクセスして、開発サーバーを確認できます。

### ビルド

```bash
npm run docs:build
```

ビルド結果は `docs/.vitepress/dist/` に出力されます。

### プレビュー

```bash
npm run docs:preview
```

## コンテンツの追加

### 記事の追加

1. 適切なカテゴリディレクトリに新しいマークダウンファイルを作成します（例: `docs/ruby/`）
2. ファイル名は英語のケバブケース（例: `01-ruby-basics.md`）
3. 記事内容は日本語で記述
4. 各記事には適切なフロントマターを含めます

### 新しいカテゴリの追加

新しいカテゴリを追加する場合は、`docs/.vitepress/config.mts` の `categories` 配列に追加してください。

## ファイル配置

- **設定ファイル**: `docs/.vitepress/config.mts` でサイト設定を管理
- **記事**: `docs/` ディレクトリ以下にカテゴリごとに配置
- **画像**: `docs/public/` 以下に配置し、マークダウンからは `/path/to/image.png` で参照
- **依存関係**: 新しいnpmパッケージは `package.json` の `devDependencies` に追加

## 既知の制限事項

- RBS言語のシンタックスハイライトは未対応（`txt`にフォールバック）
- 大きなチャンクサイズの警告が表示される場合がある（現状は許容範囲）

## サポート

- VitePressの詳細: https://vitepress.dev/
- vitepress-sidebarの詳細: https://vitepress-sidebar.jooy2.com/
- 問題や質問は GitHubのIssueで報告してください

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 連絡先

プロジェクトの管理者: [@okdyy75](https://github.com/okdyy75)

---

*このREADMEファイルは、プロジェクトの理解を深めるために作成されました。*
