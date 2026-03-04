# Next.jsのSEO最適化：metadata API・OGP・構造化データの実践テクニック

モダンなWeb開発において、Next.js（App Router）はSEOに強いフレームワークとして広く採用されています。しかし、単に導入するだけでは検索エンジンやSNSに対して最適な情報を伝えることはできません。

本記事では、実務でNext.jsを使い始めたエンジニア向けに、App Routerの「Metadata API」を駆使したメタタグ管理、ダイナミックなOGP生成、そして検索結果のクリック率を向上させる「構造化データ（JSON-LD）」の実装テクニックを詳しく解説します。

---

## 1. 概要

SEO（検索エンジン最適化）の基本は、検索エンジン（Googleなど）やSNS（X、Facebook、Slackなど）のクローラーに対して、ページの情報を正しく、かつ魅力的に伝えることです。

Next.jsのApp Routerでは、従来の`next/head`コンポーネントに代わり、**Metadata API**が導入されました。これにより、サーバーコンポーネントから型安全かつ宣言的にメタデータを定義できるようになり、SEO実装のハードルが大幅に下がりました。

本稿では、以下の3点をゴールとして実装手法を学びます。
- **Metadata APIを用いた静的・動的メタデータの実装**
- **OGP（Open Graph Protocol）の自動生成と最適化**
- **JSON-LDによる構造化データの埋め込み**

---

## 2. 前提知識

実装に入る前に、Next.jsにおけるメタデータ管理の基本ルールを整理しておきましょう。

1.  **サーバーコンポーネント専用**: メタデータ（`Metadata`オブジェクトや`generateMetadata`関数）は、サーバーコンポーネント（LayoutやPage）からのみエクスポートできます。
2.  **階層的なマージ**: ルートの`layout.tsx`で定義したメタデータは、子階層のページに継承されます。子階層で同じキーを定義した場合は、子が優先されます。
3.  **ストリーミング対応**: メタデータはHTMLの`<head>`内に配置されるため、ブラウザがレンダリングを開始する前にクローラーが読み取ることが可能です。

---

## 3. 実装手順

### 3.1 ルートレベルの静的メタデータ設定

まずは、サイト全体で共通するデフォルト値を`app/layout.tsx`で定義します。ここでは、サイト名、共通のキーワード、そして重要な`metadataBase`を設定します。

```tsx
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://example.com'),
  title: {
    default: 'Tech Blog | 最先端の技術情報',
    template: '%s | Tech Blog', // 子ページで「title」を設定すると、ここに埋め込まれる
  },
  description: 'Next.jsやTypeScriptを中心としたエンジニア向け技術ブログです。',
  keywords: ['Next.js', 'React', 'TypeScript', 'SEO'],
  authors: [{ name: 'エンジニア太郎' }],
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://example.com',
    siteName: 'Tech Blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tech Blog',
    description: 'エンジニア向け技術ブログ',
    creator: '@tech_blog_handle',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
```

### 3.2 記事ページなどの動的メタデータ設定

ブログの記事詳細ページのように、DBから取得したタイトルや概要をメタデータに反映させたい場合は、`generateMetadata`関数を使用します。

```tsx
// app/posts/[slug]/page.tsx
import type { Metadata, ResolvingMetadata } from 'next';

type Props = {
  params: { slug: string };
};

// APIやDBから記事データを取得する関数（例）
async function getPost(slug: string) {
  const res = await fetch(`https://api.example.com/posts/${slug}`);
  return res.json();
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  // slugに基づいて記事データを取得
  const post = await getPost(params.slug);

  // 親階層のメタデータを参照することも可能
  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://example.com/posts/${params.slug}`,
      images: [post.coverImage, ...previousImages],
    },
  };
}

export default function PostPage({ params }: Props) {
  return <article>...記事本文...</article>;
}
```

### 3.3 OGP画像の動的生成（Image Response）

Next.jsには、`ImageResponse` APIを使ってOGP画像をコードで生成する機能があります。これにより、記事タイトルを埋め込んだ画像を自動生成できます。

`app/posts/[slug]/opengraph-image.tsx`というファイルを作成すると、Next.jsが自動的にOGP画像として認識します。

```tsx
// app/posts/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = '記事のOGP画像';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  // ここでもデータを取得可能
  const post = await fetch(`https://api.example.com/posts/${params.slug}`).then(res => res.json());

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 64,
          background: 'linear-gradient(to bottom right, #000000, #434343)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: '40px',
        }}
      >
        <div style={{ fontSize: 24, marginBottom: 20 }}>Tech Blog</div>
        <div style={{ textAlign: 'center' }}>{post.title}</div>
      </div>
    ),
    { ...size }
  );
}
```

### 3.4 構造化データ（JSON-LD）の実装

Googleの検索結果にリッチリザルト（パンくずリストやFAQなど）を表示させるには、JSON-LD形式の構造化データが必要です。Next.jsでは、`dangerouslySetInnerHTML`を使用して`<script>`タグを埋め込みます。

```tsx
// components/JsonLd.tsx
export default function JsonLd({ data }: { data: any }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// 記事ページでの利用例
// app/posts/[slug]/page.tsx
export default async function PostPage({ params }: Props) {
  const post = await getPost(params.slug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    image: post.coverImage,
    datePublished: post.publishedAt,
    author: {
      '@type': 'Person',
      name: 'エンジニア太郎',
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <article>
        <h1>{post.title}</h1>
        {/* 本文 */}
      </article>
    </>
  );
}
```

---

## 4. ハマりどころと注意点

### 4.1 `metadataBase` の設定忘れ
Next.js 13/14以降、OGP画像のURLなどが絶対パスでない場合、`metadataBase`が未設定だとビルドエラーや意図しないURL生成の原因になります。必ずルートの`layout.tsx`で設定しましょう。

### 4.2 クライアントコンポーネントでの利用不可
`Metadata`はサーバーコンポーネントの機能です。`"use client"`を指定したコンポーネントからエクスポートしても無視されます。メタデータが必要な場合は、そのページ自体をサーバーコンポーネントのままにするか、親のサーバーコンポーネントで管理する必要があります。

### 4.3 タイトルのテンプレートが適用されないケース
`title.template`は、そのページ自身には適用されません。あくまで「そのページの子階層」で`title`が定義された際に適用されます。トップページのタイトルを完全な形にしたい場合は`title.default`に設定した内容が使われます。

---

## 5. まとめ

Next.js App RouterでのSEO最適化は、以下の手順を確実に踏むことが重要です。

1.  **`layout.tsx`** で共通のメタデータと `metadataBase` を定義する。
2.  **`generateMetadata`** を使い、各ページのコンテンツに合わせた動的な情報をクローラーに伝える。
3.  **`opengraph-image.tsx`** を活用して、SNS映えする画像を自動生成する。
4.  **JSON-LD** を埋め込み、検索エンジンがコンテンツの構造を理解しやすくする。

これらのテクニックを組み合わせることで、ユーザー体験（UX）を損なうことなく、検索流入とSNSシェアの質を最大化することができます。

---

## 参考リンク

- [Next.js Documentation: Optimizing SEO](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Next.js Documentation: ImageResponse](https://nextjs.org/docs/app/api-reference/functions/image-response)
- [Schema.org - JSON-LD Schema Definitions](https://schema.org/)
- [Rich Results Test - Google Search Console](https://search.google.com/test/rich-results)
