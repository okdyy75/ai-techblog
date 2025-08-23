# 【第10回】GraphQLの運用・監視・デバッグ - 本番環境での実践的な管理手法

GraphQLアプリケーションの本番運用には、適切な監視、ログ、デバッグ機能が不可欠です。この記事では、シンプルなコード例で実践的な運用手法を説明します。

## 基本的な監視設定

### パフォーマンス監視

```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    {
      requestDidStart() {
        return {
          willSendResponse({ response, context }) {
            const executionTime = Date.now() - context.requestStartTime;
            console.log(`Query execution time: ${executionTime}ms`);
            
            // 遅いクエリをアラート
            if (executionTime > 1000) {
              console.warn(`Slow query detected: ${executionTime}ms`);
            }
          }
        };
      }
    }
  ],
  
  context: () => ({
    requestStartTime: Date.now()
  })
});
```

### エラー監視

```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    {
      requestDidStart() {
        return {
          didEncounterErrors({ errors, request }) {
            errors.forEach(error => {
              console.error('GraphQL Error:', {
                message: error.message,
                path: error.path,
                query: request.query,
                variables: request.variables,
                timestamp: new Date().toISOString()
              });
            });
          }
        };
      }
    }
  ]
});
```

## Prometheusメトリクス

### 基本メトリクス

```javascript
const prometheus = require('prom-client');

// メトリクス定義
const queryDuration = new prometheus.Histogram({
  name: 'graphql_query_duration_seconds',
  help: 'GraphQL query execution time',
  labelNames: ['operation_name', 'operation_type']
});

const queryErrors = new prometheus.Counter({
  name: 'graphql_query_errors_total',
  help: 'GraphQL query errors',
  labelNames: ['operation_name', 'error_type']
});

// Apollo Serverプラグイン
const metricsPlugin = {
  requestDidStart() {
    return {
      willSendResponse({ request, response, context }) {
        const duration = (Date.now() - context.requestStartTime) / 1000;
        
        queryDuration
          .labels(request.operationName || 'unnamed', request.operation?.operation || 'unknown')
          .observe(duration);
      },
      
      didEncounterErrors({ request, errors }) {
        errors.forEach(error => {
          queryErrors
            .labels(request.operationName || 'unnamed', error.constructor.name)
            .inc();
        });
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

### メトリクスエンドポイント

```javascript
const express = require('express');
const app = express();

// メトリクス公開エンドポイント
app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

## 構造化ログ

### ログフォーマット

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'graphql.log' })
  ]
});

const loggingPlugin = {
  requestDidStart() {
    return {
      didResolveOperation({ request, operationName }) {
        logger.info('GraphQL Operation', {
          operationName,
          query: request.query,
          variables: request.variables
        });
      },
      
      didEncounterErrors({ errors, request }) {
        errors.forEach(error => {
          logger.error('GraphQL Error', {
            message: error.message,
            path: error.path,
            stack: error.stack,
            query: request.query
          });
        });
      }
    };
  }
};
```

## ヘルスチェック

### 基本ヘルスチェック

```javascript
app.get('/health', async (req, res) => {
  try {
    // データベース接続確認
    await db.query('SELECT 1');
    
    // 外部サービス確認
    await checkExternalServices();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GraphQLエンドポイントの健全性
app.get('/health/graphql', async (req, res) => {
  try {
    const result = await server.executeOperation({
      query: 'query { __typename }'
    });
    
    if (result.errors) {
      throw new Error('GraphQL health check failed');
    }
    
    res.status(200).json({ status: 'healthy' });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      error: error.message 
    });
  }
});
```

## デバッグ機能

### GraphQL Playground（開発環境）

```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
  playground: process.env.NODE_ENV === 'development' ? {
    settings: {
      'request.credentials': 'include'
    }
  } : false
});
```

### クエリ実行時間の詳細ログ

```javascript
const executionTimePlugin = {
  requestDidStart() {
    return {
      willSendResponse({ response, context }) {
        const { requestStartTime, resolverTimes = {} } = context;
        const totalTime = Date.now() - requestStartTime;
        
        console.log('Query Performance:', {
          totalTime: `${totalTime}ms`,
          resolverTimes
        });
      }
    };
  }
};

// リゾルバ実行時間の計測
const createTimedResolver = (resolver, name) => {
  return async (...args) => {
    const start = Date.now();
    const result = await resolver(...args);
    const executionTime = Date.now() - start;
    
    const context = args[2];
    context.resolverTimes = context.resolverTimes || {};
    context.resolverTimes[name] = `${executionTime}ms`;
    
    return result;
  };
};
```

## 自動スケーリング指標

### リソース使用率監視

```javascript
const os = require('os');

const resourceMetrics = {
  cpuUsage: new prometheus.Gauge({
    name: 'nodejs_cpu_usage_percent',
    help: 'CPU usage percentage'
  }),
  
  memoryUsage: new prometheus.Gauge({
    name: 'nodejs_memory_usage_bytes',
    help: 'Memory usage in bytes',
    labelNames: ['type']
  })
};

// メトリクス更新
setInterval(() => {
  const cpus = os.cpus();
  const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
  const totalTick = cpus.reduce((acc, cpu) => 
    acc + Object.values(cpu.times).reduce((a, b) => a + b, 0), 0);
  
  const cpuUsage = 100 - (totalIdle / totalTick) * 100;
  resourceMetrics.cpuUsage.set(cpuUsage);
  
  const memUsage = process.memoryUsage();
  resourceMetrics.memoryUsage.labels('heapUsed').set(memUsage.heapUsed);
  resourceMetrics.memoryUsage.labels('heapTotal').set(memUsage.heapTotal);
}, 5000);
```

## パフォーマンス最適化の監視

### データローダーメトリクス

```javascript
const createInstrumentedDataLoader = (batchFunction, name) => {
  const batchSize = new prometheus.Histogram({
    name: `dataloader_batch_size_${name}`,
    help: `DataLoader batch size for ${name}`
  });
  
  const instrumentedBatch = async (keys) => {
    batchSize.observe(keys.length);
    return await batchFunction(keys);
  };
  
  return new DataLoader(instrumentedBatch);
};
```

## エラーアラート

### Slack通知

```javascript
const { WebClient } = require('@slack/web-api');
const slack = new WebClient(process.env.SLACK_TOKEN);

const alertPlugin = {
  requestDidStart() {
    return {
      didEncounterErrors({ errors, request }) {
        errors.forEach(async (error) => {
          if (error.severity === 'critical') {
            await slack.chat.postMessage({
              channel: '#alerts',
              text: `GraphQL Critical Error: ${error.message}`
            });
          }
        });
      }
    };
  }
};
```

## まとめ

GraphQL運用の要点：

1. **パフォーマンス監視**: 実行時間とリソース使用率の追跡
2. **Prometheusメトリクス**: スケーラブルな監視システム
3. **構造化ログ**: 検索・分析しやすいログ形式
4. **ヘルスチェック**: サービスの健全性確認
5. **自動アラート**: 異常時の迅速な通知

適切な監視とログにより、GraphQLアプリケーションの安定した運用を実現できます。