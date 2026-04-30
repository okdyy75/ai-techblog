# AIエージェントの設計パターンと実装戦略：ReAct、Plan-and-Solve、Reflectionパターンの比較と選択基準

「ChatGPTやClaudeで簡単なタスク自動化はできたけど、複雑な業務ワークフローに組み込むと途端に破綻する...」
「AIにツールを使わせたいけど、どう設計すれば安定して動くのか分からない」

このような悩みを持つエンジニアは少なくありません。単発の質疑応答とは異なり、**AIエージェント**（自律的にツールを使い、多段階の推論と実行を行うシステム）を設計する際には、適切なアーキテクチャパターンの選択が成功を左右します。

本記事では、実務で広く使われる3つの設計パターン—**ReAct**、**Plan-and-Solve**、**Reflection**—を解説し、それぞれの適用シーンと実装例を紹介します。

---

## AIエージェントとは何か

AIエージェントとは、大規模言語モデル（LLM）をコアとし、以下の能力を持つシステムです：

- **推論（Reasoning）**：与えられた課題を段階的に分析する
- **行動（Acting）**：外部ツール（API、データベース、検索エンジンなど）を呼び出す
- **観察（Observing）**：ツールからの結果を受け取り、次の判断材料とする

単純な「質問→回答」ではなく、「思考→実行→結果確認→再思考」というサイクルを繰り返すことで、複雑なタスクを自律的に処理できます。

---

## 主要な設計パターン

### ReAct（Reasoning + Acting）

ReActは、推論と行動を**交互に繰り返す**パターンです。人間が「考えて→行動して→結果を見て→また考える」というプロセスを、LLMが模倣します。

**動作フロー**：
1. Thought（思考）：現在の状況を分析し、次に何をすべきか決定
2. Action（行動）：ツールを呼び出し（検索、APIコール、DBクエリなど）
3. Observation（観察）：ツールからの結果を受け取る
4. 1〜3を繰り返し、最終的な回答に至る

**メリット**：
- シンプルで実装しやすい
- ツールの失敗に対して即座に対応できる
- デバッグが容易（思考過程が可視化される）

**デメリット**：
- 長いタスクでは「思考→行動」のループが多くなり、トークン消費が増加
- 事前の計画がないため、非効率な探索が発生しやすい

### Plan-and-Solve（計画と実行の分離）

Plan-and-Solveは、まず**全体計画を立ててから**、それを順番に実行するパターンです。

**動作フロー**：
1. Planning（計画）：タスクを分解し、実行ステップのリストを作成
2. Execution（実行）：各ステップを順次処理
3. 必要に応じて計画の見直し

**メリット**：
- 複雑なタスクでも全体像を把握しやすい
- ステップごとの進捗管理が可能
- 不必要なツール呼び出しを減らせる

**デメリット**：
- 計画フェーズに時間がかかる
- 予期しない障害に対する柔軟性がReActより低い
- 計画の見直しロジックが必要

### Reflection（自己修正）

Reflectionは、実行結果に対して**自己評価を行い、改善を繰り返す**パターンです。

**動作フロー**：
1. 初期の回答または行動を生成
2. Reflection（反省）：生成物の品質を自己評価
3. 不足があれば修正案を立てて再実行
4. 品質が十分になるまで2〜3を繰り返す

**メリット**：
- 出力品質の向上が期待できる
- 特に創造的なタスク（文章生成、コード作成）に有効
- 自己改善ループにより長期的な精度向上が可能

**デメリット**：
- 複数回のLLM呼び出しが必要でコストが増加
- 「いつ終了するか」の判断が難しい
- 過度の改善ループに陥るリスク

---

## パターン別の適用シーンと選び方

| パターン | 適したシーン | 避けるべきシーン |
|---------|------------|----------------|
| **ReAct** | ツール使用が不確実で、試行錯誤が必要な探索タスク | ステップ数が多く、予測可能なワークフロー |
| **Plan-and-Solve** | 明確な手順がある業務処理、ワークフロー自動化 | 動的で予測不可能な環境でのリアルタイム対応 |
| **Reflection** | 品質が最重要な成果物作成（レポート、コードレビュー） | リアルタイム性が求められる対話型アプリケーション |

### 選択のためのチェックリスト

- **タスクは探索的か、手順化されているか？**
  - 探索的 → ReAct
  - 手順化されている → Plan-and-Solve

- **品質と速度、どちらを優先するか？**
  - 品質 → Reflection
  - 速度 → ReAct または Plan-and-Solve

- **ツール呼び出しの失敗は許容できるか？**
  - 許容できる → ReAct
  - 最小限にしたい → Plan-and-Solve

---

## 【実装例】TypeScriptでの簡易的なReActパターン実装

以下は、ReActパターンを最小限で実装した例です。検索ツールと計算ツールを使い、複合的な質問に回答します。

