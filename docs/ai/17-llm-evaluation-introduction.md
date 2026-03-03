# LLM評価入門：AI機能の品質をどう測るか

近年、OpenAIのGPTシリーズやAnthropicのClaudeなど、強力な大規模言語モデル（LLM）をアプリケーションに組み込むことが容易になりました。しかし、Webエンジニアが直面する最大の壁の一つが「**出力の不安定さ**」です。

「プロンプトを少し変えたら、以前は動いていたケースで失敗するようになった」
「回答のトーンが一貫しない」
「そもそもこのAI機能は『十分に良い』と言えるのか？」

これらの課題を解決し、自信を持ってプロダクションリリースするために不可欠なのが「LLM評価（Evaluation）」のプロセスです。本記事では、LLM評価の基礎から、エンジニアが今日から実践できる実装例までを解説します。

---

## なぜLLM評価が必要か

従来のソフトウェア開発では、`assert(add(1, 2) === 3)` のような決定論的なテストが有効でした。しかし、LLMは確率的に次の単語を予測するため、同じ入力に対しても出力が揺らぎます。

LLM評価が必要な理由は主に3点あります。

1.  **デグレード（品質劣化）の防止**: プロンプトの改善やモデルのバージョンアップ（例：GPT-4oからClaude 3.5 Sonnetへの切り替え）を行った際、既存の挙動が悪化していないかを検証する必要があります。
2.  **改善の定量化**: 「良くなった気がする」という主観を排除し、「正解率が15%向上した」という客観的な指標を持つことで、開発の意思決定を迅速化します。
3.  **コストとパフォーマンスの最適化**: 安価で高速な小型モデル（GPT-4o miniやLlama 3など）に切り替えた際、品質が許容範囲内に収まっているかを判断できます。

---

## 評価の2つのアプローチ

LLMの評価は、大きく「オフライン評価」と「オンライン評価」に分けられます。

### 1. オフライン評価（開発時）
リリース前に実施するテストです。あらかじめ用意した「テストセット（期待される入出力のペア）」に対して、現在のLLMシステムを走らせます。

*   **決定論的メトリクス**: 
    *   **Exact Match**: 完全一致（分類タスクなどに有効）。
    *   **JSON検証**: 出力が正しいJSON形式か、必須フィールドが含まれているか。
*   **セマンティックメトリクス**:
    *   **LLM-as-a-judge**: 性能の高いモデル（GPT-4oなど）に、評価対象モデルの回答を5段階で採点させる手法。現在の主流です。
    *   **ベクトル類似度（Cosine Similarity）**: 期待される回答と実際の回答をベクトル化し、意味的な近さを計算します。

### 2. オンライン評価（運用時）
実際のユーザーが利用している環境で収集するデータです。

*   **ユーザーフィードバック**: 「Good/Bad」ボタン、再生成ボタンのクリック率。
*   **暗黙的な指標**: 生成されたコードがコピーされたか、回答後の離脱率など。
*   **ガードレール**: 出力に不適切な表現が含まれていないか、機密情報が含まれていないかをリアルタイムでチェックします。

---

## 【実装例】TypeScriptによるシンプルな評価スクリプト

ここでは、`JSONL` 形式のテストセットを読み込み、評価用LLMを使って回答の「正確性（Accuracy）」を5段階評価するシンプルなスクリプトの実装例を紹介します。

### 1. テストデータの準備 (`testset.jsonl`)
```jsonl
{"input": "VitePressとは何ですか？", "expected": "Vue.jsベースの静的サイトジェネレーターで、ドキュメント作成に特化しています。"}
{"input": "TypeScriptでinterfaceとtypeの違いは？", "expected": "interfaceは拡張（extends）が可能で、主にオブジェクトの構造定義に使われます。typeは和集合や交差型など柔軟な定義が可能です。"}
```

### 2. 評価スクリプトの実装
`openai` ライブラリを使用したNode.jsスクリプトです。

```typescript
import fs from 'fs';
import readline from 'readline';
import OpenAI from 'openai';

const openai = new OpenAI();

interface TestCase {
  input: string;
  expected: string;
}

// 評価対象の関数（実際のアプリロジック）
async function getAIResponse(prompt: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });
  return completion.choices[0].message.content || "";
}

// LLM-as-a-judge: 回答を採点する
async function evaluateResponse(input: string, expected: string, actual: string): Promise<number> {
  const evalPrompt = `
あなたは公平な採点者です。ユーザーの質問に対するAIの回答を、期待される回答と比較して1〜5点で採点してください。
5点: 完璧。正確で、期待される内容をすべて含んでいる。
1点: 全くの間違い、または無関係。

質問: ${input}
期待される回答: ${expected}
実際の回答: ${actual}

採点結果（数字のみ）を返してください。`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: evalPrompt }],
    temperature: 0,
  });

  return parseInt(completion.choices[0].message.content || "0");
}

async function runEvaluation() {
  const fileStream = fs.createReadStream('testset.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let totalScore = 0;
  let count = 0;

  for await (const line of rl) {
    const { input, expected }: TestCase = JSON.parse(line);
    
    console.log(`Testing: ${input}`);
    const actual = await getAIResponse(input);
    const score = await evaluateResponse(input, expected, actual);
    
    console.log(`Score: ${score}/5`);
    totalScore += score;
    count++;
  }

  console.log(`--- 評価完了 ---`);
  console.log(`平均スコア: ${(totalScore / count).toFixed(2)} / 5.0`);
}

runEvaluation().catch(console.error);
```

---

## 運用フロー：継続的な評価の統合

評価スクリプトを作成したら、それを開発フローに組み込むことが重要です。

1.  **ゴールデンデータセットの作成**: 
    エッジケースや過去に失敗したパターンを含む20〜50程度の高品質なテストセットを管理します。
2.  **CI (Continuous Integration) での実行**: 
    プロンプトを管理しているファイルに変更があった際、GitHub Actionsなどで評価スクリプトを自動実行します。
3.  **ダッシュボード化**: 
    LangSmithやLangFuseといった専用の「LLM Opsプラットフォーム」を利用すると、スコアの推移や個別の失敗事例の分析が容易になります。

---

## まとめ

LLM機能の開発において、評価は「あれば望ましいもの」ではなく「不可欠なプロセス」です。

*   **主観から客観へ**: 感覚的な評価をやめ、数値化する。
*   **LLMを活用してLLMを測る**: `LLM-as-a-judge` は現代的な効率的アプローチ。
*   **小さく始める**: まずは5つの重要なQAペアから始め、徐々にテストセットを拡充していく。

品質をコントロール下に置くことで、LLMは強力なツールから、信頼できるプロダクトの構成要素へと変わります。まずは、手元のプロジェクトで簡単なJSONLテストセットを作るところから始めてみてください。

---

## 参考リンク

*   [OpenAI Evals](https://github.com/openai/evals): OpenAIが公開している評価フレームワーク。
*   [RAGAS](https://ragas.io/): RAG（検索拡張生成）に特化した評価メトリクス集。
*   [LangSmith](https://www.langchain.com/langsmith): LangChain社が提供する追跡・評価プラットフォーム。
*   [Promptfoo](https://www.promptfoo.dev/): CLIベースで動作する高速なプロンプト評価ツール。
