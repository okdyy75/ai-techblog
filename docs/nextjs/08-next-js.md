Warning: 256-color support not detected. Using a terminal with at least 256-color support is recommended for a better visual experience.
YOLO mode is enabled. All tool calls will be automatically approved.
YOLO mode is enabled. All tool calls will be automatically approved.
Ripgrep is not available. Falling back to GrepTool.
---
title: 2026年のNext.jsテスト戦略：App RouterとRSC時代の堅牢な開発ガイド
---

# 2026年のNext.jsテスト戦略：App RouterとRSC時代の堅牢な開発ガイド

Next.jsがApp Routerを標準としてから数年が経過し、React Server Components (RSC) や Server Actions を活用したアーキテクチャが一般的になりました。しかし、これらの新しいプリミティブが登場したことで、従来の「フロントエンドテスト」の常識は大きく変わり、多くの開発者が「何を、どこまで、どうやってテストすべきか」という課題に直面しています。

2026年現在、求められるのは単なるカバレッジの追求ではなく、**開発効率を損なわずにリファクタリング耐性を最大化する戦略**です。本記事では、中級エンジニアを対象に、最新のNext.js環境における実践的なテスト戦略を解説します。

---

## 1. 2026年のテスト思想：テスティング・トロフィーの再定義

かつては「テストピラミッド」が推奨されてきましたが、現在のNext.js開発においては、Kent C. Dodds氏が提唱した**テスティング・トロフィー（Testing Trophy）**をApp Router向けに最適化したモデルが最も効果的です。

### テスティング・トロフィー構成図

```text
     / \
    /   \       <-- [E2E] (Playwright) 
   /     \          重要なユーザーフローを検証（最小限）
  /-------\
 /         \    <-- [Integration] (Vitest + RTL)
/           \       コンポーネント間の連携、Server Actions、
\           /       状態遷移の検証（最も重要）
 \---------/
  \       /     <-- [Unit] (Vitest)
   \     /          ユーティリティ関数、純粋なロジック
    \---/
      |         <-- [Static] (ESLint, TypeScript)
      |             構文エラー、型定義の矛盾（土台）
```

2026年の戦略では、**統合テスト（Integration Test）**に最も重きを置きます。RSCとクライアントコンポーネントが混在するApp Routerでは、単体のユニットテストよりも、実際のデータフローをシミュレートする統合テストの方が、バグの発見と設計の検証において投資対効果（ROI）が高いからです。

---

## 2. 技術スタックの選定

2026年現在のスタンダードな構成は以下の通りです。

| レイヤー | ツール | 選定理由 |
| :--- | :--- | :--- |
| **テストランナー** | Vitest | Jestよりも高速で、Viteエコシステム（Next.jsの内部最適化）との親和性が高い。 |
| **UI検証** | React Testing Library | 実装詳細ではなくユーザーの振る舞いをテストできる。 |
| **APIモック** | MSW (Mock Service Worker) v3 | ネットワーク層をインターセプトし、サーバー・クライアント両方のリクエストを統一的に扱える。 |
| **E2Eテスト** | Playwright | 高速、高機能、かつCI環境での安定性が抜群。 |
| **型チェック** | TypeScript | コンパイル時の静的検証。 |

---

## 3. サーバーコンポーネント（RSC）のテスト手法

RSCは「サーバー側で実行される」という性質上、従来のクライアントサイドのテスト手法だけでは不十分です。

### 3.1 サーバーコンポーネントの単体・統合テスト

RSCをテストする際、最大の難関は `async` コンポーネントの扱いです。2026年のVitest環境では、非同期コンポーネントを直接レンダリングすることが可能になっています。

```typescript
// src/components/UserList.tsx (RSC)
import { fetchUsers } from '@/lib/api';

export default async function UserList() {
  const users = await fetchUsers();
  return (
    <ul>
      {users.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
}

// src/components/UserList.test.tsx
import { render, screen } from '@testing-library/react';
import { expect, it, describe, vi } from 'vitest';
import UserList from './UserList';

describe('UserList (RSC)', () => {
  it('ユーザー一覧が正しくレンダリングされること', async () => {
    // RSCは非同期関数として実行して解決する
    const ResolvedUserList = await UserList();
    render(ResolvedUserList);

    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
```

**ポイント:** 
- RSCを直接 `render(<UserList />)` に渡すとエラーになる場合があるため、関数として実行し、返却されたReact Nodeを `render` に渡す手法が推奨されます。
- `fetch` などの内部的なデータ取得は、後述するMSWでモックします。

---

## 4. Server Actionsとフォームの検証

Server Actionsは2026年のNext.jsにおける中心的な機能です。これをテストするには、アクション単体のテストと、UIを介した統合テストの両方を組み合わせます。

### 4.1 アクション単体のテスト

Server Actionsは単なる非同期関数であるため、純粋なJavaScript/TypeScriptとしてテストできます。

