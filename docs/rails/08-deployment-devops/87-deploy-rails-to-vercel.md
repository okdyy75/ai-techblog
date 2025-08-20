# VercelでRailsアプリケーションをデプロイする2025年版ガイド

## はじめに

Vercelは、Next.jsを開発したチームが提供するフロントエンド特化型のクラウドプラットフォームとして広く知られていますが、実はRailsアプリケーションのホスティングにも対応しています。特に、APIモードのRailsアプリケーションや、フロントエンドとバックエンドを分離したモダンなWebアプリケーションアーキテクチャにおいて、Vercelは非常に強力な選択肢となります。

この記事では、2025年現在のVercelの機能を活用して、RailsアプリケーションをVercelにデプロイする方法について詳しく解説します。特に、Rails APIモード + フロントエンドフレームワーク（React、Vue.js等）の組み合わせでの活用を中心に説明します。

## Vercelを選ぶ理由

### メリット

- **エッジコンピューティング**: 世界中のエッジロケーションでの高速レスポンス
- **ゼロ設定デプロイ**: GitHubと連携するだけで自動デプロイが可能
- **Serverless Functions**: サーバーレス関数による柔軟なバックエンド処理
- **プレビューデプロイ**: プルリクエストごとに一意のプレビューURLを自動生成
- **優れたDX**: 開発者体験に特化した直感的なダッシュボードとCLI

### デメリット

- **実行時間制限**: Serverless Functionsには実行時間の制限がある（10秒～900秒）
- **ステートレス**: 永続的なファイルストレージやWebSocketの制限
- **データベース**: 専用のデータベースサービスはなく、外部サービスが必要

## Vercelでのデプロイ戦略

VercelでRailsアプリケーションをデプロイする主な方法は以下の通りです：

### 1. Rails APIモード + フロントエンドSPA
- RailsをAPIサーバーとして使用
- フロントエンドは別途React/Vue.js等で構築
- Vercelでフロントエンドをホスト、APIは別サービス（Heroku、Railway等）

### 2. Serverless Functions化
- RailsのコントローラーをServerless Functionsとして実行
- 軽量なAPIエンドポイントに適している

### 3. Static Site Generation (SSG)
- Railsで静的ページを生成してVercelでホスト
- JekyllやMiddlemanの代替として

## 方法1: Rails API + フロントエンドSPA構成

### Rails APIサーバーの準備

#### 1. Rails APIモードプロジェクトの作成

```bash
# APIモードでRailsプロジェクトを作成
rails new my_api --api
cd my_api
```

#### 2. CORS設定

```ruby
# Gemfile
gem 'rack-cors'
```

```ruby
# config/application.rb
module MyApi
  class Application < Rails::Application
    config.api_only = true
    
    # CORS設定
    config.middleware.insert_before 0, Rack::Cors do
      allow do
        origins 'localhost:3000', 'your-vercel-domain.vercel.app'
        
        resource '*',
          headers: :any,
          methods: [:get, :post, :put, :patch, :delete, :options, :head],
          credentials: true
      end
    end
  end
end
```

#### 3. APIコントローラーの実装

```ruby
# app/controllers/api/v1/posts_controller.rb
class Api::V1::PostsController < ApplicationController
  def index
    posts = Post.all
    render json: posts
  end

  def show
    post = Post.find(params[:id])
    render json: post
  end

  def create
    post = Post.new(post_params)
    if post.save
      render json: post, status: :created
    else
      render json: { errors: post.errors }, status: :unprocessable_entity
    end
  end

  private

  def post_params
    params.require(:post).permit(:title, :content)
  end
end
```

#### 4. ルーティング設定

```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :posts
    end
  end
end
```

### フロントエンド（Next.js）の作成

#### 1. Next.jsプロジェクトの作成

```bash
npx create-next-app@latest my-frontend --typescript --tailwind --eslint
cd my-frontend
```

#### 2. API通信の実装

