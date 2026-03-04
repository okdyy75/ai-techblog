# Next.jsのデータ取得を整理する：fetch・Server Actions・Route Handlers実践

Next.jsのApp Routerが登場してから、データ取得（Data Fetching）の手法は大きく進化しました。以前のPages Routerでは`getStaticProps`や`getServerSideProps`といった特定の関数に依存していましたが、App RouterではReact Server Components（RSC）をベースとした、より直感的で柔軟なモデルへと移行しています。

本記事では、実務でNext.jsを使い始めたエンジニアの方に向けて、主要な3つのデータ取得・操作手法（`fetch`、`Server Actions`、`Route Handlers`）の使い分けと実践的な実装方法を整理して解説します。

---

## 1. 概要：App Routerにおけるデータ取得の考え方

App Routerの最大の特徴は、**「サーバー側でデータを取得するのがデフォルトである」**という点です。これにより、クライアント側に大量のJavaScriptを送ることなく、セキュアかつ高速にデータをレンダリングできるようになりました。

主に以下の3つの機能を組み合わせてアプリケーションを構築します。

1.  **fetch (extended)**: サーバーコンポーネント内でのデータ取得とキャッシュ制御。
2.  **Server Actions**: データの登録・更新・削除（Mutation）や、フォーム送信の処理。
3.  **Route Handlers**: 外部APIからの呼び出しや、特定のHTTPメソッド（GET/POSTなど）に対応するAPIエンドポイント。

---

## 2. 前提知識

実装に入る前に、以下の概念を理解しておく必要があります。

-   **React Server Components (RSC)**: サーバー上で実行されるコンポーネント。`async/await`を直接使用してデータ取得が可能です。
-   **Client Components**: ブラウザで実行されるコンポーネント。`"use client"`宣言が必要。
-   **Caching & Revalidation**: Next.jsが提供する独自のキャッシュ機構。いつデータを再取得するかを制御します。

---

## 3. 実装手順とパターン

### 3.1 サーバーコンポーネントでの `fetch`

Next.jsでは、標準の`fetch` APIが拡張されており、コンポーネントレベルでキャッシュ戦略を定義できます。

#### 基本の実装（Server Component）

```typescript
// app/posts/page.tsx
import { Post } from '@/types';

async function getPosts() {
  // デフォルトでは force-cache (静的生成)
  // revalidateオプションで時間指定の再検証が可能
  const res = await fetch('https://api.example.com/posts', {
    next: { revalidate: 3600 }, // 1時間ごとにキャッシュ更新
  });

  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }

  return res.json();
}

export default async function PostsPage() {
  const posts: Post[] = await getPosts();

  return (
    <main>
      <h1>記事一覧</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </main>
  );
}
```

**ポイント:**
-   `async/await` をコンポーネント内で直接利用できる。
-   `fetch` の第2引数でキャッシュの挙動を詳細に制御できる（`no-store`, `force-cache`など）。

---

### 3.2 Server Actions によるデータ更新

Server Actionsを利用すると、APIエンドポイントを明示的に作成することなく、サーバー上の関数を直接呼び出すことができます。

#### フォーム送信の実装例

```typescript
// app/posts/create/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createPost(formData: FormData) {
  const title = formData.get("title");
  const content = formData.get("content");

  // 実際のDB保存処理など
  await fetch('https://api.example.com/posts', {
    method: 'POST',
    body: JSON.stringify({ title, content }),
  });

  // キャッシュを無効化して最新の状態にする
  revalidatePath("/posts");
  // 完了後のリダイレクト
  redirect("/posts");
}
```

```tsx
// app/posts/create/page.tsx
import { createPost } from "./actions";

export default function CreatePostPage() {
  return (
    <form action={createPost}>
      <input type="text" name="title" placeholder="タイトル" required />
      <textarea name="content" placeholder="内容" required />
      <button type="submit">投稿する</button>
    </form>
  );
}
```

**ポイント:**
-   `"use server"` をファイルの先頭、または関数内に記述する。
-   `revalidatePath` を呼ぶことで、特定のページのキャッシュを即座に更新できる。
-   JavaScriptが無効な環境でも動作する（Progressive Enhancement）。

---

### 3.3 Route Handlers の活用

Route Handlersは、Pages Router時代のAPI Routesに相当します。Webhooksの受け取りや、外部サービスからのGETリクエストに応答する場合に便利です。

#### APIエンドポイントの実装例

```typescript
// app/api/external/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const data = { message: "Hello from Route Handler" };
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  // 外部システムからの通知処理など
  console.log(body);
  return NextResponse.json({ status: "success" });
}
```

**ポイント:**
-   `app`ディレクトリ内の `route.ts` というファイル名で作成する。
-   同一ディレクトリに `page.tsx` と `route.ts` を共存させることはできない（競合を避けるため）。

---

## 4. 実務での「ハマりどころ」

### 4.1 クライアントコンポーネントでのデータ取得
クライアントコンポーネント（`"use client"`）では、直接 `async/await` は使えません。この場合は以下のいずれかを選択します。

-   **SWR や React Query (TanStack Query) を使う**: ユーザー操作に伴う動的なデータ取得に適しています。
-   **Server Componentsからpropsで渡す**: 初回レンダリング用のデータはサーバー側で取得するのがベストです。

### 4.2 キャッシュの「効きすぎ」問題
Next.jsはデフォルトで積極的にキャッシュを行います。
-   `const data = await fetch(url, { cache: 'no-store' })` とすることで、常に最新のデータを取得できます。
-   `export const dynamic = 'force-dynamic'` をページ単位で設定することも可能です。

### 4.3 Server Actions のセキュリティ
Server Actionsは実質的に公開されたPOSTエンドポイントです。
-   必ず関数内部で認証（`auth()`など）を確認し、ユーザーがその操作を行う権限があるかチェックしてください。
-   `zod` などのライブラリを使用して、入力値のバリデーションを厳格に行うことが推奨されます。

---

## 5. まとめ：手法の使い分け

| 手法 | 主な用途 | 実行場所 |
| :--- | :--- | :--- |
| **fetch (in RSC)** | 初回表示データの取得・表示 | サーバー |
| **Server Actions** | フォーム送信、ボタンクリックによるデータ更新 | サーバー |
| **Route Handlers** | Webhook、外部アプリ向けAPI、複雑な認証が必要なプロキシ | サーバー |
| **SWR / React Query** | 検索フィルター、無限スクロール、リアルタイムUI更新 | クライアント |

App Routerにおけるデータ取得の基本は、**「まずはServer Componentでの `fetch` を検討し、ユーザーの操作（書き込み）が必要になったら `Server Actions` を使う」**というシンプルな流れです。Route Handlersは、フロントエンド以外からのアクセスが必要な場合に限定して利用すると、コードの複雑さを抑えることができます。

これらの手法を適切に使い分けることで、Next.jsのパフォーマンスと開発体験を最大限に引き出すことができるでしょう。

---

## 参考リンク

- [Next.js Documentation: Data Fetching, Caching, and Revalidating](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Next.js Documentation: Server Actions and Mutations](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Next.js Documentation: Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [React Documentation: Server Components](https://react.dev/reference/rsc/server-components)
