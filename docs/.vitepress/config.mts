import { defineConfig, UserConfig } from 'vitepress'
import { withSidebar } from 'vitepress-sidebar'
import taskLists from 'markdown-it-task-lists'
import { VitePressSidebarOptions } from 'vitepress-sidebar/types'
import fs from 'fs'
import path from 'path'

function generateNav() {
  const docsDir = path.join(__dirname, '..')
  const categories = [
    { dir: 'ai', name: 'AI' },
    { dir: 'ruby', name: 'Ruby' },
    { dir: 'rails', name: 'Rails' },
    { dir: 'typescript', name: 'TypeScript' },
    { dir: 'graphql', name: 'GraphQL' },
    { dir: 'postgres', name: 'PostgreSQL' },
    { dir: 'infrastructure', name: 'インフラ' }
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
  description: "最新技術を体系的に学べる技術記事コレクション。Ruby・Rails・AI・GraphQL・PostgreSQL・インフラを網羅",
  lang: 'ja-JP',
  sitemap: {
    hostname: 'https://ai-techblog.okdyy75.com'
  },
  head: [
    // Google Analytics
    ["script", { async: "", src: "https://www.googletagmanager.com/gtag/js?id=G-KV4CN8TQVS" }],
    [
      "script",
      {},
      `window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-KV4CN8TQVS');`,
    ],
    // Meta tags
    ['meta', { name: 'theme-color', content: '#3b82f6' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }],
    // Open Graph
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'AIテックブログ' }],
    ['meta', { property: 'og:title', content: 'AIテックブログ - 最新技術を体系的に学べる技術記事コレクション' }],
    ['meta', { property: 'og:description', content: 'Ruby・Rails・AI・GraphQL・PostgreSQL・インフラを網羅した包括的な技術リソース' }],
    ['meta', { property: 'og:url', content: 'https://ai-techblog.okdyy75.com' }],
    // Twitter Card
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'AIテックブログ - 最新技術を体系的に学べる技術記事コレクション' }],
    ['meta', { name: 'twitter:description', content: 'Ruby・Rails・AI・GraphQL・PostgreSQL・インフラを網羅した包括的な技術リソース' }],
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: generateNav(),

    socialLinks: [
      { icon: 'github', link: 'https://github.com/okdyy75/ai-techblog' }
    ],

    footer: {
      message: '最新技術を体系的に学べる技術記事コレクション',
      copyright: 'Copyright © 2024 okdyy75'
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '検索',
            buttonAriaLabel: 'サイト内検索'
          },
          modal: {
            noResultsText: '結果が見つかりませんでした',
            resetButtonTitle: 'リセット',
            footer: {
              selectText: '選択',
              navigateText: '移動',
              closeText: '閉じる'
            }
          }
        }
      }
    },

    // 編集リンクの設定
    editLink: {
      pattern: 'https://github.com/okdyy75/ai-techblog/edit/main/docs/:path',
      text: 'このページを編集'
    },

    // 最終更新日の表示
    lastUpdated: {
      text: '最終更新',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    },

    // ドキュメントフッター
    docFooter: {
      prev: '前のページ',
      next: '次のページ'
    },

    // アウトラインの設定
    outline: {
      level: [2, 3],
      label: '目次'
    },

    // リターントップボタン
    returnToTopLabel: 'トップに戻る',

    // サイドバーのラベル
    sidebarMenuLabel: 'メニュー',
    darkModeSwitchLabel: 'ダークモード'
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
