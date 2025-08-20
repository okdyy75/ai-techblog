# 【第10回】GraphQLの運用・監視・デバッグ - 本番環境での実践的な管理手法

GraphQLアプリケーションを本番環境で安定して運用するには、適切な監視、効果的なデバッグ手法、そして継続的な最適化が不可欠です。この記事では、パフォーマンス監視からエラートラッキング、キャパシティプランニングまで、GraphQLサービスの運用に必要な実践的な知識を包括的に解説します。

## 監視とメトリクスの設計

GraphQLアプリケーションの運用では、従来のREST APIとは異なる監視アプローチが必要です。GraphQL特有の特性を考慮した包括的な監視戦略を構築しましょう。

### 1. 基本的なメトリクス収集

GraphQLアプリケーションで重点的に監視すべきメトリクスを定義します。これらは運用チームがシステムの健全性を判断するための基盤となります：

```javascript
const prometheus = require('prom-client');

// GraphQL専用メトリクスの定義
const graphqlMetrics = {
  // 1. リクエスト数の追跡
  requestCount: new prometheus.Counter({
    name: 'graphql_requests_total',
    help: 'Total number of GraphQL requests',
    // ラベルでリクエストを分類：運用名、操作タイプ、成功/失敗
    labelNames: ['operation_name', 'operation_type', 'status']
  }),

  // 2. レスポンス時間の分布
  requestDuration: new prometheus.Histogram({
    name: 'graphql_request_duration_seconds',
    help: 'GraphQL request duration in seconds',
    labelNames: ['operation_name', 'operation_type'],
    // バケット設定：実際のレスポンス時間の分布に基づいて調整
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
  }),

  // 3. リゾルバレベルの実行時間（ボトルネック特定用）
  resolverDuration: new prometheus.Histogram({
    name: 'graphql_resolver_duration_seconds',
    help: 'GraphQL resolver execution time',
    labelNames: ['field_name', 'type_name'],
    // より細かいバケット：リゾルバは通常より高速
    buckets: [0.01, 0.1, 0.3, 0.5, 1, 2, 5]
  }),

  // 4. エラー発生状況の監視
  errorCount: new prometheus.Counter({
    name: 'graphql_errors_total',
    help: 'Total number of GraphQL errors',
    labelNames: ['error_type', 'operation_name']
  }),

  // 5. クエリ複雑性の監視（セキュリティ対策）
  queryComplexity: new prometheus.Histogram({
    name: 'graphql_query_complexity',
    help: 'GraphQL query complexity score',
    labelNames: ['operation_name'],
    buckets: [1, 10, 50, 100, 200, 500, 1000]
  }),

  // 6. DataLoaderの効果測定
  dataLoaderStats: new prometheus.Summary({
    name: 'graphql_dataloader_batch_size',
    help: 'DataLoader batch size statistics',
    labelNames: ['loader_name']
  })
};

module.exports = graphqlMetrics;
```

**メトリクス設計の原則：**
- **粒度のバランス**: 詳細すぎるとノイズが多く、粗すぎると問題の特定が困難
- **ラベルの適切な使用**: 運用チームが問題を迅速に特定できるよう分類
- **パフォーマンス考慮**: メトリクス収集自体がアプリケーションの負荷にならないよう調整

### 2. Apollo Serverでのメトリクス収集

実際の運用環境でメトリクス収集を行うためのApollo Serverプラグインを実装します。このプラグインはリクエストのライフサイクル全体を監視します：

