# 【第11回】スキーマ駆動開発を加速するGraphQL Code GeneratorとCI/CD連携

GraphQL連載、第11回へようこそ！これまでの連載では、GraphQLサーバーの構築からフロントエンドでの利用、そして運用監視までを解説してきました。今回は、開発体験と品質を劇的に向上させる「スキーマ駆動開発」と、その中核を担う「GraphQL Code Generator」に焦点を当て、さらにCI/CDパイプラインに組み込む実践的な手法を深掘りします。

## はじめに：なぜスキーマ駆動開発とコード生成が重要なのか？

現代のアプリケーション開発では、フロントエンドとバックエンドの連携が不可欠です。しかし、APIの仕様変更が頻繁に発生すると、手作業での型定義の修正や、それに伴うヒューマンエラーが大きな負担となります。

**スキーマ駆動開発（Schema-First Development）** は、まずAPIの仕様としてGraphQLスキーマを定義し、それを「信頼できる唯一の情報源（Single Source of Truth）」として開発を進めるアプローチです。これにより、以下のようなメリットが生まれます。

-   **並行開発の促進**: スキーマが確定すれば、フロントエンドはモックサーバーを使ってUI開発を、バックエンドはリゾルバーの実装を、それぞれ独立して進められます。
-   **型安全性の保証**: スキーマからフロントエンドとバックエンドの型定義を自動生成することで、APIの変更が即座にコードに反映され、コンパイル時に型の不整合を検出できます。
-   **ドキュメントの自動化**: スキーマ自体が常に最新のAPIドキュメントとして機能します。

このスキーマ駆動開発を強力にサポートするのが、**GraphQL Code Generator**です。

## 基礎概念：GraphQL Code Generatorとは？

