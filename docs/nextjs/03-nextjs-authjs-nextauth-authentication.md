# Next.jsで認証を実装する：Auth.js（NextAuth）で作る安全なログイン基盤

現代のWebアプリケーション開発において、認証機能の構築は避けて通れない要素です。しかし、セキュリティリスクやセッション管理の複雑さを考えると、自前で一から実装するのは賢明ではありません。

Next.jsのエコシステムにおいて、デファクトスタンダードとなっているのが **Auth.js（旧NextAuth.js）** です。本記事では、Next.js（App Router）とAuth.js v5を組み合わせた、安全で効率的な認証基盤の構築方法を解説します。

---

## 1. 概要

### Auth.js（NextAuth.js v5）とは
Auth.jsは、Next.jsをはじめとするモダンなフレームワーク向けに設計された、オープンソースの認証ライブラリです。GoogleやGitHubなどのOAuthプロバイダー、メールによるマジックリンク、独自のデータベース連携など、多様な認証方式を少ないコード量で安全に実装できます。

特にv5からは、App Routerに最適化され、サーバーコンポーネントやMiddlewareとの親和性が大幅に向上しました。

---

## 2. 前提知識

本記事の実装手順を進める前に、以下の知識・環境があることを確認してください。

*   **Next.js (App Router):** 基本的なルーティングとサーバーコンポーネントの理解。
*   **TypeScript:** 型定義を利用した安全な開発。
*   **OAuthの概念:** プロバイダー（GitHub, Google等）から認可を得る仕組みの基礎。
*   **環境:** Node.js v18.x 以上、Next.js v14.x または v15.x。

---

## 3. 実装手順

今回は、GitHub認証を例に、Auth.js v5の基本的なセットアップを行います。

### 3.1 ライブラリのインストール

まず、Auth.jsの最新版（v5 beta）をインストールします。

```bash
npm install next-auth@beta
```

### 3.2 環境変数の設定

プロジェクトのルートディレクトリに `.env.local` を作成し、必要な情報を記述します。

```env
# アプリケーションのシークレットキー（openssl rand -base64 32 などで生成）
AUTH_SECRET=your_auth_secret_here

# GitHub OAuthの設定
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret
```

### 3.3 設定ファイルの作成

プロジェクトのルート（または `src/`）に `auth.ts` を作成し、認証のコアロジックを定義します。v5では、このファイルから `auth`, `signIn`, `signOut`, `handlers` などの関数をエクスポートします。

```typescript
// auth.ts
import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  // 必要に応じてコールバックなどを設定
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
      
      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // 未ログインならリダイレクト
      }
      return true
    },
  },
})
```

### 3.4 Route Handlerの設置

Next.jsのAPIルートを利用して、認証リクエスト（`/api/auth/*`）を処理するためのハンドラーを作成します。

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

### 3.5 Middlewareによる保護

アプリケーション全体のルート保護を効率的に行うため、`middleware.ts` を設定します。

```typescript
// middleware.ts
export { auth as middleware } from "@/auth"

export const config = {
  // 認証を適用しないパスを除外する設定
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

### 3.6 ログイン・ログアウトボタンの実装

サーバーアクションを利用して、UIから認証処理を呼び出します。

```tsx
// components/auth-components.tsx
import { signIn, signOut } from "@/auth"

export function SignIn() {
  return (
    <form
      action={async () => {
        "use server"
        await signIn("github")
      }}
    >
      <button type="submit">GitHubでログイン</button>
    </form>
  )
}

export function SignOut() {
  return (
    <form
      action={async () => {
        "use server"
        await signOut()
      }}
    >
      <button type="submit">ログアウト</button>
    </form>
  )
}
```

### 3.7 ユーザー情報の取得

サーバーコンポーネント内でセッション情報を取得するには、`auth()` 関数を呼び出すだけです。

```tsx
// app/dashboard/page.tsx
import { auth } from "@/auth"
import { SignOut } from "@/components/auth-components"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    return <div>アクセス権限がありません</div>
  }

  return (
    <div>
      <h1>ダッシュボード</h1>
      <p>ようこそ、{session.user.name}さん</p>
      <SignOut />
    </div>
  )
}
```

---

## 4. ハマりどころと対策

Auth.jsの実装において、多くの開発者が遭遇しやすいポイントをまとめました。

### 4.1 Edge Runtimeの制限
Auth.js v5はEdge Runtimeで動作するように設計されていますが、使用するデータベースアダプター（Prismaなど）がEdgeに対応していない場合、ビルドエラーが発生することがあります。
*   **対策:** データベース接続が必要なロジックを分離するか、Edge互換のライブラリ（Drizzle ORMなど）を検討してください。

### 4.2 環境変数のプレフィックス
かつては `NEXTAUTH_URL` や `NEXTAUTH_SECRET` という名前が必須でしたが、v5では `AUTH_SECRET` などの新しい命名規則が推奨されています。
*   **注意:** 移行の際は古いドキュメントを参考にしないよう注意してください。

### 4.3 セッションの型拡張
`session.user` にカスタムプロパティ（`id` や `role` など）を追加したい場合、TypeScriptのモジュール拡張を行う必要があります。

```typescript
// next-auth.d.ts
import NextAuth, { type DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
    } & DefaultSession["user"]
  }
}
```

---

## 5. まとめ

Auth.js（NextAuth.js v5）を導入することで、Next.jsのApp Routerが持つパワーを最大限に活かしつつ、堅牢な認証システムを迅速に構築できます。

*   **App Router対応:** サーバーコンポーネントで直感的に `auth()` を利用可能。
*   **柔軟性:** OAuth、Credentials、Emailなど多彩なプロバイダーに対応。
*   **セキュリティ:** セッション管理やCSRF対策が標準で組み込まれている。

認証は一度実装して終わりではなく、継続的なメンテナンスが必要です。ライブラリのアップデート情報を常にチェックし、最新のベストプラクティスを取り入れていきましょう。

---

## 参考リンク

*   [Auth.js 公式ドキュメント (v5)](https://authjs.dev/reference/nextjs)
*   [Next.js 公式ドキュメント - Authentication](https://nextjs.org/docs/app/building-your-application/authentication)
*   [GitHub - nextauthjs/next-auth](https://github.com/nextauthjs/next-auth)
