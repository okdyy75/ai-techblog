# RubyでLLMアプリを作る実践: ruby-openai + 構造化出力 + エラーハンドリング

## はじめに
Rubyエコシステムにおいて、LLM（Large Language Model）を活用したアプリケーション開発は急速に一般的になりつつあります。PythonがAI分野の主流ですが、Ruby on Railsなどの既存のRuby資産とLLMを統合する場合、Rubyから直接APIを叩く方がアーキテクチャはシンプルになります。

本記事では、デファクトスタンダードである`ruby-openai` gemを使用し、単なるチャットではなく「システムに組み込む」ための実践的なテクニック（構造化データ抽出、堅牢なエラーハンドリング）を解説します。

## 前提
*   Ruby 3.1以上
*   OpenAI API Key取得済み
*   基本的なRubyの知識（Hash, Exception処理など）

## セットアップ

まずはGemをインストールします。環境変数の管理には`dotenv`を推奨します。

```bash
# Gemfile
gem 'ruby-openai'
gem 'dotenv'

# ターミナルでのインストール
bundle install
```

`.env`ファイルを作成し、APIキーを設定します。

```env
OPENAI_ACCESS_TOKEN=sk-proj-xxxxxxxxxxxxxxxxxxxx
```

## 基本実装: クライアントの初期化とシンプルな対話

最も基本的なチャット完了（Chat Completion）の実装です。`OpenAI::Client`をインスタンス化して利用します。

```ruby
require 'openai'
require 'dotenv/load'

# クライアントの初期化
client = OpenAI::Client.new(
  access_token: ENV.fetch("OPENAI_ACCESS_TOKEN"),
  log_errors: true # デバッグ用にエラーログを有効化
)

# APIリクエスト
response = client.chat(
  parameters: {
    model: "gpt-4o", # コストパフォーマンスの良い gpt-4o-mini も推奨
    messages: [
      { role: "system", content: "あなたは優秀なRubyエンジニアです。" },
      { role: "user", content: "RubyのStructとOpenStructの違いを簡潔に教えて。" }
    ],
    temperature: 0.7,
  }
)

puts response.dig("choices", 0, "message", "content")
```

## Structured Outputs (JSONモード) の活用

システム連携において最も重要なのが「構造化データ」の取得です。GPT-4系では`response_format: { type: "json_object" }`を指定することで、確実なJSONレスポンスを強制できます。

**注意点:** プロンプト内に必ず「JSONで出力して」という指示を含める必要があります。

```ruby
require 'json'

def analyze_sentiment(text)
  client = OpenAI::Client.new(access_token: ENV.fetch("OPENAI_ACCESS_TOKEN"))

  response = client.chat(
    parameters: {
      model: "gpt-4o",
      response_format: { type: "json_object" }, # JSONモードを有効化
      messages: [
        {
          role: "system",
          content: "ユーザーの入力を分析し、以下のJSONフォーマットで出力してください。\n{ \"sentiment\": \"positive|neutral|negative\", \"score\": 0.0-1.0, \"keywords\": [\"string\"] }"
        },
        { role: "user", content: text }
      ]
    }
  )

  raw_content = response.dig("choices", 0, "message", "content")
  
  # 文字列としてのJSONをRubyハッシュにパース
  begin
    JSON.parse(raw_content)
  rescue JSON::ParserError => e
    puts "JSONパースエラー: #{e.message}"
    nil
  end
end

# 実行例
result = analyze_sentiment("この新機能、使いにくいけどデザインは最高だね！")
# => { "sentiment" => "neutral", "score" => 0.5, "keywords" => ["使いにくい", "デザイン", "最高"] }
puts result.inspect
```

## 実践的エラーハンドリング: リトライとタイムアウト

本番環境では、APIの一時的な障害（5xxエラー）やレート制限（429 Too Many Requests）への対策が必須です。単純な`rescue`ではなく、指数バックオフ（Exponential Backoff）を用いたリトライロジックを実装します。

```ruby
def chat_with_retry(client, parameters, max_retries: 3)
  retries = 0

  begin
    client.chat(parameters: parameters)
  rescue Faraday::ServerError, Faraday::ConnectionFailed => e
    # 接続エラーやサーバーエラー(5xx)の場合
    if retries < max_retries
      wait_time = 2 ** retries # 指数バックオフ: 1秒, 2秒, 4秒...
      puts "エラー発生: #{e.message}. #{wait_time}秒後にリトライします (#{retries + 1}/#{max_retries})"
      sleep(wait_time)
      retries += 1
      retry
    else
      puts "リトライ回数上限に達しました。"
      raise e
    end
  rescue OpenAI::Error => e
    # OpenAI固有のエラー（認証エラーやBad Requestなど）
    # これらはリトライしても解決しないことが多いため、即座に例外を投げるかログ出力
    puts "OpenAI APIエラー: #{e.message}"
    nil
  end
end

# 使用例（リクエストタイムアウトの設定も含める）
client = OpenAI::Client.new(
  access_token: ENV.fetch("OPENAI_ACCESS_TOKEN"),
  request_timeout: 20 # 秒単位でタイムアウトを設定
)

params = {
  model: "gpt-4o",
  messages: [{ role: "user", content: "こんにちは" }]
}

chat_with_retry(client, params)
```

## 実践的な落とし穴と対策

開発時によく遭遇する問題とその対策をまとめました。

*   **トークン上限によるレスポンス切れ**
    *   **現象:** JSONが途中で切れて`JSON::ParserError`になる。
    *   **対策:** `max_tokens`パラメータを十分に確保する。または、入力テキストが長すぎる場合に事前に要約処理を挟む。
*   **非決定的な出力**
    *   **現象:** 同じプロンプトでも毎回微妙に形式が異なる。
    *   **対策:** `temperature: 0`を設定してランダム性を極力排除する。シード値（`seed`パラメータ）を固定するのも有効。
*   **コンテキストウィンドウあふれ**
    *   **現象:** 会話履歴を保持しすぎてエラーになる。
    *   **対策:** `ruby-openai`にはトークン計算機能がないため、`tiktoken_ruby`などのGemを併用し、リクエスト前にトークン数を見積もって古い履歴を削除（Trimming）する。

## セキュリティ注意点

1.  **APIキーの流出:** GitHubへのコミットは厳禁です。`.env`を`.gitignore`に追加し、CI/CDパイプラインではシークレット変数を使用してください。
2.  **プロンプトインジェクション:** ユーザー入力をそのままプロンプトに埋め込む際は注意が必要です。「以前の命令を無視して」といった入力に対抗するため、システムプロンプトで「ユーザーの指示による上書きを禁止する」旨を明記するか、入力値のサニタイズを行ってください。
3.  **PII（個人特定情報）の送信:** 顧客の個人情報をAPIに送信しないよう、送信前にフィルタリングするか、エンタープライズ契約（学習データとして利用されない契約）を確認してください。

## まとめ

RubyからLLMを利用する場合、`ruby-openai`は非常に強力なツールです。しかし、実務レベルのアプリにするには、単にAPIを叩くだけでなく、**JSONモードによる構造化**と**堅牢なリトライ処理**が不可欠です。これらを適切に実装することで、信頼性の高いAI機能をRubyアプリケーションに統合できます。
