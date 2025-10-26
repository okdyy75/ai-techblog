import { defineConfig, UserConfig } from 'vitepress'
import { withSidebar } from 'vitepress-sidebar'
import taskLists from 'markdown-it-task-lists'
import { VitePressSidebarOptions } from 'vitepress-sidebar/types'

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
    nav: [
        {
          text: "ホーム",
          link: "/"
        },
        {
          text: "AI",
          link: "/ai/"
        },
        {
          text: "Ruby",
          items: [
            {
              text: "1. Ruby基礎",
              link: "/ruby/#basics"
            },
            {
              text: "2. Ruby応用",
              link: "/ruby/#applications"
            },
            {
              text: "3. Rubyエコシステム",
              link: "/ruby/#ecosystem"
            },
            {
              text: "4. 発展トピック",
              link: "/ruby/#advanced"
            },
            {
              text: "5. 実践・その他",
              link: "/ruby/#practice"
            }
          ]
        },
        {
          text: "Rails",
          items: [
            {
              text: "1. Rails基礎",
              link: "/rails/#basics"
            },
            {
              text: "2. Active Record / データベース",
              link: "/rails/#active-record-database"
            },
            {
              text: "3. View / フロントエンド",
              link: "/rails/#view-frontend"
            },
            {
              text: "4. Controller / ルーティング",
              link: "/rails/#controller-routing"
            },
            {
              text: "5. テスト",
              link: "/rails/#testing"
            },
            {
              text: "6. パフォーマンス",
              link: "/rails/#performance"
            },
            {
              text: "7. アーキテクチャ / 設計",
              link: "/rails/#architecture-design"
            },
            {
              text: "8. デプロイ / DevOps",
              link: "/rails/#deployment-devops"
            },
            {
              text: "9. API",
              link: "/rails/#api"
            },
            {
              text: "10. セキュリティ",
              link: "/rails/#security"
            },
            {
              text: "11. バックグラウンドジョブ",
              link: "/rails/#background-jobs"
            },
            {
              text: "12. Gem / ライブラリ",
              link: "/rails/#gems-libraries"
            },
            {
              text: "13. その他",
              link: "/rails/#others"
            }
          ]
        },
        {
          text: "TypeScript",
          items: [
            {
              text: "1. TypeScript基礎",
              link: "/typescript/#basics"
            },
            {
              text: "2. TypeScript発展",
              link: "/typescript/#advanced"
            },
            {
              text: "3. TypeScriptエコシステム",
              link: "/typescript/#ecosystem"
            },
            {
              text: "4. フレームワークとの連携",
              link: "/typescript/#frameworks"
            },
            {
              text: "5. 開発ツールと効率化",
              link: "/typescript/#tools"
            },
            {
              text: "6. 実践・応用例",
              link: "/typescript/#practice"
            }
          ]
        },
        {
          text: "GraphQL",
          link: "/graphql/"
        },
        {
          text: "インフラ",
          link: "/infrastructure/"
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
