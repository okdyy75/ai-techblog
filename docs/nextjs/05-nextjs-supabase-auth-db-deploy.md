# Next.js × Supabaseで作る実用Webアプリ：認証・DB・デプロイまで一気通貫

現代のWeb開発において、フロントエンドの強力なフレームワークである **Next.js** と、Backend as a Service (BaaS) の急先鋒である **Supabase** の組み合わせは、最も生産性が高いスタックの一つです。

本書では、Next.js (App Router) と Supabase を組み合わせて、認証機能とデータベース操作を備えた実用的なWebアプリを構築する流れを解説します。

---

## 概要

本記事では、単純なToDoアプリやブログを越えた「実用性」を意識し、以下の機能を網羅した構成を解説します。

1.  **認証 (Auth):** Supabase Auth を利用したメール・パスワード認証と、Next.js Middleware によるルート保護。
2.  **データベース (DB):** PostgreSQL をベースとしたデータ設計と、RLS (Row Level Security) によるセキュリティ確保。
3.  **サーバーサイド連携:** Server Actions を用いた型安全なデータ操作。
4.  **デプロイ:** Vercel への最適化されたデプロイ手順。

---

## 前提知識

-   **Next.js (App Router):** 基本的なルーティングと Server Components の理解。
-   **TypeScript:** インターフェース定義や型安全な開発への意欲。
-   **SQL の基礎:** テーブル作成や制約に関する基礎知識。

---

## 実装手順

### 1. プロジェクトの初期化

まず、Next.js プロジェクトを作成します。

```bash
npx create-next-app@latest my-supabase-app --typescript --tailwind --eslint
cd my-supabase-app
```

次に、Supabase 関連のライブラリをインストールします。現在の推奨は `@supabase/ssr` を使用する構成です。

```bash
npm install @supabase/ssr @supabase/supabase-js
```

### 2. Supabase のセットアップ

Supabase ダッシュボードで新しいプロジェクトを作成し、`.env.local` に環境変数を設定します。

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Supabase クライアントの作成 (SSR 対応)

App Router では、サーバー側とクライアント側の両方で Supabase クライアントを適切に生成する必要があります。

`utils/supabase/server.ts`（サーバーサイド用）:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component から呼び出された場合は無視（Middleware側で処理）
          }
        },
      },
    }
  )
}
```

### 4. 認証機能の実装

#### Middleware によるセッション管理

未ログインユーザーをログインページにリダイレクトさせるために、`middleware.ts` を設定します。これは、アクセストークンの更新（Refresh Token）も兼ねています。

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

#### ログイン処理 (Server Actions)

`app/login/actions.ts` にログインロジックを記述します。

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect('/error')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
```

### 5. データベースと RLS の設定

Supabase SQL Editor でテーブルを作成します。ここで重要なのは **Row Level Security (RLS)** です。

```sql
-- テーブル作成
create table posts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  content text,
  user_id uuid references auth.users(id) default auth.uid()
);

-- RLSを有効化
alter table posts enable row level security;

-- ポリシー：自分のデータのみ参照可能
create policy "Users can view their own posts"
on posts for select
using ( auth.uid() = user_id );

-- ポリシー：自分のデータのみ挿入可能
create policy "Users can insert their own posts"
on posts for insert
with check ( auth.uid() = user_id );
```

### 6. データ取得と表示

Server Component を使い、型安全にデータを取得します。

```typescript
import { createClient } from '@/utils/supabase/server'

export default async function Dashboard() {
  const supabase = createClient()
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return <p>エラーが発生しました</p>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">マイ・ポスト</h1>
      <ul>
        {posts?.map((post) => (
          <li key={post.id} className="border-b py-2">
            {post.title}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

## ハマりどころ

実装時に多くのエンジニアが直面する課題をまとめます。

1.  **Server Component での Cookie 操作:**
    Server Component 内で `cookies().set()` を直接呼ぶことはできません。Cookie の更新（セッションの延長）は必ず Middleware か Route Handlers、または Server Actions 内で行う必要があります。
2.  **RLS の設定漏れ:**
    テーブルを作成しただけでは、認証済みユーザーであってもデータにアクセスできません。必ず `enable row level security` と適切な `policy` の設定を行ってください。
3.  **環境変数のプレフィックス:**
    クライアントサイド（ブラウザ）で使用する変数には必ず `NEXT_PUBLIC_` を付ける必要があります。Supabase URL と Anon Key はブラウザで公開されても RLS が適切なら安全ですが、Service Role Key などの秘匿情報は絶対に `NEXT_PUBLIC_` を付けてはいけません。
4.  **TypeScript の型定義:**
    `supabase gen types typescript --project-id ...` コマンドを使用して、データベースのスキーマから型定義を自動生成することを強く推奨します。これにより、クエリ結果が完璧に型付けされます。

---

## まとめ

Next.js と Supabase を組み合わせることで、フロントエンドエンジニアはインフラの複雑な構築作業から解放され、ビジネスロジックと UI/UX に集中できるようになります。

-   **Next.js App Router** は、サーバーとクライアントの境界を最適化します。
-   **Supabase** は、認証・DB・ストレージを統合された環境として提供します。
-   **Server Actions** により、API エンドポイントを意識せずに DB 操作が可能になります。

この構成は、スタートアップの MVP 開発から、中規模以上の実用アプリケーションまで十分に耐えうる堅牢なスタックです。ぜひ、次回のプロジェクトで採用を検討してみてください。

---

## 参考リンク

-   [Supabase Official Documentation](https://supabase.com/docs)
-   [Next.js Documentation (App Router)](https://nextjs.org/docs)
-   [Supabase SSR Package Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
-   [Vercel Deployment Guide](https://vercel.com/docs/frameworks/nextjs)
