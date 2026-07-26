import { defineConfig, UserConfig } from 'vitepress'
import { withSidebar } from 'vitepress-sidebar'
import taskLists from 'markdown-it-task-lists'
import { VitePressSidebarOptions } from 'vitepress-sidebar/types'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const HOSTNAME = 'https://ai-techblog.okdyy75.com'

// 解説密度（地の文 / 地の文+コード）が20%未満で、コードの羅列に解説が伴っていない記事。
// Search Console の手動対策「価値のない質の低いコンテンツ」の対象とみられるため、
// 加筆するまで検索結果から外す。加筆が済んだ記事はこのリストから削除すること
const NOINDEX_THIN = [
  'rails/01-rails-basics/77-mvc-architecture-guide.md',
  'rails/02-active-record-database/68-solid-queue-rails8.md',
  'rails/02-active-record-database/69-active-record-encryption.md',
  'rails/02-active-record-database/78-zero-downtime-migrations.md',
  'rails/03-view-frontend/70-rails8-inline-execution.md',
  'rails/03-view-frontend/71-advanced-turbo-streams.md',
  'rails/04-controller-routing/72-rails8-controller-improvements.md',
  'rails/05-testing/73-rails8-testing-strategy.md',
  'rails/06-performance/74-rails8-performance-improvements.md',
  'rails/08-deployment-devops/87-deploy-rails-to-vercel.md',
  'rails/08-deployment-devops/88-deploy-rails-to-google-cloud.md',
  'rails/12-gems-libraries/75-shopify-liquid-rails.md',
  'rails/13-others/76-docker-optimization-rails.md',
  'graphql/06-performance-optimization.md',
  'graphql/08-testing-strategies.md',
  'graphql/09-security-best-practices.md',
  'graphql/10-operations-monitoring.md',
  'infrastructure/gcp/gcp-basics.md',
  'infrastructure/gcp/gcp-advanced.md',
  'infrastructure/gcp/gcp-enterprise.md',
  'infrastructure/vercel/vercel-advanced.md',
  'infrastructure/vercel/vercel-enterprise.md',
  'nextjs/06-nextjs-testing-vitest-playwright.md',
  'typescript/01-basics/01-typescript-setup.md',
  'typescript/01-basics/02-typescript-syntax.md',
  'typescript/04-frameworks/01-react-typescript.md',
  'typescript/05-tools/06-zod-runtime-validation.md',
  'typescript/06-practice/06-large-project-structure.md',
  'typescript/06-practice/07-error-handling.md'
]

// rails/ セクションと主題が重複、または技術ブログの主題から外れている記事。
// 本来は削除する対象で、それまでの暫定措置として検索結果から外す
const NOINDEX_DUPLICATE = [
  'ruby/04-advanced/21-ruby-on-rails-basics.md',
  'ruby/04-advanced/22-active-record-basics.md',
  'ruby/04-advanced/23-rails-routing.md',
  'ruby/04-advanced/24-rails-views-and-templates.md',
  'ruby/04-advanced/25-rails-controllers.md',
  'ruby/04-advanced/26-rails-testing-introduction.md',
  'ruby/04-advanced/27-rails-deployment-strategies.md',
  'ruby/04-advanced/40-rails-security-best-practices.md',
  'rails/02-active-record-database/91-rails-laravel-validation-comparison.md',
  'rails/02-active-record-database/91-with-has-group-pivot-differences.md',
  'rails/02-active-record-database/92-rails-laravel-migration-comparison.md',
  'rails/02-active-record-database/93-rails-laravel-file-upload-comparison.md',
  'api-examples.md',
  'markdown-examples.md'
]

const NOINDEX = new Set([...NOINDEX_THIN, ...NOINDEX_DUPLICATE])

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
      items.flatMap((item) => {
        // canonical と URL 形式を揃える（`graphql/index.html` => `graphql/`）
        const url = item.url.replace(/(^|\/)index\.html$/, '$1')
        const relativePath = url === '' || url.endsWith('/')
          ? `${url}index.md`
          : url.replace(/\.html$/, '.md')
        // noindex のページをサイトマップに載せると矛盾したシグナルになる
        if (NOINDEX.has(relativePath)) return []
        const lastmod = lastmodMap[`docs/${relativePath}`]
        return [lastmod ? { ...item, url, lastmod } : { ...item, url }]
      })
  },
  transformPageData(pageData) {
    const head = (pageData.frontmatter.head ?? []).filter(
      (h) => !(h[0] === 'link' && h[1]?.rel === 'canonical') &&
             !(h[0] === 'meta' && h[1]?.name === 'robots')
    )
    head.push(['link', { rel: 'canonical', href: canonicalUrl(pageData.relativePath) }])
    if (NOINDEX.has(pageData.relativePath)) {
      head.push(['meta', { name: 'robots', content: 'noindex, follow' }])
    }
    pageData.frontmatter.head = head
  },
    head: [
        // AdSense は手動対策の解除まで停止（無効なトラフィック・コンテンツポリシー面のリスク回避）
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
