# GCP上級者向け：高度なサービスとアーキテクチャ

## 概要

GCPの基本サービスを理解した後は、より高度なサービスとアーキテクチャパターンを活用して、スケーラブルで堅牢なシステムを構築しましょう。この記事では、Kubernetes、Cloud Run、Pub/Sub、Cloud Functionsなどについて詳しく解説します。

## Google Kubernetes Engine (GKE)

### 1. クラスターの作成
```bash
# 基本的なGKEクラスターの作成
gcloud container clusters create my-cluster \
  --zone=us-central1-a \
  --num-nodes=3 \
  --machine-type=e2-medium \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=10

# リージョナルクラスターの作成
gcloud container clusters create my-regional-cluster \
  --region=us-central1 \
  --num-nodes=3 \
  --machine-type=e2-standard-4 \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=10 \
  --enable-autorepair \
  --enable-autoupgrade
```

### 2. クラスターの管理
```bash
# クラスターへの接続
gcloud container clusters get-credentials my-cluster --zone=us-central1-a

# ノードプールの追加
gcloud container node-pools create high-memory-pool \
  --cluster=my-cluster \
  --zone=us-central1-a \
  --machine-type=e2-highmem-4 \
  --num-nodes=2

# クラスターのアップグレード
gcloud container clusters upgrade my-cluster \
  --zone=us-central1-a \
  --master-version=1.24.0-gke.1000
```

### 3. アプリケーションのデプロイ
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-app
        image: gcr.io/my-project/my-app:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-service
spec:
  selector:
    app: my-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: LoadBalancer
```

## Cloud Run

### 1. コンテナのビルドとデプロイ
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
```

```bash
# コンテナのビルド
gcloud builds submit --tag gcr.io/my-project/my-app

# Cloud Runへのデプロイ
gcloud run deploy my-app \
  --image gcr.io/my-project/my-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 0 \
  --port 8080
```

### 2. カスタムドメインとSSL
```bash
# カスタムドメインのマッピング
gcloud run domain-mappings create \
  --service my-app \
  --domain my-app.example.com \
  --region us-central1

# SSL証明書の自動管理
gcloud run domain-mappings describe \
  --domain my-app.example.com \
  --region us-central1
```

### 3. 環境変数とシークレット
```bash
# 環境変数の設定
gcloud run services update my-app \
  --region us-central1 \
  --set-env-vars DATABASE_URL=postgresql://... \
  --set-env-vars NODE_ENV=production

# シークレットの作成と使用
gcloud secrets create my-secret --data-file=./secret.txt
gcloud run services update my-app \
  --region us-central1 \
  --set-secrets MY_SECRET=my-secret:latest
```

## Cloud Functions

### 1. HTTP関数
```javascript
// index.js
const functions = require('@google-cloud/functions-framework');

functions.http('helloHttp', (req, res) => {
  res.status(200).send(`Hello ${req.query.name || req.body.name || 'World'}!`);
});

// 非同期処理
functions.http('processData', async (req, res) => {
  try {
    const data = req.body;
    const result = await processDataAsync(data);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 2. バックグラウンド関数
```javascript
// index.js
const functions = require('@google-cloud/functions-framework');

functions.cloudEvent('processFile', (cloudEvent) => {
  const file = cloudEvent.data;
  console.log(`Processing file: ${file.name}`);
  
  // ファイル処理ロジック
  return processFile(file);
});

// Pub/Subトリガー
functions.cloudEvent('processMessage', (cloudEvent) => {
  const message = cloudEvent.data.message;
  const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
  
  console.log(`Processing message: ${data.id}`);
  return processMessage(data);
});
```

### 3. デプロイメント
```bash
# HTTP関数のデプロイ
gcloud functions deploy helloHttp \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1

# Cloud Storageトリガーのデプロイ
gcloud functions deploy processFile \
  --runtime nodejs18 \
  --trigger-event google.storage.object.finalize \
  --trigger-resource my-bucket \
  --region us-central1

# Pub/Subトリガーのデプロイ
gcloud functions deploy processMessage \
  --runtime nodejs18 \
  --trigger-topic my-topic \
  --region us-central1
```

## Cloud Pub/Sub

### 1. トピックとサブスクリプション
```bash
# トピックの作成
gcloud pubsub topics create my-topic

# サブスクリプションの作成
gcloud pubsub subscriptions create my-subscription \
  --topic my-topic \
  --ack-deadline=60 \
  --message-retention-duration=7d

# プッシュサブスクリプション
gcloud pubsub subscriptions create my-push-subscription \
  --topic my-topic \
  --push-endpoint=https://my-app.example.com/push \
  --ack-deadline=60
```

### 2. メッセージの送受信
```javascript
// publisher.js
const {PubSub} = require('@google-cloud/pubsub');
const pubsub = new PubSub();

async function publishMessage(topicName, data) {
  const dataBuffer = Buffer.from(JSON.stringify(data));
  
  try {
    const messageId = await pubsub.topic(topicName).publish(dataBuffer);
    console.log(`Message ${messageId} published.`);
    return messageId;
  } catch (error) {
    console.error(`Received error while publishing: ${error.message}`);
    process.exitCode = 1;
  }
}

// subscriber.js
const {PubSub} = require('@google-cloud/pubsub');
const pubsub = new PubSub();

const subscriptionName = 'my-subscription';
const subscription = pubsub.subscription(subscriptionName);

