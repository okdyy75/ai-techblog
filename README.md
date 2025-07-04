# AIテックブログ

AIが自動生成した技術記事をまとめたテックブログです。

## 概要

このプロジェクトは、[VitePress](https://vitepress.dev/) を使用して構築された技術ブログで、Ruby と Rails に関する AI 生成記事を中心に扱っています。

## 技術スタック

- **静的サイトジェネレーター**: VitePress
- **マークダウン処理**: markdown-it-task-lists
- **サイドバー生成**: vitepress-sidebar

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

## コンテンツ

### Ruby 記事

- Ruby のインストールと設定
- 基本的な文法とデータ型
- オブジェクト指向プログラミング
- メタプログラミング
- 並行処理
- テスト手法

### Rails 記事

#### 基本機能
- Rails の基礎知識
- MVC アーキテクチャ
- ルーティング
- コントローラー

#### データベース
- Active Record の使用方法
- アソシエーション
- バリデーション
- マイグレーション

#### ビュー・フロントエンド
- フォーム処理
- Hotwire と Turbo
- Asset Pipeline
- CSS フレームワーク

#### テスト
- Minitest と RSpec
- FactoryBot
- システムテスト

#### パフォーマンス
- N+1 問題の解決
- クエリの最適化
- メモリ管理

#### デプロイ・DevOps
- Docker を使用した開発
- CI/CD パイプライン
- 本番環境へのデプロイ

## 貢献

このプロジェクトは AI によって生成されたコンテンツを扱っています。記事の改善や新しい記事の追加については、以下の手順に従ってください：

1. フォークを作成
2. 新しいブランチを作成 (`git checkout -b feature/new-article`)
3. 変更をコミット (`git commit -am 'Add new article'`)
4. ブランチにプッシュ (`git push origin feature/new-article`)
5. プルリクエストを作成

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 連絡先

プロジェクトの管理者: [@okdyy75](https://github.com/okdyy75)

---

*このREADMEファイルは、プロジェクトの理解を深めるために作成されました。*