import { defineConfig, UserConfig } from 'vitepress'
import { withSidebar } from 'vitepress-sidebar'
import taskLists from 'markdown-it-task-lists'
import { VitePressSidebarOptions } from 'vitepress-sidebar/types'
import fs from 'fs'
import path from 'path'

const HOSTNAME = 'https://ai-techblog.okdyy75.com'

// GitHub Pages は `/foo` と `/foo.html` の両方を 200 で返すため、
// canonical を出さないと全記事が重複URL扱いになる。出力ファイル名に合わせて `.html` を正とする
function canonicalUrl(relativePath: string) {
  const p = relativePath
    .replace(/(^|\/)index\.md$/, '$1')
    .replace(/\.md$/, '.html')
  return `${HOSTNAME}/${p}`
}

function generateNav() {
  const docsDir = path.join(__dirname, '..')
  const categories = [
    { dir: 'ai', name: 'AI' },
    { dir: 'ruby', name: 'Ruby' },
    { dir: 'rails', name: 'Rails' },
    { dir: 'typescript', name: 'TypeScript' },
    { dir: 'graphql', name: 'GraphQL' },
    { dir: 'postgres', name: 'PostgreSQL' },
    { dir: 'infrastructure', name: 'インフラ' },
    { dir: 'nextjs', name: 'Next.js' }
  ]

  const nav = [{ text: 'ホーム', link: '/' }]

  for (const { dir, name } of categories) {
    const indexPath = path.join(docsDir, dir, 'index.md')
    if (!fs.existsSync(indexPath)) continue

    const content = fs.readFileSync(indexPath, 'utf-8')
    const sections = content.split('\n')
      .map(line => line.match(/^#{2,3}\s+(.+?)\s+\{#(.+?)\}/))
      .filter(Boolean)
      .map(match => ({ text: match![1], link: `/${dir}/#${match![2]}` }))

    nav.push(sections.length > 0
      ? { text: name, items: sections }
      : { text: name, link: `/${dir}/` }
    )
  }

  return nav
}

// https://vitepress.dev/reference/site-config
const vitePressOptions: UserConfig = {
  title: "AIテックブログ",
  description: "AIが自動生成した技術記事をまとめたテックブログです",
  sitemap: {
    hostname: HOSTNAME
  },
  // git の最終コミット日を取得し、サイトマップの lastmod と記事下部の最終更新日に反映する
  lastUpdated: true,
  transformPageData(pageData) {
    const head = (pageData.frontmatter.head ?? []).filter(
      (h) => !(h[0] === 'link' && h[1]?.rel === 'canonical')
    )
    head.push(['link', { rel: 'canonical', href: canonicalUrl(pageData.relativePath) }])
    pageData.frontmatter.head = head
  },
    head: [
        ["script", { async: "", src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9459277760652211", crossorigin: "anonymous" }],
        ["script", { async: "", src: "https://www.googletagmanager.com/gtag/js?id=G-KV4CN8TQVS" }],
        [
            "script",
            {},
            `window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-KV4CN8TQVS');`,
        ],
    ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: generateNav(),

    socialLinks: [
      { icon: 'github', link: 'https://github.com/okdyy75/ai-techblog' }
    ],

    footer: {
      message: 'AI が自動生成した技術記事をまとめたテックブログ',
      copyright: 'Copyright © 2024 okdyy75'
    },

    search: {
      provider: 'local'
    }
  },
  markdown: {
    config: (md) => {
        md.use(taskLists, { label: true })
    }
}
}

const vitePressSidebarOptions: VitePressSidebarOptions = {
  // VitePress Sidebar's options here...
  documentRootPath: '/docs',
  collapsed: true,
  capitalizeFirst: true,
  useTitleFromFileHeading: true,
  useFolderTitleFromIndexFile: true,
  useFolderLinkFromIndexFile: true,
  hyphenToSpace: true,
  underscoreToSpace: true,
  excludePattern: ['README.md', 'api-examples.md', 'markdown-examples.md'],
  sortMenusByFrontmatterOrder: true,
  sortMenusOrderByDescending: false,
  frontmatterOrderDefaultValue: 0,
  manualSortFileNameByPriority: [
    'index.md',
    '01-prompt-engineering-basics.md',
    '02-rag-mechanism-and-utilization.md',
    '03-fine-tuning-llm-customization.md',
    '04-major-llm-comparison.md',
    '05-generative-ai-business-cases.md',
    '06-ml-model-deployment-strategies.md',
    '07-llm-fine-tuning-with-hugging-face.md',
    '08-vector-db-for-ai-applications.md',
    '09-pytorch-vs-tensorflow-2024.md',
    '10-mastering-ai-code-assistants.md'
  ],
};

export default defineConfig(withSidebar(vitePressOptions, vitePressSidebarOptions));
