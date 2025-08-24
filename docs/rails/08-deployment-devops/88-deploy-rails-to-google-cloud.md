# Google CloudでRailsアプリケーションをデプロイする2025年版ガイド

## はじめに

Google Cloud Platform (GCP) は、Googleのインフラストラクチャを活用した包括的なクラウドサービスです。Railsアプリケーションのホスティングにおいて、GCPは高性能、高可用性、そして柔軟なスケーリングを提供します。特に、Google App Engine (GAE) のマネージドサービスから、Google Kubernetes Engine (GKE) でのコンテナオーケストレーション、Compute Engineでの仮想マシン管理まで、様々なデプロイメント選択肢があります。

この記事では、2025年現在のGoogle Cloudの各サービスを活用して、Railsアプリケーションをデプロイする包括的な方法について解説します。

## Google Cloudを選ぶ理由

### メリット

- **強力なインフラストラクチャ**: Googleの世界クラスのインフラを活用
- **豊富なマネージドサービス**: データベース、キャッシュ、ML/AIサービスなど
- **自動スケーリング**: トラフィックに応じた自動的なリソース調整
- **グローバル配信**: 世界中のリージョンでの高速アクセス
- **DevOps統合**: Cloud Build、Cloud SourceリポジトリなどのCI/CD機能

### デメリット

- **学習コストが高い**: 多数のサービスと設定オプション
- **料金の複雑さ**: 使用量ベースの細かい課金体系
- **オーバーエンジニアリングのリスク**: 小規模プロジェクトには過剰な場合も

## Google Cloudでのデプロイ選択肢

### 1. Google App Engine (GAE) - 推奨
最もシンプルでマネージドなオプション

### 2. Google Kubernetes Engine (GKE)
コンテナベースのオーケストレーション

### 3. Compute Engine + Cloud SQL
仮想マシンベースの従来型デプロイ

### 4. Cloud Run
サーバーレスコンテナプラットフォーム

## 方法1: Google App Engine (GAE) を使ったデプロイ

### Google App Engineの特徴

- **ゼロサーバー管理**: インフラの管理が不要
- **自動スケーリング**: 0インスタンスから自動でスケール
- **マネージドSSL**: HTTPSの自動設定
- **ヘルスチェック**: 自動的な健全性監視

### 事前準備

#### 1. Google Cloud CLIのインストール

```bash
# macOS
brew install google-cloud-sdk

# Ubuntu/Debian
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# 認証
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

#### 2. プロジェクトの設定

```bash
# 新しいプロジェクトを作成
gcloud projects create YOUR_PROJECT_ID

# プロジェクトを設定
gcloud config set project YOUR_PROJECT_ID

# 必要なAPIを有効化
gcloud services enable appengine.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### Railsアプリケーションの準備

#### 1. Gemfileの設定

```ruby
# Gemfile
source 'https://rubygems.org'
git_source(:github) { |repo| "https://github.com/#{repo}.git" }

ruby '3.2.0'

gem 'rails', '~> 7.1.0'
gem 'pg', '~> 1.5'  # PostgreSQL for production
gem 'puma', '~> 6.0'

# App Engine specific gems
gem 'google-cloud-storage', '~> 1.44'
gem 'google-cloud-logging', '~> 2.3'

group :development, :test do
  gem 'sqlite3', '~> 1.4'
  gem 'debug', platforms: %i[ mri mingw x64_mingw ]
end

group :development do
  gem 'web-console'
end
```

#### 2. app.yamlの作成

```yaml
# app.yaml
runtime: ruby32

# 環境変数
env_variables:
  RAILS_ENV: production
  SECRET_KEY_BASE: your-secret-key-base
  RAILS_LOG_TO_STDOUT: true

# 自動スケーリング設定
automatic_scaling:
  min_instances: 1
  max_instances: 10
  target_cpu_utilization: 0.6

# リソース設定
resources:
  cpu: 1
  memory_gb: 0.5

# ヘルスチェック
liveness_check:
  path: "/health"
  check_interval_sec: 30
  timeout_sec: 4
  failure_threshold: 2
  success_threshold: 2

readiness_check:
  path: "/health"
  check_interval_sec: 5
  timeout_sec: 4
  failure_threshold: 2
  success_threshold: 2
```

