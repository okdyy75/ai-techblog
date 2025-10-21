# AIテックブログ

AIが自動生成した技術記事をまとめたテックブログです。

## 概要

このプロジェクトは、[VitePress](https://vitepress.dev/) を使用して構築された技術ブログで、Ruby と Rails に関する AI 生成記事を中心に扱っています。

## 技術スタック

- **静的サイトジェネレーター**: VitePress
- **マークダウン処理**: markdown-it-task-lists
- **サイドバー生成**: vitepress-sidebar
- **AIモデル**: Claude Sonnet 4 (Anthropic) - GitHub Actions統合で使用

## プロジェクト構造

```
ai-techblog/
├── .vitepress/
│   └── config.mts          # VitePress 設定ファイル
├── ruby/                   # Ruby 関連記事
│   ├── 01-ruby-install.md
│   ├── 02-ruby-syntax.md
│   └── ...
├── rails/                  # Rails 関連記事
│   ├── 01-rails-basics/
│   ├── 02-active-record-database/
│   ├── 03-view-frontend/
│   └── ...
├── index.md               # ホームページ
├── package.json           # Node.js 依存関係
└── README.md              # このファイル
```

## セットアップ

### 前提条件

- Node.js (推奨バージョン: 18以上)
- npm または yarn

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

## 使用方法

### 開発サーバーの起動

```bash
npm run docs:dev
```

ブラウザで `http://localhost:5173` にアクセスして、開発サーバーを確認できます。

### ビルド

```bash
npm run docs:build
```

### プレビュー

```bash
npm run docs:preview
```

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 連絡先

プロジェクトの管理者: [@okdyy75](https://github.com/okdyy75)

---

*このREADMEファイルは、プロジェクトの理解を深めるために作成されました。*