```typescript
// lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function fetchPosts() {
  const response = await fetch(`${API_BASE_URL}/api/v1/posts`)
  if (!response.ok) {
    throw new Error('Failed to fetch posts')
  }
  return response.json()
}

export async function createPost(postData: { title: string; content: string }) {
  const response = await fetch(`${API_BASE_URL}/api/v1/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ post: postData }),
  })
  
  if (!response.ok) {
    throw new Error('Failed to create post')
  }
  return response.json()
}
```

#### 3. Reactコンポーネントの実装

```tsx
// components/PostList.tsx
'use client'

import { useState, useEffect } from 'react'
import { fetchPosts } from '@/lib/api'

interface Post {
  id: number
  title: string
  content: string
}

export default function PostList() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const postsData = await fetchPosts()
        setPosts(postsData)
      } catch (error) {
        console.error('Error loading posts:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPosts()
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div key={post.id} className="border p-4 rounded">
          <h2 className="text-xl font-bold">{post.title}</h2>
          <p>{post.content}</p>
        </div>
      ))}
    </div>
  )
}
```

### Vercelへのデプロイ

#### 1. 環境変数の設定

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://your-rails-api.herokuapp.com
```

#### 2. vercel.jsonの設定

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-rails-api.herokuapp.com/api/:path*"
    }
  ]
}
```

#### 3. デプロイ

```bash
# Vercel CLIのインストール
npm i -g vercel

# ログイン
vercel login

# デプロイ
vercel --prod
```

## 方法2: Serverless Functions化

### Railsアプリケーションをサーバーレス関数として実行

#### 1. vercel.jsonの設定

```json
{
  "functions": {
    "api/index.rb": {
      "runtime": "ruby2.7"
    }
  },
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.rb"
    }
  ]
}
```

#### 2. サーバーレス関数の実装

```ruby
# api/index.rb
require 'json'
require 'rack'

# 軽量なRackアプリケーション
app = Rack::Builder.new do
  map '/api/posts' do
    run lambda { |env|
      case env['REQUEST_METHOD']
      when 'GET'
        posts = [
          { id: 1, title: 'Hello Vercel', content: 'Serverless Rails!' },
          { id: 2, title: 'Ruby on Rails', content: 'On the edge!' }
        ]
        [200, { 'Content-Type' => 'application/json' }, [posts.to_json]]
      when 'POST'
        # POST処理の実装
        [201, { 'Content-Type' => 'application/json' }, ['{"status":"created"}']]
      else
        [405, {}, ['Method Not Allowed']]
      end
    }
  end
end

# Vercel関数のエントリーポイント
def handler(event:, context:)
  env = {
    'REQUEST_METHOD' => event['httpMethod'] || 'GET',
    'PATH_INFO' => event['path'] || '/',
    'QUERY_STRING' => event['queryStringParameters']&.map { |k, v| "#{k}=#{v}" }&.join('&') || '',
    'rack.input' => StringIO.new(event['body'] || ''),
    'rack.errors' => $stderr,
  }

  status, headers, body = app.call(env)
  
  {
    statusCode: status,
    headers: headers,
    body: body.join
  }
end
```

## 方法3: 静的サイト生成 (SSG)

### Railsで静的ページを生成

#### 1. 静的サイト生成のRakeタスク

```ruby
# lib/tasks/static_site.rake
namespace :site do
  desc "Generate static site"
  task generate: :environment do
    require 'fileutils'
    
    output_dir = 'public/static'
    FileUtils.mkdir_p(output_dir)
    
    # ホームページの生成
    renderer = ActionController::Base.new
    html = renderer.render_to_string(
      template: 'posts/index',
      layout: 'application',
      locals: { posts: Post.all }
    )
    File.write("#{output_dir}/index.html", html)
    
    # 各投稿ページの生成
    Post.all.each do |post|
      html = renderer.render_to_string(
        template: 'posts/show',
        layout: 'application',
        locals: { post: post }
      )
      FileUtils.mkdir_p("#{output_dir}/posts")
      File.write("#{output_dir}/posts/#{post.id}.html", html)
    end
    
    puts "Static site generated in #{output_dir}"
  end
