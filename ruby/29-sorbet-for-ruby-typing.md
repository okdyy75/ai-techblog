# Sorbetを使ったRubyの型付け

Sorbetは、Stripeによって開発された、Rubyのための高速で強力な静的型チェッカーです。動的な性質を持つRubyコードに型情報を付加することで、コードの可読性や保守性を向上させ、大規模なコードベースでの開発を支援します。

## Sorbetの導入

Sorbetをプロジェクトに導入するには、まず`Gemfile`に`sorbet`と`sorbet-runtime`を追加します。

```ruby
# Gemfile
gem 'sorbet', group: :development
gem 'sorbet-runtime'
```

次に、バンドルインストールとSorbetの初期化を行います。

```bash
bundle install
bundle exec srb init
```

これにより、`sorbet/config`などの設定ファイルが生成されます。

## 型シグネチャの記述

Sorbetでは、メソッドの定義の上に`sig`ブロックを使って型シグネチャを記述します。

ファイルの先頭には、型チェックのレベルを指定するコメントを追加します。`# typed: true`が一般的です。

```ruby
# typed: true
require 'sorbet-runtime'

class MyClass
  extend T::Sig

  sig {params(name: String).returns(String)}
  def greet(name)
    "Hello, #{name}!"
  end
end
```

-   `extend T::Sig`: `sig`メソッドを使えるようにするためのおまじないです。
-   `sig { ... }`: 型シグネチャのブロックを定義します。
-   `params(...)`: 引数の型を指定します。
-   `returns(...)`: 戻り値の型を指定します。

## 型チェックの実行

型チェックは`srb`コマンドで行います。

```bash
bundle exec srb tc
```

`tc`は`typecheck`の略です。コードに型エラーがあれば、ファイル名と行番号とともにエラー内容が出力されます。

## Sorbetの型

Sorbetは、基本的な型（`String`, `Integer`, `Boolean`など）に加えて、より複雑な型もサポートしています。

-   `T.nilable(Type)`: `Type`または`nil`を許容します。
-   `T::Array[Type]`: 指定された型の要素を持つ配列。
-   `T::Hash[KeyType, ValueType]`: 指定されたキーと値の型を持つハッシュ。
-   `T.any(Type1, Type2)`: `Type1`または`Type2`のいずれかの型を許容します。
-   `T.untyped`: 型を指定したくない場合や、動的なコードを扱う場合に使用します。

## 構造体 (T::Struct)

`T::Struct`を使うと、型付けされた構造体を簡単に定義できます。

```ruby
# typed: true
class User < T::Struct
  const :id, Integer
  prop :name, String
end

user = User.new(id: 1, name: "Alice")
puts user.name # => "Alice"

# user.id = 2 #=> Error! `const`は読み取り専用
# user.name = 123 #=> Type error!
```

-   `const`: 読み取り専用のプロパティを定義します。
-   `prop`: 読み書き可能なプロパティを定義します。

## メリットとデメリット

**メリット:**
-   バグの早期発見
-   コードの可読性と自己文書化の向上
-   IDEによる補完やリファクタリングの支援
-   大規模なコードベースの保守性向上

**デメリット:**
-   型シグネチャを記述する手間がかかる
-   Rubyの動的な特性を一部制限する可能性がある
-   導入時に既存のコードへの対応が必要

## まとめ

Sorbetは、Rubyの柔軟性を保ちつつ、静的型チェックの恩恵を享受するための強力なツールです。特に、大規模で長期的なプロジェクトにおいて、コードの品質と開発効率を向上させる上で大きな助けとなります。
