# 38. Avo/Administrate/Trestle: Rails製管理画面gemの比較と選択

## はじめに

多くのWebアプリケーションでは、開発者や運用者がデータを管理するための管理画面が必要です。これをゼロから作るのは手間がかかりますが、Railsのエコシステムには、管理画面を素早く構築するための優れたgemが多数存在します。

これらのgemを使えば、モデルのCRUD（作成、読み取り、更新、削除）操作、検索、フィルタリング、ダッシュボード機能などを、わずかなコードで実現できます。

本記事では、現在人気のある3つの管理画面生成gem、**Avo**、**Administrate**、**Trestle**について、それぞれの特徴、長所・短所を比較し、プロジェクトに合ったgemを選ぶための指針を示します。

## この記事で学べること

- Avo, Administrate, Trestleの基本的な特徴とコンセプト
- 各gemのカスタマイズ性と学習コストの比較
- プロジェクトの要件（シンプルさ、柔軟性、モダンさ）に応じた最適なgemの選択

## 1. Avo

[Avo](https://avohq.io/) は、比較的新しいモダンな管理画面フレームワークです。設定より規約（CoC）の考え方を重視しつつ、高いカスタマイズ性を提供することを目指しています。有償プランもありますが、基本的な機能は無償で利用できます。

### 特徴

- **リソースベースの設定**: モデルごとに `Avo::Resource` クラスを作成し、フィールド、アクション、フィルタをRubyのコードで定義します。
- **モダンなUI**: Tailwind CSSをベースにした、洗練された美しいUIが特徴です。
- **高機能**: ダッシュボード、カスタムツール、カードなど、単なるCRUDにとどまらない豊富な機能を提供します。
- **活発な開発**: 開発が非常に活発で、新機能が頻繁に追加されます。

app/avo/resources/post_resource.rb (Avoの例)
```ruby
class PostResource < Avo::BaseResource
  self.title = :title
  self.includes = [:user]

  field :id, as: :id
  field :title, as: :text, required: true
  field :body, as: :trix, placeholder: 'Enter text'
  field :user, as: :belongs_to
end
```

### 長所

- **見た目とUXが良い**: デフォルトのままでも非常に見栄えが良い。
- **柔軟性と拡張性**: カスタムフィールドやカスタムツールの作成が容易で、複雑な要件にも対応しやすい。
- **多機能**: ダッシュボード機能が標準で強力。

### 短所

- **学習コスト**: 他のgemに比べて覚えるべき概念が多い。
- **有償プラン**: 全機能を利用するには有償プラン（Pro）が必要。

## 2. Administrate

[Administrate](https://github.com/thoughtbot/administrate) は、Thoughtbot社によって開発された、シンプルさとカスタマイズのしやすさのバランスを重視したgemです。Rails開発者にとって直感的に理解しやすい設計になっています。

### 特徴

- **ダッシュボードとコントローラ**: モデルごとに `FooDashboard` と `Admin::FoosController` が生成されます。
- **ダッシュボードでの設定**: `FooDashboard` クラスで、管理画面に表示する属性やその表示形式を定義します。
- **シンプルな思想**: 過度なDSL（ドメイン固有言語）を避け、通常のRailsのコントローラやビューを上書きすることでカスタマイズを行います。

app/dashboards/post_dashboard.rb (Administrateの例)
```ruby
class PostDashboard < Administrate::BaseDashboard
  ATTRIBUTE_TYPES = {
    id: Field::Number,
    title: Field::String,
    body: Field::Text,
    user: Field::BelongsTo,
    created_at: Field::DateTime,
    updated_at: Field::DateTime,
  }.freeze

  COLLECTION_ATTRIBUTES = [:id, :title, :user].freeze # 一覧ページ
  SHOW_PAGE_ATTRIBUTES = [:id, :title, :user, :body].freeze # 詳細ページ
  FORM_ATTRIBUTES = [:title, :body, :user].freeze # フォーム
end
```

### 長所

- **Railsライク**: Rails開発者であれば、カスタマイズの方法を推測しやすい。
- **シンプル**: 覚えるべき独自の概念が少ない。
- **安定性**: 長い間開発されており、安定しています。

### 短所

- **UIが少し古い**: デフォルトのUIはAvoに比べるとシンプル（悪く言えば古風）。
- **柔軟性の限界**: 非常に複雑なカスタムロジックを実装しようとすると、コードが煩雑になることがある。

## 3. Trestle

[Trestle](https://trestle.io/) は、設定用のDSLに重点を置き、最小限のコードで素早く管理画面を構築することを目指したgemです。ActiveAdminの思想に似ていますが、よりモダンで軽量です。

### 特徴

- **DSLベースの設定**: `app/admin/foos_admin.rb` というファイルに、DSLを使ってテーブルのカラム、フォームのフィールド、スコープなどを定義します。
- **設定の集約**: 1つの設定ファイルに、そのリソースに関するすべての管理画面設定を記述します。
- **軽量**: 他のgemに比べて依存性が少なく、軽量です。

app/admin/posts_admin.rb (Trestleの例)
```ruby
Trestle.resource(:posts) do
  menu do
    item :posts, icon: "fa fa-star"
  end

  table do
    column :id
    column :title
    column :user
    actions
  end

  form do |post|
    text_field :title
    editor :body
    belongs_to :user
  end
end
```

### 長所

- **高速な開発**: シンプルなCRUDであれば、非常に少ないコード量で構築できる。
- **直感的**: DSLが分かりやすく、何をしているか把握しやすい。

### 短所

- **DSLの学習**: Trestle独自のDSLを学ぶ必要がある。
- **カスタマイズの制約**: DSLでカバーされていない複雑なカスタマイズは、他のgemより難しい場合がある。
- **開発の停滞**: 近年、開発のペースがやや落ちているように見える。

## 比較と選び方

| | Avo | Administrate | Trestle |
| :--- | :--- | :--- | :--- |
| **コンセプト** | モダンなUIと高い柔軟性 | Railsライクなシンプルさ | DSLによる高速開発 |
| **設定方法** | Resourceクラス (Ruby) | Dashboardクラス (Ruby) | DSL (Ruby) |
| **UI** | モダン (Tailwind) | シンプル | シンプル |
| **学習コスト** | 中〜高 | 低 | 中 |
| **柔軟性** | 高 | 中 | 中 |
| **ベストな用途** | **リッチでモダンなUI**が欲しい。複雑なカスタム機能が必要。 | **シンプルさが最優先**。Railsの作法から外れたくない。 | **とにかく早く**シンプルなCRUD画面を作りたい。 |

**推奨される選択**:

- **スタートアップや見た目を重視するプロジェクト**: **Avo** が最適です。初期投資（学習コスト）はかかりますが、得られるUXと機能性は非常に高いです。
- **保守的なプロジェクトや学習コストを抑えたい場合**: **Administrate** が堅実な選択です。Rails開発者にとって馴染みやすく、安定しています。
- **個人開発やプロトタイピングで速度を重視する場合**: **Trestle** が力を発揮します。少ないコードで素早く管理画面を立ち上げることができます。

## まとめ

Railsの管理画面gemは、それぞれ異なる哲学と特徴を持っています。完璧なgemというものはなく、プロジェクトの要件やチームのスキルセットによって最適な選択は変わります。

本記事で紹介した3つのgemのデモサイトなどを実際に触ってみて、その感触を確かめてから導入を決定することをお勧めします。適切なgemを選べば、管理画面の開発コストを大幅に削減し、本来のアプリケーション開発に集中することができるでしょう。