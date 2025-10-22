import { defineConfig, UserConfig } from 'vitepress'
import { withSidebar } from 'vitepress-sidebar'
import taskLists from 'markdown-it-task-lists'
import { VitePressSidebarOptions } from 'vitepress-sidebar/types'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// 型定義
interface NavItem {
  text: string
  link?: string
  items?: NavItem[]
}

interface Heading {
  text: string
  anchor: string
}

interface Category {
  dir: string
  displayName: string
}

// カテゴリの定義（表示順序を保持）
const CATEGORIES: Category[] = [
  { dir: 'ai', displayName: 'AI' },
  { dir: 'ruby', displayName: 'Ruby' },
  { dir: 'rails', displayName: 'Rails' },
  { dir: 'typescript', displayName: 'TypeScript' },
  { dir: 'graphql', displayName: 'GraphQL' },
  { dir: 'infrastructure', displayName: 'インフラ' },
]

/**
 * VitePressのアンカー形式に変換
 * 例: "1. Ruby基礎" -> "1-ruby基礎"
 */
function convertToAnchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF-]/g, (char) => {
      // 日本語文字はエンコード、それ以外は削除
      return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(char)
        ? encodeURIComponent(char).toLowerCase()
        : ''
    })
}

/**
 * Markdownから見出し（## または ###）を抽出
 */
function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = []
  const headingRegex = /^#{2,3}\s+(.+)$/gm
  let match: RegExpExecArray | null

  while ((match = headingRegex.exec(content)) !== null) {
    const text = match[1].trim()
    headings.push({
      text,
      anchor: convertToAnchor(text),
    })
  }

  return headings
}

/**
 * 1つのカテゴリのNavItemを生成
 */
function createCategoryNavItem(category: Category, docsPath: string): NavItem {
  const indexPath = join(docsPath, category.dir, 'index.md')
  const baseLink = `/${category.dir}/`

  // index.mdが存在しない、または読み込みに失敗した場合
  if (!existsSync(indexPath)) {
    return { text: category.displayName, link: baseLink }
  }

  try {
    const content = readFileSync(indexPath, 'utf-8')
    const headings = extractHeadings(content)

    // 見出しがない場合は単純なリンク
    if (headings.length === 0) {
      return { text: category.displayName, link: baseLink }
    }

    // サブメニュー付きのナビゲーションアイテム
    return {
      text: category.displayName,
      items: headings.map(({ text, anchor }) => ({
        text,
        link: `${baseLink}#${anchor}`,
      })),
    }
  } catch (error) {
    console.warn(`Failed to read ${indexPath}:`, error)
    return { text: category.displayName, link: baseLink }
  }
}

/**
 * ヘッダーナビゲーションメニューを自動生成
 */
function generateNav(): NavItem[] {
  const docsPath = join(__dirname, '..')
  const nav: NavItem[] = [{ text: 'ホーム', link: '/' }]

  for (const category of CATEGORIES) {
    nav.push(createCategoryNavItem(category, docsPath))
  }

  return nav
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
