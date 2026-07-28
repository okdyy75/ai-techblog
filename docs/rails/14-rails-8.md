Warning: 256-color support not detected. Using a terminal with at least 256-color support is recommended for a better visual experience.
YOLO mode is enabled. All tool calls will be automatically approved.
YOLO mode is enabled. All tool calls will be automatically approved.
Ripgrep is not available. Falling back to GrepTool.
---
title: Rails 8新機能徹底解説：Redis不要の「脱・外部依存」で加速するモダン開発
---

# Rails 8新機能徹底解説：Redis不要の「脱・外部依存」で加速するモダン開発

Ruby on Railsは、常に「開発者の幸福」を使命に掲げ、進化を続けてきました。2024年後半にリリースされたRails 8は、その進化の中でも特に大きな転換点となりました。DHHが提唱する「One-Person Framework（一人でも開発・運用しきれるフレームワーク）」のビジョンを具現化し、Redisなどの外部依存を可能な限り排除した新しい標準構成が提示されています。

本記事では、中級エンジニアの皆様を対象に、Rails 8で導入された主要機能とその設計思想、そして実務に役立つコード例を徹底解説します。

---

## 1. Rails 8の設計思想：Redisからの脱却

これまでのRailsアプリケーションにおいて、バックグラウンドジョブ（Sidekiq）、キャッシュ、そしてAction Cable（WebSocket）を利用するにはRedisが事実上の標準でした。しかし、Redisの運用はインフラの複雑性を増大させ、特に小規模から中規模のプロジェクトにおいてはオーバーヘッドとなりがちでした。

Rails 8では、これらを「データベース（主にSQLiteやPostgres）で完結させる」ための**Solidシリーズ**が標準採用されました。

### 外部依存の変化（Before vs After）

| 機能 | Rails 7以前 | Rails 8 (デフォルト) |
| :--- | :--- | :--- |
| バックグラウンドジョブ | Redis + Sidekiq / Delayed Job | **Solid Queue** (DB-backed) |
| キャッシュストア | Redis / Memcached | **Solid Cache** (DB-backed) |
| Action Cable | Redis / PostgreSQL | **Solid Cable** (DB-backed) |
| デプロイツール | Capistrano / Heroku / AWS | **Kamal 2** |
| プロキシサーバー | Nginx / Apache | **Thruster** |

---

## 2. Solid Queue：データベースによるジョブ管理

Rails 8のデフォルトのアダプタとなった**Solid Queue**は、データベースを利用した高性能なキューイングライブラリです。

### なぜ今、データベースなのか？
かつて、DBによるジョブ管理はパフォーマンスが懸念されていました。しかし、現代のSSDの普及と、PostgreSQLの`FOR UPDATE SKIP LOCKED`のような行ロック機能の洗練、そしてSQLiteのWALモードの進化により、数千件/秒のジョブ処理であればDBで十分に事足りるようになりました。

### 設定と使い方
`config/application.rb` で自動的に設定されますが、明示的に変更する場合は以下のようになります。

```ruby
# config/environments/production.rb
config.active_job.queue_adapter = :solid_queue
```

Solid Queueは複数のキュー、優先度、ポーリング間隔などを詳細に設定可能です。

```yaml
# config/solid_queue.yml
production:
  dispatchers:
    - polling_interval: 1.second
      batch_size: 500
  workers:
    - queues: ["default", "mailers"]
      threads: 5
      polling_interval: 0.1.seconds
```

---

## 3. Solid Cache：DBをキャッシュストアに

**Solid Cache**は、Redisの代わりにデータベースをキャッシュストアとして利用します。

### 特徴
- **大容量キャッシュ**: メモリが高価なRedisに対し、ディスクベースのDBならテラバイト級のキャッシュも安価に保持できます。
- **永続性**: デプロイや再起動でキャッシュが消える心配がありません。

### 実装例
`config/environments/production.rb` での設定：

```ruby
config.cache_store = :solid_cache_store
```

コード上での使い方は、従来の `Rails.cache` と全く同じです。

```ruby
# コントローラーやモデルでの利用
@user_data = Rails.cache.fetch("user_#{id}_profile", expires_in: 24.hours) do
  # 重い処理
  User.find(id).expensive_calculation
end
```

---

## 4. 組み込み認証機能（Authentication Generator）