```typescript
interface Tool {
  name: string;
  description: string;
  execute: (input: string) => Promise<string>;
}

interface ReActStep {
  thought: string;
  action?: { tool: string; input: string };
  observation?: string;
  finalAnswer?: string;
}

class ReActAgent {
  private tools: Map<string, Tool>;
  private llm: (prompt: string) => Promise<string>;
  private maxIterations: number;

  constructor(
    tools: Tool[],
    llm: (prompt: string) => Promise<string>,
    maxIterations = 10
  ) {
    this.tools = new Map(tools.map(t => [t.name, t]));
    this.llm = llm;
    this.maxIterations = maxIterations;
  }

  async run(query: string): Promise<string> {
    const history: ReActStep[] = [];
    
    for (let i = 0; i < this.maxIterations; i++) {
      const prompt = this.buildPrompt(query, history);
      const response = await this.llm(prompt);
      
      const parsed = this.parseResponse(response);
      
      if (parsed.finalAnswer) {
        return parsed.finalAnswer;
      }
      
      if (parsed.action) {
        const tool = this.tools.get(parsed.action.tool);
        if (!tool) {
          throw new Error(`Unknown tool: ${parsed.action.tool}`);
        }
        
        const observation = await tool.execute(parsed.action.input);
        history.push({
          thought: parsed.thought,
          action: parsed.action,
          observation
        });
      }
    }
    
    throw new Error('Max iterations reached');
  }

  private buildPrompt(query: string, history: ReActStep[]): string {
    const toolDescriptions = Array.from(this.tools.values())
      .map(t => `- ${t.name}: ${t.description}`)
      .join('\n');

    const historyText = history.map((step, idx) => `
Step ${idx + 1}:
Thought: ${step.thought}
Action: ${step.action?.tool}("${step.action?.input}")
Observation: ${step.observation}
`).join('\n');

    return `You are a helpful assistant that uses tools to answer questions.
Available tools:
${toolDescriptions}

Question: ${query}
${historyText}

Respond in this format:
Thought: <your reasoning about what to do next>
Action: <tool_name>("<input>")
OR
Final Answer: <your final answer>`;
  }

  private parseResponse(response: string): {
    thought: string;
    action?: { tool: string; input: string };
    finalAnswer?: string;
  } {
    const thoughtMatch = response.match(/Thought:\s*(.+?)(?=\nAction:|\nFinal Answer:|$)/s);
    const actionMatch = response.match(/Action:\s*(\w+)\("(.+?)"\)/);
    const finalMatch = response.match(/Final Answer:\s*(.+)/s);

    return {
      thought: thoughtMatch?.[1]?.trim() || '',
      action: actionMatch ? {
        tool: actionMatch[1],
        input: actionMatch[2]
      } : undefined,
      finalAnswer: finalMatch?.[1]?.trim()
    };
  }
}

// 使用例
const searchTool: Tool = {
  name: 'search',
  description: 'Search for information on the web',
  execute: async (query) => {
    // 実際の検索API呼び出し
    return `Results for "${query}"...`;
  }
};

const calculatorTool: Tool = {
  name: 'calculator',
  description: 'Perform mathematical calculations',
  execute: async (expression) => {
    return eval(expression).toString();
  }
};

// エージェントの初期化と実行
const agent = new ReActAgent(
  [searchTool, calculatorTool],
  async (prompt) => {
    // OpenAI APIやAnthropic APIなどを呼び出す
    return callLLM(prompt);
  }
);

const answer = await agent.run(
  '2024年の日本のGDPは？それを2019年と比較して何%増減した？'
);
```

### 実装のポイント

1. **厳密なパース処理**：LLMの出力形式を正確にパースするため、正規表現や構造化出力（JSON mode）を活用
2. **イテレーション制限**：無限ループを防ぐため、最大繰り返し回数を設定
3. **ツールの抽象化**：新しいツールを容易に追加できるよう、共通インターフェースを定義
4. **エラーハンドリング**：ツール実行失敗時のフォールバック戦略を用意

---

## まとめと次のステップ

AIエージェントの設計パターンを選ぶ際は、**タスクの性質**と**品質・速度のトレードオフ**を意識することが重要です：

- **ReAct**：探索的で柔軟性が必要なタスクに最適
- **Plan-and-Solve**：手順化された業務処理の自動化に強い
- **Reflection**：高品質な成果物が必要な創造的タスクに有効

実際のプロジェクトでは、これらを組み合わせたハイブリッドアプローチも有効です。例えば、「Plan-and-Solveで大枠を決め、各ステップでReActによる探索を許容する」といった具合です。

### 学習の次のステップ

1. **LangChainやLlamaIndexなどのフレームワーク**を使って、より堅牢なエージェントを構築
2. **MCP（Model Context Protocol）**を導入し、ツール接続を標準化
3. **評価基準の設計**：エージェントの出力を客観的に評価するテストスイートを作成

AIエージェントの領域は急速に進化しています。本記事で学んだ基礎概念を持ちながら、実際に手を動かして試行錯誤することが、最良の理解につながります。