```javascript
const { ApolloServer } = require('apollo-server-express');
const { graphqlMetrics } = require('./metrics');

// 包括的な監視プラグイン
const metricsPlugin = {
  requestDidStart() {
    const startTime = Date.now();
    let operationName = 'anonymous';
    let operationType = 'unknown';
    
    return {
      // 1. 操作の解析完了時
      didResolveOperation(requestContext) {
        const { operation } = requestContext.request;
        operationName = requestContext.request.operationName || 'anonymous';
        operationType = operation.operation; // query, mutation, subscription
        
        // クエリ複雑性の記録（外部ライブラリと連携）
        if (requestContext.metrics && requestContext.metrics.queryComplexity) {
          graphqlMetrics.queryComplexity
            .labels(operationName)
            .observe(requestContext.metrics.queryComplexity);
        }
      },

      // 2. エラー発生時の監視
      didEncounterErrors(requestContext) {
        requestContext.errors.forEach(error => {
          // エラータイプの分類（重要：障害対応の迅速化）
          const errorType = error.extensions?.code || 'UNKNOWN_ERROR';
          
          graphqlMetrics.errorCount
            .labels(errorType, operationName)
            .inc();
          
          // 重大なエラーは別途ログ出力
          if (['INTERNAL_ERROR', 'UNAUTHENTICATED'].includes(errorType)) {
            console.error('Critical GraphQL Error:', {
              type: errorType,
              operation: operationName,
              message: error.message,
              timestamp: new Date().toISOString()
            });
          }
        });
      },

      // 3. リクエスト完了時の統計記録
      willSendResponse(requestContext) {
        const duration = (Date.now() - startTime) / 1000;
        const status = requestContext.errors ? 'error' : 'success';
        
        // 基本的なリクエスト統計
        graphqlMetrics.requestCount
          .labels(operationName, operationType, status)
          .inc();
        
        graphqlMetrics.requestDuration
          .labels(operationName, operationType)
          .observe(duration);
        
        // パフォーマンス警告（開発段階での最適化指標）
        if (duration > 5) {
          console.warn(`Slow GraphQL Query detected:`, {
            operation: operationName,
            duration: `${duration}s`,
            type: operationType
          });
        }
      }
    };
  }
};

// リクエスト監視プラグイン
const metricsPlugin = {
  requestDidStart() {
    const startTime = Date.now();
    
    return {
      didResolveOperation(requestContext) {
        const { operationName, operation } = requestContext.request;
        const operationType = operation.operation;
        
        // 複雑性スコアを記録（query-complexityライブラリと連携）
        if (requestContext.metrics && requestContext.metrics.queryComplexity) {
          graphqlMetrics.queryComplexity
            .labels(operationName || 'anonymous')
            .observe(requestContext.metrics.queryComplexity);
        }
      },

      didEncounterErrors(requestContext) {
        const { operationName } = requestContext.request;
        
        requestContext.errors.forEach(error => {
          const errorType = error.extensions?.code || 'UNKNOWN_ERROR';
          
          graphqlMetrics.errorCount
            .labels(errorType, operationName || 'anonymous')
            .inc();
        });
      },

      willSendResponse(requestContext) {
        const duration = (Date.now() - startTime) / 1000;
        const { operationName, operation } = requestContext.request;
        const operationType = operation?.operation || 'unknown';
        const status = requestContext.errors ? 'error' : 'success';

        // リクエスト数を記録
        graphqlMetrics.requestCount
          .labels(operationName || 'anonymous', operationType, status)
          .inc();

        // レスポンス時間を記録
        graphqlMetrics.requestDuration
          .labels(operationName || 'anonymous', operationType)
          .observe(duration);
      }
    };
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [metricsPlugin]
});
```

### 3. リゾルバレベルの監視

```javascript
// リゾルバ実行時間を監視するデコレータ
const withMetrics = (resolverFn, typeName, fieldName) => {
  return async (parent, args, context, info) => {
    const startTime = Date.now();
    
    try {
      const result = await resolverFn(parent, args, context, info);
      
      const duration = (Date.now() - startTime) / 1000;
      graphqlMetrics.resolverDuration
        .labels(fieldName, typeName)
        .observe(duration);
      
      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      graphqlMetrics.resolverDuration
        .labels(fieldName, typeName)
        .observe(duration);
      
      throw error;
    }
  };
};

// 使用例
const resolvers = {
  Query: {
    users: withMetrics(
      async (parent, args, context) => {
        return await context.dataSources.userAPI.getUsers();
      },
      'Query',
      'users'
    ),
    
    posts: withMetrics(
      async (parent, args, context) => {
        return await context.dataSources.postAPI.getPosts(args);
      },
      'Query',
      'posts'
    )
  },

  User: {
    posts: withMetrics(
      async (user, args, context) => {
        return await context.loaders.userPostsLoader.load(user.id);
      },
      'User',
      'posts'
    )
  }
};
```

