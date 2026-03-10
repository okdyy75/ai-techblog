# Next.jsのSEO最適化：metadata API・OGP・構造化データの実践テクニック

## 1. 概要

Next.jsのApp Routerは、アプリケーションのルーティングとレンダリングのパラダイムを大きく変えました。それに伴い、検索エンジン最適化（SEO）戦略も進化させる必要があります。本記事では、Next.jsのApp Router環境下で、`metadata` API、OGP（Open Graph Protocol）、構造化データ（JSON-LD）を駆使し、SEOを最大化するための実践的なテクニックを、具体的なコード例を交えて解説します。実務でNext.jsプロジェクトのSEOを強化したいと考えるエンジニアの皆様に、即座に役立つ知見を提供します。

## 2. なぜApp Router時代のSEO設計が重要か

従来のPages Routerでは、SEO関連のメタデータ管理は`next/head`コンポーネントやカスタムの`_document.js`、`_app.js`ファイルに分散しがちでした。しかし、App Routerでは、`layout.tsx`や`page.tsx`ファイルに直接`metadata`オブジェクトや`generateMetadata`関数をエクスポートすることで、ルーティングとコローケーションされた形でメタデータを管理できるようになりました。これにより、各ルートのSEO設定がより直感的になり、動的なコンテンツに対するSEO最適化も容易になります。

サーバーコンポーネントがデフォルトとなったApp Routerでは、サーバーサイドでメタデータが完全にレンダリングされるため、クローラーがJavaScriptを実行するのを待つことなく、正確なページ情報を取得できるようになります。これは、Googleなどの検索エンジンが重視する「ファーストバイトまでの時間（TTFB）」や「コアウェブバイタル」の改善にも寄与し、検索ランキングに好影響をもたらします。

## 3. metadata APIの基本（title, description, alternates, robots, openGraph, twitter）

App Routerでは、`layout.tsx`または`page.tsx`ファイルから`metadata`オブジェクトをエクスポートすることで、ページのメタデータを設定します。

```typescript
// app/layout.tsx または app/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Next.jsのSEO最適化ガイド',
  description: 'Next.js App RouterでのSEO実践テクニックを解説。metadata API、OGP、構造化データなど。',
  keywords: ['Next.js', 'SEO', 'App Router', 'metadata API', 'OGP', '構造化データ'],
  alternates: {
    canonical: 'https://example.com/seo-guide',
    // 異なる言語バージョンがある場合
    // languages: {
    //   'en-US': 'https://example.com/en/seo-guide',
    //   'ja-JP': 'https://example.com/ja/seo-guide',
    // },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'Next.jsのSEO最適化：metadata API・OGP・構造化データの実践テクニック',
    description: 'Next.js App RouterでのSEO実践テクニックを解説。metadata API、OGP、構造化データなど。',
    url: 'https://example.com/seo-guide',
    siteName: 'AI Tech Blog',
    images: [
      {
        url: 'https://example.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Next.js SEO Optimization',
      },
    ],
    locale: 'ja_JP',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Next.jsのSEO最適化：metadata API・OGP・構造化データの実践テクニック',
    description: 'Next.js App RouterでのSEO実践テクニックを解説。metadata API、OGP、構造化データなど。',
    creator: '@your_twitter_handle',
    images: ['https://example.com/twitter-image.jpg'],
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

- **`title`**: ページのタイトル。SEOで最も重要な要素の一つです。
- **`description`**: ページの要約。検索結果のスニペットに表示される可能性があります。
- **`alternates.canonical`**: 重複コンテンツの問題を防ぐためのURL正規化。
- **`robots`**: クローラーの動作を制御します。`index: true`、`follow: true`が基本です。
- **`openGraph`**: FacebookやX（旧Twitter）などのSNSで共有された際の表示を制御します。`title`、`description`、`url`、`images`は重要な項目です。
- **`twitter`**: Xカードの設定。`card`タイプ（`summary_large_image`が推奨）と`images`が重要です。

これらのプロパティは、必要に応じて階層的に上書きされます。例えば、`layout.tsx`で設定された`title`は、その子である`page.tsx`で異なる`title`が設定されていれば、`page.tsx`のものが優先されます。

## 4. generateMetadataの使いどころ（動的ルート）

ブログ記事や商品ページなど、動的なコンテンツでは、そのページの内容に応じてメタデータを生成する必要があります。このような場合に`generateMetadata`関数を使用します。`generateMetadata`は非同期関数として定義でき、`params`や`searchParams`にアクセスして動的にメタデータを生成できます。

```typescript
// app/blog/[slug]/page.tsx
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ slug: string }>;
};

