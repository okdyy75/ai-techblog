# Gemini CLI 完全ガイド

## 概要

Geminiは、Googleによって開発された最先端のマルチモーモーダルAIモデルです。テキスト、画像、音声、動画など、さまざまな形式の情報をシームレスに理解し、操作することができます。

これまで、Geminiの機能は主にPython SDKやWeb UIを通じて利用されてきましたが、Gemini CLIの登場により、コマンドラインから直接その強力な機能を活用できるようになりました。

このガイドでは、Gemini CLIの基本的な使い方から、実用的な応用例までをわかりやすく解説します。

## Gemini API

GeminiはAPI経由で利用できます。Google CloudのVertex AI、Google AI Studioなどから利用できます。

ドキュメント：[https://ai.google.dev/docs/gemini_api_overview](https://ai.google.dev/docs/gemini_api_overview)

今回はGoogle Cloud SDKに含まれる`gcloud`コマンドを利用して、Gemini APIを操作する方法を説明します。

## gcloudのインストールと設定

### インストール

gcloudは、Google Cloud Platformの各種サービスをコマンドラインから操作するためのツールです。以下の手順でインストールします。

```bash
# スクリプトをダウンロード
curl -O https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-sdk.tar.gz

# 展開
tar -xf google-cloud-sdk.tar.gz

# インストール
./google-cloud-sdk/install.sh
```

インストール後、ターミナルを再起動するか、`source ~/.bashrc`（または`~/.zshrc`）を実行して設定を反映させます。

### 初期設定

```bash
gcloud init
```

このコマンドを実行すると、ブラウザが開き、Googleアカウントへのログインを求められます。ログイン後、使用するGCPプロジェクトを選択します。

### 認証

```bash
gcloud auth application-default login
```

このコマンドで、アプリケーションのデフォルトとして認証情報を設定します。

## 基本的な使い方

`gcloud ai models`コマンドを使用して、Geminiを操作します。

### テキスト生成

最も基本的なテキスト生成の例です。

```bash
gcloud ai models predict gemini-pro --project=[YOUR_PROJECT_ID] --region=us-central1 --json-request='{
  "contents": [
    {
      "role": "USER",
      "parts": [
        {
          "text": "Gemini CLIについて教えて"
        }
      ]
    }
  ]
}'
```

`[YOUR_PROJECT_ID]`は、ご自身のGCPプロジェクトIDに置き換えてください。

### パラメータの調整

`temperature`や`maxOutputTokens`などのパラメータを調整することで、生成されるテキストの多様性や長さをコントロールできます。

```bash
gcloud ai models predict gemini-pro --project=[YOUR_PROJECT_ID] --region=us-central1 --json-request='{
  "contents": [
    {
      "role": "USER",
      "parts": [
        {
          "text": "日本の首都について3つの異なる説明をしてください"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.9,
    "maxOutputTokens": 200
  }
}'
```

## マルチモーダルプロンプト

Geminiの最大の特徴であるマルチモーダル機能をCLIから利用します。

### 画像とテキスト

ローカルの画像ファイルをGCS（Google Cloud Storage）にアップロードし、そのURIを使用してプロンプトに含めます。

1.  **GCSバケットの作成**

    ```bash
    gsutil mb gs://[YOUR_BUCKET_NAME]
    ```

2.  **画像のアップロード**

    ```bash
    gsutil cp [LOCAL_IMAGE_PATH] gs://[YOUR_BUCKET_NAME]/
    ```

3.  **マルチモーダルプロンプトの実行**

    ```bash
    gcloud ai models predict gemini-pro-vision --project=[YOUR_PROJECT_ID] --region=us-central1 --json-request='{
      "contents": [
        {
          "role": "USER",
          "parts": [
            {
              "text": "この画像について説明してください"
            },
            {
              "fileData": {
                "mimeType": "image/jpeg",
                "fileUri": "gs://[YOUR_BUCKET_NAME]/[IMAGE_NAME]"
              }
            }
          ]
        }
      ]
    }'
    ```

## まとめ

Gemini CLI（`gcloud`コマンド）を使用することで、スクリプトやCI/CDパイプラインにGeminiの強力なAI機能を簡単に組み込むことができます。

本ガイドを参考に、ぜひGemini CLIを活用してみてください。

より詳細な情報については、公式ドキュメントを参照してください。

-   [Google Cloud AIドキュメント](https://cloud.google.com/vertex-ai/docs/generative-ai/multimodal/send-multimodal-prompts)
-   [Gemini APIドキュメント](https://ai.google.dev/docs)
