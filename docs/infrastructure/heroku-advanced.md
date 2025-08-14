# Heroku上級者向け：高度な機能とベストプラクティス

## 概要

Herokuの基本を理解した後は、より高度な機能を活用して本格的なアプリケーションを構築しましょう。この記事では、スケーリング、監視、セキュリティ、CI/CDなどについて詳しく解説します。

## 高度なスケーリング戦略

### 1. 自動スケーリング
```bash
# 自動スケーリングの設定
heroku ps:autoscale:enable --min=1 --max=10 --p95-response-time=2000

# 手動スケーリング
heroku ps:scale web=3 worker=2
```

### 2. リソース最適化
- **Dyno Types**: Basic, Standard, Performance, Private
- **Memory Optimization**: アプリケーションのメモリ使用量を監視
- **Database Connection Pooling**: 接続プールの適切な設定

### 3. 負荷分散
```bash
# 複数リージョンでのデプロイ
heroku create my-app-eu --region eu
heroku create my-app-us --region us
```

## 監視とログ管理

### 1. アプリケーション監視
```bash
# リアルタイムログの確認
heroku logs --tail

# 特定の時間範囲のログ
heroku logs --since 2024-01-01

# エラーログのみ
heroku logs --source app --tail | grep ERROR
```

### 2. パフォーマンス監視
```bash
# メトリクスの確認
heroku ps

# レスポンス時間の監視
heroku labs:enable runtime-metrics
```

### 3. アドオンによる監視
- **New Relic**: APM（Application Performance Monitoring）
- **Papertrail**: ログ集約・検索
- **Scout**: リアルタイム監視

## セキュリティ強化

### 1. SSL/TLS設定
```bash
# 自動SSL証明書の有効化
heroku certs:auto:enable

# カスタムドメインの追加
heroku domains:add www.myapp.com
```

### 2. 環境変数の管理
```bash
# 機密情報の設定
heroku config:set SECRET_KEY_BASE=$(openssl rand -base64 64)

# 環境変数の確認
heroku config
```

### 3. セキュリティヘッダー
```javascript
// Express.jsでの例
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"]
  }
}));
```

## CI/CDパイプライン

### 1. GitHub Actionsとの連携
```yaml
# .github/workflows/deploy.yml
name: Deploy to Heroku
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
          heroku_app_name: ${{ secrets.HEROKU_APP_NAME }}
          heroku_email: ${{ secrets.HEROKU_EMAIL }}
```

### 2. 自動テスト
```bash
# テストの実行
npm test

# カバレッジレポート
npm run test:coverage
```

### 3. ステージング環境
```bash
# ステージングアプリの作成
heroku create my-app-staging

# 本番環境へのプロモート
heroku pipelines:promote --app my-app-staging
```

## データベース最適化

### 1. PostgreSQL最適化
```sql
-- インデックスの確認
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public';

-- スロークエリの特定
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### 2. Redis活用
```bash
# Redisアドオンの追加
heroku addons:create heroku-redis:hobby-dev

# Redis接続の確認
heroku redis:info
```

### 3. バックアップ戦略
```bash
# 自動バックアップの設定
heroku pg:backups schedule DATABASE_URL --at '02:00 UTC'

# 手動バックアップ
heroku pg:backups capture
```

## トラブルシューティング

### 1. よくある問題と解決策
- **H10 - App Crashed**: アプリケーションの起動エラー
- **H12 - Request Timeout**: 30秒以上の処理時間
- **H13 - Connection Closed**: データベース接続エラー

### 2. デバッグ手法
```bash
# アプリケーションの状態確認
heroku ps

# プロセス詳細
heroku ps:exec

# 環境変数の確認
heroku config
```

## まとめ

Herokuの高度な機能を活用することで、本格的なプロダクション環境を構築できます。特に、自動スケーリング、監視、セキュリティ、CI/CDの組み合わせにより、開発チームの生産性を大幅に向上させることが可能です。ただし、これらの機能を適切に設定・運用するには、継続的な学習と実践が必要です。