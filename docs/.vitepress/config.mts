import { defineConfig, UserConfig } from 'vitepress'
import { withSidebar } from 'vitepress-sidebar'
import taskLists from 'markdown-it-task-lists'
import { VitePressSidebarOptions } from 'vitepress-sidebar/types'

// https://vitepress.dev/reference/site-config
const vitePressOptions: UserConfig = {
  base: '/ai-techblog/',
  title: "AIテックブログ",
  description: "AIが自動生成した技術記事をまとめたテックブログです",
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
    nav: [
      { text: 'ホーム', link: '/' },
      { 
        text: 'Ruby', 
        items: [
          { text: '1. Ruby基礎', link: '/ruby/#_1-ruby%E5%9F%BA%E7%A4%8E' },
          { text: '2. Ruby応用', link: '/ruby/#_2-ruby%E5%BF%9C%E7%94%A8' },
          { text: '3. Rubyエコシステム', link: '/ruby/#_3-ruby%E3%82%A8%E3%82%B3%E3%82%B7%E3%82%B9%E3%83%86%E3%83%A0' },
          { text: '4. 発展トピック', link: '/ruby/#_4-ruby%E7%99%BA%E5%B1%95%E3%83%88%E3%83%94%E3%83%83%E3%82%AF' }
        ]
      },
      { 
        text: 'Rails', 
        items: [
          { text: '1. Rails基礎', link: '/rails/#_1-rails%E5%9F%BA%E7%A4%8E' },
          { text: '2. Active Record / データベース', link: '/rails/#_2-active-record-%E3%83%86%E3%82%99%E3%83%BC%E3%82%BF%E3%83%98%E3%82%99%E3%83%BC%E3%82%B9' },
          { text: '3. View / フロントエンド', link: '/rails/#_3-view-%E3%83%95%E3%83%AD%E3%83%B3%E3%83%88%E3%82%A8%E3%83%B3%E3%83%88%E3%82%99' },
          { text: '4. Controller / ルーティング', link: '/rails/#_4-controller-%E3%83%AB%E3%83%BC%E3%83%86%E3%82%A3%E3%83%B3%E3%82%AF%E3%82%99' },
          { text: '5. テスト', link: '/rails/#_5-%E3%83%86%E3%82%B9%E3%83%88' },
          { text: '6. パフォーマンス', link: '/rails/#_6-%E3%83%8F%E3%82%9A%E3%83%95%E3%82%A9%E3%83%BC%E3%83%9E%E3%83%B3%E3%82%B9' },
          { text: '7. アーキテクチャ / 設計', link: '/rails/#_7-%E3%82%A2%E3%83%BC%E3%82%AD%E3%83%86%E3%82%AF%E3%83%81%E3%83%A3-%E8%A8%AD%E8%A8%88' },
          { text: '8. デプロイ / DevOps', link: '/rails/#_8-%E3%83%86%E3%82%99%E3%83%95%E3%82%9A%E3%83%AD%E3%82%A4-devops' },
          { text: '9. API', link: '/rails/#_9-api' },
          { text: '10. セキュリティ', link: '/rails/#_10-%E3%82%BB%E3%82%AD%E3%83%A5%E3%83%AA%E3%83%86%E3%82%A3' },
          { text: '11. バックグラウンドジョブ', link: '/rails/#_11-%E3%83%8F%E3%82%99%E3%83%83%E3%82%AF%E3%82%AF%E3%82%99%E3%83%A9%E3%82%A6%E3%83%B3%E3%83%88%E3%82%99%E3%82%B7%E3%82%99%E3%83%A7%E3%83%95%E3%82%99' },
          { text: '12. Gem / ライブラリ', link: '/rails/#_12-gem-%E3%83%A9%E3%82%A4%E3%83%95%E3%82%99%E3%83%A9%E3%83%AA' },
          { text: '13. その他', link: '/rails/#_13-%E3%81%9D%E3%81%AE%E4%BB%96' },
        ]
      }
    ],

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
  manualSortFileNameByPriority: ['index.md'],
};

export default defineConfig(withSidebar(vitePressOptions, vitePressSidebarOptions));
