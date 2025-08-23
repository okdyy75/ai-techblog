# GCPエンタープライズ：大規模システムとベストプラクティス

## 概要

GCPの高度なサービスを理解した後は、エンタープライズレベルの要件に対応するためのアーキテクチャパターンとベストプラクティスを学びましょう。この記事では、セキュリティ、コンプライアンス、コスト最適化、災害復旧などについて詳しく解説します。

## エンタープライズセキュリティ

### 1. Organization Policy
```bash
# Organization Policyの設定
gcloud resource-manager org-policies set-policy \
  --project=my-project-id \
  policy.yaml

# 制約の確認
gcloud resource-manager org-policies list \
  --project=my-project-id
```

```yaml
# policy.yaml
name: projects/my-project-id/policies/compute.vmExternalIpAccess
spec:
  rules:
  - enforce: true
    condition:
      title: "Allow external IP only for specific instances"
      description: "Allow external IP only for instances with specific labels"
      expression: "resource.labels.allow-external-ip == 'true'"
```

### 2. VPC Service Controls
```bash
# サービス境界の作成
gcloud access-context-manager policies create \
  --organization=123456789 \
  --title="My Policy"

# サービス境界の設定
gcloud access-context-manager levels create "my-level" \
  --policy=123456789 \
  --title="My Level" \
  --basic-level-spec=level-spec.yaml
```

```yaml
# level-spec.yaml
resources:
- projects/my-project-id
accessLevels:
- name: "my-level"
  title: "My Level"
  description: "Access level for my service"
  basic:
    conditions:
    - members:
      - "user:admin@example.com"
      - "serviceAccount:my-service@my-project.iam.gserviceaccount.com"
```

### 3. Cloud Armor
```bash
# セキュリティポリシーの作成
gcloud compute security-policies create my-policy \
  --description="My security policy"

# ルールの追加
gcloud compute security-policies rules create 1000 \
  --security-policy=my-policy \
  --expression="evaluatePreconfiguredExpr('xss-stable')" \
  --action="deny-403"

# レート制限の設定
gcloud compute security-policies rules create 2000 \
  --security-policy=my-policy \
  --expression="true" \
  --rate-limit-threshold-count=100 \
  --rate-limit-threshold-interval-sec=60 \
  --action="rate-based-ban"
```

## コンプライアンスとガバナンス

### 1. Cloud Asset Inventory
```bash
# アセットのエクスポート
gcloud asset export --project=my-project-id \
  --output-path=gs://my-bucket/assets \
  --content-type=resource \
  --asset-types="compute.googleapis.com/Instance"

# リアルタイムフィードの設定
gcloud asset feeds create my-feed \
  --project=my-project-id \
  --asset-names="projects/my-project-id" \
  --asset-types="compute.googleapis.com/Instance" \
  --condition-expression="temporal_asset.deleted" \
  --pubsub-topic="projects/my-project-id/topics/my-topic"
```

### 2. Cloud Audit Logs
```bash
# 監査ログの有効化
gcloud logging sinks create my-audit-sink \
  storage.googleapis.com/my-audit-bucket \
  --log-filter='logName:"projects/my-project-id/logs/cloudaudit.googleapis.com%2Factivity"'

# データアクセスログの有効化
gcloud logging sinks create my-data-access-sink \
  storage.googleapis.com/my-data-access-bucket \
  --log-filter='logName:"projects/my-project-id/logs/cloudaudit.googleapis.com%2Fdata_access"'
```

### 3. Data Loss Prevention (DLP)
```javascript
// dlp.js
const {DlpServiceClient} = require('@google-cloud/dlp');
const client = new DlpServiceClient();

async function inspectContent(projectId, content) {
  const request = {
    parent: `projects/${projectId}`,
    item: {
      value: content
    },
    inspectConfig: {
      infoTypes: [
        {name: 'EMAIL_ADDRESS'},
        {name: 'PHONE_NUMBER'},
        {name: 'CREDIT_CARD_NUMBER'}
      ],
      minLikelihood: 'LIKELY'
    }
  };

  const [response] = await client.inspectContent(request);
  return response.result;
}

async function deidentifyContent(projectId, content) {
  const request = {
    parent: `projects/${projectId}`,
    deidentifyConfig: {
      infoTypeTransformations: {
        transformations: [
          {
            primitiveTransformation: {
              replaceWithInfoTypeConfig: {}
            }
          }
        ]
      }
    },
    item: {
      value: content
    }
  };

  const [response] = await client.deidentifyContent(request);
  return response.item.value;
}
```

## コスト最適化

### 1. Committed Use Discounts
```bash
# 1年間のコミットメント
gcloud compute commitments create my-commitment \
  --region=us-central1 \
  --resources=vcpu=4,memory=16384 \
  --plan=12-month

# 3年間のコミットメント
gcloud compute commitments create my-commitment-3yr \
  --region=us-central1 \
  --resources=vcpu=8,memory=32768 \
  --plan=36-month
```

### 2. Preemptible Instances
```yaml
# preemptible-instance.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-preemptible-app
spec:
  replicas: 5
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
      nodeSelector:
        cloud.google.com/gke-preemptible: "true"
      tolerations:
      - key: "cloud.google.com/gke-preemptible"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
```

### 3. 自動スケーリング
```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 20
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
```

## 災害復旧とバックアップ

