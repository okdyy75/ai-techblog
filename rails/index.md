# Rails技術記事

Ruby on Railsに関する技術記事をトピック別にまとめました。

### 1. Rails基礎
- [x] [Rails7対応！`rails new`から始めるブログアプリケーション開発チュートリアル](/rails/01-rails-basics/01-rails7-blog-tutorial)
- [x] [Scaffoldは一体何をしているのか？生成されるコードを1行ずつ解説](/rails/01-rails-basics/02-scaffold-deep-dive)
- [x] [Rails開発が捗る！`rails console`の便利な使い方10選](/rails/01-rails-basics/06-rails-console-tips)
- [x] [Active Support Concernを活用してモデルのコードをDRYに保つ](/rails/01-rails-basics/12-active-support-concern)
- [x] [Active Storage徹底活用: ローカルとクラウド（S3）へのファイルアップロード](/rails/01-rails-basics/15-active-storage-guide)
- [x] [Action Mailer実践ガイド: メール送信とプレビュー、テスト](/rails/01-rails-basics/33-action-mailer-guide)
- [x] [Railsアプリケーションの国際化(i18n)対応](/rails/01-rails-basics/34-rails-i18n)
- [x] [Railsにおける設定管理: credentials, Figaro, dotenvの比較と実践](/rails/01-rails-basics/36-rails-config-management)
- [x] [Railsのロギング設定をカスタマイズして、本番環境のデバッグを効率化する](/rails/01-rails-basics/62-rails-logging-customize)
- [x] [Rails 8の新機能と変更点を総まとめ: 開発者が知るべきポイント](/rails/01-rails-basics/67-rails8-new-features)
- [x] [Rails初心者のためのMVCアーキテクチャ完全理解ガイド](/rails/01-rails-basics/77-mvc-architecture-guide)

### 2. Active Record / データベース
- [x] [Active Recordの基本: `has_many` / `belongs_to` を使って記事とコメント機能を実装する](/rails/02-active-record-database/03-active-record-associations)
- [x] [Active Recordバリデーション入門: よく使う検証とカスタムバリデーションの作り方](/rails/02-active-record-database/05-active-record-validations)
- [x] [ポリモーフィック関連を理解する: いいね機能やコメント機能を複数のモデルに対応させる方法](/rails/02-active-record-database/18-polymorphic-associations)
- [x] [Active Recordのロック機能（Pessimistic/Optimistic Locking）を理解して競合を防ぐ](/rails/02-active-record-database/22-active-record-locking)
- [x] [Active RecordのEnumを使いこなす: 型安全で可読性の高いコードへ](/rails/02-active-record-database/47-active-record-enum)
- [x] [Railsにおけるマルチデータベース接続のセットアップと活用法](/rails/02-active-record-database/48-rails-multi-db)
- [x] [PostgreSQLの高度な機能（JSONB、Window関数など）をRailsで活用する](/rails/02-active-record-database/49-postgresql-advanced)
- [x] [`scenic` gemを使ったデータベースビューの管理](/rails/02-active-record-database/50-scenic-gem-guide)
- [x] [Rails 8のSolid Queueで実現するジョブキューの新しいアプローチ](/rails/02-active-record-database/68-solid-queue-rails8)
- [x] [Active Record Encryptionを使った機密データの暗号化](/rails/02-active-record-database/69-active-record-encryption)
- [x] [データベース移行のベストプラクティス: ゼロダウンタイム・デプロイメント](/rails/02-active-record-database/78-zero-downtime-migrations)

