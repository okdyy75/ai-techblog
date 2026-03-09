# AIエージェントのメモリ設計入門：短期記憶・長期記憶・RAGをどう使い分けるか

## はじめに

近年、大規模言語モデル（LLM）を核としたAIエージェントの開発が急速に進んでいます。これらのエージェントが複雑なタスクをこなし、人間との自然な対話を維持するためには、「記憶」の仕組みが不可欠です。しかし、LLMの持つコンテキストウィンドウには限界があり、長期的な知識や過去の対話履歴を効率的に管理するには、短期記憶、長期記憶、そして検索拡張生成（RAG）といった異なる種類のメモリを適切に設計し、使い分ける必要があります。

本記事では、AIエージェントにおけるメモリの役割を整理し、それぞれのメモリタイプの特性と、Webエンジニアの視点から実践的な設計パターンおよびTypeScriptによる実装例を紹介します。

## AIエージェントの「記憶」とは？

AIエージェントが「記憶」を持つとは、単に情報を保持するだけでなく、その情報を必要な時に参照し、推論や行動に活かす能力を指します。これを実現するために、主に以下の3つのメモリタイプを組み合わせます。

### 短期記憶（Short-term Memory）

短期記憶は、エージェントが現在進行中のタスクや対話で利用する、一時的かつ揮発性の情報を指します。

-   **主な用途**: 直近の会話履歴、現在のタスクの状態、一時的に生成された思考プロセスなど。
-   **実装メカニズム**: LLMのプロンプト（コンテキストウィンドウ）に直接含められる情報。配列やキューで管理されることが多い。
-   **特性**: アクセスは高速だが、容量に制限がある（トークン数）。コンテキストウィンドウの限界を超える情報は切り捨てられるか、要約される。

### 長期記憶（Long-term Memory）

長期記憶は、エージェントが永続的に保持し、必要に応じて参照する知識や経験の集積です。

-   **主な用途**: 特定のドメイン知識、ユーザープロファイル、過去の成功事例や失敗事例、エージェント自身の学習履歴など。
-   **実装メカニズム**: ベクトルデータベース（Vector DB）、グラフデータベース、リレーショナルデータベースなど。LLMに直接入力するのではなく、検索によって関連情報が抽出される。
-   **特性**: 大容量の情報を保持でき、永続性がある。情報の検索には追加の処理が必要。

### 検索コンテキスト（Retrieval Context）

検索コンテキストは、長期記憶から特定のクエリに基づいて「検索（Retrieval）」され、LLMの短期記憶（プロンプト）に「拡張（Augmentation）」される具体的な情報の断片です。これはRAG（Retrieval Augmented Generation）プロセスの結果として得られるものです。

-   **主な用途**: ユーザーの質問やエージェントの現在の思考に基づき、長期記憶から関連性の高い情報を抽出し、LLMの推論を補強する。
-   **実装メカニズム**: 長期記憶（例：ベクトルDB）へのクエリ結果。
-   **特性**: LLMのコンテキストウィンドウに収まるように最適化され、関連性の高い情報に限定されるため、より正確で根拠に基づいた応答を生成するのに役立つ。

## メモリ設計のパターン

これらのメモリタイプを効果的に組み合わせるための設計パターンをいくつか紹介します。

### 1. 会話履歴の最適化

LLMのコンテキストウィンドウは限られているため、無尽蔵に会話履歴を追加することはできません。
-   **サマライズ**: 一定のターン数やトークン数を超えた古い会話履歴を要約し、要約文をプロンプトに含めることで、重要な情報を保持しつつトークン数を削減します。
-   **重要度フィルタリング**: 会話履歴の中から、今後の対話にとって特に重要と思われる部分だけを抽出し、それらを優先的に保持します。

### 2. 外部知識の動的な活用（RAG）

エージェントが持つべき知識全てをLLMの学習データに含めることは非現実的です。RAGの仕組みを用いて、外部の信頼できる情報源から必要な時に情報を取得します。
-   **事前準備**: ドキュメント、データベース、APIレスポンスなどをチャンクに分割し、ベクトル化してベクトルデータベースに格納します。
-   **検索トリガー**: ユーザーの質問、エージェントの思考ステップ、特定のキーワードなどに基づいて、ベクトルデータベースを検索します。
-   **コンテキスト統合**: 検索で得られた情報をLLMへのプロンプトに含め、質問応答やタスク実行を強化します。

### 3. エージェントの思考プロセスへの組み込み

メモリは単なる情報の保存場所ではなく、エージェントの推論プロセスの一部として機能させるべきです。
-   **Reflection（反省）**: 過去の行動や推論の結果を長期記憶に保存し、エージェントが「反省」することで、将来の意思決定に活かします。
-   **Planning（計画）**: 長期記憶から関連する計画や戦略のテンプレートを検索し、現在のタスクに適用します。
-   **Tool Use（ツール利用）**: 特定のタスク（例：Web検索、計算）を実行するために、長期記憶に保存されたツールの使い方やAPIスキーマを参照します。