## エラートラッキングとログ記録

### 1. 構造化ログの実装

```javascript
const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');

// ログ設定
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'graphql-api',
    version: process.env.APP_VERSION || '1.0.0'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// 本番環境ではElasticsearchにも送信
if (process.env.NODE_ENV === 'production') {
  logger.add(new ElasticsearchTransport({
    level: 'info',
    clientOpts: { node: process.env.ELASTICSEARCH_URL },
    index: 'graphql-logs'
  }));
}

module.exports = logger;
```

### 2. 詳細なリクエストログ

```javascript
const loggingPlugin = {
  requestDidStart() {
    const requestId = require('uuid').v4();
    const startTime = process.hrtime.bigint();
    
    return {
      didResolveOperation(requestContext) {
        const { query, variables, operationName } = requestContext.request;
        const user = requestContext.context.user;
        
        logger.info('GraphQL Operation Started', {
          requestId,
          operationName,
          operationType: requestContext.operation.operation,
          userId: user?.id,
          userRole: user?.role,
          ip: requestContext.request.ip,
          userAgent: requestContext.request.http?.headers['user-agent'],
          query: process.env.LOG_QUERIES === 'true' ? query : undefined,
          variables: process.env.LOG_VARIABLES === 'true' ? variables : undefined
        });
      },

      didEncounterErrors(requestContext) {
        const { operationName } = requestContext.request;
        
        requestContext.errors.forEach(error => {
          logger.error('GraphQL Error', {
            requestId,
            operationName,
            error: {
              message: error.message,
              code: error.extensions?.code,
              stack: error.stack,
              path: error.path
            },
            userId: requestContext.context.user?.id,
            query: requestContext.request.query,
            variables: requestContext.request.variables
          });
        });
      },

      willSendResponse(requestContext) {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // milliseconds
        
        logger.info('GraphQL Operation Completed', {
          requestId,
          operationName: requestContext.request.operationName,
          duration,
          success: !requestContext.errors,
          errorCount: requestContext.errors?.length || 0,
          userId: requestContext.context.user?.id
        });
      }
    };
  }
};
```

### 3. Sentryとの統合

```javascript
const Sentry = require('@sentry/node');
const { ApolloError } = require('apollo-server-express');

// Sentry初期化
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.Integrations.GraphQL({
      // GraphQLエラーの詳細をキャプチャ
      captureRequestInfo: true,
      captureVariables: true
    })
  ]
});

// Sentryエラートラッキングプラグイン
const sentryPlugin = {
  requestDidStart() {
    return {
      didEncounterErrors(requestContext) {
        Sentry.withScope(scope => {
          scope.setTag('graphql.operation.name', requestContext.request.operationName);
          scope.setTag('graphql.operation.type', requestContext.operation?.operation);
          
          if (requestContext.context.user) {
            scope.setUser({
              id: requestContext.context.user.id,
              username: requestContext.context.user.name,
              email: requestContext.context.user.email
            });
          }
          
          scope.setContext('graphql', {
            query: requestContext.request.query,
            variables: requestContext.request.variables
          });
          
          requestContext.errors.forEach(error => {
            // システムエラーのみSentryに送信（ユーザーエラーは除外）
            if (!(error instanceof ApolloError) || error.extensions?.code === 'INTERNAL_ERROR') {
              Sentry.captureException(error);
            }
          });
        });
      }
    };
  }
};
```

## パフォーマンス監視とプロファイリング

### 1. Apollo Studioとの統合

```javascript
const { ApolloServerPluginUsageReporting } = require('apollo-server-core');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    ApolloServerPluginUsageReporting({
      // Apollo Studioにメトリクスを送信
      sendVariableValues: { 
        // 機密情報は除外
        except: ['password', 'token', 'secret']
      },
      sendHeaders: { 
        except: ['authorization', 'cookie'] 
      },
      sendErrorDetails: true
    })
  ]
});
```

### 2. カスタムトレーシング

