# 27. Rails APIモード + Next.jsで構築するモダンなWebアプリケーション

## はじめに

近年、フロントエンドとバックエンドを分離した開発スタイルが主流になりつつあります。バックエンドはAPIを提供することに専念し、フロントエンドはリッチなユーザーインターフェースを構築します。この構成は、技術スタックの柔軟性、スケーラビリティ、開発効率の向上など多くのメリットをもたらします。

本記事では、バックエンドに**Rails APIモード**、フロントエンドに**Next.js**を採用し、モダンなWebアプリケーションを構築する方法をステップバイステップで解説します。

## この記事で学べること

- Rails APIモードでのプロジェクト作成と設定
- Next.jsプロジェクトのセットアップ
- RailsとNext.js間のCORS設定
- API経由でのデータ連携方法

## 1. Rails APIのセットアップ

まずはバックエンドとなるRails APIを作成します。

### 1.1. Railsプロジェクトの作成

`--api` オプションを付けて `rails new` を実行します。これにより、APIに特化した、不要なミドルウェアやモジュールが削ぎ落とされたRailsアプリケーションが生成されます。

```bash
rails new my-rails-api --api -d postgresql
cd my-rails-api
```

### 1.2. CORSの設定

フロントエンドのNext.jsアプリケーション（別ドメインで動作）からAPIリクエストを受け付けるために、CORS（Cross-Origin Resource Sharing）を設定します。

`Gemfile` に `rack-cors` がコメントアウトされているので、アンコメントします。

Gemfile
```ruby
gem 'rack-cors'
```

そして `bundle install` を実行します。

```bash
bundle install
```

次に、`config/initializers/cors.rb` を設定します。開発環境ではNext.jsが `http://localhost:3000` で動作することを想定しています。

config/initializers/cors.rb
```ruby
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins "http://localhost:3000" # Next.jsのドメイン

    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head]
  end
end
```

### 1.3. APIエンドポイントの作成

動作確認用の簡単なAPIを作成します。ここでは、メッセージを返すだけのシンプルなコントローラを作成します。

```bash
rails g controller Api::V1::Greetings index
```

`app/controllers/api/v1/greetings_controller.rb` を編集します。

app/controllers/api/v1/greetings_controller.rb
```ruby
class Api::V1::GreetingsController < ApplicationController
  def index
    render json: { message: "Hello from Rails API!" }
  end
end
```

`config/routes.rb` にルーティングを追加します。

config/routes.rb
```ruby
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      get 'greetings', to: 'greetings#index'
    end
  end
end
```

### 1.4. データベースの作成とサーバーの起動

```bash
rails db:create
rails s -p 3001 # Next.jsとポートが衝突しないようにする
```

`http://localhost:3001/api/v1/greetings` にアクセスし、`{"message":"Hello from Rails API!"}` が表示されれば成功です。

## 2. Next.jsフロントエンドのセットアップ

次にフロントエンドのNext.jsアプリケーションを作成します。

### 2.1. Next.jsプロジェクトの作成

Railsプロジェクトとは別のターミナルで実行します。

```bash
npx create-next-app@latest my-nextjs-app
cd my-nextjs-app
```

### 2.2. APIからデータを取得して表示

`app/page.tsx` (または `pages/index.tsx`) を編集して、先ほど作成したRails APIからデータを取得します。

ここでは `useEffect` と `useState` を使って、クライアントサイドでデータをフェッチする例を示します。

app/page.tsx
```tsx
'use client'; // Client Componentとしてマーク

import { useState, useEffect } from 'react';

export default function Home() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/v1/greetings');
        const data = await res.json();
        setMessage(data.message);
      } catch (error) {
        console.error('Error fetching data:', error);
        setMessage('Failed to load message from API.');
      }
    };

    fetchData();
  }, []);

  return (
    <main>
      <h1>Next.js Frontend</h1>
      <p>Message from Rails API: <strong>{message}</strong></p>
    </main>
  );
}
```

### 2.3. Next.js開発サーバーの起動

```bash
npm run dev
```

`http://localhost:3000` にアクセスします。画面に "Message from Rails API: **Hello from Rails API!**" と表示されれば、APIとの連携は成功です。

## まとめ

本記事では、Rails APIモードとNext.jsを組み合わせてモダンなWebアプリケーションを構築する基本的な流れを解説しました。

- **Rails API**: バックエンドのロジックとデータ提供に専念
- **Next.js**: 高度なUI/UXとパフォーマンスを提供

この構成をベースに、認証機能（例: `devise-token-auth`）、データ永続化、より複雑なフロントエンドコンポーネントなどを追加していくことで、本格的なアプリケーションを開発できます。

フロントエンドとバックエンドを分離することで、それぞれの得意分野に集中でき、より効率的でスケーラブルな開発が可能になります。ぜひこの構成を試してみてください。