### 3. View / フロントエンド
- [x] [Viewの基本: `form_with` を使って安全なフォームを作成する方法](/rails/03-view-frontend/07-rails-form-with)
- [x] [Hotwire（Turbo/Stimulus）で作る、SPAのようなUXを持つ動的アプリケーション](/rails/03-view-frontend/16-hotwire-intro)
- [x] [Action Cableを使ってリアルタイムなチャット機能を実装する](/rails/03-view-frontend/17-action-cable-chat)
- [x] [Rails 7の`jsbundling-rails`を使ってReactやVue.jsをモダンに統合する方法](/rails/03-view-frontend/23-jsbundling-rails-react)
- [x] [ViewComponentを使った再利用可能なビューコンポーネント開発](/rails/03-view-frontend/32-view-component)
- [x] [Action Text入門: Trix Editorを使ったリッチテキスト編集機能](/rails/03-view-frontend/40-action-text-trix-editor)
- [x] [WebpackerからShakapackerへの移行ガイド](/rails/03-view-frontend/42-webpacker-to-shakapacker-migration)
- [x] [StimulusReflex入門: Cable-readyを使ったリアクティブな体験](/rails/03-view-frontend/46-stimulus-reflex-cable-ready)
- [x] [Propshaftアセットパイプライン入門: Sprocketsからの移行とメリット](/rails/03-view-frontend/54-propshaft-asset-pipeline)
- [x] [Tailwind CSSをRails 7で使うためのモダンなセットアップ](/rails/03-view-frontend/55-tailwind-css-rails7)
- [x] [Import mapsを理解する: JavaScriptの依存関係をシンプルに管理](/rails/03-view-frontend/56-import-maps-guide)
- [x] [Phlexを使った高速なViewレンダリング](/rails/03-view-frontend/66-phlex-fast-views)
- [x] [Rails 8のインライン実行でJavaScriptとCSSの扱いがどう変わるか](/rails/03-view-frontend/70-rails8-inline-execution)
- [x] [Turbo Streamsでリアルタイム更新を実現する高度なテクニック](/rails/03-view-frontend/71-advanced-turbo-streams)
- [x] [`Motion UI`と`Turbo`を連携させたリッチなUIアニメーション](/rails/03-view-frontend/88-motion-ui-turbo-guide)

### 4. Controller / ルーティング
- [x] [もう怖くない！Railsのルーティング (`routes.rb`) 完全ガイド](/rails/04-controller-routing/04-rails-routing-guide)
- [x] [Rails 8のコントローラレイヤー改善と新しいレスポンス処理](/rails/04-controller-routing/72-rails8-controller-improvements)

### 5. テスト
- [x] [Rails標準のテストフレームワーク「Minitest」ではじめるテスト駆動開発（TDD）](/rails/05-testing/13-minitest-tdd-intro)
- [x] [RSpecとFactoryBotを使った実践的なテストコードの書き方](/rails/05-testing/28-rspec-factorybot)
- [x] [System Spec（E2Eテスト）をCapybaraで書く実践ガイド](/rails/05-testing/51-capybara-system-spec)
- [x] [テストカバレッジをSimpleCovで計測し、品質を可視化する](/rails/05-testing/52-simplecov-test-coverage)
- [x] [`VCR`や`WebMock`を使った外部API連携のテスト戦略](/rails/05-testing/53-vcr-webmock-testing)
- [x] [Rails 8時代のテスト戦略: 新機能を活用したテストの書き方](/rails/05-testing/73-rails8-testing-strategy)
- [x] [`RSpec Mocks`の高度な使い方: `double`, `spy`, `stub`の活用](/rails/05-testing/87-rspec-mocks-guide)

### 6. パフォーマンス
- [x] [N+1問題はこれで解決！Bullet gemの導入と実践的な使い方](/rails/06-performance/09-n-plus-one-with-bullet)
- [x] [Active Recordクエリの高速化: `joins`, `preload`, `includes`, `eager_load` の違いと使い分け](/rails/06-performance/10-active-record-query-optimization)
- [x] [パフォーマンスチューニング: Railsアプリケーションのボトルネックを特定し、改善する実践テクニック](/rails/06-performance/20-performance-tuning)
- [x] [Railsアプリケーションのメモリ使用量を調査・最適化する方法](/rails/06-performance/43-rails-memory-optimization)
- [x] [SentryやNew Relicを使ったエラー監視とパフォーマンスモニタリング](/rails/06-performance/61-sentry-newrelic-monitoring)
- [x] [Rails 8のパフォーマンス改善: ベンチマークから見る実際の効果](/rails/06-performance/74-rails8-performance-improvements)
- [x] [`rack-mini-profiler`による開発中のパフォーマンス計測](/rails/06-performance/86-rack-mini-profiler-guide)

### 7. アーキテクチャ / 設計
- [x] [サービスクラス（Service Object）を導入してFat Controllerを解消する](/rails/07-architecture-design/08-service-objects-for-fat-controllers)
- [x] [Rails Engineを作成して、再利用可能なコンポーネントを開発する](/rails/07-architecture-design/19-rails-engines)
- [x] [Trailblazerアーキテクチャを導入して大規模Railsアプリケーションを構築する](/rails/07-architecture-design/57-trailblazer-architecture)
- [x] [Railsアプリケーションにおけるマイクロサービス化への道筋](/rails/07-architecture-design/59-rails-microservices)
- [x] [Railsにおけるドメイン駆動設計(DDD)入門](/rails/07-architecture-design/85-rails-ddd-guide)