async function getPost(slug: string) {
  const response = await fetch(`https://api.example.com/posts/${slug}`);
  if (!response.ok) return null;
  return response.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: '記事が見つかりません',
      description: 'お探しの記事は見つかりませんでした。',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `https://example.com/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      url: `https://example.com/blog/${slug}`,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      images: [
        {
          url: post.ogImageUrl || 'https://example.com/default-og-image.jpg',
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.ogImageUrl || 'https://example.com/default-og-image.jpg'],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return <h1>記事が見つかりません</h1>;
  }

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

`generateMetadata`は、コンポーネントがレンダリングされる前にサーバーで実行されるため、データフェッチを安全に行い、その結果をメタデータに反映させることができます。記事詳細、カテゴリ、商品、LPなど、URL単位でメタ情報を変えたいページではほぼ必須です。

実務では、以下のルールで使い分けると整理しやすくなります。

- 共通のサイト名やデフォルトOGPは`layout.tsx`
- ルート固有の静的SEO設定は`page.tsx`の`metadata`
- CMSやDB依存のページは`generateMetadata`
- 存在しないページは`notFound()`と`robots: noindex`

## 5. OGP画像設計（ImageResponse や next/og の考え方）

OGP画像はSNSでの視認性を高め、クリック率を向上させるために非常に重要です。Next.jsでは、動的なOGP画像を生成するための強力なツールが提供されています。

### `ImageResponse` と `next/og`

`ImageResponse`は、JSXを画像に変換し、動的にOGP画像を生成するためのAPIです。記事タイトルやカテゴリ名、サービス名を画像内に描画できるため、一覧記事でも個別記事でも統一感のあるカードを作れます。

```typescript
// app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

async function getPost(slug: string) {
  const response = await fetch(`https://api.example.com/posts/${slug}`);
  if (!response.ok) return null;
  return response.json();
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          color: 'white',
          padding: '56px',
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.8 }}>AI Tech Blog / Next.js</div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.25 }}>
          {post?.title ?? 'Next.js Article'}
        </div>
        <div style={{ fontSize: 24, opacity: 0.85 }}>metadata API / OGP / JSON-LD</div>
      </div>
    ),
    size,
  );
}
```

設計上のポイントは次の通りです。

- 画像サイズは原則`1200x630`
- タイトルは長くなりすぎないよう2〜3行に収める
- 小さなスマホ表示でも読める余白と文字サイズを確保する
- サイト名やカテゴリを入れて、共有時に出典が分かるようにする
- 画像生成で使うフォントや外部データは、レスポンス遅延を起こさないよう注意する

記事数が多いメディアでは、投稿ごとに手作業でOGP画像を作るのは持続しません。まずはテンプレートを1つ決め、動的生成に寄せる方が運用は安定します。

## 6. 構造化データ（JSON-LD）の実装例

構造化データは、検索エンジンに「このページが何を表しているか」を明示的に伝えるための仕組みです。ブログ記事なら`Article`、FAQページなら`FAQPage`、製品ページなら`Product`など、コンテンツに合ったスキーマを選びます。

App Routerでは、`<script type="application/ld+json">`をサーバーコンポーネント内で出力するのがシンプルです。

```typescript
// app/blog/[slug]/page.tsx
import type { Metadata } from 'next';

async function getPost(slug: string) {
  const response = await fetch(`https://api.example.com/posts/${slug}`);
  if (!response.ok) return null;
  return response.json();
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return <h1>記事が見つかりません</h1>;
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: [post.ogImageUrl],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'AI Tech Blog',
      logo: {
        '@type': 'ImageObject',
        url: 'https://example.com/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://example.com/blog/${slug}`,
    },
  };

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

実務上の注意点もあります。

- ページ本文とJSON-LDの内容を一致させる
- `datePublished` / `dateModified`は実データと揃える
- 存在しない画像URLを設定しない
- `Organization`や`Person`情報を仮値のまま本番に出さない
- 検証はRich Results TestやSchema Markup Validatorで行う

