import { defineConfig, UserConfig } from 'vitepress'
import { withSidebar } from 'vitepress-sidebar'
import taskLists from 'markdown-it-task-lists'
import { VitePressSidebarOptions } from 'vitepress-sidebar/types'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const HOSTNAME = 'https://ai-techblog.okdyy75.com'

// GitHub Pages は `/foo` と `/foo.html` の両方を 200 で返すため、
// canonical を出さないと全記事が重複URL扱いになる。出力ファイル名に合わせて `.html` を正とする
function canonicalUrl(relativePath: string) {
  const p = relativePath
    .replace(/(^|\/)index\.md$/, '$1')
    .replace(/\.md$/, '.html')
  return `${HOSTNAME}/${p}`
}

// git の最終コミット日を1回のログ走査で「docs配下のファイル => ISO日時」に集計する
function buildLastmodMap(): Record<string, string> {
  const map: Record<string, string> = {}
  try {
    const log = execSync('git log --pretty=format:%cI --name-only --diff-filter=ACMR -- docs', {
      cwd: path.join(__dirname, '../..'),
      encoding: 'utf-8',
      maxBuffer: 256 * 1024 * 1024
    })
    let date = ''
    for (const line of log.split('\n')) {
      const t = line.trim()
      if (!t) continue
      if (/^\d{4}-\d{2}-\d{2}T/.test(t)) { date = t; continue }
      // git log は新しい順に出力されるので、各ファイルの初出がそのまま最終更新日になる
      if (t.endsWith('.md') && !map[t]) map[t] = date
    }
  } catch {
    // 履歴を取得できない環境では lastmod を省略する
  }
  return map
}

const lastmodMap = buildLastmodMap()

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
  description: "Ruby・Rails を中心に、Web 開発の技術記事をまとめたブログです",
  sitemap: {
    hostname: HOSTNAME,
    transformItems: (items) =>
      items.map((item) => {
        // canonical と URL 形式を揃える（`graphql/index.html` => `graphql/`）
        const url = item.url.replace(/(^|\/)index\.html$/, '$1')
        const relativePath = url === '' || url.endsWith('/')
          ? `${url}index.md`
          : url.replace(/\.html$/, '.md')
        const lastmod = lastmodMap[`docs/${relativePath}`]
        return lastmod ? { ...item, url, lastmod } : { ...item, url }
      })
  },
  transformPageData(pageData) {
    const head = (pageData.frontmatter.head ?? []).filter(
      (h) => !(h[0] === 'link' && h[1]?.rel === 'canonical')
    )
    head.push(['link', { rel: 'canonical', href: canonicalUrl(pageData.relativePath) }])
    pageData.frontmatter.head = head
  },
    head: [
        // AdSense は手動対策の解除まで停止（コンテンツポリシー面のリスク回避）
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
      message: 'Ruby・Rails を中心とした Web 開発の技術ブログ',
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
