---
title: MCP入門：AIエージェントに外部ツールを安全に接続する方法
description: Model Context Protocol (MCP) の基本概念から、TypeScriptによる実装例、セキュリティ設計、運用ベストプラクティスまでを網羅的に解説します。
---

# MCP入門：AIエージェントに外部ツールを安全に接続する方法

AIエージェントの進化において、最大の壁は「モデルの外部にあるデータやツールへのアクセス」でした。従来の開発では、各AIモデルやインターフェースごとに独自のコネクタを実装する必要があり、エコシステムの分断が課題となっていました。

この課題を解決するためにAnthropic社が提唱したのが **Model Context Protocol (MCP)** です。本記事では、AIエージェント開発を始めたばかりのエンジニアに向けて、MCPの基礎から実装、そして実運用に欠かせないセキュリティ設計までを詳しく解説します。

---

## 1. 概要：なぜ今MCPが必要なのか

LLM（大規模言語モデル）は、学習データに基づいた高度な推論が可能ですが、リアルタイムの情報やプライベートなデータ、特定の業務システムの操作には直接アクセスできません。

これまで、これを解決するために「Tool Use (Function Calling)」や「RAG (Retrieval-Augmented Generation)」が使われてきましたが、以下の問題がありました。

- **実装の重複**: 同じGoogle Drive連携を、Claude向け、ChatGPT向け、独自エージェント向けに個別に作る必要がある。
- **セキュリティの不透明性**: 外部ツールをどのような権限で、どこまで許可するかの標準ルールがない。
- **スケーラビリティの欠如**: 連携ツールが増えるたびにエージェント側のプロンプトやロジックが肥大化する。

MCPは、これらのツール接続を**標準化**し、一度サーバーを実装すれば、あらゆる「MCPホスト（Claude Desktop, IDE, 独自アプリなど）」から安全に利用できるようにするプロトコルです。

---

## 2. MCPとは

**Model Context Protocol (MCP)** は、AIアプリケーションと、データソースやツールを提供するサーバー間の通信を標準化するオープンプロトコルです。

### 主な特徴
- **オープン標準**: 特定のベンダーに依存せず、コミュニティ全体で利用・拡張が可能。
- **関心の分離**: AIモデルは「何をするか」に集中し、MCPサーバーは「どのように実行するか」を担う。
- **双方向性**: サーバーからリソース（データ）を読み取るだけでなく、ツール（関数実行）を通じてアクションを起こすことも可能。

MCPを使用することで、開発者は「ローカルファイルの内容を読み取るサーバー」や「GitHubのIssueを管理するサーバー」を一度書くだけで、複数のAIインターフェースから即座に利用できるようになります。

---

## 3. アーキテクチャ

MCPは主に3つのコンポーネントで構成されます。

### 1. MCPホスト (Host)
AIエージェントが動作するクライアントアプリケーションです。
- **例**: Claude Desktop, Cursor, VS Code Extension, 自作のAIチャットアプリ。
- **役割**: ユーザーの意図を解釈し、必要に応じてMCPクライアントを通じてサーバーを呼び出す。

### 2. MCPクライアント (Client)
ホスト内に統合され、サーバーとの通信プロトコルを処理する層です。
- **役割**: サーバーの機能をリストアップし、ツールの実行要求を送信する。

### 3. MCPサーバー (Server)
特定のデータや機能を提供する軽量なプログラムです。
- **役割**: ローカルファイル、データベース、APIなどの「リソース」や「ツール」を定義し、クライアントからの要求に応じてデータを返す。

### 通信プロトコル
通常、**JSON-RPC** ベースで通信が行われます。
- **Stdio**: ローカル実行時（標準入出力を介した通信）。
- **SSE (Server-Sent Events)**: リモートサーバー実行時（HTTP/HTTPS経由）。

---

## 4. 実装例：TypeScriptによる最小構成のMCPサーバー

ここでは、Node.jsとTypeScriptを使用して、シンプルな「計算ツール」を提供するMCPサーバーを構築します。

### プロジェクトのセットアップ