#### 3. ヘルスチェックエンドポイントの追加

```ruby
# config/routes.rb
Rails.application.routes.draw do
  get '/health', to: 'health#check'
  # 他のルート...
end
```

```ruby
# app/controllers/health_controller.rb
class HealthController < ApplicationController
  def check
    render json: { 
      status: 'ok', 
      timestamp: Time.current.iso8601,
      environment: Rails.env
    }
  end
end
```

#### 4. Cloud SQLデータベースの設定

```bash
# Cloud SQLインスタンスを作成
gcloud sql instances create my-rails-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1

# データベースを作成
gcloud sql databases create my_rails_production \
    --instance=my-rails-db

# ユーザーを作成
gcloud sql users create railsuser \
    --instance=my-rails-db \
    --password=your-secure-password
```

#### 5. database.ymlの設定

```yaml
# config/database.yml
production:
  adapter: postgresql
  encoding: unicode
  database: my_rails_production
  username: railsuser
  password: <%= ENV['DB_PASSWORD'] %>
  host: <%= ENV['DB_HOST'] %>
  port: 5432
  pool: 5
  # Cloud SQL Proxy使用時の設定
  host: <%= ENV['CLOUD_SQL_CONNECTION_NAME'] ? "/cloudsql/#{ENV['CLOUD_SQL_CONNECTION_NAME']}" : "localhost" %>
```

#### 6. App Engineの環境変数設定

```yaml
# app.yaml (環境変数セクションを更新)
env_variables:
  RAILS_ENV: production
  SECRET_KEY_BASE: your-secret-key-base
  RAILS_LOG_TO_STDOUT: true
  DB_PASSWORD: your-secure-password
  CLOUD_SQL_CONNECTION_NAME: your-project:us-central1:my-rails-db
```

### デプロイ実行

```bash
# アプリケーションをデプロイ
gcloud app deploy

# デフォルトサービスとして設定
gcloud app deploy --promote

# ログを確認
gcloud app logs tail -s default
```

## 方法2: Cloud Run を使ったサーバーレスデプロイ

### Cloud Runの特徴

- **完全サーバーレス**: 使用した分だけ課金
- **高速スタートアップ**: コールドスタートが高速
- **Dockerベース**: 任意のコンテナイメージを実行
- **自動HTTPS**: カスタムドメインでのSSL証明書

### Dockerfileの作成

```dockerfile
# Dockerfile
FROM ruby:3.2.0-slim

# 作業ディレクトリを設定
WORKDIR /app

# システムの依存関係をインストール
RUN apt-get update -qq && apt-get install -y \
    build-essential \
    libpq-dev \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Gemをインストール
COPY Gemfile Gemfile.lock ./
RUN bundle config set --local deployment 'true' && \
    bundle config set --local without 'development test' && \
    bundle install

# アプリケーションのファイルをコピー
COPY . .

# アセットをプリコンパイル
RUN RAILS_ENV=production bundle exec rails assets:precompile

# ポートを公開
EXPOSE 8080

# アプリケーションを起動
CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]
```

### Puma設定の調整

```ruby
# config/puma.rb
require 'concurrent'

max_threads_count = ENV.fetch('RAILS_MAX_THREADS', 5)
min_threads_count = ENV.fetch('RAILS_MIN_THREADS') { max_threads_count }
threads min_threads_count, max_threads_count

# Cloud Runのポート設定
port ENV.fetch('PORT', 8080)

environment ENV.fetch('RAILS_ENV', 'development')

# プロセス数（Cloud Runでは1に設定）
workers ENV.fetch('WEB_CONCURRENCY', 1)

preload_app!

on_worker_boot do
  ActiveRecord::Base.establish_connection if defined?(ActiveRecord)
end

# Graceful shutdown
plugin :tmp_restart
```

### Cloud Build設定

