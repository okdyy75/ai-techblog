# Vercel基礎知識：JAMstackとフロントエンドデプロイメント

## 概要

Vercelは、フロントエンド開発者向けのクラウドプラットフォームで、JAMstackアプリケーションのデプロイメントとホスティングに特化しています。Next.jsの開発元としても知られており、モダンなWeb開発ワークフローを提供します。

## Vercelの特徴

### 1. JAMstack特化
- **JavaScript**: クライアントサイドの動的機能
- **APIs**: サーバーレス関数とサードパーティAPI
- **Markup**: 事前にビルドされた静的HTML

### 2. 自動デプロイメント
- Gitリポジトリとの直接連携
- プレビューデプロイメント
- 本番環境への自動マージ

### 3. エッジネットワーク
- グローバルCDN
- 自動的な地理的分散
- 高速なコンテンツ配信

## 基本的なワークフロー

### 1. プロジェクトの作成
```bash
# Vercel CLIのインストール
npm i -g vercel

# ログイン
vercel login

# プロジェクトの初期化
vercel
```

### 2. フレームワーク別の設定

#### Next.js
```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

#### React (Create React App)
```json
// package.json
{
  "scripts": {
    "build": "react-scripts build"
  }
}
```

#### Vue.js
```json
// package.json
{
  "scripts": {
    "build": "vue-cli-service build"
  }
}
```

### 3. デプロイメント
```bash
# 開発環境へのデプロイ
vercel

# 本番環境へのデプロイ
vercel --prod

# 特定のブランチからデプロイ
vercel --prod --branch main
```

## プロジェクト構造

### 1. 基本的なディレクトリ構造
```
my-project/
├── components/
├── pages/
├── public/
├── styles/
├── package.json
├── vercel.json
└── .gitignore
```

### 2. vercel.json設定
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ]
}
```

## サーバーレス関数

### 1. API Routes (Next.js)
```javascript
// pages/api/hello.js
export default function handler(req, res) {
  res.status(200).json({ message: 'Hello World!' })
}
```

### 2. Vercel Functions
```javascript
// api/users.js
export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({ users: [] })
  } else if (req.method === 'POST') {
    res.status(201).json({ message: 'User created' })
  }
}
```

### 3. 環境変数の使用
```javascript
// api/config.js
export default function handler(req, res) {
  res.status(200).json({
    apiKey: process.env.API_KEY,
    databaseUrl: process.env.DATABASE_URL
  })
}
```

## 環境変数の管理

### 1. ローカル環境
```bash
# .env.local
DATABASE_URL=postgresql://...
API_KEY=your-api-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Vercel環境
```bash
# Vercel CLIで設定
vercel env add DATABASE_URL

# ダッシュボードで設定
# Settings > Environment Variables
```

### 3. 環境別の設定
```bash
# 開発環境
vercel env add DATABASE_URL development

# プレビュー環境
vercel env add DATABASE_URL preview

# 本番環境
vercel env add DATABASE_URL production
```

## ドメインとSSL

### 1. カスタムドメイン
```bash
# ドメインの追加
vercel domains add example.com

# DNS設定の確認
vercel domains ls
```

### 2. SSL証明書
- 自動的なSSL証明書発行
- Let's Encryptとの連携
- ワイルドカード証明書対応

### 3. リダイレクト設定
```json
// vercel.json
{
  "redirects": [
    {
      "source": "/old-page",
      "destination": "/new-page",
      "permanent": true
    }
  ]
}
```

## 料金体系

### Hobby (無料)
- 個人プロジェクト
- 100GB バンド幅/月
- サーバーレス関数実行時間制限
- チーム機能なし

### Pro ($20/月)
- チーム機能
- 1TB バンド幅/月
- パスワード保護
- 分析機能

### Enterprise
- カスタム料金
- 専用サポート
- SLA保証
- カスタムドメイン無制限

## パフォーマンス最適化

### 1. 画像最適化
```javascript
// Next.js Image component
import Image from 'next/image'

<Image
  src="/profile.jpg"
  alt="Profile"
  width={500}
  height={300}
  priority
/>
```

### 2. 静的生成
```javascript
// pages/blog/[slug].js
export async function getStaticProps({ params }) {
  const post = await getPost(params.slug)
  return {
    props: { post },
    revalidate: 60 // ISR
  }
}
```

### 3. キャッシュ戦略
```javascript
// API Routesでのキャッシュ
export default function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate')
  res.status(200).json({ data: 'cached' })
}
```

## まとめ

Vercelは、モダンなフロントエンド開発に特化したプラットフォームで、特にJAMstackアプリケーションの開発・デプロイメントにおいて優れた開発者体験を提供します。Next.jsとの相性が特に良く、サーバーレス関数やエッジネットワークを活用した高性能なアプリケーションの構築が可能です。

初心者から上級者まで、段階的に機能を活用できる設計になっており、フロントエンド開発の効率化に大きく貢献します。