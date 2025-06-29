# Railsにおけるマルチデータベース接続のセットアップと活用法

Rails 6から、複数のデータベースへの接続をネイティブでサポートする機能が導入されました。これにより、単一のRailsアプリケーションから、プライマリデータベース（書き込み用）とレプリカデータベース（読み取り用）、あるいは全く異なる目的を持つ複数のデータベースをシームレスに扱うことが可能になりました。

この記事では、Railsのマルチデータベース機能のセットアップ方法と、その具体的な活用シナリオについて解説します。

## なぜマルチデータベースが必要なのか？

マルチデータベースが有効なシナリオはいくつかあります。

1.  **リードレプリカによる負荷分散**: 書き込み処理はプライマリDB、読み取り処理はリードレプリカDBに振り分けることで、データベースの負荷を分散し、アプリケーション全体のパフォーマンスを向上させます。これは最も一般的なユースケースです。
2.  **レガシーシステムとの連携**: 既存の古いデータベースからデータを参照しつつ、新しいアプリケーションでは別のモダンなデータベースを利用する、といった場合に役立ちます。
3.  **マイクロサービスアーキテクチャ**: 各サービスが独自のデータベースを持つ構成で、一部のデータを共有・参照する必要がある場合に利用できます。
4.  **データの分離**: 分析用のデータベースやログ用のデータベースなど、主たるデータとは異なるライフサイクルを持つデータを物理的に分離して管理したい場合に有効です。

## セットアップ方法

セットアップは`config/database.yml`に設定を追加するだけで簡単に行えます。

### 1. `database.yml`の設定

プライマリDBとリードレプリカDBを持つ構成を例に設定します。

```yaml
# config/database.yml
production:
  primary:
    <<: *default
    database: myapp_production
    # 書き込み用のDB設定
    adapter: postgresql
    ...
  primary_replica:
    <<: *default
    database: myapp_production_replica
    # 読み取り用のDB設定
    replica: true
    ...
```

重要なポイントは以下の通りです。

- `production`環境下に、論理的な接続名（ここでは`primary`と`primary_replica`）を定義します。
- 書き込み用のデータベース設定には特別な指定は不要です。これがデフォルトの接続先となります。
- 読み取り用のデータベース設定には`replica: true`というフラグを追加します。これにより、この接続先がレプリカであることがRailsに伝わります。

### 2. モデルでの接続設定

次に、アプリケーション全体でこの設定を有効にするために、`ApplicationRecord`を修正します。

```ruby
# app/models/application_record.rb
class ApplicationRecord < ActiveRecord::Base
  self.abstract_class = true

  connects_to database: { writing: :primary, reading: :primary_replica }
end
```

`connects_to`メソッドを使い、書き込み（`writing`）には`:primary`接続を、読み取り（`reading`）には`:primary_replica`接続を使用するようRailsに指示します。

これだけで、基本的なセットアップは完了です。

## 自動的な接続切り替え

上記の設定を行うと、Railsはリクエストの種類に応じて自動的にデータベース接続を切り替えてくれます。

- **書き込みリクエスト**: `POST`, `PUT`, `DELETE`, `PATCH`といったHTTPメソッドのリクエストは、自動的に`writing`（プライマリDB）に接続されます。
- **読み取りリクエスト**: `GET`, `HEAD`といったHTTPメソッドのリクエストは、基本的に`reading`（レプリカDB）に接続されます。

ただし、`GET`リクエストであっても、リクエストを受け取ってから一定時間（デフォルトでは2秒）以内に書き込みが発生した場合、その`GET`リクエストもプライマリDBに接続されるようになります。これは、書き込み直後にレプリケーションの遅延によって古いデータを読んでしまうことを防ぐための仕組みです。

## 手動での接続切り替え

自動切り替えだけでは対応できない複雑なケースでは、ブロックを使って手動で接続先を明示的に指定することも可能です。

```ruby
# 長時間かかるレポート生成など、必ずレプリカを参照させたい場合
ActiveRecord::Base.connected_to(role: :reading) do
  # このブロック内の処理はすべてレプリカDBに接続される
  @reports = HeavyReportGenerator.generate
end

# トランザクション内で、一部の処理を別DBで行いたい場合（※注意が必要）
ActiveRecord::Base.connected_to(role: :writing) do
  User.transaction do
    # ... 書き込み処理 ...

    ActiveRecord::Base.connected_to(role: :another_db) do
      # 別のDBへのログ書き込みなど
      AuditLogger.log("...")
    end
  end
end
```

`connected_to`ブロックを使うことで、特定の処理ブロック内での接続先を柔軟にコントロールできます。

## 異なるデータベースへの接続

リードレプリカ構成だけでなく、全く異なるデータベース（例えば、レガシーシステムのDB）に接続することも可能です。

### `database.yml`

```yaml
# config/database.yml
development:
  primary:
    ...
  legacy_db:
    <<: *default
    database: legacy_database
    adapter: mysql2
    ...
```

### モデルの定義

特定のモデルだけを別DBに接続させたい場合は、そのモデルで`connects_to`を定義します。

```ruby
# app/models/legacy_user.rb
class LegacyUser < ApplicationRecord
  self.table_name = 'users' # テーブル名が異なる場合は指定

  connects_to database: { writing: :legacy_db, reading: :legacy_db }
end
```

これにより、`LegacyUser`モデルに関するすべての操作は`legacy_db`に接続されるようになります。

## まとめ

Railsのマルチデータベース機能は、アプリケーションのスケールアウトや、複雑なシステム連携を実現するための強力なツールです。

- `database.yml`と`ApplicationRecord`の簡単な設定で、リードレプリカ構成を導入できる。
- Railsがリクエストに応じて書き込み/読み取り接続を自動で切り替えてくれる。
- `connected_to`ブロックを使えば、手動での柔軟な接続制御も可能。
- 異なる種類のデータベースにもシームレスに接続できる。

データベースの負荷が問題になってきた場合や、外部システムとの連携が必要になった際には、ぜひこの機能の活用を検討してみてください。
