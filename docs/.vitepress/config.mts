import { defineConfig, UserConfig } from 'vitepress'
import { withSidebar } from 'vitepress-sidebar'
import taskLists from 'markdown-it-task-lists'
import { VitePressSidebarOptions } from 'vitepress-sidebar/types'
import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

// ヘッダーメニューを自動生成する関数
function generateNav() {
  const docsPath = join(__dirname, '..')
  const nav: any[] = [{ text: 'ホーム', link: '/' }]

  // カテゴリ名と表示名のマッピング
  const categoryNames: Record<string, string> = {
    ai: 'AI',
    ruby: 'Ruby',
    rails: 'Rails',
    typescript: 'TypeScript',
    graphql: 'GraphQL',
    infrastructure: 'インフラ',
  }

  // 除外するディレクトリ
  const excludeDirs = ['.vitepress', 'public', '.obsidian']

  // docsディレクトリ内のフォルダを取得
  const dirs = readdirSync(docsPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !excludeDirs.includes(dirent.name))
    .filter(dirent => categoryNames[dirent.name])
    .map(dirent => dirent.name)

  // 各カテゴリのindex.mdから見出しを抽出してnavを生成
  for (const dir of dirs) {
    const indexPath = join(docsPath, dir, 'index.md')
    const displayName = categoryNames[dir]

    if (!existsSync(indexPath)) {
      // index.mdがない場合は単純なリンク
      nav.push({ text: displayName, link: `/${dir}/` })
      continue
    }

    const content = readFileSync(indexPath, 'utf-8')
    const headings = extractHeadings(content)

    if (headings.length === 0) {
      // 見出しがない場合は単純なリンク
      nav.push({ text: displayName, link: `/${dir}/` })
    } else {
      // サブメニューを持つアイテム
      nav.push({
        text: displayName,
        items: headings.map(heading => ({
          text: heading.text,
          link: `/${dir}/#${heading.anchor}`
        }))
      })
    }
  }

  return nav
}

// マークダウンから見出しを抽出する関数
function extractHeadings(content: string) {
  const headings: Array<{ text: string; anchor: string }> = []
  const lines = content.split('\n')

  for (const line of lines) {
    // ## または ### で始まる見出しを抽出（#のみは除外）
    const match = line.match(/^#{2,3}\s+(.+)/)
    if (match) {
      const text = match[1].trim()
      // VitePressのアンカー生成ルールに従う（小文字化、スペースをハイフンに、特殊文字をエンコード）
      const anchor = text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF-]/g, (char) => {
          // 日本語やハイフン、アンダースコア以外はエンコード
          if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(char)) {
            return encodeURIComponent(char).toLowerCase()
          }
          return ''
        })

      headings.push({ text, anchor })
    }
  }

  return headings
}

// https://vitepress.dev/reference/site-config
const vitePressOptions: UserConfig = {
  title: "AIテックブログ",
  description: "AIが自動生成した技術記事をまとめたテックブログです",
  sitemap: {
    hostname: 'https://ai-techblog.okdyy75.com'
  },
    head: [
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