```javascript
const { createTracing } = require('@apollo/gateway');

// 分散トレーシング（Jaeger/Zipkin対応）
const tracingPlugin = {
  requestDidStart() {
    const span = tracer.startSpan('graphql.request');
    
    return {
      didResolveOperation(requestContext) {
        span.setTag('operation.name', requestContext.request.operationName);
        span.setTag('operation.type', requestContext.operation.operation);
      },
      
      willSendResponse(requestContext) {
        if (requestContext.errors) {
          span.setTag('error', true);
          span.log({ errors: requestContext.errors.map(e => e.message) });
        }
        span.finish();
      }
    };
  }
};

// リゾルバレベルのトレーシング
const withTracing = (resolverFn, fieldName) => {
  return async (parent, args, context, info) => {
    const span = tracer.startSpan(`resolver.${fieldName}`);
    
    try {
      const result = await resolverFn(parent, args, context, info);
      return result;
    } catch (error) {
      span.setTag('error', true);
      span.log({ error: error.message });
      throw error;
    } finally {
      span.finish();
    }
  };
};
```

## ヘルスチェックとSRE

### 1. GraphQLヘルスチェック

```javascript
const typeDefs = gql`
  type Query {
    health: HealthStatus!
  }
  
  type HealthStatus {
    status: String!
    timestamp: String!
    version: String!
    dependencies: [DependencyStatus!]!
  }
  
  type DependencyStatus {
    name: String!
    status: String!
    responseTime: Int
    error: String
  }
`;

const resolvers = {
  Query: {
    health: async (parent, args, context) => {
      const dependencies = await Promise.all([
        checkDatabase(),
        checkRedis(),
        checkExternalAPI()
      ]);
      
      const allHealthy = dependencies.every(dep => dep.status === 'healthy');
      
      return {
        status: allHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '1.0.0',
        dependencies
      };
    }
  }
};

// 依存関係チェック関数
const checkDatabase = async () => {
  try {
    const start = Date.now();
    await db.raw('SELECT 1');
    const responseTime = Date.now() - start;
    
    return {
      name: 'database',
      status: 'healthy',
      responseTime
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      error: error.message
    };
  }
};

const checkRedis = async () => {
  try {
    const start = Date.now();
    await redis.ping();
    const responseTime = Date.now() - start;
    
    return {
      name: 'redis',
      status: 'healthy',
      responseTime
    };
  } catch (error) {
    return {
      name: 'redis',
      status: 'unhealthy',
      error: error.message
    };
  }
};
```

### 2. Prometheusメトリクスエンドポイント

```javascript
const express = require('express');
const prometheus = require('prom-client');

const app = express();

// デフォルトメトリクスを有効化
prometheus.collectDefaultMetrics();

// カスタムメトリクスエンドポイント
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', prometheus.register.contentType);
    res.end(await prometheus.register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
});

// Kubernetesのリブネスプローブ
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Kubernetesのレディネスプローブ
app.get('/health/ready', async (req, res) => {
  try {
    // 依存関係の確認
    await db.raw('SELECT 1');
    await redis.ping();
    
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready', 
      error: error.message 
    });
  }
});
```

## デバッグとトラブルシューティング

### 1. 開発環境でのデバッグ

```javascript
// GraphQLクエリの詳細ログ
const debugPlugin = {
  requestDidStart() {
    return {
      didResolveOperation(requestContext) {
        if (process.env.DEBUG_GRAPHQL === 'true') {
          console.log('=== GraphQL Debug ===');
          console.log('Operation:', requestContext.request.operationName);
          console.log('Query:', requestContext.request.query);
          console.log('Variables:', JSON.stringify(requestContext.request.variables, null, 2));
          console.log('User:', requestContext.context.user);
          console.log('====================');
        }
      },
      
      willSendResponse(requestContext) {
        if (process.env.DEBUG_GRAPHQL === 'true' && requestContext.errors) {
          console.log('=== GraphQL Errors ===');
          requestContext.errors.forEach(error => {
            console.log('Error:', error.message);
            console.log('Path:', error.path);
            console.log('Stack:', error.stack);
          });
          console.log('=====================');
        }
      }
    };
  }
};

// DataLoader統計
const createDataLoaderWithStats = (batchFunction, name) => {
  return new DataLoader(async (keys) => {
    const start = Date.now();
    const result = await batchFunction(keys);
    const duration = Date.now() - start;
    
    // 統計をログ出力
    logger.info('DataLoader Stats', {
      loader: name,
      batchSize: keys.length,
      duration,
      avgTimePerKey: duration / keys.length
    });
    
    // Prometheusメトリクスに記録
    graphqlMetrics.dataLoaderStats
      .labels(name)
      .observe(keys.length);
    
    return result;
  });
};
```

