import { defineConfig } from 'vitepress'
import { withSidebar } from 'vitepress-sidebar'
import taskLists from 'markdown-it-task-lists'

// https://vitepress.dev/reference/site-config
const vitePressOptions = {
  title: "AIテックブログ",
  description: "AIが自動生成した技術記事をまとめたテックブログです",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'ホーム', link: '/' },
      { 
        text: 'Ruby', 
        items: [
          { text: 'Ruby基礎', link: '/ruby/' },
          { text: 'Ruby インストール', link: '/ruby/01-ruby-install' },
          { text: 'Ruby 構文', link: '/ruby/02-ruby-syntax' },
          { text: 'Ruby OOP', link: '/ruby/03-ruby-oop' }
        ]
      },
      { 
        text: 'Rails', 
        items: [
          { text: 'Rails基礎', link: '/rails/' },
          { text: 'Rails基本', link: '/rails/01-rails-basics/' },
          { text: 'Active Record', link: '/rails/02-active-record-database/' },
          { text: 'View・フロントエンド', link: '/rails/03-view-frontend/' },
          { text: 'テスト', link: '/rails/05-testing/' }
        ]
      },
      { text: 'マークダウン例', link: '/markdown-examples' }
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

const vitePressSidebarOptions = {
  // VitePress Sidebar's options here...
  documentRootPath: '/',
  collapsed: false,
  capitalizeFirst: true,
  useTitleFromFileHeading: true,
  useFolderTitleFromIndexFile: true,
  useFolderLinkFromIndexFile: true,
  hyphenToSpace: true,
  underscoreToSpace: true,
  excludeFiles: ['README.md', 'api-examples.md', 'markdown-examples.md'],
  sortMenusByFrontmatterOrder: true,
  sortMenusOrderByDescending: false,
  frontmatterOrderDefaultValue: 0,
  manualSortFileNameByPriority: ['index.md'],
};

export default defineConfig(withSidebar(vitePressOptions, vitePressSidebarOptions));