end
```

#### 2. package.jsonでビルドスクリプトを設定

```json
{
  "scripts": {
    "build": "bundle exec rails site:generate && cp -r public/static/* ."
  },
  "devDependencies": {
    "@vercel/ruby": "^1.3.0"
  }
}
```

## 高度な設定

### 環境変数の管理

```bash
# Vercel CLIで環境変数を設定
vercel env add DATABASE_URL
vercel env add RAILS_MASTER_KEY
vercel env add API_KEY
```

### カスタムドメインの設定

```bash
# カスタムドメインを追加
vercel domains add example.com
```

### キャッシュ戦略

```json
{
  "headers": [
    {
      "source": "/api/posts",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=60, stale-while-revalidate"
        }
      ]
    }
  ]
}
```

## パフォーマンス最適化

### 1. エッジキャッシング

```typescript
// Next.jsでのキャッシュ戦略
export async function getStaticProps() {
  const posts = await fetchPosts()
  
  return {
    props: {
      posts,
    },
    revalidate: 60, // 60秒ごとに再生成
  }
}
```

### 2. 画像最適化

```tsx
import Image from 'next/image'

export default function PostImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={600}
      priority
      className="rounded-lg"
    />
  )
}
```

### 3. API Routes最適化

```typescript
// pages/api/posts/[id].ts
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query
  
  // キャッシュヘッダーの設定
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate')
  
  try {
    const post = await fetchPost(id as string)
    res.status(200).json(post)
  } catch (error) {
    res.status(404).json({ error: 'Post not found' })
  }
}
```

## セキュリティ対策

### 1. 環境変数による秘密情報管理

```typescript
// 環境変数の検証
const requiredEnvVars = ['NEXT_PUBLIC_API_URL', 'API_SECRET'] as const

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}
```

### 2. CSRFトークン

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  include ActionController::RequestForgeryProtection
  
  protect_from_forgery with: :null_session
  before_action :authenticate_request
  
  private
  
  def authenticate_request
    token = request.headers['Authorization']&.sub('Bearer ', '')
    # JWT等での認証ロジック
  end
end
```

### 3. CORS設定の強化

```ruby
# config/application.rb
config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins lambda { |source, env|
      # 本番環境では特定のドメインのみ許可
      if Rails.env.production?
        source == 'https://your-app.vercel.app'
      else
        source&.match?(/\Ahttp:\/\/localhost:\d+\z/)
      end
    }
    
    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true
  end
end
```

## 監視とログ

### Vercel Analytics

```tsx
// pages/_app.tsx
import { Analytics } from '@vercel/analytics/react'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}
```

### エラー追跡

```typescript
// lib/error-tracking.ts
export function trackError(error: Error, context?: Record<string, any>) {
  console.error('Application error:', error, context)
  
  // Sentry等のエラー追跡サービスに送信
  if (process.env.NODE_ENV === 'production') {
    // Sentry.captureException(error, { extra: context })
  }
}
```

## Vercel vs 他のプラットフォーム比較

| 機能 | Vercel | Netlify | AWS Amplify |
|------|--------|---------|-------------|
| 料金 | $20/月～ | $19/月～ | $0.01/分～ |
| エッジロケーション | 世界中 | 世界中 | AWS リージョン |
| 関数実行時間 | 10秒～900秒 | 10秒 | 15分 |
| カスタムドメイン | ✅ | ✅ | ✅ |
| プレビューデプロイ | ✅ | ✅ | ✅ |
| データベース | 外部必要 | 外部必要 | DynamoDB |

## まとめ

VercelでのRailsアプリケーションデプロイは、従来の方法とは異なるアプローチが必要ですが、適切に設計すれば以下のメリットを享受できます：

### 推奨される使用ケース

- **JAMstack アーキテクチャ**: 静的サイト + APIの組み合わせ
- **マイクロサービス**: 軽量なAPIサービス
- **プロトタイプ開発**: 素早いMVP構築
- **グローバル配信**: 世界中のユーザーへの高速配信

### 避けるべきケース

- **長時間実行処理**: バッチ処理や重い計算処理
- **ステートフルアプリケーション**: WebSocketやファイルアップロード中心の機能
- **従来のMonolithicアプリケーション**: 大規模な既存Railsアプリケーション

Vercelの強みを活かしつつ、適切なアーキテクチャ設計を行うことで、高性能でスケーラブルなWebアプリケーションを構築できるでしょう。