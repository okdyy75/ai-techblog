# 45. RailsにおけるAPIドキュメントの自動生成 (RSwag/Committee)

## はじめに

RailsでAPIを開発する際、そのAPIが「どのようなエンドポイントを持ち、どのようなパラメータを受け取り、どのようなレスポンスを返すのか」を明確に示すドキュメントは不可欠です。ドキュメントは、フロントエンド開発者やAPIを利用する他のチームとの円滑なコミュニケーションを促進し、開発効率を大幅に向上させます。

しかし、手動でAPIドキュメントを作成・維持するのは非常に手間がかかり、コードの変更に追従できずに陳腐化しやすいという問題があります。この問題を解決するのが、**テストコードからAPIドキュメントを自動生成する**アプローチです。

本記事では、Rails APIのドキュメントを自動生成するための代表的なgemである **RSwag** と **Committee** を紹介し、RSwagを使った具体的なドキュメント生成方法を解説します。

## この記事で学べること

- APIドキュメントを自動生成するメリット
- RSwagとCommitteeのコンセプトと違い
- RSpecリクエストスペックからSwagger (OpenAPI) ドキュメントを生成するRSwagの使い方
- 生成されたドキュメントをSwagger UIで閲覧する方法

## RSwag vs. Committee

どちらのgemも、OpenAPI Specification (OAS, 旧Swagger) というAPI記述のための標準フォーマットを利用しますが、アプローチが異なります。

### RSwag

- **アプローチ**: **コードファースト (Code First)** / **テスト駆動 (Test-Driven)**
- **流れ**: RSpecで記述したリクエストスペック（APIのテストコード）に、Swagger/OASの情報を記述するDSLを追加します。このテストを実行することで、テストが通ったAPIの仕様として `swagger.json` (OASファイル) が生成されます。
- **長所**: テストコードがそのままドキュメントの定義になるため、**ドキュメントと実際のAPIの挙動が乖離しにくい**。Rails開発者にとっては、使い慣れたRSpecの延長で書けるため学習コストが低い。
- **短所**: テストコードにドキュメント定義が混在するため、やや冗長になることがある。

### Committee

- **アプローチ**: **デザインファースト (Design First)** / **スキーマ駆動 (Schema-Driven)**
- **流れ**: まず手動または別のツールでAPIの仕様を `swagger.json` (OASファイル) として定義します。Committeeは、そのスキーマ定義と実際のリクエスト/レスポンスを比較し、仕様に準拠しているかをテスト（アサーション）するためのミドルウェアやテストヘルパーを提供します。
- **長所**: APIの設計が最初に確定するため、フロントエンドとバックエンドの並行開発がしやすい。スキーマが唯一の正となるため、仕様のブレが少ない。
- **短所**: 最初にスキーマを記述する手間がかかる。スキーマの学習コストが必要。

**どちらを選ぶか？**
- **既存のRailsアプリケーションに後から導入する場合**や、**テスト駆動で開発を進めたい場合**は、**RSwag** が非常に適しています。
- **APIの設計を厳密に行い、複数チームで並行開発を進める場合**は、**Committee** によるデザインファーストのアプローチが有効です。

本記事では、より手軽に始められる **RSwag** の使い方に焦点を当てます。

## RSwagによるドキュメント生成

### ステップ1: インストール

`Gemfile` の `:development, :test` グループにgemを追加します。

```ruby:Gemfile
group :development, :test do
  gem 'rswag-api'
  gem 'rswag-ui'
  gem 'rswag-specs'
end
```

`bundle install` を実行後、インストールコマンドを実行します。

```bash
rails g rswag:install
```

これにより、設定ファイル (`config/initializers/rswag-api.rb`, `rswag-ui.rb`) と、ドキュメントのベースとなる `spec/swagger_helper.rb` が生成されます。

### ステップ2: Swagger Helperの編集

`spec/swagger_helper.rb` を編集し、APIの基本情報（タイトル、バージョンなど）を定義します。

```ruby:spec/swagger_helper.rb
require 'rails_helper'

RSpec.configure do |config|
  config.swagger_root = Rails.root.join('swagger').to_s

  config.swagger_docs = {
    'v1/swagger.yaml' => {
      openapi: '3.0.1',
      info: {
        title: 'My API V1',
        version: 'v1'
      },
      paths: {},
      servers: [
        { url: 'http://localhost:3000', description: 'Local development server' }
      ]
    }
  }
  # ...
end
```

### ステップ3: リクエストスペックの記述

APIのエンドポイントに対するRSpecのリクエストスペックを作成します。ここにRSwagのDSLを使ってドキュメント情報を追記していきます。

`spec/requests/articles_spec.rb`:
```ruby
require 'swagger_helper'

RSpec.describe 'Articles API', type: :request do

  path '/articles' do
    get('list articles') do
      tags 'Articles'
      produces 'application/json'

      response(200, 'successful') do
        schema type: :array,
               items: {
                 type: :object,
                 properties: {
                   id: { type: :integer },
                   title: { type: :string },
                   body: { type: :string }
                 },
                 required: [ 'id', 'title' ]
               }

        after do |example|
          example.metadata[:response][:content] = {
            'application/json' => {
              example: JSON.parse(response.body, symbolize_names: true)
            }
          }
        end
        run_test! # テストを実行し、レスポンスを検証
      end
    end
  end

  path '/articles/{id}' do
    get('retrieve an article') do
      tags 'Articles'
      produces 'application/json'
      parameter name: :id, in: :path, type: :string, description: 'article id'

      response(200, 'successful') do
        let(:id) { Article.create(title: 'foo', body: 'bar').id }
        # ... schema definition ...
        run_test!
      end

      response(404, 'not found') do
        let(:id) { 'invalid' }
        run_test!
      end
    end
  end
end
```

- `path`: エンドポイントのパスを定義します。
- `get`, `post` など: HTTPメソッドを定義します。
- `tags`: ドキュメントUIでのグルーピングに使われます。
- `parameter`: 受け付けるパラメータ（パス、クエリ、ヘッダーなど）を定義します。
- `response`: レスポンスのステータスコードごとに、挙動とスキーマを定義します。
- `schema`: レスポンスボディのJSON構造を定義します。
- `run_test!`: この呼び出しで、実際にリクエストが実行され、通常のRSpecテストとしてアサーションが行われます。

### ステップ4: ドキュメントの生成と閲覧

1.  **ドキュメント生成**: RSpecを実行して、ドキュメントファイルを生成します。
    ```bash
    RAILS_ENV=test bundle exec rspec spec/requests/
    ```
    テストが成功すると、`swagger/v1/swagger.yaml` のようなファイルが生成されます。

2.  **UIの確認**: `rswag-ui` がマウントするエンドポイントにアクセスします。`routes.rb` を確認し、開発サーバーを起動して `http://localhost:3000/api-docs` などにアクセスします。

すると、Swagger UIのインタラクティブな画面が表示され、各エンドポイントの詳細を確認したり、フォームから実際にAPIを試したりすることができます。

## まとめ

APIドキュメントの自動生成は、現代のAPI開発におけるベストプラクティスです。

- **RSwag**: テストコードからドキュメントを生成し、仕様と実装の乖離を防ぐ。
- **Committee**: スキーマ定義からテストを行い、仕様への準拠を保証する。

特にRSwagは、既存のテストワークフローに自然に組み込むことができ、導入のハードルも低いため、多くのRailsプロジェクトにとって強力な武器となります。信頼性が高く、メンテナンスの行き届いたAPIドキュメントを整備することで、開発チーム全体の生産性を向上させましょう。