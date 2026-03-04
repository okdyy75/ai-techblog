# Next.js App Router完全入門：Pages Routerとの違いと移行ポイント

Next.js 13で導入され、現在は標準となった「App Router」。従来のPages Routerで慣れ親しんだ開発手法とは、設計思想から大きく異なります。

本記事では、Pages Routerを経験したエンジニアがApp Routerへスムーズに移行し、そのポテンシャルを最大限に引き出すためのポイントを徹底解説します。

---

## 1. 概要

App Routerは、React Server Components（RSC）をベースに構築された新しいルーティングシステムです。

従来のPages Routerが「ファイルシステムベースのルーティング」を提供していたのに対し、App Routerはそれに加えて「コンポーネント単位でのサーバーサイドレンダリング」と「高度なローディング・エラーハンドリング」を直感的に記述できる仕組みを提供します。

### なぜApp Routerなのか？
- **パフォーマンス向上**: クライアントに送るJavaScriptの量を劇的に削減できます。
- **パフォーマンス向上**: クライアントに送るJavaScriptの量を劇的に削減できます。
- **UXの向上**: ストリーミング機能により、重いデータ取得を待たずにページの一部を先に表示できます。

---

## 2. 前提知識

App Routerを理解する上で欠かせないのが、**React Server Components (RSC)** の概念です。

- **Server Components**: サーバー側で実行され、結果（HTML）のみがクライアントに送られるコンポーネント。デフォルトはこちらになります。
- **Client Components**: ブラウザで実行され、状態管理（useState）や副作用（useEffect）が利用できるコンポーネント。ファイルの先頭に`"use client"`と記述することで指定します。

この「境界線」を意識することが、App Router攻略の第一歩です。

---

## 3. Pages Routerとの主な違い

### ディレクトリ構成
Pages Routerでは`pages/`以下にファイルを置きましたが、App Routerでは`app/`ディレクトリを使用します。

- **Pages Router**: `pages/about.tsx` -> `/about`
- **App Router**: `app/about/page.tsx` -> `/about`

App Routerでは、ディレクトリ名がパスになり、実際のページ内容は`page.tsx`という予約済みファイル名で定義します。

### データ取得（Data Fetching）
もっとも大きな変更点です。`getServerSideProps`や`getStaticProps`は廃止されました。

- **Pages Router**: ページトップの関数でデータを取得し、propsで渡す。
- **App Router**: コンポーネントを`async`化し、内部で直接`fetch`（またはDB操作）を行う。

```tsx
// app/users/page.tsx (Server Component)
export default async function UsersPage() {
  const res = await fetch('https://api.example.com/users', {
    next: { revalidate: 3600 } // 1時間キャッシュ（ISR相当）
  });
  const users = await res.json();

  return (
    <ul>
      {users.map((user: { id: string; name: string }) => (
        <li key={user.id}>{user.name}</li>
      ))}
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

---

## 4. 実装と移行のステップ

既存のPages Routerプロジェクトから移行する場合、あるいは新規で構築する場合の基本的な手順を整理します。

### ステップ1：Root Layoutの定義
App Routerでは、HTMLの`<html>`や`<body>`タグを管理する共通の`layout.tsx`が必要です。

```tsx
// app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'My Next.js App',
  description: 'Built with App Router',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <nav>共通ナビゲーション</nav>
        {children}
      </body>
    </html>
  );
}
```

### ステップ2：Client Componentsの切り分け
ブラウザのAPI（`window`など）や、`useState` / `useEffect` を使う場合は、コンポーネントを分離します。

```tsx
// components/Counter.tsx
"use client"; // クライアントコンポーネントであることを宣言

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

### ステップ3：Metadata APIの利用
`<Head>`コンポーネントは不要になりました。代わりに、`metadata`オブジェクトをエクスポートします。

```tsx
// app/blog/[slug]/page.tsx
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  return {
    title: `Blog: ${params.slug}`,
  };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  return <h1>Post: {params.slug}</h1>;
}
```

---

## 5. ハマりどころ（注意点）

実務で遭遇しやすいトラブルをいくつか挙げます。

### 1. サーバーコンポーネントでのHooks利用
`useRouter`や`useSearchParams`をServer Componentで呼び出すとエラーになります。ナビゲーションが必要な場合はClient Component化するか、`redirect`関数を使用してください。

### 2. ライブラリの対応状況
CSS-in-JS（styled-componentsなど）や一部のUIライブラリは、Server Component内で直接動かないことがあります。その場合、それらをラップしたコンポーネントを作成し、`"use client"`を付与して利用する必要があります。

### 3. Hydration Error
サーバーでレンダリングした結果と、クライアントでの初回レンダリング結果が異なると「Hydration failed」エラーが発生します。
- `new Date()` を直接レンダリングする
- `window` の有無で条件分岐して表示を変える
といった処理は、`useEffect` 内で行うように修正してください。

### 4. キャッシュの挙動
`fetch`はデフォルトで強力にキャッシュされます。動的なデータを表示したい場合は、`cache: 'no-store'`を指定するか、`revalidatePath`などで明示的にキャッシュをパージする必要があります。

---

## 6. まとめ

App Routerへの移行は、単なる「書き方の変更」ではなく「サーバーとクライアントの責務を再定義する作業」です。

- **Server Components**を基本とし、必要な時だけ**Client Components**を導入する。
- データの取得は可能な限り**サーバー側（page.tsxなど）**で行う。
- **Layout**を活用して、再レンダリングの範囲を最適化する。

これらを意識することで、これまでのPages Routerでは難しかった高いパフォーマンスと良好な開発者体験を両立できるようになります。最初は戸惑うことも多いですが、一度慣れてしまえば、非同期処理の記述が劇的に楽になるはずです。

---

## 参考リンク

- [Next.js Documentation (App Router Guide)](https://nextjs.org/docs/app)
- [React Server Components Concepts](https://react.dev/reference/react/server-components)
- [Next.js App Router Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)
