import { defineConfig, UserConfig } from 'vitepress'
import { withSidebar } from 'vitepress-sidebar'
import taskLists from 'markdown-it-task-lists'
import { VitePressSidebarOptions } from 'vitepress-sidebar/types'
import fs from 'fs'
import path from 'path'

// ナビゲーションを自動生成する関数
function generateNav() {
  const docsDir = path.join(__dirname, '..')
  const nav: any[] = [{ text: 'ホーム', link: '/' }]

  // ディレクトリリストを取得（特定の順序で表示）
  const categories = ['ai', 'ruby', 'rails', 'typescript', 'graphql', 'infrastructure']

  // 日本語のカテゴリ名のマッピング
  const categoryNames: Record<string, string> = {
    ai: 'AI',
    ruby: 'Ruby',
    rails: 'Rails',
    typescript: 'TypeScript',
    graphql: 'GraphQL',
    infrastructure: 'インフラ'
  }

  for (const category of categories) {
    const categoryPath = path.join(docsDir, category)
    const indexPath = path.join(categoryPath, 'index.md')

    // ディレクトリとindex.mdが存在するかチェック
    if (!fs.existsSync(categoryPath) || !fs.existsSync(indexPath)) {
      continue
    }

    // index.mdからセクションを抽出
    const content = fs.readFileSync(indexPath, 'utf-8')
    const sections = extractSections(content, category)

    if (sections.length > 0) {
      // サブメニューがある場合
      nav.push({
        text: categoryNames[category] || category,
        items: sections
      })
    } else {
      // サブメニューがない場合（シンプルなリンク）
      nav.push({
        text: categoryNames[category] || category,
        link: `/${category}/`
      })
    }
  }

  return nav
}

// index.mdからセクション情報を抽出する関数
function extractSections(content: string, category: string) {
  const sections: { text: string; link: string }[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    // ## または ### で始まる見出しを検索し、{#id} パターンを探す
    const match = line.match(/^#{2,3}\s+(.+?)\s+\{#(.+?)\}/)
    if (match) {
      const text = match[1].trim()
      const id = match[2].trim()
      sections.push({
        text: text,
        link: `/${category}/#${id}`
      })
    }
  }

  return sections
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
