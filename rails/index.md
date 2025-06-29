# Rails技術記事

Ruby on Railsに関する技術記事をトピック別にまとめました。

### 1. Rails基礎
- [x] [Rails7対応！`rails new`から始めるブログアプリケーション開発チュートリアル](./rails/01-rails-basics/01-rails7-blog-tutorial.md)
- [x] [Scaffoldは一体何をしているのか？生成されるコードを1行ずつ解説](./rails/01-rails-basics/02-scaffold-deep-dive.md)
- [x] [Rails開発が捗る！`rails console`の便利な使い方10選](./rails/01-rails-basics/06-rails-console-tips.md)
- [x] [Active Support Concernを活用してモデルのコードをDRYに保つ](./rails/01-rails-basics/12-active-support-concern.md)
- [x] [Active Storage徹底活用: ローカルとクラウド（S3）へのファイルアップロード](./rails/01-rails-basics/15-active-storage-guide.md)
- [x] [Action Mailer実践ガイド: メール送信とプレビュー、テスト](./rails/01-rails-basics/33-action-mailer-guide.md)
- [x] [Railsアプリケーションの国際化(i18n)対応](./rails/01-rails-basics/34-rails-i18n.md)
- [x] [Railsにおける設定管理: credentials, Figaro, dotenvの比較と実践](./rails/01-rails-basics/36-rails-config-management.md)
- [x] [Railsのロギング設定をカスタマイズして、本番環境のデバッグを効率化する](./rails/01-rails-basics/62-rails-logging-customize.md)

### 2. Active Record / データベース
- [x] [Active Recordの基本: `has_many` / `belongs_to` を使って記事とコメント機能を実装する](./rails/02-active-record-database/03-active-record-associations.md)
- [x] [Active Recordバリデーション入門: よく使う検証とカスタムバリデーションの作り方](./rails/02-active-record-database/05-active-record-validations.md)
- [x] [ポリモーフィック関連を理解する: いいね機能やコメント機能を複数のモデルに対応させる方法](./rails/02-active-record-database/18-polymorphic-associations.md)
- [x] [Active Recordのロック機能（Pessimistic/Optimistic Locking）を理解して競合を防ぐ](./rails/02-active-record-database/22-active-record-locking.md)
- [x] [Active RecordのEnumを使いこなす: 型安全で可読性の高いコードへ](./rails/02-active-record-database/47-active-record-enum.md)
- [x] [Railsにおけるマルチデータベース接続のセットアップと活用法](./rails/02-active-record-database/48-rails-multi-db.md)
- [x] [PostgreSQLの高度な機能（JSONB、Window関数など）をRailsで活用する](./rails/02-active-record-database/49-postgresql-advanced.md)
- [x] [`scenic` gemを使ったデータベースビューの管理](./rails/02-active-record-database/50-scenic-gem-guide.md)

### 3. View / フロントエンド
- [x] [Viewの基本: `form_with` を使って安全なフォームを作成する方法](./rails/03-view-frontend/07-rails-form-with.md)
- [x] [Hotwire（Turbo/Stimulus）で作る、SPAのようなUXを持つ動的アプリケーション](./rails/03-view-frontend/16-hotwire-intro.md)
- [x] [Action Cableを使ってリアルタイムなチャット機能を実装する](./rails/03-view-frontend/17-action-cable-chat.md)
- [x] [Rails 7の`jsbundling-rails`を使ってReactやVue.jsをモダンに統合する方法](./rails/03-view-frontend/23-jsbundling-rails-react.md)
- [x] [ViewComponentを使った再利用可能なビューコンポーネント開発](./rails/03-view-frontend/32-view-component.md)
- [x] [Action Text入門: Trix Editorを使ったリッチテキスト編集機能](./rails/03-view-frontend/40-action-text-trix-editor.md)
- [x] [WebpackerからShakapackerへの移行ガイド](./rails/03-view-frontend/42-webpacker-to-shakapacker-migration.md)
- [x] [StimulusReflex入門: Cable-readyを使ったリアクティブな体験](./rails/03-view-frontend/46-stimulus-reflex-cable-ready.md)
- [x] [Propshaftアセットパイプライン入門: Sprocketsからの移行とメリット](./rails/03-view-frontend/54-propshaft-asset-pipeline.md)
- [x] [Tailwind CSSをRails 7で使うためのモダンなセットアップ](./rails/03-view-frontend/55-tailwind-css-rails7.md)
- [x] [Import mapsを理解する: JavaScriptの依存関係をシンプルに管理](./rails/03-view-frontend/56-import-maps-guide.md)
- [x] [Phlexを使った高速なViewレンダリング](./rails/03-view-frontend/66-phlex-fast-views.md)

### 4. Controller / ルーティング
- [x] [もう怖くない！Railsのルーティング (`routes.rb`) 完全ガイド](./rails/04-controller-routing/04-rails-routing-guide.md)

### 5. テスト
- [x] [Rails標準のテストフレームワーク「Minitest」ではじめるテスト駆動開発（TDD）](./rails/05-testing/13-minitest-tdd-intro.md)
- [x] [RSpecとFactoryBotを使った実践的なテストコードの書き方](./rails/05-testing/28-rspec-factorybot.md)
- [x] [System Spec（E2Eテスト）をCapybaraで書く実践ガイド](./rails/05-testing/51-capybara-system-spec.md)
- [x] [テストカバレッジをSimpleCovで計測し、品質を可視化する](./rails/05-testing/52-simplecov-test-coverage.md)
- [x] [`VCR`や`WebMock`を使った外部API連携のテスト戦略](./rails/05-testing/53-vcr-webmock-testing.md)

