# Rubyの委譲（Delegation）

委譲（Delegation）は、オブジェクトが自身の処理の一部を別のオブジェクト（デリゲート）に委ねるデザインパターンです。Rubyでは、このパターンを簡単に実現するための仕組みが標準ライブラリで提供されています。

## なぜ委譲を使うのか？

- **関心の分離**: オブジェクトの責務を分割し、コードをクリーンに保ちます。
- **継承の代替**: 継承は強力ですが、クラス間の結合を強くします。委譲はより柔軟な関係を築けます。
- **コードの再利用**: 共通の機能をデリゲートオブジェクトにまとめることで、再利用性が高まります。

## 1. `Forwardable`モジュール

`Forwardable`モジュールは、メソッドの委譲を宣言的に記述するための最も一般的な方法です。

```ruby
require 'forwardable'

class Playlist
  extend Forwardable

  # @songs配列の :[], :size, :map メソッドを self.[] のように呼び出せるようにする
  def_delegators :@songs, :[], :size, :map

  def initialize
    @songs = ["Song A", "Song B", "Song C"]
  end
end

playlist = Playlist.new
p playlist.size    #=> 3
p playlist[1]      #=> "Song B"
p playlist.map { |s| s.upcase } #=> ["SONG A", "SONG B", "SONG C"]
```

- `extend Forwardable`: クラスに`Forwardable`の機能を追加します。
- `def_delegators`: 最初の引数（デリゲート先オブジェクト）に、後続のメソッド群を委譲します。

## 2. `SimpleDelegator`クラス

`SimpleDelegator`は、ラップしたオブジェクトに全てのメソッド呼び出しを自動的に委譲するクラスです。デコレータパターンを実装するのに便利です。

```ruby
require 'delegate'

class User
  def name
    "Alice"
  end
end

class UserDecorator < SimpleDelegator
  def decorated_name
    "*** #{name} ***"
  end
end

user = User.new
decorated_user = UserDecorator.new(user)

p decorated_user.name           #=> "Alice" (Userオブジェクトに委譲)
p decorated_user.decorated_name #=> "*** Alice ***" (Decorator自身のメソッド)
```
`UserDecorator`は`User`オブジェクトをラップし、`name`メソッドは`user`に委譲されますが、独自の`decorated_name`メソッドを追加で提供しています。

## 3. `Delegate`クラス

`Delegate`は`SimpleDelegator`の親クラスで、より詳細なカスタマイズが必要な場合に使用されますが、ほとんどの場合は`SimpleDelegator`で十分です。

## まとめ

| 方法 | 特徴 | ユースケース |
| --- | --- | --- |
| **`Forwardable`** | 特定のメソッドを選択して委譲する。宣言的で分かりやすい。 | オブジェクトの一部機能だけを外部に公開したい場合。（コンポジション） |
| **`SimpleDelegator`** | ほぼ全てのメソッドを自動的に委譲する。 | オブジェクトの振る舞いを動的に拡張・変更したい場合。（デコレータ） |

委譲は、Rubyにおいて柔軟で保守性の高いコードを書くための重要なテクニックです。適切に使うことで、複雑なオブジェクトの関係性をシンプルに表現できます。
