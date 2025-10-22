import { defineConfig, UserConfig } from 'vitepress'
import { withSidebar } from 'vitepress-sidebar'
import taskLists from 'markdown-it-task-lists'
import { VitePressSidebarOptions } from 'vitepress-sidebar/types'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const CATEGORIES = [
  ['ai', 'AI'],
  ['ruby', 'Ruby'],
  ['rails', 'Rails'],
  ['typescript', 'TypeScript'],
  ['graphql', 'GraphQL'],
  ['infrastructure', 'インフラ'],
]

function generateNav() {
  const nav = [{ text: 'ホーム', link: '/' }]

  for (const [dir, name] of CATEGORIES) {
    const path = join(__dirname, '..', dir, 'index.md')
    if (!existsSync(path)) {
      nav.push({ text: name, link: `/${dir}/` })
      continue
    }

    try {
      const content = readFileSync(path, 'utf-8')
      const headings = [...content.matchAll(/^#{2,3}\s+(.+)$/gm)].map(m => {
        const text = m[1].trim()
        const anchor = text
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF-]/g, c =>
            /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(c) ? encodeURIComponent(c).toLowerCase() : ''
          )
        return { text, link: `/${dir}/#${anchor}` }
      })

      nav.push(headings.length ? { text: name, items: headings } : { text: name, link: `/${dir}/` })
    } catch {
      nav.push({ text: name, link: `/${dir}/` })
    }
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