### 1. マルチリージョンデプロイメント
```bash
# マルチリージョンクラスターの作成
gcloud container clusters create my-multi-region-cluster \
  --region=us-central1 \
  --num-nodes=3 \
  --machine-type=e2-standard-4 \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=10

# セカンダリクラスターの作成
gcloud container clusters create my-secondary-cluster \
  --region=us-east1 \
  --num-nodes=3 \
  --machine-type=e2-standard-4 \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=10
```

### 2. データベースのレプリケーション
```bash
# Cloud SQLの読み取りレプリカ作成
gcloud sql instances create my-read-replica \
  --master-instance-name=my-master-instance \
  --region=us-east1 \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro

# フェイルオーバーレプリカの作成
gcloud sql instances create my-failover-replica \
  --master-instance-name=my-master-instance \
  --region=us-east1 \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --availability-type=REGIONAL
```

### 3. バックアップ戦略
```bash
# Cloud Storageのバックアップ
gsutil mb gs://my-backup-bucket
gsutil lifecycle set lifecycle.json gs://my-backup-bucket

# 自動バックアップの設定
gcloud sql instances patch my-instance \
  --backup-start-time="23:00" \
  --backup-location=us-central1 \
  --enable-bin-log
```

```json
// lifecycle.json
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {
        "age": 365,
        "isLive": true
      }
    },
    {
      "action": {"type": "SetStorageClass"},
      "condition": {
        "age": 30,
        "isLive": true
      },
      "setStorageClass": "NEARLINE"
    }
  ]
}
```

## パフォーマンス最適化

### 1. Cloud CDN
```bash
# バックエンドバケットの作成
gsutil mb gs://my-cdn-bucket
gsutil iam ch allUsers:objectViewer gs://my-cdn-bucket

# Cloud CDNの有効化
gcloud compute backend-buckets create my-backend-bucket \
  --gcs-bucket-name=my-cdn-bucket \
  --enable-cdn

# URLマップの作成
gcloud compute url-maps create my-cdn-url-map \
  --default-backend-bucket=my-backend-bucket
```

### 2. Cloud Memorystore
```bash
# Redisインスタンスの作成
gcloud redis instances create my-redis-instance \
  --region=us-central1 \
  --zone=us-central1-a \
  --size=1 \
  --redis-version=redis_6_x

# Memcachedインスタンスの作成
gcloud memcache instances create my-memcache-instance \
  --region=us-central1 \
  --zone=us-central1-a \
  --node-count=1 \
  --node-cpu=1 \
  --node-memory=1GB
```

### 3. データベース最適化
```sql
-- インデックスの作成
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_order_date ON orders(created_at);

-- パーティショニング
CREATE TABLE orders_partitioned (
  id INT,
  user_id INT,
  amount DECIMAL(10,2),
  created_at TIMESTAMP
) PARTITION BY RANGE (YEAR(created_at));

-- ビューの作成
CREATE VIEW user_order_summary AS
SELECT 
  u.id,
  u.name,
  COUNT(o.id) as order_count,
  SUM(o.amount) as total_amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

## 監視とアラート

### 1. カスタムダッシュボード
```javascript
// dashboard.js
const {DashboardsServiceClient} = require('@google-cloud/monitoring-dashboards');
const client = new DashboardsServiceClient();

async function createDashboard(projectId) {
  const request = {
    parent: `projects/${projectId}`,
    dashboard: {
      displayName: 'My Custom Dashboard',
      gridLayout: {
        columns: '2',
        widgets: [
          {
            title: 'CPU Usage',
            xyChart: {
              dataSets: [{
                timeSeriesQuery: {
                  timeSeriesFilter: {
                    filter: 'metric.type="compute.googleapis.com/instance/cpu/utilization"'
                  }
                }
              }]
            }
          },
          {
            title: 'Memory Usage',
            xyChart: {
              dataSets: [{
                timeSeriesQuery: {
                  timeSeriesFilter: {
                    filter: 'metric.type="compute.googleapis.com/instance/memory/utilization"'
                  }
                }
              }]
            }
          }
        ]
      }
    }
  };

  const [dashboard] = await client.createDashboard(request);
  console.log(`Created dashboard: ${dashboard.name}`);
  return dashboard;
}
```

### 2. アラートポリシー
```yaml
# alert-policy.yaml
displayName: "High Error Rate Alert"
conditions:
- displayName: "Error rate is high"
  conditionThreshold:
    filter: 'metric.type="logging.googleapis.com/log_entry_count" AND resource.type="k8s_container" AND metric.labels.severity="ERROR"'
    comparison: COMPARISON_GREATER_THAN
    thresholdValue: 10
    duration: 300s
    aggregations:
    - alignmentPeriod: 60s
      perSeriesAligner: ALIGN_RATE
documentation:
  content: "Error rate is above 10 errors per minute for 5 minutes"
  mimeType: "text/markdown"
notificationChannels:
- projects/my-project/notificationChannels/123456789
```

## まとめ

GCPのエンタープライズ機能を活用することで、大規模で安全なシステムを構築できます。特に、セキュリティ、コンプライアンス、コスト最適化、災害復旧の組み合わせにより、エンタープライズレベルの運用が可能です。

これらの機能を適切に設定・運用することで、ビジネス要件を満たしながら、運用コストを最適化し、リスクを最小化できます。