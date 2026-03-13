# LLMアプリケーションのオブザーバビリティ：トレースとコスト管理の実装戦略

LLM（大規模言語モデル）を組み込んだアプリケーションが「動く」状態から「運用できる」状態に移行するとき、Webエンジニアが直面する最大の課題は**ブラックボックス化**です。

「なぜこの回答が生成されたのか？」
「特定のユーザーに対するコストはいくらか？」
「RAG（検索拡張生成）の検索ステップで何秒かかっているのか？」

従来のWebアプリ開発におけるログ監視（アクセスログやエラーログ）だけでは、これらの問いに答えることは困難です。本記事では、LLMアプリケーション特有の監視・追跡手法である**オブザーバビリティ（可観測性）**の概念と、TypeScriptによる具体的な実装戦略について解説します。

## LLMオブザーバビリティの重要概念

LLMアプリの健全性を把握するためには、以下の4つの指標を構造化して記録する必要があります。

### 1. トレース（Trace）とスパン（Span）
単なる「リクエスト/レスポンス」のログではなく、処理の連鎖を階層構造で記録します。
*   **Trace**: ユーザーの1回の対話全体（例：「旅行プランを立てて」というリクエスト）。
*   **Span**: その中の個々の処理単位（例：検索クエリ生成 → 検索実行 → 回答生成）。

### 2. トークン使用量とコスト
サーバーリソース（CPU/メモリ）よりも、**トークン数**がコストとパフォーマンスに直結します。
*   Prompt Tokens（入力）：安価だが、RAGで膨れ上がることがある。
*   Completion Tokens（出力）：高価で、生成速度（レイテンシ）に影響する。

### 3. レイテンシの内訳
LLMは応答が遅いため、どこで時間がかかっているかの分解が重要です。
*   **TTFT (Time To First Token)**: 最初の文字が表示されるまでの時間（体感速度に直結）。
*   **Total Latency**: 全体の処理時間。

### 4. フィードバック（Ground Truth）
ユーザーによる「Good/Bad」評価や、修正後の正解データをトレースと紐付けることで、将来的なファインチューニングや評価（Evaluation）のデータセットとして活用できます。

## 【実装例】TypeScriptによる簡易トレーサー

専用のSaaS（LangSmithやArize Phoenixなど）を導入する前に、まずは自前でトレースの仕組みを理解しましょう。以下は、OpenAI APIの呼び出しをラップして、実行時間とトークン数を構造化ログとして出力するシンプルな実装例です。

```typescript
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

// 1. 基本的なスパン（処理単位）の型定義
interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  input: any;
  output?: any;
  metadata?: Record<string, any>;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

class SimpleTracer {
  private spans: Span[] = [];

  startSpan(name: string, traceId: string, parentSpanId?: string, input?: any): Span {
    const span: Span = {
      traceId,
      spanId: uuidv4(),
      parentSpanId,
      name,
      startTime: Date.now(),
      input,
    };
    this.spans.push(span);
    return span;
  }

  endSpan(spanId: string, output: any, usage?: OpenAI.CompletionUsage) {
    const span = this.spans.find((s) => s.spanId === spanId);
    if (!span) return;

    span.endTime = Date.now();
    span.output = output;
    
    if (usage) {
      span.tokens = {
        prompt: usage.prompt_tokens,
        completion: usage.completion_tokens,
        total: usage.total_tokens,
      };
    }
  }

  // 実際の運用ではここでDBや監視基盤（Datadog/OpenTelemetryなど）に送信する
  flush() {
    console.log(JSON.stringify(this.spans, null, 2));
    this.spans = [];
  }
}

// 2. トレーサーを使用したLLM呼び出しの実装
const openai = new OpenAI();
const tracer = new SimpleTracer();

async function generateTravelPlan(destination: string) {
  const traceId = uuidv4();
  
  // 親スパン：処理全体
  const rootSpan = tracer.startSpan('generate_travel_plan', traceId, undefined, { destination });

  try {
    // 子スパン：検索（ダミー）
    const searchSpan = tracer.startSpan('retrieve_info', traceId, rootSpan.spanId, { query: destination });
    // 本来はここでベクトル検索などを行う
    const searchContext = `観光地情報: ${destination}には美しい寺院があります。`;
    tracer.endSpan(searchSpan.spanId, { context: searchContext });

    // 子スパン：LLM生成
    const llmSpan = tracer.startSpan('call_llm', traceId, rootSpan.spanId, { model: 'gpt-4o' });
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "旅行プランナーとして振る舞ってください。" },
        { role: "user", content: `以下の情報を使って${destination}のプランを作って。\n${searchContext}` }
      ],
    });

    const answer = completion.choices[0].message.content;
    tracer.endSpan(llmSpan.spanId, answer, completion.usage);

    tracer.endSpan(rootSpan.spanId, { finalResponse: answer });
  } catch (error) {
    console.error("Error executing chain", error);
    // エラー情報もスパンに記録すべき
  } finally {
    tracer.flush();
  }
}

// 実行
generateTravelPlan("京都").catch(console.error);
```

