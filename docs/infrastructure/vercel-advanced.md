# Vercel上級者向け：高度な機能とパフォーマンス最適化

## 概要

Vercelの基本機能を理解した後は、より高度な機能を活用してパフォーマンスと開発効率を最大化しましょう。この記事では、エッジ関数、ISR、分析、チーム機能などについて詳しく解説します。

## エッジ関数とエッジコンピューティング

### 1. Edge Functions
```javascript
// api/edge.js
export const config = {
  runtime: 'edge'
}

export default function handler(req) {
  return new Response('Hello from Edge!', {
    status: 200,
    headers: {
      'content-type': 'text/plain'
    }
  })
}
```

### 2. Edge Middleware
```javascript
// middleware.js
import { NextResponse } from 'next/server'

export function middleware(request) {
  // 地理的位置に基づくコンテンツ配信
  const country = request.geo?.country || 'US'
  
  if (country === 'JP') {
    return NextResponse.rewrite(new URL('/ja', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)'
}
```

### 3. Edge Config
```javascript
// lib/edge-config.js
import { get } from '@vercel/edge-config'

export async function getConfig() {
  const apiKey = await get('apiKey')
  const featureFlags = await get('featureFlags')
  
  return { apiKey, featureFlags }
}
```

## 高度なキャッシュ戦略

### 1. ISR (Incremental Static Regeneration)
```javascript
// pages/blog/[slug].js
export async function getStaticProps({ params }) {
  const post = await fetchPost(params.slug)
  
  return {
    props: { post },
    revalidate: 3600, // 1時間ごとに再生成
    notFound: !post
  }
}

export async function getStaticPaths() {
  const posts = await fetchPosts()
  
  const paths = posts.map((post) => ({
    params: { slug: post.slug }
  }))
  
  return {
    paths,
    fallback: 'blocking' // 新しいページを動的に生成
  }
}
```

### 2. 動的キャッシュ
```javascript
// pages/api/data.js
export default function handler(req, res) {
  // 動的なキャッシュヘッダー
  const cacheTime = req.query.cache || 60
  
  res.setHeader('Cache-Control', `s-maxage=${cacheTime}, stale-while-revalidate`)
  res.status(200).json({ data: 'cached data' })
}
```

### 3. キャッシュ無効化
```javascript
// pages/api/revalidate.js
export default async function handler(req, res) {
  if (req.query.secret !== process.env.REVALIDATE_SECRET) {
    return res.status(401).json({ message: 'Invalid token' })
  }
  
  try {
    await res.revalidate('/blog')
    return res.json({ revalidated: true })
  } catch (err) {
    return res.status(500).send('Error revalidating')
  }
}
```

## パフォーマンス最適化

### 1. 画像最適化
```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['example.com'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  }
}
```

### 2. フォント最適化
```javascript
// pages/_app.js
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export default function App({ Component, pageProps }) {
  return (
    <main className={inter.variable}>
      <Component {...pageProps} />
    </main>
  )
}
```

### 3. バンドル分析
```bash
# バンドルサイズの分析
npm run build
npx @next/bundle-analyzer
```

## チーム機能とコラボレーション

### 1. チーム管理
```bash
# チームの作成
vercel teams create my-team

# メンバーの招待
vercel teams invite user@example.com

# プロジェクトの移譲
vercel projects transfer my-project my-team
```

### 2. 環境別の設定
```json
// vercel.json
{
  "env": {
    "DATABASE_URL": "@database-url"
  },
  "build": {
    "env": {
      "NEXT_PUBLIC_API_URL": "@api-url"
    }
  }
}
```

### 3. プレビューデプロイメント
```bash
# プレビューの作成
vercel --target preview

# 特定のブランチからプレビュー
vercel --target preview --branch feature/new-feature
```

## 監視と分析

### 1. Vercel Analytics
```javascript
// pages/_app.js
import { Analytics } from '@vercel/analytics/react'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}
```

### 2. パフォーマンス監視
```javascript
// lib/analytics.js
export function trackEvent(event, properties = {}) {
  if (typeof window !== 'undefined') {
    window.gtag('event', event, properties)
  }
}

export function trackPageView(url) {
  trackEvent('page_view', { page_location: url })
}
```

### 3. エラー監視
```javascript
// lib/error-tracking.js
export function captureException(error, context = {}) {
  if (process.env.NODE_ENV === 'production') {
    // SentryやLogRocketなどの統合
    console.error('Error captured:', error, context)
  }
}
```

## セキュリティ強化

### 1. 認証と認可
```javascript
// middleware.js
import { NextResponse } from 'next/server'

export function middleware(request) {
  const token = request.headers.get('authorization')
  
  if (!token && request.nextUrl.pathname.startsWith('/api/protected')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  return NextResponse.next()
}
```

### 2. CORS設定
```javascript
// pages/api/cors.js
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://example.com')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  
  res.status(200).json({ message: 'CORS enabled' })
}
```

### 3. 環境変数の暗号化
```bash
# 機密情報の暗号化
vercel env add SECRET_KEY production
# プロンプトで値を入力（画面に表示されない）
```

## データベース統合

### 1. Vercel Postgres
```javascript
// lib/db.js
import { sql } from '@vercel/postgres'

export async function getUsers() {
  const { rows } = await sql`SELECT * FROM users`
  return rows
}

export async function createUser(name, email) {
  const { rows } = await sql`
    INSERT INTO users (name, email) 
    VALUES (${name}, ${email}) 
    RETURNING *
  `
  return rows[0]
}
```

### 2. Vercel KV (Redis)
```javascript
// lib/kv.js
import { kv } from '@vercel/kv'

export async function getCache(key) {
  return await kv.get(key)
}

export async function setCache(key, value, ttl = 3600) {
  await kv.set(key, value, { ex: ttl })
}
```

### 3. Vercel Blob
```javascript
// lib/blob.js
import { put, del, list } from '@vercel/blob'

export async function uploadFile(file) {
  const { url } = await put(file.name, file, { access: 'public' })
  return url
}

export async function deleteFile(url) {
  await del(url)
}
```

## CI/CDとデプロイメント

### 1. GitHub Actions統合
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### 2. 自動テスト
```javascript
// __tests__/api.test.js
import { createMocks } from 'node-mocks-http'
import handler from '../pages/api/hello'

describe('/api/hello', () => {
  test('returns a message', async () => {
    const { req, res } = createMocks({
      method: 'GET'
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        message: expect.any(String)
      })
    )
  })
})
```

### 3. デプロイメント保護
```json
// vercel.json
{
  "git": {
    "deploymentEnabled": {
      "main": true,
      "develop": false
    }
  }
}
```

## まとめ

Vercelの高度な機能を活用することで、エンタープライズレベルのアプリケーションを構築できます。特に、エッジコンピューティング、ISR、チーム機能の組み合わせにより、スケーラブルで高性能なWebアプリケーションの開発が可能です。

これらの機能を適切に設定・運用することで、開発チームの生産性とアプリケーションのパフォーマンスを大幅に向上させることができます。