## TypeScriptによる実装例

ここでは、短期記憶、長期記憶、検索コンテキストの概念を分けたシンプルなエージェントメモリのTypeScript実装例を示します。

```typescript
// longTermMemory.ts
// 長期記憶をシミュレートする（実際のアプリケーションではVector DBなどを用いる）
interface KnowledgeDocument {
  id: string;
  content: string;
  embedding?: number[]; // 実際はここでベクトル表現を持つ
}

class LongTermMemory {
  private documents: KnowledgeDocument[] = [];

  constructor(initialDocs: KnowledgeDocument[] = []) {
    this.documents = initialDocs;
  }

  // 実際はここでembeddingを使って類似度検索を行う
  // 今回は簡易的なキーワード検索でシミュレート
  async retrieve(query: string, limit: number = 2): Promise<KnowledgeDocument[]> {
    console.log(`[LongTermMemory] Retrieving for query: "${query}"`);
    const relevantDocs = this.documents
      .filter(doc => doc.content.includes(query) || query.includes(doc.content))
      .slice(0, limit);
    return relevantDocs;
  }

  async addDocument(doc: KnowledgeDocument): Promise<void> {
    this.documents.push(doc);
    console.log(`[LongTermMemory] Added document: ${doc.id}`);
  }
}

// agentMemory.ts
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

class AgentMemory {
  private shortTermMessages: ChatMessage[] = [];
  private maxShortTermTokens: number; // 例: 4000トークン相当

  private longTermMemory: LongTermMemory;

  constructor(longTermMemory: LongTermMemory, maxTokens: number = 4000) {
    this.longTermMemory = longTermMemory;
    this.maxShortTermTokens = maxTokens;
  }

  // 短期記憶にメッセージを追加し、コンテキストウィンドウを管理
  addMessage(message: ChatMessage): void {
    this.shortTermMessages.push(message);
    this.pruneShortTermMemory(); // 古いメッセージを削除または要約
  }

  // 短期記憶を整理（簡易的に古いものから削除）
  private pruneShortTermMemory(): void {
    // 実際にはトークン数を計算し、閾値を超えたら要約または古いメッセージを削除
    // ここでは簡易的に、現在のメッセージの文字数をトークン数と見立てて管理
    let estimatedTokenCount = this.shortTermMessages.reduce((sum, msg) => sum + msg.content.length, 0); 
    
    // 最大トークン数を超過した場合、最も古いメッセージから削除
    while (estimatedTokenCount > this.maxShortTermTokens && this.shortTermMessages.length > 1) {
      const removedMessage = this.shortTermMessages.shift(); // 最も古いメッセージを削除
      if (removedMessage) {
        estimatedTokenCount -= removedMessage.content.length;
      }
      // 実際にはもっと複雑なサマライズロジックが入る
    }
    console.log(`[AgentMemory] Short-term memory pruned. Current messages count: ${this.shortTermMessages.length}, Estimated tokens: ${estimatedTokenCount}`);
  }

  // LLMに渡すためのプロンプトコンテキストを生成
  // 短期記憶と長期記憶から取得した検索コンテキストを統合する
  async getContextForLLM(currentQuery: string): Promise<string> {
    let context = "";

    // 1. 長期記憶から関連情報を検索 (検索コンテキスト)
    const relevantDocs = await this.longTermMemory.retrieve(currentQuery, 2);
    if (relevantDocs.length > 0) {
      context += "参照情報:\n";
      relevantDocs.forEach(doc => {
        context += `- ${doc.content}\n`;
      });
      context += "\n";
    }

    // 2. 短期記憶 (会話履歴) を統合
    context += "これまでの会話:\n";
    this.shortTermMessages.forEach(msg => {
      context += `${msg.role}: ${msg.content}\n`;
    });

    // 3. 現在のクエリ
    context += `\nユーザーの質問: ${currentQuery}\n`;
    context += `アシスタントの返答:`; // LLMが続くように

    return context;
  }
}

// usage.ts
async function main() {
  // 長期記憶の初期化
  const knowledgeBase = new LongTermMemory([
    { id: 'doc1', content: 'Gemini CLIは、AIエージェントの開発とデプロイを支援するツールです。' },
    { id: 'doc2', content: 'Gemini CLIは、対話型UIとファイル操作機能を提供します。' },
    { id: 'doc3', content: 'AIエージェントのメモリ設計には、短期記憶と長期記憶の適切な使い分けが重要です。' },
    { id: 'doc4', content: 'ベクトルデータベースは長期記憶の実装によく使われます。' },
  ]);

  // エージェントメモリの初期化
  // 短期記憶の最大文字数を低く設定し、pruneShortTermMemoryの動作を確認
  const agent = new AgentMemory(knowledgeBase, 100); 

  console.log("--- 会話開始 ---");
  // 会話のシミュレーション
  agent.addMessage({ role: 'user', content: 'Gemini CLIについて教えてください。' });
  agent.addMessage({ role: 'assistant', content: 'Gemini CLIはAIエージェント開発を支援するツールです。具体的に何を知りたいですか？' });
  agent.addMessage({ role: 'user', content: 'その機能について詳しく教えて。' });

  // LLMに渡すコンテキストの生成
  const llmPrompt = await agent.getContextForLLM("Gemini CLIの機能は何ですか？");
  console.log("\n--- LLMに渡されるプロンプト ---");
  console.log(llmPrompt);

  console.log("\n--- 会話を続ける ---");
  // さらに会話を進める
  agent.addMessage({ role: 'assistant', content: '主な機能には、対話型UIとファイル操作機能があります。' });
  // 短期記憶が溢れるように長めのメッセージを追加
  agent.addMessage({ role: 'user', content: 'AIエージェントのメモリ設計の重要性について、特に短期記憶、長期記憶、RAGのそれぞれの役割を詳しく説明してほしい。それぞれの連携がどのようにエージェントの性能に寄与するのか、具体的な例を交えて教えてください。' });

  const llmPrompt2 = await agent.getContextForLLM("AIエージェントのメモリ設計の重要性について教えてください。");
  console.log("\n--- LLMに渡されるプロンプト (2回目) ---");
  console.log(llmPrompt2);
}

main();
```

