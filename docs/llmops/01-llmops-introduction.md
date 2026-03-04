# LLMOps入門：生成AI機能を本番運用するための実践ガイド

近年、ChatGPTに代表される大規模言語モデル（LLM）の台頭により、WebアプリケーションへのAI機能の実装は驚くほど容易になりました。しかし、「プロンプトを投げて返ってきた結果を画面に表示する」というプロトタイプから、「数千・数万のユーザーが安定して利用できる本番サービス」へと昇華させるには、従来のソフトウェア開発とは異なる高い壁が存在します。

本記事では、LLMを活用した機能を継続的に改善し、安定運用するための手法である**LLMOps**の基礎知識と、具体的な実践ガイドを解説します。

---

## 1. 概要：なぜLLMOpsが必要なのか

「昨日は完璧に動いていたプロンプトが、今日になったら微妙に違う回答を返す」「特定の入力パターンで出力が崩れる」「APIコストが予想以上に膨らんでいる」——。

これらはLLMを組み込んだプロダクトで必ず直面する課題です。LLMは決定論的（同じ入力なら必ず同じ出力）ではなく、確率的な挙動をします。この「不確実性」を管理し、ソフトウェアとしての品質を保証するためのフレームワークがLLMOpsです。

## 2. LLMOpsとは

**LLMOps (Large Language Model Operations)** は、LLMのライフサイクル（開発、デプロイ、監視、改善）を管理するための一連のプロセスとプラクティスを指します。

従来のMLOpsとの主な違いは以下の通りです。

| 特徴 | 従来のMLOps | LLMOps |
| :--- | :--- | :--- |
| **主なタスク** | モデルの学習、特徴量エンジニアリング | プロンプト管理、RAGの構築、評価設計 |
| **データの扱い** | 大規模な学習用データセットが必要 | 少数の評価用データ（Few-shot）や検索用ドキュメント |
| **専門性** | データサイエンティスト中心 | ソフトウェアエンジニア、ドメインエキスパート |
| **評価の難易度** | 回帰・分類指標（正解率など）で明確 | 自由形式テキストのため定量評価が困難 |

LLMOpsの目的は、**「推論品質の維持」「コストの最適化」「リスクの最小化」**を継続的に実現することにあります。

---

## 3. 開発から運用までの流れ

LLMOpsのサイクルは、大きく以下の5つのフェーズに分かれます。

### ① 要件定義と評価データ作成
「何を成功とするか」を定義します。LLMの回答を評価するためのゴールデンデータ（理想的な入力と出力のペア）を20〜50件程度作成することから始めます。

### ② プロンプトエンジニアリング・RAG構築
プロンプトの調整や、外部知識を参照させるRAG（Retrieval-Augmented Generation）の実装を行います。この際、プロンプトをコード内にハードコードせず、バージョン管理可能な形式で管理するのが望ましいです。

### ③ 評価（Evaluation）
作成した評価データに対し、プロンプトの変更がどのような影響を与えたかをテストします。最近では「LLMによる評価（LLM-as-a-judge）」という手法が一般的です。

### ④ デプロイ
CI/CDパイプラインに評価ステップを組み込み、一定の品質をクリアした場合のみ本番環境へデプロイします。

### ⑤ 監視とフィードバックループ
本番環境での推論ログを収集し、ユーザーからの低評価や失敗例を分析して、①の評価データにフィードバックします。

---

## 4. 監視すべき指標

運用フェーズでは、以下の3つの観点からメトリクスを監視する必要があります。

### 運用メトリクス
- **レイテンシ（P99）**: LLMの回答生成にかかる時間。ストリーミング（逐次出力）を利用している場合は、最初の1文字が出るまでの時間（TTFT: Time To First Token）が重要です。
- **エラー率**: APIのレート制限やタイムアウトの発生頻度。

### コストメトリクス
- **トークン消費量**: 入力・出力それぞれのトークン数。
- **リクエストあたりの平均単価**: モデルやプロンプトの複雑さに依存します。