構造化データは設定すれば必ずリッチリザルトになるわけではありません。ただし、検索エンジンに文脈を伝える意味で価値が高く、記事・求人・FAQ・イベントなどでは優先度が高い施策です。

## 7. canonical / sitemap / robots.txt の整理

SEOで意外と事故が多いのが、ページ本文ではなく周辺ファイルの管理です。App Routerでは`app/sitemap.ts`や`app/robots.ts`を使って、これらをコードで管理できます。

### canonical

重複コンテンツを避けるために、正規URLを明示します。

- クエリ付き一覧ページ
- 並び替え違いページ
- 計測用パラメータ付きURL
- 同一内容の言語違い・デバイス違いページ

これらが存在する場合、`alternates.canonical`を必ず定義します。

### sitemap

```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await fetch('https://api.example.com/posts').then((res) => res.json());

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: 'https://example.com/',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://example.com/blog',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  const articlePages: MetadataRoute.Sitemap = posts.map((post: { slug: string; updatedAt: string }) => ({
    url: `https://example.com/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticPages, ...articlePages];
}
```

### robots.txt

```typescript
// app/robots.ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/internal'],
      },
    ],
    sitemap: 'https://example.com/sitemap.xml',
  };
}
```

ここでのポイントは、**「noindexページをsitemapへ入れない」「クロールさせたくないURLを明確に分ける」**ことです。`robots.txt`でブロックしただけではインデックス制御として不十分なケースもあるため、必要に応じて`robots: noindex`も併用します。

## 8. よくある失敗と対策

### 失敗1: 一覧と詳細で同じtitle/descriptionを使っている

CMS連携時に共通テンプレートだけを設定し、記事詳細でも同じメタ情報を返してしまうケースがあります。`generateMetadata`で記事単位に値を変えるべきです。

### 失敗2: OGP画像URLが相対パスのまま

SNSクローラーは絶対URLを期待することが多いため、`/og.png`ではなく`https://example.com/og.png`の形に寄せると安全です。

### 失敗3: 構造化データだけ整っていて本文とズレている

JSON-LD上では著者名や公開日が入っていても、本文では未表示だと整合性が崩れます。検索エンジン視点では不自然です。

### 失敗4: `metadataBase`未設定でURL生成が不安定

絶対URLを生成するアプリでは、ベースURLを共通化しておくと事故を減らせます。

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://example.com'),
  title: {
    default: 'AI Tech Blog',
    template: '%s | AI Tech Blog',
  },
};
```

### 失敗5: 本番とプレビューで同じインデックス制御をしている

プレビュー環境までインデックス対象にすると、重複ページが増えます。環境変数で`noindex`を切り替える運用が有効です。

## 9. 実務向けチェックリスト

新規ページや記事詳細を公開する前に、最低限ここは確認しておくと事故を減らせます。

- `title`と`description`がページ固有になっている
- canonical URLが正しく設定されている
- OGP画像が1200x630前提で表示崩れしない
- `openGraph`と`twitter`の文言が共有文脈に合っている
- JSON-LDが本文データと一致している
- `robots`設定が本番・ステージングで適切に分かれている
- sitemapに公開対象ページだけが含まれている
- Search ConsoleやSNS Card Validatorで最低限の確認をした

さらに、記事メディアなら次も効きます。

- タイトルと見出しに検索意図が反映されている
- 一覧ページから内部リンクが張られている
- OGP画像テンプレートがカテゴリごとに破綻しない
- 更新日時を本文・構造化データ・sitemapで揃えている

## 10. まとめ

App Router時代のNext.jsでは、SEOは「後からmetaタグを足す作業」ではなく、**ルーティング・データ取得・コンテンツ設計と一体で考える実装領域**になりました。`metadata` APIで静的な土台を整え、`generateMetadata`で動的ページに対応し、`next/og`で共有体験を高め、JSON-LDで検索エンジンに文脈を伝える。この4点を押さえるだけでも、SEO品質はかなり安定します。

実務での導入優先順位を付けるなら、まずは以下がおすすめです。

1. `title` / `description` / canonicalをページ固有にする
2. 記事詳細で`generateMetadata`を導入する
3. OGP画像をテンプレート化する
4. JSON-LDとsitemap / robotsを整備する

最初から全部を完璧にやる必要はありません。まずは検索結果とSNS共有で壊れない状態を作り、その後に構造化データや自動OGP生成へ広げると、手戻りが少なく運用もしやすくなります。
