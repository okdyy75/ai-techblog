---
title: Next.jsのテスト戦略：Unit/E2E（Vitest + Playwright）を最小構成で始める
---

# Next.jsのテスト戦略：Unit/E2E（Vitist + Playwright）を最小構成で始める

## はじめに

Next.jsアプリケーションの品質を担保するためには、適切なテスト戦略が不可欠です。しかし、「何を」「どのように」テストすべきか迷う開発者も多いのではないでしょうか。

本記事では、現代のNext.jsプロジェクトで最も推奨される構成である **Vitest**（Unitテスト）と **Playwright**（E2Eテスト）を組み合わせたテスト戦略を解説します。最小構成から始めて、段階的に拡張していく方法を紹介します。

## テストの種類と役割

Next.jsアプリケーションでは、主に3つのテストレベルを意識します。

| テスト種別 | 対象 | 目的 | ツール例 |
|---------|------|------|---------|
| **Unitテスト** | 関数、コンポーネント | ロジックの正確性 | Vitest + RTL |
| **Integrationテスト** | 複数コンポーネント連携 | データフローの検証 | Vitest + RTL |
| **E2Eテスト** | ユーザー操作全体 | 実際の動作検証 | Playwright |

### テストピラミッドの考え方

テストはピラミッド型に配置するのが基本です：

- **Unitテスト**（多め）：個別の関数・コンポーネント
- **Integrationテスト**（中程度）：API連携・状態管理
- **E2Eテスト**（少なめ）：クリティカルパスのみ

このバランスを保つことで、メンテナンス性と信頼性を両立できます。

## Vitestセットアップ手順

### インストール

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

### 設定ファイル

`vitest.config.ts` を作成します：

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### セットアップファイル

`vitest.setup.ts` を作成：

```typescript
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// 各テスト後にクリーンアップ
afterEach(() => {
  cleanup()
})
```

### package.jsonにスクリプト追加

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## React Testing Libraryでのコンポーネントテスト

### シンプルなコンポーネントのテスト

```tsx
// components/Button.tsx
interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}

export function Button({ children, onClick, disabled }: ButtonProps) {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className="px-4 py-2 bg-blue-500 text-white rounded"
    >
      {children}
    </button>
  )
}
```

```tsx
// components/Button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>)
    expect(screen.getByText('Click me')).toBeDisabled()
  })
})
```

### Server Componentのテスト

App RouterのServer Componentをテストする際は、モックを活用します：

```tsx
// app/page.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// fetchをモック
vi.stubGlobal('fetch', vi.fn())

describe('HomePage', () => {
  it('renders fetched data', async () => {
    const mockData = { title: 'Test Post' }
    ;(fetch as any).mockResolvedValueOnce({
      json: async () => mockData,
    })

    const { default: HomePage } = await import('./page')
    render(await HomePage())
    
    expect(screen.getByText('Test Post')).toBeInTheDocument()
  })
})
```

## Playwrightセットアップ手順

### インストール

```bash
npm init playwright@latest
# または
npm install -D @playwright/test
npx playwright install
```

### 設定ファイル

`playwright.config.ts`：

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

## E2Eテスト実践（App Router対応）

### 基本的なページ遷移テスト

```typescript
// e2e/navigation.spec.ts
import { test, expect } from '@playwright/test'

test('homepage loads and navigation works', async ({ page }) => {
  // ホームページにアクセス
  await page.goto('/')
  
  // タイトルを確認
  await expect(page).toHaveTitle(/My App/)
  
  // ナビゲーションリンクをクリック
  await page.click('text=About')
  
  // URL変更を確認
  await expect(page).toHaveURL('/about')
  
  // コンテンツ表示を確認
  await expect(page.locator('h1')).toContainText('About')
})
```

### フォーム送信テスト

```typescript
// e2e/form.spec.ts
import { test, expect } from '@playwright/test'

test('contact form submission', async ({ page }) => {
  await page.goto('/contact')
  
  // フォーム入力
  await page.fill('[name="name"]', 'Test User')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="message"]', 'This is a test message')
  
  // 送信
  await page.click('button[type="submit"]')
  
  // 成功メッセージを確認
  await expect(page.locator('.success-message')).toBeVisible()
  await expect(page.locator('.success-message')).toContainText('送信しました')
})
```