### 6. パフォーマンス
- [x] [N+1問題はこれで解決！Bullet gemの導入と実践的な使い方](./rails/06-performance/09-n-plus-one-with-bullet.md)
- [x] [Active Recordクエリの高速化: `joins`, `preload`, `includes`, `eager_load` の違いと使い分け](./rails/06-performance/10-active-record-query-optimization.md)
- [x] [パフォーマンスチューニング: Railsアプリケーションのボトルネックを特定し、改善する実践テクニック](./rails/06-performance/20-performance-tuning.md)
- [x] [Railsアプリケーションのメモリ使用量を調査・最適化する方法](./rails/06-performance/43-rails-memory-optimization.md)
- [x] [SentryやNew Relicを使ったエラー監視とパフォーマンスモニタリング](./rails/06-performance/61-sentry-newrelic-monitoring.md)

### 7. アーキテクチャ / 設計
- [x] [サービスクラス（Service Object）を導入してFat Controllerを解消する](./rails/07-architecture-design/08-service-objects-for-fat-controllers.md)
- [x] [Rails Engineを作成して、再利用可能なコンポーネントを開発する](./rails/07-architecture-design/19-rails-engines.md)
- [x] [Trailblazerアーキテクチャを導入して大規模Railsアプリケーションを構築する](./rails/07-architecture-design/57-trailblazer-architecture.md)
- [x] [Railsアプリケーションにおけるマイクロサービス化への道筋](./rails/07-architecture-design/59-rails-microservices.md)

### 8. デプロイ / DevOps
- [x] [Docker Composeを使ったRails開発環境の構築とメリット](./rails/08-deployment-devops/24-docker-compose-rails-development.md)
- [x] [Render.comへRailsアプリケーションをデプロイする2025年版ガイド](./rails/08-deployment-devops/26-deploy-rails-to-render.md)
- [x] [RailsアプリケーションのCI/CDパイプラインをGitHub Actionsで構築する](./rails/08-deployment-devops/39-rails-ci-github-actions.md)
- [x] [Kamal (旧MRSK) を使ったRailsアプリケーションのデプロイ戦略](./rails/08-deployment-devops/60-kamal-deployment.md)

### 9. API
- [x] [GraphQL APIを`graphql-ruby` gemで構築する](./rails/09-api/25-graphql-ruby-api.md)
- [x] [Rails APIモード + Next.jsで構築するモダンなWebアプリケーション](./rails/09-api/27-rails-api-nextjs.md)
- [x] [RailsにおけるAPIドキュメントの自動生成 (RSwag/Committee)](./rails/09-api/45-rails-api-documentation.md)

### 10. セキュリティ
- [x] [Devise gemを使わずに自前で認証機能を実装する](./rails/10-security/14-authentication-from-scratch.md)
- [x] [Railsセキュリティ: OWASP Top 10に基づいた脆弱性対策と実践](./rails/10-security/30-rails-security-owasp.md)
- [x] [Punditを使った認可機能の実装: ポリシーベースのアクセス制御](./rails/10-security/37-pundit-authorization.md)
- [x] [`rodauth` gemを使った柔軟でセキュアな認証システムの構築](./rails/10-security/64-rodauth-authentication.md)
- [x] [Action Policy: Punditに代わる次世代の認可ライブラリ](./rails/10-security/65-action-policy-authorization.md)

### 11. バックグラウンドジョブ
- [x] [Sidekiqではじめるバックグラウンドジョブ入門](./rails/11-background-jobs/11-introduction-to-sidekiq.md)
- [x] [Active Job詳解: アダプターの選び方と高度な使い方](./rails/11-background-jobs/35-active-job-guide.md)
- [x] [RailsとGoodJob: PostgreSQLベースのバックグラウンドジョブプロセッサ](./rails/11-background-jobs/63-goodjob-background-jobs.md)

### 12. Gem / ライブラリ
- [x] [Sorbetを導入してRailsアプリケーションに型を導入する](./rails/12-gems-libraries/29-sorbet-rails.md)
- [x] [RailsとStripe連携: サブスクリプション課金システムを構築する](./rails/12-gems-libraries/31-rails-stripe-subscription.md)
- [x] [Avo/Administrate/Trestle: Rails製管理画面gemの比較と選択](./rails/12-gems-libraries/38-rails-admin-gems-comparison.md)
- [x] [RailsとRedis: キャッシュ、セッションストア、Sidekiqでの活用法](./rails/12-gems-libraries/41-rails-redis-use-cases.md)
- [x] [Ransackを使った高度な検索機能の実装](./rails/12-gems-libraries/44-ransack-advanced-search.md)
- [x] [Dry-rbエコシステム（dry-validation, dry-structなど）の紹介](./rails/12-gems-libraries/58-dry-rb-ecosystem.md)

### 13. その他
- [x] [Rackミドルウェアを自作してリクエスト/レスポンスをカスタマイズする](./rails/13-others/21-custom-rack-middleware.md)