# mruby/CRubyの違い

Rubyのエコシステムには、複数の実装が存在します。その中でも最も広く使われているのがCRuby（MRI）であり、もう一つ注目すべき実装としてmrubyがあります。両者は異なる設計思想と目的を持っており、ユースケースに応じて使い分けられます。

## CRuby (MRI - Matz's Ruby Interpreter)

CRubyは、Ruby言語の公式なリファレンス実装です。一般的に「Ruby」と言う場合、多くの場合はCRubyを指します。

-   **目的**: 汎用的なプログラミング言語としての利用。Webアプリケーション（Ruby on Rails）、スクリプティング、ツール開発など、幅広い用途で使われます。
-   **特徴**:
    -   豊富な標準ライブラリと、RubyGemsによる膨大な数のサードパーティライブラリ（gem）エコシステム。
    -   動的な性質が強く、柔軟なプログラミングが可能。
    -   JIT（Just-In-Time）コンパイラ（YJIT）の導入により、パフォーマンスが向上している。
    -   比較的多くのメモリを消費する。
-   **主な用途**:
    -   Webアプリケーション開発 (Ruby on Rails, Sinatra)
    -   コマンドラインツール
    -   汎用スクリプティング

## mruby

mrubyは、Rubyの作者であるまつもとゆきひろ氏が設計した、軽量なRubyの実装です。

-   **目的**: 組み込みシステムや、他のアプリケーションへの組み込み。リソースが限られた環境での動作を想定しています。
-   **特徴**:
    -   **軽量・省メモリ**: 必要な機能だけを選択してコンパイルできるため、バイナリサイズとメモリ使用量を小さく抑えられます。
    -   **組み込みやすさ**: C言語のアプリケーションに簡単に組み込むことができます。
    -   **サンドボックス**: 実行環境を分離するサンドボックス機能があり、安全性が高い。
    -   **バイトコード実行**: スクリプトを事前にバイトコードにコンパイルして実行することができます（`mrbc`）。
    -   **標準ライブラリが最小限**: CRubyに比べて標準ライブラリは少なく、必要なものは`mrbgems`という仕組みで追加します。
-   **主な用途**:
    -   IoTデバイスや組み込み機器
    -   ゲームエンジン（例: スクリプト言語として）
    -   ミドルウェア（例: Nginx, Redisの拡張）
    -   モバイルアプリケーションの一部

## 主な違いの比較表

| 項目               | CRuby (MRI)                               | mruby                                           |
|--------------------|-------------------------------------------|-------------------------------------------------|
| **主な用途**       | 汎用プログラミング、Webアプリケーション   | 組み込みシステム、アプリケーションへの組み込み  |
| **リソース消費**   | 比較的大きい                              | 軽量、省メモリ                                  |
| **ライブラリ**     | RubyGemsによる豊富なエコシステム          | mrbgemsによる選択的なライブラリ追加             |
| **実行モデル**     | インタプリタ実行、JITコンパイル           | インタプリタ実行、AOT（事前）コンパイル         |
| **バイナリ**       | Rubyインタプリタが必要                    | スタンドアロンの実行バイナリを生成可能          |
| **設計思想**       | 開発者の生産性（"楽しさ"）                | 軽量性、ポータビリティ、組み込みやすさ          |

## どちらを選ぶか？

-   **Webサービスや一般的なアプリケーションを開発したい場合**: 迷わず**CRuby**を選びます。Railsをはじめとする強力なフレームワークや豊富なgemを利用できます。
-   **メモリやCPUに制約のあるデバイスでRubyを動かしたい場合**: **mruby**が最適な選択です。リソースを節約し、必要な機能だけを搭載したカスタムのRuby環境を構築できます。
-   **既存のC/C++アプリケーションにスクリプト機能を追加したい場合**: **mruby**の組み込みやすさが活きます。

## まとめ

CRubyとmrubyは、同じRubyの文法を持ちながらも、その設計思想と得意な領域が明確に異なります。CRubyが汎用性と生産性を追求する一方で、mrubyは軽量性と組み込みやすさに特化しています。この違いを理解することで、プロジェクトの要件に最適なRuby実装を選択することができます。