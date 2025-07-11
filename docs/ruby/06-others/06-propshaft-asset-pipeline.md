# Propshaft: Sprocketsに代わるアセットパイプライン

## はじめに
Propshaftは、Rails 7で導入された新しいアセットパイプラインライブラリです。従来のSprocketsに代わる、よりシンプルで高速な選択肢として設計されました。

## Propshaftとは
Propshaftは、主に静的ファイルの配信に焦点を当てたアセットパイプラインです。Sprocketsのようなアセットの変換や結合機能は持たず、ファイルのダイジェスト付与と配信という基本的な役割に特化しています。

## 主な特徴
- **シンプルさ:** 設定が非常にシンプルで、規約に基づいています。
- **パフォーマンス:** 事前コンパイルが不要で、開発中の起動が高速です。
- **ESM/Import Mapsとの連携:** JavaScriptのビルドは`jsbundling-rails`や`importmap-rails`に任せ、PropshaftはCSSや画像などの静的アセットの配信に集中します。

## Sprocketsとの違い
| 機能 | Propshaft | Sprockets |
|---|---|---|
| アセット変換 | なし | あり (Sass, CoffeeScriptなど) |
| アセット結合 | なし | あり |
| 事前コンパイル | 不要 | 必要 |
| 設定 | シンプル | 複雑 |

## まとめ
Propshaftは、モダンなフロントエンド開発の潮流に合わせた、シンプルで高速なアセットパイプラインです。新しいRailsアプリケーションではデフォルトの一つとなっており、その設計思想を理解することは重要です。