```yaml
# cloudbuild.yaml
steps:
  # イメージをビルド
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-rails-app', '.']

  # Container Registryにプッシュ
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/my-rails-app']

  # Cloud Runにデプロイ
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'my-rails-app'
      - '--image'
      - 'gcr.io/$PROJECT_ID/my-rails-app'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
```

### デプロイ実行

```bash
# Cloud Buildでビルドとデプロイ
gcloud builds submit --config cloudbuild.yaml

# または、手動でデプロイ
docker build -t gcr.io/YOUR_PROJECT_ID/my-rails-app .
docker push gcr.io/YOUR_PROJECT_ID/my-rails-app

gcloud run deploy my-rails-app \
    --image gcr.io/YOUR_PROJECT_ID/my-rails-app \
    --region us-central1 \
    --platform managed \
    --allow-unauthenticated
```

## 方法3: Google Kubernetes Engine (GKE) を使ったコンテナオーケストレーション

### GKEクラスターの作成

```bash
# Autopilotモード（推奨）でクラスター作成
gcloud container clusters create-auto my-rails-cluster \
    --region=us-central1

# クラスターに接続
gcloud container clusters get-credentials my-rails-cluster \
    --region=us-central1
```

### Kubernetes設定ファイル

#### 1. ConfigMapとSecret

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rails-config
data:
  RAILS_ENV: "production"
  RAILS_LOG_TO_STDOUT: "true"
  RAILS_SERVE_STATIC_FILES: "true"

---
apiVersion: v1
kind: Secret
metadata:
  name: rails-secrets
type: Opaque
stringData:
  SECRET_KEY_BASE: "your-secret-key-base"
  DATABASE_URL: "postgresql://user:password@postgres:5432/my_rails_production"
```

#### 2. Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rails-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rails-app
  template:
    metadata:
      labels:
        app: rails-app
    spec:
      containers:
      - name: rails
        image: gcr.io/YOUR_PROJECT_ID/my-rails-app:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: rails-config
        - secretRef:
            name: rails-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

#### 3. Service と Ingress

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: rails-service
spec:
  selector:
    app: rails-app
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rails-ingress
  annotations:
    kubernetes.io/ingress.global-static-ip-name: rails-ip
    networking.gke.io/managed-certificates: rails-ssl-cert
spec:
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rails-service
            port:
              number: 80
```

### デプロイ実行

```bash
# イメージをビルドしてプッシュ
docker build -t gcr.io/YOUR_PROJECT_ID/my-rails-app:latest .
docker push gcr.io/YOUR_PROJECT_ID/my-rails-app:latest

# Kubernetesリソースを適用
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# デプロイ状況を確認
kubectl get pods
kubectl get services
kubectl get ingress
```

## Cloud SQLでのデータベース管理

### 高可用性設定

```bash
# 高可用性のCloud SQLインスタンス作成
gcloud sql instances create my-rails-db-ha \
    --database-version=POSTGRES_15 \
    --tier=db-custom-2-7680 \
    --region=us-central1 \
    --availability-type=REGIONAL \
    --backup-start-time=03:00 \
    --backup-location=us \
    --maintenance-window-day=SUN \
    --maintenance-window-hour=04
```

### 自動バックアップとポイントインタイムリカバリ

```bash
# バックアップの確認
gcloud sql backups list --instance=my-rails-db-ha

# ポイントインタイムリカバリ
gcloud sql backups restore BACKUP_ID \
    --restore-instance=my-rails-db-restored \
    --backup-instance=my-rails-db-ha
```

## Cloud Storageでのファイル管理

### Active Storageの設定

```ruby
# config/storage.yml
google:
  service: GCS
  credentials: <%= Rails.root.join("path/to/keyfile.json") %>
  project: your-project-id
  bucket: your-bucket-name

production:
  service: google
```

```ruby
# config/environments/production.rb
Rails.application.configure do
  config.active_storage.service = :google
end
```

### バケットの作成

```bash
# Cloud Storageバケットを作成
gsutil mb gs://your-bucket-name

# 公開設定（必要に応じて）
gsutil iam ch allUsers:objectViewer gs://your-bucket-name
```