[GraphQL Code Generator](https://www.graphql-code-generator.com/)（codegen）は、GraphQLスキーマとクライアントで定義したクエリ（Operations）を元に、様々な言語の型定義やSDKコードを自動生成するCLIツールです。

主な特徴：

-   **豊富なプラグイン**: TypeScript、React Apollo/Urql Hooks、Vue、C#、Javaなど、多様な環境に対応したプラグインが提供されています。
-   **高いカスタマイズ性**: 設定ファイル（`codegen.yml`）で、生成するコードの内容や出力先を柔軟に制御できます。
-   **開発効率の向上**: 手動での型定義作業をゼロにし、開発者はビジネスロジックの実装に集中できます。

## 実装手順：React (TypeScript) + Apollo Clientの例

ここでは、Node.js環境でApollo Clientを利用するReactプロジェクトを例に、GraphQL Code Generatorの導入から使い方までを解説します。

### 1. 必要なパッケージのインストール

まず、開発者依存としてcodegen関連のパッケージをインストールします。

```bash
npm install --save-dev \
  @graphql-codegen/cli \
  @graphql-codegen/client-preset \
  graphql
```
`@graphql-codegen/client-preset` は、モダンなGraphQLクライアント開発に必要な基本的なプラグイン（`typescript`, `typescript-operations`, `typescript-react-apollo`など）を良きに計らって設定してくれる便利なプリセットです。

### 2. 設定ファイルの作成 (`codegen.yml`)

プロジェクトのルートに `codegen.yml` を作成します。これがcodegenの振る舞いを定義する設定ファイルです。

```yaml
overwrite: true
schema: "http://localhost:4000/graphql" # あなたのGraphQLサーバーのエンドポイント or ローカルのスキーマファイルパス
documents: "src/graphql/**/*.graphql" # クエリ、ミューテーションなどを記述するファイルの場所
generates:
  src/generated/graphql.ts:
    preset: client
    plugins: []
    presetConfig:
      gqlTagName: "gql"
```

-   `schema`: スキーマの場所を指定します。稼働中のサーバーエンドポイントや、リポジトリ内の `.graphql` ファイルを指定できます。
-   `documents`: フロントエンドで使うGraphQLのクエリやミューテーションを記述したファイルの場所をglobパターンで指定します。
-   `generates`: どこに何を生成するかを定義します。
    -   `src/generated/graphql.ts`: 生成されるファイルのパスです。
    -   `preset: client`: インストールした `client-preset` を使用することを宣言します。

### 3. GraphQLクエリファイルの作成

`documents`で指定した場所に、実際に使用するGraphQLクエリを記述したファイルを作成します。

**`src/graphql/queries/getUsers.graphql`**
```graphql
query GetUsers {
  users {
    id
    name
    email
  }
}
```

### 4. コード生成スクリプトの追加と実行

`package.json` の `scripts` にcodegenを実行するコマンドを追加します。`--watch` オプションを付けたコマンドも用意しておくと、開発中にファイルが変更されるたびに自動でコードが再生成され便利です。

**`package.json`**
```json
{
  "scripts": {
    "codegen": "graphql-codegen --config codegen.yml",
    "codegen:watch": "graphql-codegen --config codegen.yml --watch"
  }
}
```

ターミナルで以下のコマンドを実行してみましょう。

```bash
npm run codegen
```

成功すると、`src/generated/graphql.ts` が生成されます。中には、スキーマの型定義、`GetUsers` クエリに対応する `GetUsersQuery` 型、そして `useGetUsersQuery` というカスタムフックなどが含まれているはずです。

### 5. 生成されたコードをコンポーネントで利用する

最後に、生成された型やフックをReactコンポーネントで実際に使ってみます。

**`src/components/UserList.tsx`**
```typescript
import React from 'react';
import { gql } from '../generated/graphql';
import { useGetUsersQuery } from '../generated/graphql'; // 自動生成されたフックをインポート

const GET_USERS = gql(\`
  query GetUsers {
    users {
      id
      name
      email
    }
  }
\`);

export const UserList: React.FC = () => {
  // 自動生成されたフックを使い、型安全にデータを取得
  const { loading, error, data } = useGetUsersQuery();

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <ul>
      {data?.users.map((user) => (
        // 'user'オブジェクトのプロパティは型補完が効く！
        <li key={user.id}>
          {user.name} ({user.email})
        </li>
      ))}
    </ul>
  );
};
```
`useGetUsersQuery` を使うだけで、ローディング状態、エラー、そして型付けされた `data` を簡単に取得できました。もしスキーマの `User` 型から `email` が削除されれば、このコードはコンパイルエラーとなり、実行前に問題を検知できます。

## CI/CDへの統合

スキーマ駆動開発の真価は、CI/CDパイプラインに組み込むことでさらに発揮されます。

### なぜCIでコード生成をチェックするのか？

-   **一貫性の担保**: スキーマやクエリの変更に対して、生成された型が常に最新であることを保証します。
-   **レビューの効率化**: Pull Requestのレビュアーは、「codegenをしましたか？」といった確認をする必要がなくなり、本質的なロジックのレビューに集中できます。
-   **ヒューマンエラーの防止**: 開発者がローカルでcodegenの実行を忘れても、CIがそれを検知してくれます。

### GitHub Actionsでのワークフロー例

ここでは、GitHub Actionsを使って、Pull Request時にcodegenの差分をチェックするワークフローを構築します。差分がある（＝codegenの実行を忘れている）場合は、ワークフローを失敗させます。

**`.github/workflows/codegen-check.yml`**
```yaml
name: Check GraphQL Codegen

on:
  pull_request:
    paths:
      - "src/graphql/**/*.graphql"
      - "schema.graphql" # プロジェクト内のスキーマファイルパス
      - "codegen.yml"

jobs:
  check-codegen-diff:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Run GraphQL Codegen
        run: npm run codegen

      - name: Check for diff
        run: |
          git add .
          if ! git diff --staged --quiet; then
            echo "::error::Generated code is out of date. Please run 'npm run codegen' and commit the changes."
            git diff --staged
            exit 1
          fi
```
このワークフローは、スキーマやクエリファイルが変更されたPull Requestに対して自動で実行されます。`npm run codegen` を実行した後、`git diff` で差分をチェックし、もし差分があればエラーメッセージと共のCIを失敗させます。これにより、常に生成済みコードが最新の状態に保たれることを強制できます。

## 運用のコツと実務チェックリスト

codegenをより効果的に運用するためのヒントと、導入時に確認すべきチェックリストです。

### 運用のコツ

-   **生成ファイルを `.gitignore` に含めるか？**:
    -   **含めない（推奨）**: Gitリポジトリでコードを管理することで、CIでの差分チェックが容易になり、開発者は `codegen` コマンドの実行だけで済みます。
    -   **含める**: リポジトリが少し汚れますが、CIで毎回コード生成ステップを実行する必要がなくなります。ビルド時間が重要な場合に検討の余地があります。
-   **破壊的変更の検知**: `graphql-inspector` のようなツールをCIに導入し、スキーマの破壊的変更（フィールドの削除など）を自動で検知する仕組みを構築すると、より安全な運用が可能です。
-   **バックエンドでの活用**: `typescript-resolvers` プラグインを使えば、リゾルバーの引数や返り値の型も生成でき、バックエンドも完全に型安全になります。

### 実務チェックリスト

-   [ ] `codegen.yml` はプロジェクトのルートに存在し、バージョン管理されているか？
-   [ ] `schema` のパスは、開発環境とCI環境の両方でアクセス可能か？
-   [ ] `documents` のglobパターンは、プロジェクト内の全てのクエリファイルを網羅しているか？
-   [ ] `package.json` に `codegen` と `codegen:watch` スクリプトが定義されているか？
-   [ ] CIで、スキーマやクエリの変更時にcodegenの差分チェックが実行されているか？
-   [ ] （推奨）スキーマの破壊的変更を検知する仕組みがCIに導入されているか？
-   [ ] 生成されたファイル（`src/generated/graphql.ts`など）は `.gitignore` に *含めず*、リポジトリで管理されているか？

## トラブルシューティング

-   **`Unable to find any GraphQL type definitions`**: `schema` のパスが間違っているか、サーバーが起動していない可能性があります。パスを確認し、ローカルサーバーを参照している場合は起動してください。
-   **型の衝突**: 複数のプラグインが同じ名前の型を生成しようとすると発生します。`config` オプションで `namingConvention` を変更するか、不要なプラグインを削除して調整します。
-   **CIでのみ失敗する**: ローカルとCI環境でのNode.jsやnpmのバージョン差異が原因であることが多いです。`package-lock.json` を使い `npm ci` で依存をインストールし、環境を揃えましょう。

## まとめ

今回は、GraphQL Code Generatorを活用したスキーマ駆動開発と、それをCI/CDに統合する実践的な手法について解説しました。このアプローチを取り入れることで、開発チームはAPIの仕様変更に迅速かつ安全に対応できるようになり、生産性を飛躍的に高めることができます。

手作業による型定義から解放され、より創造的な作業に集中できる環境は、開発者体験を向上させる上で非常に重要です。ぜひあなたのプロジェクトでも、スキーマ駆動開発とcodegenの導入を検討してみてください。

次回は、GraphQL Federationを用いたマイクロサービスアーキテクチャについて探求していく予定です。お楽しみに！