### 8. デプロイ / DevOps
- [x] [Docker Composeを使ったRails開発環境の構築とメリット](/rails/08-deployment-devops/24-docker-compose-rails-development)
- [x] [Render.comへRailsアプリケーションをデプロイする2025年版ガイド](/rails/08-deployment-devops/26-deploy-rails-to-render)
- [x] [RailsアプリケーションのCI/CDパイプラインをGitHub Actionsで構築する](/rails/08-deployment-devops/39-rails-ci-github-actions)
- [x] [Kamal (旧MRSK) を使ったRailsアプリケーションのデプロイ戦略](/rails/08-deployment-devops/60-kamal-deployment)
- [x] [`Terraform`によるRailsのインフラ管理(IaC)](/rails/08-deployment-devops/84-terraform-rails-guide)

### 9. API
- [x] [GraphQL APIを`graphql-ruby` gemで構築する](/rails/09-api/25-graphql-ruby-api)
- [x] [Rails APIモード + Next.jsで構築するモダンなWebアプリケーション](/rails/09-api/27-rails-api-nextjs)
- [x] [RailsにおけるAPIドキュメントの自動生成 (RSwag/Committee)](/rails/09-api/45-rails-api-documentation)
- [x] [RailsとgRPCによるハイパフォーマンスなマイクロサービス間通信](/rails/09-api/83-rails-grpc-guide)

### 10. セキュリティ
- [x] [Devise gemを使わずに自前で認証機能を実装する](/rails/10-security/14-authentication-from-scratch)
- [x] [Railsセキュリティ: OWASP Top 10に基づいた脆弱性対策と実践](/rails/10-security/30-rails-security-owasp)
- [x] [Punditを使った認可機能の実装: ポリシーベースのアクセス制御](/rails/10-security/37-pundit-authorization)
- [x] [`rodauth` gemを使った柔軟でセキュアな認証システムの構築](/rails/10-security/64-rodauth-authentication)
- [x] [Action Policy: Punditに代わる次世代の認可ライブラリ](/rails/10-security/65-action-policy-authorization)
- [x] [`Brakeman`による静的解析での脆弱性診断](/rails/10-security/82-brakeman-guide)

### 11. バックグラウンドジョブ
- [x] [Sidekiqではじめるバックグラウンドジョブ入門](/rails/11-background-jobs/11-introduction-to-sidekiq)
- [x] [Active Job詳解: アダプターの選び方と高度な使い方](/rails/11-background-jobs/35-active-job-guide)
- [x] [RailsとGoodJob: PostgreSQLベースのバックグラウンドジョブプロセッサ](/rails/11-background-jobs/63-goodjob-background-jobs)
- [x] [`Sidekiq-cron`で定期的なジョブをスケジューリングする](/rails/11-background-jobs/81-sidekiq-cron-guide)

### 12. Gem / ライブラリ
- [x] [Sorbetを導入してRailsアプリケーションに型を導入する](/rails/12-gems-libraries/29-sorbet-rails)
- [x] [RailsとStripe連携: サブスクリプション課金システムを構築する](/rails/12-gems-libraries/31-rails-stripe-subscription)
- [x] [Avo/Administrate/Trestle: Rails製管理画面gemの比較と選択](/rails/12-gems-libraries/38-rails-admin-gems-comparison)
- [x] [RailsとRedis: キャッシュ、セッションストア、Sidekiqでの活用法](/rails/12-gems-libraries/41-rails-redis-use-cases)
- [x] [Ransackを使った高度な検索機能の実装](/rails/12-gems-libraries/44-ransack-advanced-search)
- [x] [Dry-rbエコシステム（dry-validation, dry-structなど）の紹介](/rails/12-gems-libraries/58-dry-rb-ecosystem)
- [x] [Shopify LiquidテンプレートエンジンをRailsで活用する](/rails/12-gems-libraries/75-shopify-liquid-rails)
- [x] [`CanCanCan`によるシンプルで強力な認可管理](/rails/12-gems-libraries/80-cancancan-guide)

### 13. その他
- [x] [Rackミドルウェアを自作してリクエスト/レスポンスをカスタマイズする](/rails/13-others/21-custom-rack-middleware)
- [x] [Rails開発者のためのDocker最適化テクニック集](/rails/13-others/76-docker-optimization-rails)
- [x] [`i18n-tasks` gemでRailsの多言語対応を効率化する](/rails/13-others/79-i18n-tasks-guide)
- [x] [Railsアプリケーションにおける設定ファイルのベストプラクティス](/rails/13-others/89-rails-settings-best-practices)
