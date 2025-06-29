# Dry-rbエコシステム（dry-validation, dry-structなど）の紹介

Rubyはその柔軟性から多くの人に愛されていますが、大規模なアプリケーションを構築する際には、その動的な性質が逆に管理の難しさを引き起こすこともあります。型がないことによる不安、意図しない副作用、複雑に絡み合ったビジネスロジックなどは、多くの開発者が直面する課題です。

こうした課題に対処するために生まれたのが、**Dry-rb**というRuby gemのエコシステムです。Dry-rbは、関数型プログラミングの原則と厳格な設計思想を取り入れた、再利用可能で堅牢なコンポーネント群を提供します。

この記事では、Dry-rbエコシステムの中心的なgemである`dry-validation`と`dry-struct`を中心に、その魅力と使い方を紹介します。

## Dry-rbとは？

Dry-rbは、「Don't Repeat Yourself」の原則を推し進め、より宣言的で、構成可能（composable）で、副作用の少ない（less side-effects）コードを書くことを目的としたライブラリ群です。

RailsのActive RecordやActive Supportが「何でもあり（all-in-one）」で便利な機能を提供するのとは対照的に、Dry-rbの各gemは、一つの特定の責務に特化しており、非常に軽量です。そして、それらを組み合わせることで、堅牢なシステムを構築できるよう設計されています。

## `dry-validation`: 強力で柔軟なデータ検証

`dry-validation`は、データ（例えば、コントローラーに送られてきた`params`ハッシュ）の検証を行うためのライブラリです。Active Recordのバリデーションと似ていますが、より強力で表現力豊かなDSL（ドメイン固有言語）を提供します。

### 特徴

- **DB非依存**: モデルやデータベースから完全に独立して、あらゆるデータ構造を検証できます。
- **型チェック**: 単なる存在チェックだけでなく、値が期待する型（Integer, String, Dateなど）であるかを厳密にチェックします。
- **高度なルール**: 「`end_date`は`start_date`より後でなければならない」といった、複数の値にまたがる複雑なルールを簡潔に記述できます。
- **詳細なエラーメッセージ**: 検証に失敗した理由が、構造化されたデータとして返されるため、APIのエラーレスポンス生成などが容易です。

### 使い方

```ruby
require 'dry-validation'

class RegistrationContract < Dry::Validation::Contract
  params do
    required(:email).filled(:string)
    required(:age).value(:integer)
    optional(:promo_code).maybe(:string, min_size?: 3)
  end

  rule(:email) do
    key.failure("must be a valid email format") unless /\A[\w+\-.]+@[a-z\d\-.]+\.[a-z]+\z/i.match?(value)
  end

  rule(:age) do
    key.failure("must be 18 or older") if value < 18
  end
end

contract = RegistrationContract.new
result = contract.call(email: "test@example.com", age: 20)

result.success? #=> true
result.to_h     #=> { email: "test@example.com", age: 20 }

result = contract.call(email: "invalid", age: 17)

result.success? #=> false
result.errors.to_h
#=> {
#     :email=>["must be a valid email format"],
#     :age=>["must be 18 or older"]
#   }
```

- `params`ブロックで、キーの必須/任意、型、基本的な制約を定義します。
- `rule`ブロックで、より複雑なカスタムルールを記述します。
- `call`メソッドの結果は、成功か失敗か、そして詳細なエラー情報を持つオブジェクトとして返されます。

## `dry-struct`: 型付けされた不変なデータ構造

`dry-struct`は、Rubyで型付きの構造体（Struct）を定義するためのライブラリです。`Struct`や`OpenStruct`と似ていますが、より厳格で安全な特徴を持っています。

### 特徴

- **厳格な型付け**: 属性ごとに型を定義し、不正な型の値が代入されるとエラーになります。
- **不変性 (Immutability)**: 一度生成された`dry-struct`オブジェクトの値を後から変更することはできません。これにより、意図しない副作用を防ぎ、安全なコードになります。
- **デフォルト値**: 属性にデフォルト値を設定できます。

### 使い方

```ruby
require 'dry-struct'

module Types
  include Dry.Types()
end

class User < Dry::Struct
  attribute :name, Types::String
  attribute :age,  Types::Coercible::Integer # "25"のような文字列を整数に変換してくれる
  attribute :admin, Types::Bool.default(false)
end

user = User.new(name: "Alice", age: "25")

user.name  #=> "Alice"
user.age   #=> 25
user.admin #=> false

# 不変なので変更しようとするとエラーになる
# user.age = 26 #=> NoMethodError

# 不正な型を渡すとエラーになる
# User.new(name: "Bob", age: "twenty") #=> Dry::Struct::Error
```

`dry-validation`と`dry-struct`を組み合わせることで、外部からの入力を安全に検証し、型が保証された不変のオブジェクトに変換してから、アプリケーションのコアロジックに渡す、というクリーンなデータフローを構築できます。

## Dry-rbエコシステムの他の主要なgem

- **`dry-system`**: アプリケーションのコンポーネント（クラスやオブジェクト）を登録し、依存性注入（DI）を管理するためのコンテナ。
- **`dry-monads`**: `Result`（成功/失敗）や`Maybe`（nilの可能性）といったモナドを提供し、エラーハンドリングをより関数型スタイルで記述できるようにする。
- **`dry-logic`**: `dry-validation`のルールエンジンのコア部分。再利用可能な述語ロジックを組み立てるためのライブラリ。
- **`dry-configurable`**: クラスやモジュールに設定機能を追加するためのgem。

## まとめ

Dry-rbは、Railsの「魔法のような」便利さとは対極にある、明示的で、厳格で、規律を求めるツール群です。そのため、小規模なプロジェクトでは過剰に感じられるかもしれません。

しかし、アプリケーションが大規模化し、長期的なメンテナンス性が重要になってくると、Dry-rbが提供する以下のメリットが光り始めます。

- **安全性**: 厳格な型チェックと不変性により、多くのバグを未然に防ぐ。
- **明確さ**: コードの責務が明確に分離され、何がどこで行われているかが分かりやすくなる。
- **構成可能性**: 小さな部品を組み合わせて、複雑なシステムを構築できる。
- **テスト容易性**: 各コンポーネントが独立しているため、テストが書きやすい。

Trailblazerアーキテクチャが内部でDry-rbのgemを多用していることからも分かるように、これらは大規模で堅牢なRubyアプリケーションを構築するための強力な基盤となります。

もしあなたがRubyの動的な性質に起因する問題に悩んでいるなら、Dry-rbのエコシステムを探求してみることを強くお勧めします。
