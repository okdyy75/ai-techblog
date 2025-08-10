# Vercelエンタープライズ：大規模アプリケーションとチーム開発

## 概要

Vercelは個人開発者からエンタープライズまで幅広く対応していますが、大規模なチーム開発やエンタープライズ要件では特別な機能とベストプラクティスが必要です。この記事では、エンタープライズレベルの機能と運用について詳しく解説します。

## エンタープライズ機能

### 1. チーム管理と権限
```bash
# エンタープライズチームの作成
vercel teams create enterprise-team --type enterprise

# ロールベースのアクセス制御
vercel teams invite user@company.com --role admin
vercel teams invite user@company.com --role developer
vercel teams invite user@company.com --role viewer
```

### 2. SSO (Single Sign-On)
```json
// vercel.json
{
  "sso": {
    "provider": "saml",
    "domain": "company.com",
    "attributes": {
      "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      "name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
    }
  }
}
```

### 3. カスタムドメイン管理
```bash
# ドメインの追加
vercel domains add app.company.com

# DNS設定の確認
vercel domains ls

# SSL証明書の管理
vercel certs ls
```

## 大規模アプリケーションのアーキテクチャ

### 1. マイクロフロントエンド
```javascript
// next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/auth/:path*',
        destination: 'https://auth.company.com/:path*'
      },
      {
        source: '/admin/:path*',
        destination: 'https://admin.company.com/:path*'
      }
    ]
  }
}
```

### 2. モノレポ管理
```json
// package.json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build:all": "turbo run build",
    "dev:all": "turbo run dev",
    "test:all": "turbo run test"
  }
}
```

### 3. 環境分離
```bash
# 環境別のプロジェクト
vercel --env production
vercel --env staging
vercel --env development

# 環境変数の管理
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
vercel env add DATABASE_URL development
```

## パフォーマンス最適化

### 1. エッジキャッシュ戦略
```javascript
// middleware.js
import { NextResponse } from 'next/server'

export function middleware(request) {
  const response = NextResponse.next()
  
  // 動的コンテンツのキャッシュ
  if (request.nextUrl.pathname.startsWith('/api/data')) {
    response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate')
  }
  
  // 静的コンテンツのキャッシュ
  if (request.nextUrl.pathname.startsWith('/static')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }
  
  return response
}
```

### 2. 画像最適化
```javascript
// next.config.js
module.exports = {
  images: {
    loader: 'custom',
    loaderFile: './image-loader.js',
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  }
}
```

### 3. バンドル最適化
```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
})

module.exports = withBundleAnalyzer({
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@mui/material', 'lodash']
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups = {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
    return config
  }
})
```

## セキュリティ強化

### 1. 認証と認可
```javascript
// lib/auth.js
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth-options'

export async function requireAuth(req, res, next) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  req.user = session.user
  return next()
}
```

### 2. API保護
```javascript
// middleware.js
import { NextResponse } from 'next/server'
import { verifyToken } from './lib/jwt'

export async function middleware(request) {
  if (request.nextUrl.pathname.startsWith('/api/protected')) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }
    
    try {
      const decoded = await verifyToken(token)
      request.user = decoded
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
  }
  
  return NextResponse.next()
}
```

### 3. セキュリティヘッダー
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
]

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders
      }
    ]
  }
}
```

## 監視とログ

### 1. 統合監視
```javascript
// lib/monitoring.js
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', 'your-domain.com']
    })
  ]
})

export function captureException(error, context = {}) {
  Sentry.captureException(error, {
    extra: context
  })
}
```

### 2. パフォーマンス監視
```javascript
// lib/performance.js
export function trackPerformance(metric) {
  if (typeof window !== 'undefined') {
    window.gtag('event', 'performance', {
      event_category: 'Web Vitals',
      event_label: metric.name,
      value: Math.round(metric.value)
    })
  }
}

export function trackCoreWebVitals() {
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(trackPerformance)
    getFID(trackPerformance)
    getFCP(trackPerformance)
    getLCP(trackPerformance)
    getTTFB(trackPerformance)
  })
}
```

### 3. ログ集約
```javascript
// lib/logger.js
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label }
    }
  }
})

export function logError(error, context = {}) {
  logger.error({
    error: error.message,
    stack: error.stack,
    ...context
  })
}

export function logInfo(message, data = {}) {
  logger.info({ message, ...data })
}
```

## CI/CDとデプロイメント

### 1. マルチステージデプロイメント
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run build

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID_STAGING }}

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID_PROD }}
          vercel-args: '--prod'
```

### 2. カナリアデプロイメント
```javascript
// middleware.js
import { NextResponse } from 'next/server'

export function middleware(request) {
  const canaryPercentage = 10 // 10%のトラフィックを新バージョンに
  const random = Math.random() * 100
  
  if (random < canaryPercentage) {
    // 新バージョンへのルーティング
    return NextResponse.rewrite(new URL('/canary' + request.nextUrl.pathname, request.url))
  }
  
  return NextResponse.next()
}
```

### 3. ロールバック戦略
```bash
# 特定のデプロイメントにロールバック
vercel rollback https://my-app-abc123.vercel.app

# 最新のデプロイメントにロールバック
vercel rollback

# 特定のコミットにロールバック
vercel rollback --to=abc123
```

## コスト最適化

### 1. リソース使用量の監視
```bash
# プロジェクトの使用量確認
vercel usage

# チーム全体の使用量
vercel teams usage
```

### 2. キャッシュ戦略
```javascript
// lib/cache.js
import { kv } from '@vercel/kv'

export class CacheManager {
  static async get(key) {
    return await kv.get(key)
  }
  
  static async set(key, value, ttl = 3600) {
    await kv.set(key, value, { ex: ttl })
  }
  
  static async invalidate(pattern) {
    const keys = await kv.keys(pattern)
    if (keys.length > 0) {
      await kv.del(...keys)
    }
  }
}
```

### 3. バンドルサイズ最適化
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@mui/material', 'lodash', 'date-fns']
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true
          }
        }
      }
    }
    return config
  }
}
```

## まとめ

Vercelのエンタープライズ機能を活用することで、大規模なチーム開発と本格的なプロダクション環境を構築できます。特に、SSO、高度な権限管理、統合監視、CI/CDパイプラインの組み合わせにより、エンタープライズレベルの開発・運用が可能です。

これらの機能を適切に設定・運用することで、開発チームの生産性向上とアプリケーションの安定性確保を両立できます。