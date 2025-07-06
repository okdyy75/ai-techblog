# 29. Sorbetを導入してRailsアプリケーションに型を導入する

## はじめに

Rubyは動的型付け言語であり、その柔軟性が高い生産性の源泉となっています。しかし、大規模なアプリケーションになるほど、型の不整合による実行時エラーや、メソッドの引数・返り値が分かりにくいといった問題に直面することがあります。

**Sorbet**は、Stripe社が開発したRuby向けの静的型チェッカーです。コードに型シグネチャを追加することで、開発中に型の問題を検出し、コードの可読性と堅牢性を向上させることができます。

本記事では、RailsアプリケーションにSorbetを導入し、型のある開発を始めるための第一歩を解説します。

## この記事で学べること

- Sorbetの導入と初期設定方法
- `# typed:` sigilによる型検査レベルの指定
- `sig` を使ったメソッドへの型シグネチャの書き方
- `T.let` を使った変数への型付け

## 1. Sorbetの導入

### 1.1. Gemのインストール

`Gemfile` に `sorbet` と `sorbet-runtime` を追加します。

Gemfile
```ruby
gem 'sorbet', group: :development
gem 'sorbet-runtime'
```

`bundle install` を実行します。

```bash
bundle install
```

### 1.2. 初期設定

以下のコマンドを実行して、Sorbetの初期設定を行います。このコマンドはプロジェクト内のコードをスキャンし、型定義ファイル（RBIファイル）を `sorbet/rbi` ディレクトリに生成します。

```bash
bundle exec srb init
```

これにより、Railsのコアメソッドや依存gemの型情報が生成され、Sorbetが正しくコードを解析できるようになります。

## 2. Sorbetの基本的な使い方

### 2.1. 型検査レベルの指定 (`# typed:`) 

Sorbetは、ファイルごとに型検査の厳密さを指定できます。これはファイルの先頭にコメント（sigil）を追加することで行います。

- `# typed: false` (デフォルト): 型検査を全く行わない。
- `# typed: true`: 型検査を行う。ただし、型シグネチャがないコードも許容する。
- `# typed: strict`: 厳密な型検査。すべてのメソッドにシグネチャが、すべての変数に型が必須。
- `# typed: strong`: `strict` に加え、`T.untyped` の使用を禁止する最も厳密なレベル。

まずは `true` から始めるのが現実的です。

app/models/user.rb
```ruby
# typed: true
class User < ApplicationRecord
  # ...
end
```

### 2.2. メソッドへの型付け (`sig`)

`sig` ヘルパーを使って、メソッドの引数と返り値の型を定義します。

```ruby
# typed: strict
require 'sorbet-runtime'

class Calculator
  extend T::Sig

  sig {params(a: Integer, b: Integer).returns(Integer)}
  def add(a, b)
    a + b
  end
end
```

Railsのモデルに適用してみましょう。

app/models/user.rb
```ruby
# typed: true
class User < ApplicationRecord
  extend T::Sig

  validates :name, presence: true

  sig {returns(String)}
  def formatted_name
    "User: #{name}"
  end

  sig {params(other_user: User).returns(T::Boolean)}
  def name_same_as?(other_user)
    self.name == other_user.name
  end
end
```

### 2.3. 変数への型付け (`T.let`)

`# typed: strict` 以上のレベルでは、ローカル変数にも型を明記する必要があります。`T.let` を使って変数の型を宣言します。

```ruby
# typed: strict

# ...

sig {void}
def process_user
  user = T.let(User.find(1), User)
  puts user.formatted_name
end
```

### 2.4. 主要な型

Sorbetには多くの型が用意されています。

- **基本型**: `T::String`, `T::Integer`, `T::Float`, `T::Boolean`, `T::Symbol`
- **nilを許容**: `T.nilable(String)` は `String` または `nil` を許容します。
- **配列**: `T::Array[Integer]` は整数の配列を表します。
- **ハッシュ**: `T::Hash[Symbol, String]` はシンボルキーと文字列バリューのハッシュを表します。
- **その他**: `T.any(Integer, String)` は整数または文字列のどちらか、`T.untyped` は型検査を放棄します。

## 3. 型チェックの実行

コードに型情報を追加したら、以下のコマンドで静的型チェックを実行できます。

```bash
bundle exec srb tc
```

`tc` は `typecheck` の略です。このコマンドはプロジェクト全体をスキャンし、型エラーがあれば報告します。

```
app/models/user.rb:12: Method `formatted_name` does not exist on `NilClass` https://srb.help/7003
     12 |    puts user.formatted_name
                  ^^^^^^^^^^^^^^^^^^
  Got `NilClass` originating from:
    app/models/user.rb:11: `T.let` inferred a type that was not nilable
     11 |  user = T.let(User.find_by(id: 1), User)
                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Errors: 1
```

上記のエラー例では、`User.find_by` が `nil` を返す可能性があるのに、`User` 型として宣言しているためエラーになっています。`T.nilable(User)` と修正することで解決できます。

## 4. TapiocaによるRBIファイルの自動生成

Railsの動的な性質上、Sorbetがモデルの属性や動的に定義されるメソッドを認識できないことがあります。**Tapioca** は、Railsアプリケーションの状態をロードし、これらの情報をRBIファイルとして生成してくれるツールです。

```bash
# Gemfileに追加
gem 'tapioca', require: false, group: :development

# インストールと設定
bundle install
bundle exec tapioca init

# RBIファイルの生成
bundle exec tapioca sync
```

`tapioca sync` を実行すると、`sorbet/rbi/generated` 以下にモデルの属性などが定義されたRBIファイルが生成され、型チェックの精度が向上します。

## まとめ

Sorbetを導入することで、Railsアプリケーションに静的型チェックの恩恵をもたらすことができます。

- **開発中のエラー発見**: 実行時ではなく、開発・CIの段階で型に関するバグを発見できる。
- **コードの自己文書化**: メソッドのシグネチャが仕様の役割を果たし、コードの理解が容易になる。
- **リファクタリングへの自信**: 型情報がガイドとなり、安全にコードの変更を行える。

既存のプロジェクトに段階的に導入できるのもSorbetの魅力です。まずは `# typed: false` から始め、徐々に型を導入していくことで、大規模なRailsアプリケーションの保守性と品質を向上させることができるでしょう。