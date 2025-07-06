# Active Support Concernを活用してモデルのコードをDRYに保つ

## はじめに

Railsアプリケーションの開発を進める中で、複数のモデルに共通のメソッドや振る舞いを持たせたい場面がよくあります。例えば、「公開」「下書き」のような状態を持つ`Article`モデルと`Page`モデル、両方に`publish!`や`published?`といったメソッドを実装したいケースです。

このような場合に、各モデルに同じようなコードを繰り返し書くのは、DRY（Don't Repeat Yourself）の原則に反し、メンテナンス性を低下させます。この問題をエレガントに解決してくれるのが、Railsに組み込まれている`ActiveSupport::Concern`です。

この記事では、`ActiveSupport::Concern`（以下、Concern）を使って、モデル間で共通のロジックをモジュールとして切り出し、コードを再利用可能にする方法を解説します。

## 問題提起: 共通ロジックの重複

まず、Concernがない場合にどのような問題が起きるかを見てみましょう。記事（`Article`）と静的ページ（`StaticPage`）の2つのモデルがあり、どちらも公開・非公開の状態（`status`カラム）と、それに関連する振る舞いを持つとします。

```ruby
# app/models/article.rb
class Article < ApplicationRecord
  enum status: { draft: 0, published: 1 }

  scope :published, -> { where(status: :published) }

  def published?
    status == 'published'
  end

  def publish!
    update(status: :published, published_at: Time.current)
  end
end
```

```ruby
# app/models/static_page.rb
class StaticPage < ApplicationRecord
  enum status: { draft: 0, published: 1 }

  scope :published, -> { where(status: :published) }

  def published?
    status == 'published'
  end

  def publish!
    update(status: :published, published_at: Time.current)
  end
end
```

`enum`, `scope`, `published?`, `publish!`といったコードが完全に重複しています。将来、このロジックに変更（例えば`archived`ステータスを追加するなど）が必要になった場合、すべてのモデルを個別に修正しなければならず、修正漏れやバグの原因となります。

## Concernによる解決策

この共通ロジックを`Publishable`という名前のConcernとして切り出してみましょう。

### 1. Concernモジュールの作成

まず、`app/models/concerns`というディレクトリを作成します。（Rails 5以降はデフォルトで存在します）

```bash
mkdir -p app/models/concerns
```

次に、その中に`publishable.rb`というファイルを作成します。

```ruby
# app/models/concerns/publishable.rb
module Publishable
  extend ActiveSupport::Concern

  included do
    # `include`されたときに、そのクラスのコンテキストで実行されるブロック
    enum status: { draft: 0, published: 1 }

    scope :published, -> { where(status: :published) }
  end

  # ここに定義されたメソッドは、インスタンスメソッドになる
  def published?
    status == 'published'
  end

  def publish!
    update(status: :published, published_at: Time.current)
  end
end
```

### `ActiveSupport::Concern`の魔法

ここで`ActiveSupport::Concern`が重要な役割を果たします。

*   **`extend ActiveSupport::Concern`**: これを記述することで、このモジュールは特別な能力を持つようになります。
*   **`included do ... end`**: これがConcernの核となる機能です。通常のRubyの`Module`では、`scope`や`enum`のようなクラスメソッドをミックスインするのは少し複雑な定型コードが必要でした。しかし、Concernの`included`ブロック内に記述されたコードは、このモジュールが`include`されたクラス（`Article`や`StaticPage`）のクラスコンテキストで直接評価されます。これにより、`scope`や`validates`, `has_many`といったクラスマクロを自然に定義できます。
*   **インスタンスメソッド**: `included`ブロックの外に定義されたメソッド（`published?`など）は、通常通りインスタンスメソッドとしてミックスインされます。

### 2. モデルにConcernを`include`する

作成したConcernを、共通の振る舞いを持たせたいモデルに`include`します。

```ruby
# app/models/article.rb
class Article < ApplicationRecord
  include Publishable

  # Articleモデル固有のロジックはここに書く
  has_many :comments
end
```

```ruby
# app/models/static_page.rb
class StaticPage < ApplicationRecord
  include Publishable

  # StaticPageモデル固有のロジックはここに書く
  validates :slug, presence: true, uniqueness: true
end
```

たった1行`include Publishable`を追加するだけで、重複していたコードは一掃され、`Article`と`StaticPage`の両方のモデルで`published`スコープや`publish!`メソッドが使えるようになります。

```ruby
# rails consoleで確認
Article.published.count
StaticPage.published.count

article = Article.create(status: :draft)
article.published? #=> false
article.publish!
article.published? #=> true
```

これで、将来「公開」に関するロジックを変更する必要が生じた場合も、`app/models/concerns/publishable.rb`というファイルを1つ修正するだけで、すべての関連モデルにその変更が反映されます。

## Concernの利点と注意点

### 利点

*   **DRYの促進**: コードの重複をなくし、メンテナンス性を向上させます。
*   **関心の分離**: モデルの「関心事」を小さな単位に分割できます。「公開可能であること」「タグ付け可能であること」「バージョン管理されること」といった関心事をそれぞれConcernとして切り出すことで、モデル本体はそれらの組み合わせとしてシンプルに表現できます。
*   **可読性の向上**: `include Taggable`, `include Versionable`のように記述することで、そのモデルがどのような能力を持っているのかが一目でわかります。

### 注意点

*   **過剰な使用**: 何でもかんでもConcernに切り出すと、かえってコードの全体像が把握しにくくなることがあります。Concernはあくまで「複数のクラスで共有される、明確に分離可能な振る舞い」を切り出すためのものです。
*   **名前の衝突**: 複数のConcernを`include`する場合、メソッド名が衝突しないように注意が必要です。
*   **巨大なConcern**: 1つのConcernにあらゆる機能を詰め込みすぎると、それ自体が密結合で再利用性の低い塊になってしまいます。Concernもまた、単一責任の原則を意識して設計することが重要です。

## まとめ

`ActiveSupport::Concern`は、Railsアプリケーションのモデル層をクリーンでDRYに保つための強力なツールです。複数のモデルにまたがる共通の振る舞いに気づいたら、それはConcernとして抽出する良い機会です。

重複したコードをリファクタリングし、再利用可能なモジュールへと整理することで、あなたのRailsアプリケーションはより堅牢で、変更に強く、そして読みやすいものになるでしょう。
