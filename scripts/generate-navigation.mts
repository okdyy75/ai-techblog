#!/usr/bin/env node
/**
 * ナビゲーション自動生成スクリプト
 *
 * 各カテゴリのindex.mdファイルからセクション情報を抽出し、
 * .vitepress/config.mtsのnavセクションを自動生成します。
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface NavItem {
  text: string
  link?: string
  items?: NavItem[]
}

interface CategoryConfig {
  path: string
  hasDropdown: boolean
}

// カテゴリ設定
const categories: Record<string, CategoryConfig> = {
  'ai': { path: 'docs/ai/index.md', hasDropdown: false },
  'ruby': { path: 'docs/ruby/index.md', hasDropdown: true },
  'rails': { path: 'docs/rails/index.md', hasDropdown: true },
  'typescript': { path: 'docs/typescript/index.md', hasDropdown: true },
  'graphql': { path: 'docs/graphql/index.md', hasDropdown: false },
  'infrastructure': { path: 'docs/infrastructure/index.md', hasDropdown: false }
}

/**
 * index.mdファイルからセクション情報を抽出
 */
function extractSections(filePath: string): Array<{ text: string, anchor: string }> {
  const fullPath = path.join(__dirname, '..', filePath)

  if (!fs.existsSync(fullPath)) {
    console.warn(`Warning: ${filePath} not found`)
    return []
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  const sections: Array<{ text: string, anchor: string }> = []

  // セクションヘッダーのパターン: ## 1. セクション名 {#anchor}
  // または ### 1. セクション名 {#anchor}
  const sectionRegex = /^#{2,3}\s+(.+?)\s+\{#([^}]+)\}/gm

  let match
  while ((match = sectionRegex.exec(content)) !== null) {
    const text = match[1].trim()
    const anchor = match[2].trim()
    sections.push({ text, anchor })
  }

  return sections
}

/**
 * カテゴリ名を日本語表記に変換
 */
function getCategoryDisplayName(category: string): string {
  const displayNames: Record<string, string> = {
    'ai': 'AI',
    'ruby': 'Ruby',
    'rails': 'Rails',
    'typescript': 'TypeScript',
    'graphql': 'GraphQL',
    'infrastructure': 'インフラ'
  }
  return displayNames[category] || category
}

/**
 * ナビゲーション設定を生成
 */
function generateNavigation(): NavItem[] {
  const nav: NavItem[] = [
    { text: 'ホーム', link: '/' }
  ]

  for (const [category, config] of Object.entries(categories)) {
    const displayName = getCategoryDisplayName(category)

    if (config.hasDropdown) {
      const sections = extractSections(config.path)

      if (sections.length > 0) {
        nav.push({
          text: displayName,
          items: sections.map(section => ({
            text: section.text,
            link: `/${category}/#${section.anchor}`
          }))
        })
      } else {
        // セクションが見つからない場合は通常リンクとして追加
        nav.push({ text: displayName, link: `/${category}/` })
      }
    } else {
      // ドロップダウンなしの場合は通常リンク
      nav.push({ text: displayName, link: `/${category}/` })
    }
  }

  return nav
}

/**
 * config.mtsファイルを更新
 */
function updateConfigFile(nav: NavItem[]): void {
  const configPath = path.join(__dirname, '..', 'docs/.vitepress/config.mts')
  let content = fs.readFileSync(configPath, 'utf-8')

  // nav配列を文字列に変換（インデントを保持）
  const navString = JSON.stringify(nav, null, 2)
    .replace(/"(\w+)":/g, '$1:') // キーのクォートを削除
    .split('\n')
    .map((line, index) => {
      if (index === 0) return line
      return '      ' + line // 6スペースでインデント
    })
    .join('\n')

  // nav: [...] の部分を置換（カンマも含む）
  const navRegex = /nav:\s*\[[\s\S]*?\],/

  if (navRegex.test(content)) {
    content = content.replace(navRegex, `nav: ${navString},`)
  } else {
    console.error('Error: Could not find nav section in config.mts')
    process.exit(1)
  }

  fs.writeFileSync(configPath, content, 'utf-8')
  console.log('✅ Navigation updated successfully in config.mts')
}

/**
 * メイン処理
 */
function main(): void {
  console.log('🚀 Generating navigation from index.md files...\n')

  const nav = generateNavigation()

  console.log('📋 Generated navigation structure:')
  console.log(JSON.stringify(nav, null, 2))
  console.log()

  updateConfigFile(nav)

  console.log('\n✨ Navigation generation completed!')
}

main()
