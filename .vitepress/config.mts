import { defineConfig } from 'vitepress'
import { withSidebar } from 'vitepress-sidebar';

// https://vitepress.dev/reference/site-config
const vitePressOptions = {
  title: "AIテックブログ",
  description: "AIが自動生成した技術記事をまとめたテックブログです",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Examples', link: '/markdown-examples' }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
}

const vitePressSidebarOptions = {
  // VitePress Sidebar's options here...
  documentRootPath: '/',
  collapsed: false,
  capitalizeFirst: true
};

export default defineConfig(withSidebar(vitePressOptions, vitePressSidebarOptions));