## 監視とログ

### Cloud Loggingの設定

```ruby
# Gemfile
gem 'google-cloud-logging'

# config/environments/production.rb
Rails.application.configure do
  require 'google/cloud/logging'
  
  config.google_cloud_logging = Google::Cloud::Logging.new
  config.logger = config.google_cloud_logging.logger "rails-app"
end
```

### Cloud Monitoringでのメトリクス

```bash
# Monitoring APIを有効化
gcloud services enable monitoring.googleapis.com

# カスタムメトリクスの送信例
```

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  before_action :record_metrics
  
  private
  
  def record_metrics
    # カスタムメトリクスをCloud Monitoringに送信
    if Rails.env.production?
      # 実装例: リクエスト数やレスポンス時間を記録
    end
  end
end
```

## セキュリティ設定

### IAMとサービスアカウント

```bash
# サービスアカウントを作成
gcloud iam service-accounts create rails-app-sa \
    --description="Service account for Rails app" \
    --display-name="Rails App Service Account"

# 必要な権限を付与
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:rails-app-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:rails-app-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"
```

### VPCとファイアウォール

```bash
# VPCネットワークを作成
gcloud compute networks create rails-vpc --subnet-mode=custom

# サブネットを作成
gcloud compute networks subnets create rails-subnet \
    --network=rails-vpc \
    --range=10.1.0.0/24 \
    --region=us-central1

# ファイアウォールルールを作成
gcloud compute firewall-rules create allow-rails-http \
    --network=rails-vpc \
    --allow=tcp:80,tcp:443 \
    --source-ranges=0.0.0.0/0
```

## パフォーマンス最適化

### Cloud CDNの設定

```bash
# グローバル静的IPアドレスを作成
gcloud compute addresses create rails-ip --global

# Cloud CDNを有効化
gcloud compute backend-services create rails-backend \
    --protocol=HTTP \
    --health-checks=rails-health-check \
    --global

gcloud compute backend-services update rails-backend \
    --enable-cdn \
    --global
```

### メモリ最適化

```ruby
# config/boot.rb
ENV['BUNDLE_GEMFILE'] ||= File.expand_path('../Gemfile', __dir__)

require 'bundler/setup'

# メモリ使用量の最適化
if ENV['RAILS_ENV'] == 'production'
  require 'bootsnap/setup'
end
```

## 料金最適化

### プリエンプティブルインスタンスの活用

```bash
# プリエンプティブルノードプールでGKEクラスター作成
gcloud container node-pools create preemptible-pool \
    --cluster=my-rails-cluster \
    --zone=us-central1-a \
    --preemptible \
    --num-nodes=3 \
    --machine-type=e2-medium
```

### 自動スケーリング設定

```bash
# 水平ポッドオートスケーラーの設定
kubectl autoscale deployment rails-app --cpu-percent=70 --min=2 --max=10
```

## まとめ

Google CloudでのRailsアプリケーションデプロイは、プロジェクトの要件に応じて複数の選択肢があります：

### 推奨される使用ケース別

#### Google App Engine
- **小〜中規模アプリケーション**: シンプルなWebアプリケーション
- **迅速な開発**: プロトタイプから本格運用まで
- **サーバー管理不要**: インフラ管理を避けたい場合

#### Cloud Run
- **マイクロサービス**: APIサービスや軽量なWebアプリケーション
- **コスト効率**: 使用量に応じた課金が重要な場合
- **コンテナベース**: 既存のDockerワークフローがある場合

#### Google Kubernetes Engine
- **大規模アプリケーション**: 高いスケーラビリティが必要
- **マルチサービス**: 複数のサービスを統合管理
- **細かい制御**: インフラレベルでの詳細な設定が必要

Google Cloudの豊富なマネージドサービスを活用することで、スケーラブルで信頼性の高いRailsアプリケーションを効率的に運用できます。適切なサービス選択と設定により、開発者は本来のアプリケーション開発に集中できるでしょう。