### Server Actionsのテスト

```typescript
// e2e/server-actions.spec.ts
import { test, expect } from '@playwright/test'

test('server action updates data', async ({ page }) => {
  await page.goto('/todos')
  
  // 新規Todo追加
  await page.fill('[name="title"]', 'New Todo')
  await page.click('button:has-text("追加")')
  
  // リストに追加されたことを確認（Server Action後の再レンダリング）
  await expect(page.locator('text=New Todo')).toBeVisible()
  
  // 削除
  await page.click('[data-testid="delete-todo"]:first-child')
  
  // 削除確認（悲観的UI更新）
  await expect(page.locator('text=New Todo')).not.toBeVisible()
})
```

### 認証フローのテスト

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test('login flow', async ({ page }) => {
  await page.goto('/login')
  
  // ログイン実行
  await page.fill('[name="email"]', 'user@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('button:has-text("ログイン")')
  
  // ダッシュボードへリダイレクト
  await page.waitForURL('/dashboard')
  await expect(page.locator('h1')).toContainText('ダッシュボード')
  
  // ログイン状態の保持確認
  await page.goto('/')
  await expect(page.locator('text=ログアウト')).toBeVisible()
})
```

## CI/CD連携（GitHub Actions）

### ワークフロー設定

`.github/workflows/test.yml`：

```yaml
name: Test

on: [push, pull_request]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  e2e-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npx playwright test
      
      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### 並列実行の最適化

大規模プロジェクトでは、テストをシャーディングして並列実行できます：

```yaml
strategy:
  fail-fast: false
  matrix:
    shardIndex: [1, 2, 3, 4]
    shardTotal: [4]

- name: Run E2E tests
  run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
```

## ベストプラクティス

### テストの優先順位

1. **ビジネスクリティカルなパス**から始める
   - ユーザー登録・ログイン
   - 決済フロー
   - 主要機能のCRUD操作

2. **複雑なロジック**を持つユーティリティ関数
   - バリデーション
   - データ変換
   - 計算処理

3. **再利用コンポーネント**
   - UIライブラリのコンポーネント
   - 共通レイアウト

### 避けるべきアンチパターン

```typescript
// ❌ Bad: 実装詳細に依存
test('button has correct class', () => {
  render(<Button />)
  expect(screen.getByRole('button')).toHaveClass('bg-blue-500')
})

// ✅ Good: ユーザー視点でテスト
test('button is visible and clickable', () => {
  render(<Button />)
  expect(screen.getByRole('button')).toBeVisible()
})
```

### テストデータ管理

```typescript
// test-utils/factories.ts
export function createUser(overrides = {}) {
  return {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    ...overrides,
  }
}

// テスト内で使用
test('displays user name', () => {
  const user = createUser({ name: 'John' })
  render(<UserCard user={user} />)
  expect(screen.getByText('John')).toBeInTheDocument()
})
```

## まとめ

Next.jsアプリケーションのテスト戦略を、最小構成から構築する方法を解説しました。

### ポイントまとめ

| 項目 | 推奨事項 |
|------|---------|
| **Unitテスト** | Vitest + RTLでロジック・コンポーネントをカバー |
| **E2Eテスト** | Playwrightでクリティカルパスのみ効率的に |
| **構成管理** | 設定ファイルを分割し、目的別に管理 |
| **CI/CD** | GitHub Actionsで自動化、カバレッジレポートを活用 |

### 次のステップ

1. **既存コードの重要部分**からテストを追加
2. **テストカバレッジ**を計測し、目標を設定（目安：70-80%）
3. **ビジュアルリグレッションテスト**（Storybook + Chromatic）の導入検討
4. **パフォーマンステスト**（Lighthouse CI）との統合

テストは「書き終わり」ではなく「育てるもの」です。小さく始めて、継続的に改善していきましょう。

---

**関連記事**

- [Next.js App Router完全入門：Pages Routerとの違いと移行ポイント](./01-nextjs-app-router-guide.md)
- [Vercelデプロイ最適化：Next.js本番運用でハマるポイント総まとめ](./05-vercel-deployment-optimization-nextjs.md)
