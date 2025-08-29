# Heroku基礎知識：クラウドプラットフォームの入門

## 概要

Herokuは、開発者がアプリケーションを簡単にデプロイ・管理できるPaaS（Platform as a Service）プラットフォームです。2007年に創業され、現在はSalesforceの子会社として運営されています。

## Herokuの特徴

### 1. シンプルなデプロイメント
- Gitリポジトリとの直接連携
- `git push heroku main` でデプロイ完了
- 自動的なビルドプロセス

### 2. マルチ言語対応
- Ruby, Node.js, Python, Java, PHP, Go, Scala, Clojure
- 各言語の最新バージョンをサポート

### 3. アドオンエコシステム
- データベース（PostgreSQL, Redis, MongoDB）
- 監視・ログ（Papertrail, New Relic）
- 認証（Auth0, Okta）

## 基本的なワークフロー

### 1. アプリケーションの作成
```bash
# Heroku CLIのインストール
curl https://cli-assets.heroku.com/install.sh | sh

# ログイン
heroku login

# アプリケーション作成
heroku create my-app-name
```

### 2. デプロイメント
```bash
# リモートリポジトリの追加
git remote add heroku https://git.heroku.com/my-app-name.git

# デプロイ
git push heroku main
```

### 3. 環境変数の設定
```bash
heroku config:set DATABASE_URL=postgresql://...
heroku config:set NODE_ENV=production
```

## 料金体系

### Free Tier（終了）
- 2022年11月に無料プランが終了
- 現在は有料プランのみ

### Basic Dyno
- $7/月から
- 512MB RAM
- 1x CPU

### Standard Dyno
- $25/月から
- 512MB-2.5GB RAM
- 1x-2x CPU

## メリット・デメリット

### メリット
- 開発者体験が優れている
- 学習コストが低い
- 豊富なアドオン
- 自動スケーリング

### デメリット
- コストが高くなりやすい
- ベンダーロックイン
- カスタマイズ性の制限
- 無料プランの廃止

## まとめ

Herokuは初心者から中級者まで幅広く使えるPaaSプラットフォームです。特に、開発からデプロイまでの流れが非常にシンプルで、インフラの複雑さを隠蔽してくれる点が大きな魅力です。ただし、本格的な運用を考える場合は、コストとベンダーロックインのリスクを考慮する必要があります。