const messageHandler = message => {
  console.log(`Received message ${message.id}:`);
  console.log(`\tData: ${message.data}`);
  console.log(`\tAttributes: ${message.attributes}`);
  
  // メッセージ処理
  processMessage(message.data);
  
  // メッセージの確認
  message.ack();
};

const errorHandler = error => {
  console.error('ERROR:', error);
};

subscription.on('message', messageHandler);
subscription.on('error', errorHandler);
```

## Cloud Load Balancing

### 1. HTTP(S)ロードバランサー
```bash
# バックエンドサービスの作成
gcloud compute backend-services create my-backend-service \
  --global \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --protocol=HTTP \
  --port-name=http

# バックエンドの追加
gcloud compute backend-services add-backend my-backend-service \
  --global \
  --instance-group=my-instance-group \
  --instance-group-zone=us-central1-a

# URLマップの作成
gcloud compute url-maps create my-url-map \
  --default-service my-backend-service

# HTTPSプロキシの作成
gcloud compute target-https-proxies create my-https-proxy \
  --url-map=my-url-map \
  --ssl-certificates=my-ssl-cert

# グローバルフォワーディングルールの作成
gcloud compute forwarding-rules create my-forwarding-rule \
  --global \
  --target-https-proxy=my-https-proxy \
  --ports=443
```

### 2. 内部ロードバランサー
```bash
# 内部ロードバランサーの作成
gcloud compute backend-services create my-internal-backend \
  --region=us-central1 \
  --load-balancing-scheme=INTERNAL_MANAGED \
  --protocol=HTTP \
  --port-name=http

# 内部ロードバランサーの設定
gcloud compute forwarding-rules create my-internal-forwarding-rule \
  --region=us-central1 \
  --load-balancing-scheme=INTERNAL_MANAGED \
  --network=my-vpc \
  --subnet=my-subnet \
  --address=10.0.0.10 \
  --ports=80 \
  --backend-service=my-internal-backend
```

## Cloud Monitoring

### 1. カスタムメトリクス
```javascript
// monitoring.js
const {Monitoring} = require('@google-cloud/monitoring');
const client = new Monitoring.MetricServiceClient();

async function createCustomMetric(projectId, metricType) {
  const request = {
    name: client.projectPath(projectId),
    metricDescriptor: {
      type: `custom.googleapis.com/${metricType}`,
      displayName: `Custom Metric: ${metricType}`,
      description: `A custom metric for ${metricType}`,
      metricKind: 'GAUGE',
      valueType: 'DOUBLE',
      unit: '1'
    }
  };

  const [descriptor] = await client.createMetricDescriptor(request);
  console.log(`Created custom metric: ${descriptor.name}`);
  return descriptor;
}

async function writeTimeSeries(projectId, metricType, value) {
  const request = {
    name: client.projectPath(projectId),
    timeSeries: [{
      metric: {
        type: `custom.googleapis.com/${metricType}`
      },
      resource: {
        type: 'global',
        labels: {
          project_id: projectId
        }
      },
      points: [{
        interval: {
          endTime: {
            seconds: Date.now() / 1000
          }
        },
        value: {
          doubleValue: value
        }
      }]
    }]
  };

  await client.createTimeSeries(request);
  console.log(`Wrote time series for ${metricType}: ${value}`);
}
```

### 2. アラートポリシー
```bash
# アラートポリシーの作成
gcloud alpha monitoring policies create \
  --policy-from-file=alert-policy.yaml

# 通知チャンネルの作成
gcloud alpha monitoring channels create \
  --display-name="Email Alerts" \
  --type="email" \
  --channel-labels="email_address=admin@example.com"
```

```yaml
# alert-policy.yaml
displayName: "High CPU Usage Alert"
conditions:
- displayName: "CPU usage is high"
  conditionThreshold:
    filter: 'metric.type="compute.googleapis.com/instance/cpu/utilization"'
    comparison: COMPARISON_GREATER_THAN
    thresholdValue: 0.8
    duration: 300s
documentation:
  content: "CPU usage is above 80% for 5 minutes"
  mimeType: "text/markdown"
notificationChannels:
- projects/my-project/notificationChannels/123456789
```

## Cloud Logging

### 1. 構造化ログ
```javascript
// logging.js
const {Logging} = require('@google-cloud/logging');
const logging = new Logging();

async function writeStructuredLog(projectId, logName, data) {
  const log = logging.log(logName);
  
  const entry = log.entry({
    resource: {
      type: 'global',
      labels: {
        project_id: projectId
      }
    },
    severity: 'INFO',
    jsonPayload: {
      message: 'Structured log entry',
      timestamp: new Date().toISOString(),
      data: data
    }
  });

  await log.write(entry);
  console.log(`Wrote log entry to ${logName}`);
}
```

### 2. ログフィルタリング
```bash
# ログの検索
gcloud logging read 'resource.type="gce_instance" AND severity>=ERROR' \
  --limit=10 \
  --format="table(timestamp,severity,textPayload)"

# ログエクスポート
gcloud logging sinks create my-sink \
  storage.googleapis.com/my-bucket \
  --log-filter='resource.type="gce_instance"'
```

## まとめ

GCPの高度なサービスを活用することで、エンタープライズレベルのアプリケーションを構築できます。特に、GKE、Cloud Run、Cloud Functions、Pub/Subの組み合わせにより、マイクロサービスアーキテクチャやサーバーレスアプリケーションの開発が可能です。

これらのサービスを適切に設定・運用することで、スケーラブルで堅牢なシステムを構築し、運用コストを最適化できます。