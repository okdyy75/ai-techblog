# GitHub Copilot 指示書

## プロジェクト概要

このリポジトリは、VitePressを使用して構築されたAI技術ブログです。AI、Ruby、Rails、TypeScript、GraphQL、PostgreSQL、インフラなど、様々な技術トピックに関する記事を含んでいます。

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
└── README.md             # プロジェクトのREADME
```

## 開発コマンド

### セットアップ
```bash
npm install
```

### 開発サーバー
```bash
npm run docs:dev
# http://localhost:5173 でアクセス可能
```

### ビルド
```bash
npm run docs:build
# docs/.vitepress/dist/ に出力
```

### プレビュー
```bash
npm run docs:preview
```

## コーディング規約と注意事項

### 一般的なガイドライン

1. **言語設定**
   - 常に日本語で回答してください
   - コードコメント、ドキュメント、コミットメッセージは日本語で記述
   - 技術用語は英語のままでも可

2. **マークダウン記事**
   - 全ての記事は `docs/` ディレクトリ以下に配置
   - カテゴリごとにディレクトリを分ける（ai, ruby, rails, etc.）
   - ファイル名は英語のケバブケース（例: `01-ruby-basics.md`）
   - 記事内容は日本語で記述

3. **VitePress設定**
   - サイト設定は `docs/.vitepress/config.mts` で管理
   - ナビゲーションは `generateNav()` 関数で自動生成
   - サイドバーは `vitepress-sidebar` で自動生成
   - 新しいカテゴリを追加する場合は `config.mts` の `categories` 配列に追加

4. **フロントマター**
   - 各記事には適切なフロントマターを含める
   - タイトル、説明、日付などのメタデータを記述

### ファイル変更時の注意

- **設定ファイル**: `docs/.vitepress/config.mts` を変更する場合は、TypeScriptの型安全性を維持
- **記事追加**: 新しい記事を追加する場合は、適切なカテゴリディレクトリに配置
- **画像**: 画像は `docs/public/` 以下に配置し、マークダウンからは `/path/to/image.png` で参照
- **依存関係**: 新しいnpmパッケージを追加する場合は、`package.json` の `devDependencies` に追加

### ビルドとテスト

- コード変更後は必ず `npm run docs:build` でビルドエラーがないことを確認
- 開発サーバー (`npm run docs:dev`) で動作確認を推奨
- 大きな変更の場合は、複数のカテゴリページで表示を確認

### 既知の制限事項

- RBS言語のシンタックスハイライトは未対応（`txt`にフォールバック）
- 大きなチャンクサイズの警告が表示される場合がある（現状は許容範囲）

## AI生成コンテンツについて

このブログの記事はAIによって生成されています。記事を追加・編集する際は：

- 技術的な正確性を確認
- 読みやすさと構成を重視
- コードサンプルが動作することを確認（可能な場合）
- 適切な参照リンクを含める

## サポートとヘルプ

- VitePressの詳細: https://vitepress.dev/
- vitepress-sidebarの詳細: https://vitepress-sidebar.jooy2.com/
- 問題や質問は GitHubのIssueで報告してください