```typescript
// src/app/actions/createUser.test.ts
import { createUser } from './createUser';
import { db } from '@/lib/db';
import { vi, expect, it } from 'vitest';

vi.mock('@/lib/db');

it('正しいデータでユーザーを作成できること', async () => {
  const formData = new FormData();
  formData.append('name', 'John Doe');
  formData.append('email', 'john@example.com');

  const result = await createUser(formData);

  expect(db.user.create).toHaveBeenCalledWith({
    data: { name: 'John Doe', email: 'john@example.com' }
  });
  expect(result.success).toBe(true);
});
```

### 4.2 UIとの統合テスト

`useActionState`（旧 `useFormState`）を使用しているクライアントコンポーネントのテスト例です。

```typescript
// src/components/UserForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserForm from './UserForm';
import { createUser } from '@/app/actions/createUser';
import { vi } from 'vitest';

vi.mock('@/app/actions/createUser', () => ({
  createUser: vi.fn().mockResolvedValue({ success: true })
}));

it('フォーム送信時にServer Actionが呼ばれること', async () => {
  const user = userEvent.setup();
  render(<UserForm />);

  await user.type(screen.getByLabelText(/名前/i), 'John Doe');
  await user.click(screen.getByRole('button', { name: /登録/i }));

  expect(createUser).toHaveBeenCalled();
  expect(await screen.findByText(/登録が完了しました/i)).toBeInTheDocument();
});
```

---

## 5. MSWによるAPIモッキング戦略

2026年のNext.js開発において、MSWは必須のツールです。`next fetch` のキャッシュ機能や、サーバー・クライアントを跨ぐ通信を透過的にテストするために、MSWによるネットワークレベルのモックが威力を発揮します。

### setupTests.ts の設定

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

MSWを使用することで、コード内で `vi.mock` を多用する必要がなくなり、実際のAPIレスポンスに近い状況でコンポーネントを検証できるため、リファクタリング耐性が向上します。

---

## 6. PlaywrightによるE2Eテスト：重要なパスの厳選

E2Eテストはコストが高いため、すべての機能をテストするのではなく、**「ビジネス上のクリティカルパス」**に絞ります。

- ログイン/認証フロー
- 決済フロー
- 複雑な多ステップフォーム
- SEOに直結するメタデータと初期レンダリング

### 2026年スタイルのE2Eテスト例

```typescript
import { test, expect } from '@playwright/test';

test.describe('チェックアウトフロー', () => {
  test('商品をカートに追加して決済を完了できる', async ({ page }) => {
    await page.goto('/products/1');
    
    // ユーザー操作のシミュレーション
    await page.getByRole('button', { name: 'カートに入れる' }).click();
    await page.goto('/cart');
    
    await expect(page.getByText('商品合計')).toBeVisible();
    
    await page.getByRole('button', { name: '購入手続きへ' }).click();
    
    // フォーム入力
    await page.fill('input[name="address"]', '東京都渋谷区...');
    await page.click('text=確定する');
    
    // 完了画面の検証
    await expect(page).toHaveURL(/\/checkout\/success/);
    await expect(page.locator('h1')).toHaveText('ご注文ありがとうございます');
  });
});
```

---

## 7. テスト自動化とCI/CD

テストは実行されなければ意味がありません。GitHub ActionsなどのCIツールで、プッシュごとに以下のパイプラインを実行するように構築します。

1. **Lint & Type Check:** 最速のフィードバック。
2. **Unit & Integration Test (Vitest):** 数分以内で完了させる。
3. **E2E Test (Playwright):** 重要なパスのみ実行。VercelのPreview Deploymentに対して実行するのが理想的。

### 効率化のヒント：ShardingとCaching
2026年のCI環境では、テストの並列実行（Sharding）が一般的です。PlaywrightやVitestのテストを複数のコンテナに分割して実行することで、大規模なプロジェクトでもテスト時間を5分以内に抑えることができます。

---

## 8. まとめ：賢牢なNext.jsアプリのために

Next.js App Router時代のテスト戦略において重要なポイントを振り返ります。

1. **統合テストを核にする:** 単体の機能ではなく、RSCからServer Actions、UIまでの「流れ」をVitest + RTL + MSWでテストする。
2. **RSCの特性を理解する:** `async` コンポーネントの解決方法や、サーバー側でのみ実行されるコードのモック方法を習得する。
3. **ユーザー目線で検証する:** `data-testid` に頼るのではなく、アクセシビリティクエリ（`getByRole` など）を使用して、実際のユーザーの振る舞いに即したテストを書く。
4. **E2Eは最小限に:** メンテナンスコストを考慮し、本当に壊れてはいけない部分だけをPlaywrightで守る。

テストは「書くこと」が目的ではありません。「安心してコードを変更できる」状態を作ることが目的です。本記事で紹介した戦略をベースに、プロジェクトの規模や要件に合わせて最適なバランスを見つけてください。

---
*執筆：2026年7月13日*
*Next.js 16.x (想定) / App Router 環境対応*