このコードを実行すると、`traceId` で紐付いた複数の処理（検索、生成）が、入力・出力・所要時間・トークン数とともに記録されます。これにより、「検索は速いが生成が遅い」「特定のプロンプトでトークン消費が激しい」といったボトルネックが一目瞭然になります。

## 運用上の注意点

本番環境でオブザーバビリティを運用する際は、以下の点に注意が必要です。

### 1. PII（個人情報）のマスキング
LLMへの入力には、ユーザーのメールアドレスや電話番号が含まれる可能性があります。ログやトレース基盤に送信する前に、正規表現や専用のPII除去ライブラリ（Microsoft Presidioなど）を使用して、機密情報をマスクする必要があります。

### 2. サンプリング戦略
すべてのリクエスト詳細（特に巨大なプロンプトと回答）を保存すると、ログストレージのコストが膨大になります。
*   エラー発生時は100%記録する。
*   正常系は1〜5%程度をサンプリングする。
*   トークン数やレイテンシなどの「メトリクス（数値）」は全件記録し、「ペイロード（テキスト中身）」はサンプリングする、といった使い分けが有効です。

### 3. コストのアラート設定
LLM APIは従量課金です。無限ループバグや予期せぬ大量アクセスにより、一夜にして数千ドルの請求が発生するリスクがあります。
*   「1時間あたりのトークン消費量が閾値を超えたらSlack通知」
*   「特定のユーザーIDの消費が急増したらAPIキーを一時停止」
といったガードレールをアプリケーション層で実装しましょう。

## まとめ

LLMアプリケーションにおけるオブザーバビリティは、単なるデバッグツールではなく、**コスト管理と品質向上のための羅針盤**です。

1.  **Trace**: 処理の流れと入出力を可視化する。
2.  **Metrics**: トークン数とレイテンシを数値で監視する。
3.  **Cost**: ユーザーごとの原価を把握する。

まずは実装例のようなシンプルなロギングから始め、運用規模が大きくなってきたら、OpenTelemetryなどの標準規格や、LangSmith、Heliconeといった専用ツールの導入を検討してください。ブラックボックスの中身が見えるようになることで、エンジニアは自信を持ってAI機能を改善し続けることができます。

## 参考リンク

*   [OpenTelemetry for LLM Applications](https://opentelemetry.io/): 分散トレーシングの標準規格。LLM向けのセマンティック規約も策定が進んでいます。
*   [LangSmith](https://www.langchain.com/langsmith): LangChainと親和性が高い、トレース・評価プラットフォーム。
*   [Helicone](https://www.helicone.ai/): LLM APIのプロキシとして動作し、わずかな設定でロギングとキャッシュを提供するツール。
*   [Arize Phoenix](https://arize.com/phoenix/): LLMのトレース可視化と評価を行うオープンソースツール。
*   [Portkey](https://portkey.ai/): 複数のLLMプロバイダを統合管理し、可観測性を提供するゲートウェイ。