Rails 8の目玉機能の一つが、ついに公式から提供された**認証ジェネレーター**です。「Deviseは重すぎるしブラックボックス、かといって自作するのは面倒」という長年の悩みに終止符を打ちます。

### 実行コマンド
```bash
bin/rails generate authentication
```

このコマンドを実行すると、以下のファイルが自動生成されます。
- `User` モデル（パスワードハッシュ化済み）
- `Session` モデル
- `SessionsController`
- 認証用の `Concerns`
- ログインフォーム等のView

### 生成されるコードの思想
Deviseのような「Gemの中にある魔法」ではなく、**自分のアプリのディレクトリ直下にコードが出力される**のが最大の特徴です。これにより、要件に合わせたカスタマイズが極めて容易になります。

```ruby
# app/controllers/concerns/authenticated.rb (生成されるコードの例)
module Authenticated
  extend ActiveSupport::Concern

  included do
    before_action :require_authentication
    helper_method :authenticated?
  end

  private
    def authenticated?
      Current.session.present?
    end

    def require_authentication
      restore_authentication || request_authentication
    end

    def restore_authentication
      if session = Session.find_by(id: cookies.signed[:session_id])
        Current.session = session
      end
    end
end
```

---

## 5. Kamal 2 & Thruster：ゼロコスト・デプロイ

Rails 8は、アプリケーションのコードだけでなく「どう動かすか」についても明確な答えを用意しています。

### Kamal 2
Dockerを利用して、素のLinuxサーバー（VPS等）にコマンド一つでデプロイできるツールです。
- **Zero-downtime**: 新しいコンテナが立ち上がってから古いものを落とす。
- **No PaaS needed**: Herokuなどの高価なプラットフォームを使わず、月額5ドルのVPSでも本格運用が可能。

### Thruster
Rails 8から同梱されるようになった、Go製のHTTP/2プロキシサーバーです。
- **役割**: Railsサーバー（Puma）の前段に立ち、SSL証明書の自動更新（Let's Encrypt）、HTTP/2対応、アセットの圧縮・キャッシュを担います。
- **利点**: これまでNginxで行っていた設定が不要になり、Dockerfile内で完結します。

### 構成図 (The Rails 8 Way)

```text
[ Internet ]
      |
      v (HTTPS / Port 443)
+-----------------------+
|      Thruster         | (SSL, HTTP/2, Compression)
+-----------------------+
      |
      v (HTTP / Port 3000)
+-----------------------+
|        Puma           | (Rails App)
+-----------------------+
      |
      +---> [ Solid Queue / Cache / Cable ] ---> [ SQLite / PostgreSQL ]
```

---

## 6. その他の注目すべき変更点

### Propshaft の標準化
Sprocketsに代わり、よりシンプルで高速なアセットパイプラインである **Propshaft** がデフォルトになりました。「ビルドしない（No-build）」モダンなフロントエンド開発と非常に相性が良いです。

### bin/script による運用自動化
`bin/script` ディレクトリが標準で用意され、データメンテナンスやバッチ処理のためのスクリプトを配置しやすくなりました。

```ruby
# bin/scripts/cleanup_users.rb
#!/usr/bin/env ruby
require_relative "../config/environment"

User.where(inactive: true).delete_all
puts "Cleanup completed at #{Time.current}"
```

---

## まとめ：Rails 8が変える開発体験

Rails 8は、単なる機能追加のバージョンアップではなく、**「Web開発の複雑性をいかに減らすか」**という問いに対する一つの究極の回答です。

1.  **インフラの簡素化**: Solidシリーズにより、Redisサーバーの管理が不要に。
2.  **認証の民主化**: 生成されたコードで、自由にセキュアな認証を実装可能に。
3.  **デプロイの自由**: Kamal 2とThrusterにより、特定のプラットフォームに縛られず、低コストで高性能なインフラを構築可能に。

これから新規プロジェクトを始めるなら、Rails 8を選択しない理由はありません。また、既存プロジェクトの移行においても、外部ミドルウェアを一つずつ「Solid」に置き換えていくことで、保守コストの劇的な削減が期待できます。

2026年、Railsはかつてないほど「一人」で、あるいは「少人数」で世界を変えるプロダクトを作るための最強の武器となっています。ぜひ、この新時代のRailsを体感してください。