### 品質メトリクス
- **ハルシネーション率**: 事実に基づかない回答の割合。
- **感情・バイアスチェック**: 出力が不適切でないか。
- **ユーザーフィードバック**: 「役に立った（👍）/立たなかった（👎）」ボタンのクリック率。

---

## 5. 実装例：推論ログの記録（TypeScript）

LLMOpsの第一歩は、**「何が起きているかを可視化すること」**です。以下は、Node.js環境でOpenAI APIを使用し、推論のメタデータをログに残す最小限のコード例です。

```typescript
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface InferenceLog {
  id: string;
  timestamp: string;
  model: string;
  prompt: string;
  completion: string;
  usage: OpenAI.Completions.CompletionUsage | undefined;
  latencyMs: number;
  metadata: Record<string, any>;
}

async function getCompletionWithLogging(userPrompt: string, userId: string) {
  const startTime = Date.now();
  const requestId = uuidv4();

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "user", content: userPrompt }],
    });

    const endTime = Date.now();
    const completion = response.choices[0].message.content || "";

    // ログオブジェクトの構築
    const log: InferenceLog = {
      id: requestId,
      timestamp: new Date().toISOString(),
      model: response.model,
      prompt: userPrompt,
      completion: completion,
      usage: response.usage,
      latencyMs: endTime - startTime,
      metadata: { userId }, // ユーザーIDなどのコンテキスト
    };

    // 実際にはDBや監視ツール（LangSmith, Weights & Biases, Datadog等）に送信
    console.log("LLM_INFERENCE_LOG:", JSON.stringify(log));

    return completion;
  } catch (error) {
    console.error("LLM_ERROR:", error);
    throw error;
  }
}

// 実行例
getCompletionWithLogging("TypeScriptでLLMOpsを始める方法は？", "user_123");
```

このようにログを構造化して保存しておくことで、後から「どのユーザーが」「どのような入力で」「どれだけのコストをかけて」「どのような質の低い回答を得たか」を分析できるようになります。

---

## 6. 失敗しやすいポイント

運用を開始して間もないエンジニアが陥りがちな罠がいくつかあります。

- **プロンプトの「秘伝のタレ」化**: 
  複雑すぎるプロンプトは、モデルのアップデート時に挙動が予測不能になりがちです。可能な限りシンプルにし、評価データで品質を担保しましょう。
- **リトライ戦略の欠如**: 
  LLM APIは頻繁に一時的なエラーを返します。指数バックオフを用いたリトライ処理は必須です。
- **キャッシュの未利用**: 
  同じ質問に対して何度もLLMを叩くのはコストと時間の無駄です。Semantic Cache（意味的な類似性によるキャッシュ）の導入を検討してください。
- **セキュリティ（プロンプトインジェクション）**: 
  ユーザーの入力をそのままプロンプトに流し込むと、システムの指示を無視させる攻撃を受ける可能性があります。入力バリデーションやガードレール（Llama Guardなど）の導入を検討しましょう。

---

## 7. まとめ

LLMOpsは、単なるツールの導入ではなく、**「実験と学習を繰り返す文化」**そのものです。

1. まずは推論ログをすべて残す。
2. 小さな評価データセットを作る。
3. 定期的に「失敗例」を分析し、評価データを更新する。

この地道なサイクルの積み重ねが、魔法のようなAI体験を「信頼できる製品」へと変えていきます。まずは、今日から推論ログにレイテンシとトークン数を記録することから始めてみてください。

---

## 参考リンク

- [OpenAI: Production best practices](https://platform.openai.com/docs/guides/production-best-practices)
- [LangChain: LangSmith (Evaluation & Monitoring)](https://www.langchain.com/langsmith)
- [DeepLearning.ai: LLMOps Course](https://www.deeplearning.ai/short-courses/llmops/)
- [Microsoft: LLMOps maturity model](https://learn.microsoft.com/en-us/azure/architecture/guide/ai/llmops-maturity-model)
