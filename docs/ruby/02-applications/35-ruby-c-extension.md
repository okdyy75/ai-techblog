# RubyとC言語連携（拡張ライブラリ作成）

Rubyは柔軟で生産性の高い言語ですが、パフォーマンスが要求される計算集約的な処理には向いていない場合があります。そのようなとき、C言語で書かれた高速な処理をRubyから呼び出す「拡張ライブラリ」を作成するのが有効な解決策です。

この記事では、RubyのC拡張ライブラリを作成する基本的な手順を解説します。

## なぜC言語で拡張するのか？

- **パフォーマンス**: C言語はコンパイル言語であり、実行速度が非常に速い。数値計算や画像処理など、CPUに負荷のかかるタスクをCで実装することで、Rubyプログラム全体を高速化できます。
- **既存のCライブラリの活用**: すでに存在する豊富なCライブラリをRubyから利用することができます。
- **低レベルAPIへのアクセス**: OSのシステムコールなど、Rubyからは直接アクセスしにくい低レベルな機能を利用できます。

## C拡張の基本的な構造

RubyのC拡張は、以下の要素で構成されます。

1.  **ヘッダファイルのインクルード**: `ruby.h`を���ンクルードして、RubyのC APIを利用できるようにします。
2.  **C関数の実装**: Rubyから呼び出したい処理をC言語で記述します。この関数は`VALUE`というRubyオブジェクトを表す型を引数に取り、`VALUE`を返します。
3.  **メソッドの定義**: C関数をRubyのメソッドとして登録します。`rb_define_method`などの関数を使用します。
4.  **初期化関数の定義**: ライブラリが`require`されたときに呼び出される`Init_ライブラリ名`という名前の関数を定義します。この中でメソッド定義を行います。

## 実践：簡単なC拡張の作成

2つの数値を足し算する`FastAdder`というモジュールを作成してみましょう。

### 1. Cソースファイルの作成

`fast_adder.c`という名前でファイルを作成します。

```c
// fast_adder.c
#include "ruby.h"

// Rubyから呼び出されるC関数
// selfはレシーバオブジェクト (今回はFastAdderモジュール)
// aとbが引数
static VALUE fast_add(VALUE self, VALUE a, VALUE b) {
  // RubyのFixnumをCのlongに変換
  long long_a = NUM2LONG(a);
  long long_b = NUM2LONG(b);

  // Cで足し算を実行
  long result = long_a + long_b;

  // CのlongをRubyのFixnumに変換して返す
  return LONG2NUM(result);
}

// 初期化関数 (require 'fast_adder' で呼ばれる)
void Init_fast_adder(void) {
  // FastAdderモジュールを定義
  VALUE mFastAdder = rb_define_module("FastAdder");

  // FastAdderモジュールにfast_addメソッドを定義
  // 第1引数: モジュール
  // 第2引数: Rubyでのメソッド名
  // 第3引数: 対応するC関数ポインタ
  // 第4引数: C関数に渡す引数の数
  rb_define_module_function(mFastAdder, "add", fast_add, 2);
}
```

### 2. `extconf.rb`の作成

C拡張をコンパイルするための`Makefile`を生成するスクリプト`extconf.rb`を作成します。

```ruby
# extconf.rb
require 'mkmf'

# 拡張ライブラリの名前を指定
create_makefile('fast_adder')
```

### 3. コンパイルとインストール

ターミナルで以下のコマンドを実行します。

```bash
# 1. Makefileの生成
ruby extconf.rb

# 2. コンパイル
make

# 3. (オプション) ライブラリのインストール
make install
```

これにより、`fast_adder.so`（macOSの場合）や`fast_adder.bundle`といった共有ライブラリが生成されます。

### 4. Rubyからの呼び出し

IRBやRubyスクリプトから作成した拡張ライブラリを使ってみましょう。

```ruby
require './fast_adder'

include FastAdder

puts add(10, 20) #=> 30

# モジュール関数としても呼び出せる
puts FastAdder.add(100, 200) #=> 300
```

## 注意点

- **型変換**: RubyのオブジェクトとCのデータ型を相互に変換する必要があります（例: `NUM2LONG`, `StringValueCStr`）。
- **ガベージコレクション**: RubyのGCを意識する必要があります。C拡張内でRubyオブジェクトへの参照を保持する場合は、`rb_gc_register_address`などでGCから保護する必要があります。
- **エラー処理**: Rubyの例外を発生させるには`rb_raise`関数を使用します。

## まとめ

RubyのC拡張は、パフォーマンスが重要な場面で非常に強力な武器となります。最初は複雑に感じるかもしれませんが、基本的な構造を理解すれば、C言語のパワーをRubyアプリケーションに組み込むことができます。

`Rice`や`Fiddle`といった、より簡単にC/C++と連携できるライブラリも存在するため、用途に応じて使い分けるのが良いでしょう。