### 2. 本番環境でのトラブルシューティング

```javascript
// スロークエリの検出と記録
const slowQueryPlugin = {
  requestDidStart() {
    const startTime = Date.now();
    
    return {
      willSendResponse(requestContext) {
        const duration = Date.now() - startTime;
        const threshold = parseInt(process.env.SLOW_QUERY_THRESHOLD) || 5000; // 5秒
        
        if (duration > threshold) {
          logger.warn('Slow GraphQL Query Detected', {
            operationName: requestContext.request.operationName,
            duration,
            query: requestContext.request.query,
            variables: requestContext.request.variables,
            userId: requestContext.context.user?.id
          });
          
          // アラートを送信
          if (process.env.NODE_ENV === 'production') {
            sendSlackAlert({
              title: 'Slow GraphQL Query',
              message: `Query ${requestContext.request.operationName} took ${duration}ms`,
              severity: 'warning'
            });
          }
        }
      }
    };
  }
};

// メモリリーク検出
const memoryLeakDetector = {
  requestDidStart() {
    return {
      willSendResponse() {
        if (global.gc && Math.random() < 0.01) { // 1%の確率でGCを実行
          const memBefore = process.memoryUsage();
          global.gc();
          const memAfter = process.memoryUsage();
          
          logger.info('Memory Usage', {
            before: memBefore,
            after: memAfter,
            freed: {
              rss: memBefore.rss - memAfter.rss,
              heapUsed: memBefore.heapUsed - memAfter.heapUsed
            }
          });
        }
      }
    };
  }
};
```

## キャパシティプランニングと自動スケーリング

### 1. メトリクスベースのアラート

```yaml
# Prometheus Alert Rules
groups:
  - name: graphql-alerts
    rules:
      - alert: GraphQLHighErrorRate
        expr: rate(graphql_errors_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "GraphQL error rate is high"
          description: "GraphQL API error rate is {{ $value }} per second"

      - alert: GraphQLSlowQueries
        expr: histogram_quantile(0.95, rate(graphql_request_duration_seconds_bucket[5m])) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "GraphQL queries are slow"
          description: "95th percentile of GraphQL request duration is {{ $value }}s"

      - alert: GraphQLHighComplexity
        expr: histogram_quantile(0.90, rate(graphql_query_complexity_bucket[5m])) > 1000
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "GraphQL query complexity is too high"
          description: "90th percentile of query complexity is {{ $value }}"
```

### 2. Kubernetesでの自動スケーリング

```yaml
# HorizontalPodAutoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: graphql-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: graphql-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: graphql_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
```

## まとめ

GraphQLアプリケーションの運用・監視・デバッグには以下が重要です：

1. **包括的な監視**: メトリクス収集、構造化ログ、分散トレーシング
2. **プロアクティブなアラート**: 性能劣化やエラー増加の早期検出
3. **効果的なデバッグ**: 開発・本番環境でのトラブルシューティング手法
4. **自動スケーリング**: メトリクスベースのキャパシティ管理
5. **継続的改善**: パフォーマンスデータに基づく最適化

## GraphQL連載の完了

これで全10回のGraphQL連載が完了しました。基本概念から実践的な運用まで、GraphQLエコシステムの包括的な知識を習得いただけたはずです。

- **第1〜5回**: GraphQLの基礎から実装まで
- **第6〜10回**: 最適化、リアルタイム機能、テスト、セキュリティ、運用

GraphQLは進化し続ける技術です。新しい仕様や最適化手法、ツールが日々登場しているため、継続的な学習と実践を通じて、さらに深い理解を深めていってください。

Happy GraphQL development! 🚀