```bash
mkdir mcp-server-demo
cd mcp-server-demo
npm init -y
npm install @modelcontextprotocol/sdk
npm install -D typescript @types/node
npx tsc --init
```

### サーバーコードの実装 (`index.ts`)

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * MCPサーバーの初期化
 */
const server = new Server(
  {
    name: "demo-calculator",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {}, // ツール機能を提供することを宣言
    },
  }
);

/**
 * 利用可能なツールの一覧を定義
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "calculate_area",
        description: "長方形の面積を計算します",
        inputSchema: {
          type: "object",
          properties: {
            width: { type: "number", description: "幅" },
            height: { type: "number", description: "高さ" },
          },
          required: ["width", "height"],
        },
      },
    ],
  };
});

/**
 * ツールの実行ロジック
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "calculate_area") {
    const { width, height } = request.params.arguments as {
      width: number;
      height: number;
    };

    return {
      content: [
        {
          type: "text",
          text: `面積は ${width * height} です。`,
        },
      ],
    };
  }

  throw new Error("Tool not found");
});

/**
 * Stdio輸送層でサーバーを起動
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Calculator MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
```

### 実行と接続
このサーバーをビルドして実行可能な状態にし、Claude Desktop等の `config.json` にパスを指定することで、AIエージェントがこの計算ツールを認識・利用できるようになります。

---

## 5. セキュリティ設計：安全に接続するために

外部ツールを接続することは、AIに強力な権限を与えることを意味します。以下の3つの観点でセキュリティを設計する必要があります。

### 1. 最小権限の原則 (Principle of Least Privilege)
MCPサーバーに与えるOSやAPIの権限は、必要最小限に留めてください。
- **ファイルアクセス**: サーバーがアクセスできるディレクトリを特定のフォルダのみに制限する（サンドボックス化）。
- **ネットワーク**: 接続先のドメインをホワイトリスト化する。

### 2. 人間による確認 (Human-in-the-loop)
破壊的な操作（ファイルの削除、メールの送信、高額な決済など）を伴うツールを実行する場合、必ずユーザーの承認を挟むフローをホスト側で実装します。

### 3. 入力のバリデーション
AIが生成するパラメータは必ずしも正しいとは限りません。
- **型チェック**: JSON Schemaを用いて厳密にバリデーションを行う。
- **サニタイズ**: シェルコマンドの実行やSQLの発行を伴う場合は、インジェクション攻撃を防止するための対策を徹底する。

---

## 6. 運用ベストプラクティス

MCPサーバーを継続的に運用するためのポイントを紹介します。

- **詳細なエラーメッセージの返却**: AIモデルが「なぜ失敗したか」を理解できるように、エラー内容を具体的に返します。これにより、モデル自身が自己修正（リトライ）を行えるようになります。
- **ステートレスな設計**: 可能な限りサーバー側で状態を持たず、必要な情報は引数として受け取るようにします。
- **ログと監査**: 誰が、いつ、どのツールを、どんな引数で実行したかを記録し、後から追跡できるようにします。
- **バージョニング**: ツールのスキーマを変更する場合は、破壊的変更を避け、新しい名前のツールを追加するか、バージョン番号を管理します。

---

## 7. まとめ

MCP（Model Context Protocol）は、AIエージェントを「ただのチャットボット」から「実務をこなす自律型アシスタント」へと進化させるための強力な武器です。

- **標準化**により開発コストを下げ、
- **関心の分離**により再利用性を高め、
- **適切な設計**により安全性を確保する。

まずはローカル環境で小さなMCPサーバーを作成し、普段使っているツールをAIと連携させることから始めてみてください。AIがあなたのデータやツールを「理解」し、操作してくれる快適さに驚くはずです。

---

## 参考リンク

- [MCP Official Documentation (Anthropic)](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK (GitHub)](https://github.com/modelcontextprotocol/typescript-sdk)
- [Claude Desktop - Configuring MCP Servers](https://modelcontextprotocol.io/quickstart/user)
- [MCP Server Directory (Community)](https://github.com/modelcontextprotocol/servers)
