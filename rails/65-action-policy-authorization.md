# Action Policy: Punditに代わる次世代の認可ライブラリ

Railsアプリケーションで認証（Authentication）と並んで重要なのが、**認可（Authorization）**です。認証が「誰であるか」を確認するのに対し、認可は「その人が何をしてよいか」を決定するプロセスです。

Railsの認可ライブラリとしては、`CanCanCan`や`Pundit`が長年にわたり広く使われてきました。特にPunditは、シンプルでオブジェクト指向的なアプローチが多くの開発者に支持されています。

しかし、Punditにもいくつかの課題（例えば、グローバルな`current_user`への依存、テストのしにくさなど）がありました。そうした課題を解決し、よりモダンで柔軟な認可システムを構築するために登場したのが、**Action Policy**です。

この記事では、Action PolicyがPunditとどう違うのか、そしてその強力な機能と使い方について解説します。

## Action Policyとは？

Action Policyは、Punditに強くインスパイアされつつも、その設計をさらに洗練させた認可ライブラリです。その名前の通り、「**アクション**（何をするか）」と「**ポリシー**（誰が、何を、できるか）」を基本概念としています。

### Punditとの主な違いとAction Policyの強み

1.  **明示的なコンテキスト（Explicit Context）**
    - **Pundit**: ポリシー内で`user`という名前で`current_user`を暗黙的に参照します。
    - **Action Policy**: `authorize!`メソッドを呼び出す際に、認可のコンテキスト（誰が、どのような権限で）を**明示的に**渡します。これにより、`current_user`だけでなく、APIトークンを持つクライアントや、特定の役割（`role`）など、様々な認可コンテキストを柔軟に扱うことができます。

2.  **パフォーマンス**
    - ポリシークラスのインスタンスがリクエスト内でキャッシュされ、再利用されます。これにより、同じリクエスト内で何度も認可チェックが行われる場合のオーバーヘッドが削減されます。

3.  **テストの容易さ**
    - ポリシーのテストを書くための専用のRSpecマッチャー（`be_allowed_to`）が提供されており、テストが非常に書きやすいです。

4.  **豊富な機能**
    - ポリシーの事前チェック（`pre_check`）。例えば、管理者はすべての操作を許可する、といった共通ルールを定義できます。
    - ポリシーのスコープ機能がより強化され、キャッシュ可能です。
    - `reasons`（理由）のサポート。なぜ認可が失敗したのか、詳細な理由を返すことができます。これはAPIのエラーレスポンスなどで非常に役立ちます。

## セットアップと基本的な使い方

### 1. インストール

`Gemfile`に`action_policy`を追加して`bundle install`します。

```ruby
# Gemfile
gem "action_policy"
```

### 2. ベースポリシーの作成

ジェネレータを使って、すべてのポリシーが継承するベースクラスを作成します。

```bash
rails g action_policy:install
```

これにより`app/policies/application_policy.rb`が生成されます。

### 3. ポリシーの作成

特定のモデル（例: `Article`）に対するポリシーを作成します。

```bash
rails g action_policy:policy Article
```

`app/policies/article_policy.rb`が生成されます。

```ruby
# app/policies/article_policy.rb
class ArticlePolicy < ApplicationPolicy
  # `user`という名前はPunditと同じですが、これは単なる引数名です。
  # `authorization_context`で渡したハッシュのキーに依存します。

  def index?
    true # 誰でも一覧は見れる
  end

  def show?
    # 公開中の記事、または自分の記事なら見れる
    record.published? || user == record.author
  end

  def create?
    user.present? # ログインしていれば作成できる
  end

  def update?
    # 記事の著者だけが更新できる
    user == record.author
  end

  def destroy?
    # 管理者、または記事の著者だけが削除できる
    user.admin? || user == record.author
  end
end
```

- `user`: 認可の対象となるユーザー（またはそれに類するもの）。
- `record`: 認可の対象となるオブジェクト（この場合は`Article`のインスタンス）。

### 4. コントローラーでの利用

コントローラーで`authorize!`メソッドを使って認可チェックを行います。

```ruby
# app/controllers/articles_controller.rb
class ArticlesController < ApplicationController
  # `implicit_authorization_target` を設定すると、
  # `authorize!`時に `@article` を明示的に渡す必要がなくなる
  implicit_authorization_target :@article

  def show
    @article = Article.find(params[:id])
    authorize! @article # または authorize! to: :show?
  end

  def update
    @article = Article.find(params[:id])
    authorize! @article, to: :update?

    if @article.update(article_params)
      # ...
    else
      # ...
    end
  end

  # 認可コンテキストをカスタマイズ
  def authorization_context
    { user: current_user, account: current_account }
  end
end
```

- `authorize! @article, to: :update?`: `@article`オブジェクトに対して、`ArticlePolicy`の`update?`ルールを適用して認可チェックを行います。失敗した場合は`ActionPolicy::Unauthorized`例外が発生します。
- `authorization_context`: ここで返されるハッシュが、ポリシーのメソッドに引数として渡されます。`{ user: current_user }`とすれば、ポリシー内で`user`として`current_user`を参照できます。

### 5. スコープ

一覧ページなどで、現在のユーザーが見ることのできるレコードだけを絞り込むためにスコープを使います。

```ruby
# app/policies/article_policy.rb
class ArticlePolicy < ApplicationPolicy
  # ...

  def apply_scope(scope, type: :active_record_relation)
    # 管理者ならすべての記事を返す
    return scope.all if user.admin?

    # それ以外は、公開中の記事と自分の下書き記事を返す
    scope.where(published: true).or(scope.where(author: user))
  end
end
```

コントローラーでは`authorized_scope`を使います。

```ruby
# app/controllers/articles_controller.rb
def index
  @articles = authorized_scope(Article.all)
end
```

## まとめ

Action Policyは、Punditのシンプルさを継承しつつ、その弱点を克服し、より堅牢で柔軟な認可システムを構築するための現代的なライブラリです。

- **明示的なコンテキスト**により、`current_user`への依存から解放される。
- **パフォーマンス**が考慮されており、キャッシュ機構が組み込まれている。
- **テストが書きやすく**、品質を維持しやすい。
- **失敗の理由（reasons）**を返せるなど、API開発に便利な機能が豊富。

Punditに慣れている開発者であれば、Action Policyへの移行は比較的スムーズです。その設計思想の違いを理解すれば、よりクリーンでメンテナンス性の高いコードを書くことができるようになります。

これから新しいRailsプロジェクトで認可機能を実装するなら、Action Policyは第一の選択肢として検討する価値のある、非常に優れたライブラリです。