## 運用上の注意点

高度なメモリ設計を実装する際には、以下の運用上の注意点を考慮する必要があります。

### コスト

-   **LLMのトークンコスト**: 短期記憶（コンテキストウィンドウ）に多くの情報を詰め込むと、LLMのAPI呼び出しごとに消費されるトークン数が増大し、コストが高騰します。効率的なサマライズやフィルタリングが重要です。
-   **ベクトルデータベースの運用コスト**: 長期記憶としてベクトルデータベースを使用する場合、データの保存量、クエリ頻度、インデックスの更新頻度に応じてコストが発生します。

### レイテンシ

-   **RAGのオーバーヘッド**: 長期記憶からの情報検索（RAG）は、LLMへのプロンプト生成の前に追加のステップを挟むため、応答までのレイテンシが増加します。高速な検索メカニズムと非同期処理の活用が求められます。
-   **複雑な思考プロセス**: エージェントが多段階の思考（例：計画、検索、実行、反省）を行う場合、各ステップでメモリへのアクセスやLLM呼び出しが発生し、全体のレイテンシが顕著になります。

### データの鮮度と更新

-   **長期記憶の鮮度**: 外部情報を長期記憶として利用する場合、その情報が常に最新であることを保証する必要があります。定期的なデータ更新、または変更検知に基づくリアルタイム更新の仕組みが必要です。
-   **一貫性**: 短期記憶と長期記憶、あるいは複数の長期記憶間で情報の一貫性を保つことが重要です。古い情報に基づいて誤った推論をしないよう注意が必要です。

### セキュリティとプライバシー

-   **機密情報の管理**: ユーザーの個人情報や企業の機密情報をメモリに格納する場合、適切な暗号化、アクセス制御、データ保持ポリシーの適用が不可欠です。
-   **RAGにおける情報漏洩リスク**: 検索コンテキストとして長期記憶から取り出した情報が、意図せずLLMの出力を通じて外部に漏洩するリスクを考慮し、プロンプトインジェクション対策や出力フィルタリングが必要です。

## まとめ

AIエージェントが真にインテリジェントな振る舞いをするためには、短期記憶、長期記憶、そして検索コンテキストという異なる種類のメモリを戦略的に設計し、連携させることが不可欠です。短期記憶で直近の対話フローを維持し、長期記憶で広範な知識を永続化し、RAGによって必要な情報を動的に引き出すことで、LLMの限界を克服し、より複雑で状況に応じた応答を生成できるようになります。

本記事で紹介した設計パターンとTypeScriptの実装例が、Webエンジニアの皆様がAIエージェントのメモリシステムを構築する一助となれば幸いです。

## 参考リンク

-   LangChain Documentation: [https://www.langchain.com/docs/](https://www.langchain.com/docs/)
-   LlamaIndex Documentation: [https://www.llamaindex.ai/](https://www.llamaindex.ai/)
-   RAG (Retrieval Augmented Generation) Explained: [https://www.ibm.com/topics/retrieval-augmented-generation](https://www.ibm.com/topics/retrieval-augmented-generation)
-   Vector Databases: [https://aws.amazon.com/what-is/vector-database/](https://aws.amazon.com/what-is/vector-database/)
