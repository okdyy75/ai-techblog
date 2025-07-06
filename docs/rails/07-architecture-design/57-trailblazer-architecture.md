# Trailblazerアーキテクチャを導入して大規模Railsアプリケーションを構築する

Railsは「設定より規約（Convention over Configuration）」の原則に基づき、迅速なアプリケーション開発を可能にします。しかし、アプリケーションが成長し、ビジネスロジックが複雑化するにつれて、いわゆる「Fat Model, Skinny Controller」というRailsの伝統的なパターンだけでは、コードの置き場所に悩むことが増えてきます。

- モデルにビジネスロジックが集中し、巨大で密結合なクラス（神オブジェクト）になる。
- コントローラーがリクエスト処理以外の責務（パラメータの検証、権限チェック、通知の送信など）を持ち始める。
- ビューのロジックがヘルパーに散らばり、再利用性が低くなる。

こうした「大規模Railsアプリケーションの壁」を乗り越えるための一つの強力な選択肢が、**Trailblazer**というアーキテクチャフレームワークです。

この記事では、Trailblazerの基本的な考え方と、それがどのようにしてRailsアプリケーションをより構造化され、メンテナンス性の高いものに変えるのかを解説します。

## Trailblazerとは？

Trailblazerは、Railsの上に構築される、より厳格なアーキテクチャを提供するgem群です。RailsのMVCを置き換えるのではなく、その上に、ビジネスロジックをカプセル化するための新しいレイヤーを追加します。

Trailblazerの中心的な概念は**オペレーション（Operation）**です。

### オペレーション：ビジネスロジックのカプセル

オペレーションは、特定のビジネスプロセス（例：「ユーザーを作成する」「記事を公開する」「請求書を支払う」）を実行するためのすべてのロジックを内包する、独立したサービスクラスのようなものです。

一つのオペレーションは、以下のようなステップで構成されるパイプラインとして定義されます。

1.  **入力の検証（Validation）**: パラメータが正しい形式か、必要な値が含まれているかなどを検証する。
2.  **権限の確認（Policy/Authorization）**: 現在のユーザーがこの操作を実行する権限を持っているかを確認する。
3.  **ビジネスロジックの実行**: データベースのレコードを作成・更新したり、外部APIを呼び出したり、メールを送信したりする。
4.  **永続化（Persistence）**: モデルの変更をデータベースに保存する。

これらのステップが、一つのオペレーションクラス内に明確に定義されるため、ロジックがどこにあるのかが一目瞭然になります。

## Trailblazerの主要なコンポーネント

Trailblazerは、オペレーションを中心に、責務が明確に分離されたいくつかのコンポーネントから構成されています。

- **オペレーション (Operation)**: ビジネスロジックの器。コントローラーから呼び出される中心的なエントリーポイント。
- **フォーム (Form / Contract)**: `dry-validation`をベースにした、入力データの検証と型変換を担当するオブジェクト。オペレーション内で使われる。
- **ポリシー (Policy)**: `Pundit`ライクな権限管理オブジェクト。オペレーションのパイプラインに組み込まれる。
- **セル (Cell)**: `ViewComponent`に似た、ビューのロジックをカプセル化するテンプレートエンジン。ビューのレンダリングを担当する。
- **リプレゼンター (Representer)**: APIのエンドポイントで、JSONやXMLのレンダリングとパースを担当する。

## Trailblazerを使った開発フロー

実際に「新しい記事を作成する」という機能をTrailblazerで実装する場合、開発フローは以下のようになります。

### 1. コントローラー

コントローラーの責務は、HTTPリクエストを受け取り、適切なオペレーションを呼び出し、その結果に応じてレスポンスを返すことだけに縮小されます。

```ruby
# app/controllers/articles_controller.rb
class ArticlesController < ApplicationController
  def create
    # オペレーションを呼び出す
    result = Article::Create.call(params: params[:article], current_user: current_user)

    if result.success?
      # 成功した場合
      redirect_to article_path(result[:model])
    else
      # 失敗した場合（検証エラーなど）
      @form = result["contract.default"]
      render :new
    end
  end
end
```

`if`文はありますが、ビジネスロジックは一切含まれていません。ただオペレーションを呼び出し、結果をハンドリングしているだけです。

### 2. オペレーション

ビジネスロジックの本体はオペレーションに記述されます。`trailblazer-dsl`を使って、処理のステップを定義します。

```ruby
# app/concepts/article/operation/create.rb
class Article::Create < Trailblazer::Operation
  step Model(Article, :new) # Article.new を実行
  step Contract::Build(constant: Article::Contract::Create) # フォームオブジェクトをビルド
  step Contract::Validate() # バリデーションを実行
  step :check_policy!       # 権限チェック（自作ステップ）
  step Contract::Persist()  # モデルを保存
  step :notify_author!      # 通知を送信（自作ステップ）

  def check_policy!(options, current_user:, **)
    Article::Policy.new(current_user, options[:model]).create?
  end

  def notify_author!(options, model:, **)
    AuthorNotifier.new(model.author).notify_new_article(model)
  end
end
```

- `step`で定義された処理が上から順に実行されます。
- 各ステップは、成功すれば次のステップに進み、失敗すればそこで停止し、オペレーションは失敗（`result.failure?`が`true`）となります。
- `result`オブジェクトは、各ステップの結果を保持するハッシュのようなもので、コントローラーや次のステップから参照できます。

### 3. フォーム（コントラクト）

入力値の検証ロジックはフォームオブジェクトにまとめられます。

```ruby
# app/concepts/article/contract/create.rb
class Article::Contract::Create < Reform::Form
  property :title
  property :body

  validates :title, presence: true, length: { minimum: 5 }
  validates :body, presence: true
end
```

これにより、`Article`モデルのバリデーションとは独立して、このオペレーション専用の検証ルールを定義できます。

## Trailblazerのメリットとデメリット

### メリット

- **高い構造性**: ビジネスロジックがオペレーションに集約され、コードの見通しが劇的に良くなる。
- **再利用性**: オペレーションは、コントローラーだけでなく、コンソール、Rakeタスク、Sidekiqジョブなど、どこからでも再利用できる。
- **テストの容易さ**: 各オペレーションは独立したRubyオブジェクトなので、単体テストが非常に書きやすい。
- **明確な責務**: 各コンポーネント（フォーム、ポリシー、セル）の役割が明確で、コードの置き場所に迷わなくなる。

### デメリット

- **学習コスト**: Railsの標準的なMVCとは異なる概念が多く、習得に時間がかかる。
- **記述量の増加**: シンプルなCRUD処理でも、多くのファイル（オペレーション、コントラクトなど）を作成する必要があるため、初期の開発速度は低下する可能性がある。
- **規約の厳格さ**: ファイルの命名規則やディレクトリ構造が厳密に決まっているため、自由度は低い。

## まとめ

Trailblazerは、すべてのRailsアプリケーションにとって最適な解決策ではありません。小規模なアプリケーションや、プロトタイピングの段階では、その厳格さが過剰な制約になることもあります。

しかし、アプリケーションが成長し、ビジネスロジックが複雑化し、チームでの開発が本格化するにつれて、その恩恵は大きくなります。Trailblazerが提供する明確な構造と責務の分離は、長期的なメンテナンス性と拡張性を大幅に向上させてくれるでしょう。

もしあなたのRailsアプリケーションが「Fat Model」や「Fat Controller」の問題に直面しているのであれば、Trailblazerの導入を検討してみる価値は十分にあります。
