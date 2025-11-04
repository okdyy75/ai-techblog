---
title: PostgreSQL
---

# PostgreSQL

## 記事一覧

### 1. PostgreSQL基礎 {#basics}
- [x] 1. [PostgreSQL入門：初めてのデータベース構築](./01-basics.md)
- [x] 2. [PostgreSQLのインストールと初期設定ガイド](./02-installation-and-setup.md)
- [x] 3. [psqlコマンドラインツールの基本操作](./03-psql-basic-operations.md)
- [x] 4. [データ型をマスターする：PostgreSQLの型システム](./04-mastering-data-types.md)
- [x] 5. [SQLの基礎：SELECT, INSERT, UPDATE, DELETE](./05-sql-basics.md)
- [x] 6. [テーブル設計のベストプラクティス](./06-table-design-best-practices.md)
- [ ] 30. DockerでPostgreSQL環境を構築する

### 2. インデックス・パフォーマンス {#performance}
- [x] 7. [インデックスの仕組みと効果的な使い方](./07-indexing-mechanisms-and-usage.md)
- [ ] 15. パフォーマンスチューニング：EXPLAIN ANALYZEの読み方
- [ ] 16. クエリ最適化：実行計画を改善するテクニック
- [ ] 24. マテリアライズドビューによるパフォーマンス向上

### 3. トランザクション・データベース設計 {#transactions-design}
- [x] 8. [トランザクションとACID特性](./08-transactions-and-acid.md)
- [x] 9. [ビューの活用法：複雑なクエリをシンプルに](./09-using-views.md)
- [x] 10. [ストアドプロシージャと関数によるサーバーサイドプログラミング](./10-stored-procedures-and-functions.md)
- [x] 11. [トリガーを使ったデータ整合性の維持](./11-triggers-for-data-integrity.md)

### 4. 高度なデータ型・機能 {#advanced-features}
- [ ] 12. JSON/JSONBデータ型の徹底活用
- [ ] 13. 全文検索：pg_trgmとFTS
- [ ] 14. PostGISによる地理空間データ入門
- [ ] 25. ウィンドウ関数を使いこなす
- [ ] 26. CTE（共通テーブル式）による複雑なクエリの可読性向上
- [ ] 27. PostgreSQLの拡張機能トップ10

### 5. 運用・管理 {#administration}
- [ ] 17. バックアップとリストア戦略
- [ ] 18. レプリケーション：ストリーミングレプリケーションの設定
- [ ] 19. 高可用性構成：pgpool-IIとPacemaker
- [ ] 20. セキュリティ：ユーザー、ロール、権限管理
- [ ] 21. 接続プーリング：PgBouncerの導入と設定
- [ ] 28. メジャーバージョンアップグレードの手順
- [ ] 29. 監視：pg_stat_statementsと監視ツール

### 6. 大規模データ・統合 {#scaling-integration}
- [ ] 22. 外部データラッパー（FDW）で外部DBに接続する
- [ ] 23. パーティショニングによる大規模データ管理
