# Railsにおけるドメイン駆動設計(DDD)入門

## 概要

Railsは「設定より規約（CoC）」の思想に基づき、Active Recordパターンを中心とした迅速な開発を可能にします。しかし、アプリケーションが大規模化・複雑化するにつれて、ビジネスロジックがモデル、コントローラ、ビューに散在し、見通しが悪くなる「Fat Model」や「Fat Controller」といった問題に直面しがちです。

ドメイン駆動設計（DDD）は、このような複雑なビジネスドメインを効果的にモデル化するためのアプローチです。この記事では、DDDの基本的な考え方をRailsアプリケーションに応用し、保守性と拡張性の高いアーキテクチャを構築するための入門的な方法を紹介します。

## なぜRailsでDDDか？

標準的なRailsアーキテクチャは、CRUD（作成、読み取り、更新、削除）が中心のシンプルなアプリケーションには最適です。しかし、以下のような課題に直面した場合、DDDのアプローチが有効です。

-   **複雑なビジネスルールのカプセル化**: ビジネスロジックがActive Recordモデルのコールバックやバリデーション、コントローラのアクション内に散在してしまう。
-   **関心の分離**: モデルが永続化（データベースとのやり取り）とビジネスロジックの両方に責任を持ちすぎている。
-   **テストの困難さ**: モデルがデータベースに密結合しているため、ビジネスロジックのみを対象とした高速なユニットテストが書きにくい。

DDDは、これらの課題に対し、「ドメイン」つまりビジネスの関心事をソフトウェアの中心に据え、それを表現する豊かなドメインモデルを構築することで応えます。

## DDDの基本概念とRailsでの実践

DDDの全ての概念を一度に導入するのは大変です。ここでは、Railsアプリケーションに適用しやすい主要なパターンをいくつか紹介します。

### 1. ドメインモデル (Domain Model)

DDDにおけるドメインモデルは、単なるデータの入れ物（Active Recordのような）ではなく、**データと振る舞いを一体としてカプセル化したオブジェクト**です。Railsでは、これを`app/models`配下のPORO（Plain Old Ruby Object）として実装できます。

**例: `Order`ドメインモデル**

```ruby
# app/models/domain/order.rb

module Domain
  class Order
    attr_reader :id, :line_items, :status

    def initialize(id:, line_items:, status: 'pending')
      @id = id
      @line_items = line_items
      @status = status
    end

    def add_item(item)
      raise "Order is already paid." if paid?
      @line_items << item
    end

    def total_price
      @line_items.sum(&:price)
    end

    def pay
      @status = 'paid'
      # 支払い完了イベントを発行するなどのドメインイベントをここに記述
    end

    def paid?
      @status == 'paid'
    end
  end
end
```

-   この`Order`クラスは、Active Recordの機能に依存していません。
-   `add_item`や`pay`のように、状態を変更する振る舞い（メソッド）を持っています。
-   ビジネスルール（例: 支払い済みの注文には商品を追加できない）がモデル内にカプセル化されています。

### 2. リポジトリ (Repository)

リポジトリは、ドメインモデルの永続化を抽象化する責務を持ちます。ドメインモデルがデータベースの存在を意識しないように、リポジトリがActive Recordモデルとの変換を担当します。

**例: `OrderRepository`**

```ruby
# app/repositories/order_repository.rb

class OrderRepository
  def self.find(id)
    # ActiveRecordモデルからデータを取得
    record = ::Order.find(id)
    # ドメインモデルに変換
    to_domain_model(record)
  end

  def self.save(order_domain)
    # ドメインモデルからActiveRecordモデルの属性に変換
    attrs = {
      status: order_domain.status,
      # ...
    }
    record = ::Order.find_or_initialize_by(id: order_domain.id)
    record.update!(attrs)
    # line_itemsの永続化などもここに記述
  end

  private

  def self.to_domain_model(record)
    # ActiveRecordモデルからドメインモデルを再構築
    Domain::Order.new(
      id: record.id,
      status: record.status,
      line_items: record.line_items.map { |li| to_domain_line_item(li) }
    )
  end
end
```

-   `find`メソッドは、データベースからデータを取得し、ドメインモデルのインスタンスを返します。
-   `save`メソッドは、ドメインモデルのインスタンスを受け取り、それをデータベースに保存します。
-   これにより、ドメインモデルは永続化のロジックから完全に分離されます。

### 3. 集約 (Aggregate)

集約は、関連するドメインモデルを一つの単位としてまとめたものです。集約には「ルート」となるエンティティが存在し、外部からのアクセスはそのルートを通じてのみ行われます。これにより、データの一貫性が保たれます。

-   **例**: `Order`が集約ルートであり、`LineItem`はその一部です。`LineItem`を直接変更するのではなく、必ず`Order`オブジェクトの`add_item`や`remove_item`メソッドを通じて操作します。

### 4. アプリケーションサービス (Application Service)

アプリケーションサービスは、ユースケースを実現するための処理フローを記述します。リポジトリを使ってドメインモデルを取得し、ドメインモデルのメソッドを呼び出し、結果をリポジトリに保存します。

**例: `OrderingService`**

```ruby
# app/services/ordering_service.rb

class OrderingService
  def place_order(customer_id, product_requests)
    # ユースケースのオーケストレーション
    customer = CustomerRepository.find(customer_id)
    
    # ドメインモデルの生成
    line_items = product_requests.map do |req|
      Domain::LineItem.new(product_id: req[:product_id], quantity: req[:quantity])
    end
    order = Domain::Order.new(id: SecureRandom.uuid, line_items: line_items)

    # ドメインロジックの実行
    customer.add_order(order)

    # 永続化
    CustomerRepository.save(customer)
    OrderRepository.save(order)

    order
  end
end
```

-   コントローラは、この`OrderingService`を呼び出すだけになります。これにより、コントローラはHTTPリクエストの処理に専念でき、ビジネスロジックから解放されます。

## ディレクトリ構成案

DDDを導入する場合、以下のようなディレクトリ構成が考えられます。

```
app/
├── models/
│   ├── domain/         # ドメインモデル (PORO)
│   │   ├── order.rb
│   │   └── line_item.rb
│   ├── order.rb        # ActiveRecordモデル
│   └── user.rb         # ActiveRecordモデル
├── repositories/       # リポジトリ層
│   └── order_repository.rb
├── services/           # アプリケーションサービス層
│   └── ordering_service.rb
└── controllers/
    └── orders_controller.rb
```

## まとめ

RailsアプリケーションにDDDの考え方を取り入れることは、特に複雑なビジネスドメインを扱うプロジェクトにおいて、多くのメリットをもたらします。

-   **関心の分離**: ビジネスロジック、永続化、UIの責務が明確に分離される。
-   **高い凝集度**: 関連するデータと振る舞いがドメインモデルにカプセル化される。
-   **テスト容易性**: データベースに依存しないドメインモデルは、高速にユニットテストできる。
-   **保守性と拡張性**: ビジネスルールの変更がドメイン層に限定されるため、影響範囲が少なく、変更が容易になる。

もちろん、全てのアプリケーションにDDDが必要なわけではありません。しかし、Railsの規約の恩恵を受けつつ、システムの複雑さに応じてDDDのパターンを選択的に導入することで、より堅牢で長期的にメンテナンスしやすいアプリケーションを構築することが可能です。
