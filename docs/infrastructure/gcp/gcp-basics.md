# Google Cloud Platform基礎知識：クラウドインフラの入門

## 概要

Google Cloud Platform（GCP）は、Googleが提供する包括的なクラウドコンピューティングプラットフォームです。コンピューティング、ストレージ、ネットワーキング、機械学習など、200以上のサービスを提供しており、エンタープライズレベルのインフラストラクチャを構築できます。

## GCPの主要サービス

### 1. コンピューティング
- **Compute Engine**: 仮想マシン（VM）
- **App Engine**: マネージドアプリケーションプラットフォーム
- **Cloud Run**: コンテナベースのサーバーレスプラットフォーム
- **Cloud Functions**: サーバーレス関数

### 2. ストレージ
- **Cloud Storage**: オブジェクトストレージ
- **Cloud SQL**: マネージドリレーショナルデータベース
- **Cloud Firestore**: NoSQLデータベース
- **BigQuery**: データウェアハウス

### 3. ネットワーキング
- **VPC**: 仮想プライベートクラウド
- **Cloud Load Balancing**: ロードバランサー
- **Cloud CDN**: コンテンツ配信ネットワーク
- **Cloud DNS**: DNSサービス

## 基本的なセットアップ

### 1. GCPアカウントの作成
```bash
# Google Cloud CLIのインストール
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# 初期化
gcloud init

# プロジェクトの作成
gcloud projects create my-project-id --name="My Project"

# プロジェクトの設定
gcloud config set project my-project-id
```

### 2. 認証の設定
```bash
# サービスアカウントキーの作成
gcloud iam service-accounts create my-service-account \
  --display-name="My Service Account"

# キーファイルのダウンロード
gcloud iam service-accounts keys create key.json \
  --iam-account=my-service-account@my-project-id.iam.gserviceaccount.com

# 認証の設定
gcloud auth activate-service-account --key-file=key.json
```

### 3. 必要なAPIの有効化
```bash
# Compute Engine API
gcloud services enable compute.googleapis.com

# Cloud Storage API
gcloud services enable storage.googleapis.com

# Cloud SQL API
gcloud services enable sqladmin.googleapis.com
```

## Compute Engine（仮想マシン）

### 1. VMインスタンスの作成
```bash
# 基本的なVMインスタンスの作成
gcloud compute instances create my-instance \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=debian-11 \
  --image-project=debian-cloud \
  --boot-disk-size=10GB \
  --boot-disk-type=pd-standard

# カスタム設定でのVM作成
gcloud compute instances create my-instance \
  --zone=us-central1-a \
  --machine-type=e2-standard-4 \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB \
  --boot-disk-type=pd-ssd \
  --tags=http-server,https-server \
  --metadata=startup-script='#! /bin/bash
    sudo apt-get update
    sudo apt-get install -y nginx
    sudo systemctl start nginx'
```

### 2. インスタンスの管理
```bash
# インスタンスの一覧表示
gcloud compute instances list

# インスタンスの停止
gcloud compute instances stop my-instance --zone=us-central1-a

# インスタンスの開始
gcloud compute instances start my-instance --zone=us-central1-a

# インスタンスの削除
gcloud compute instances delete my-instance --zone=us-central1-a
```

### 3. ファイアウォールルール
```bash
# HTTPトラフィックを許可
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 \
  --source-ranges 0.0.0.0/0 \
  --target-tags http-server

# HTTPSトラフィックを許可
gcloud compute firewall-rules create allow-https \
  --allow tcp:443 \
  --source-ranges 0.0.0.0/0 \
  --target-tags https-server
```

## Cloud Storage

### 1. バケットの作成と管理
```bash
# バケットの作成
gsutil mb gs://my-unique-bucket-name

# バケットの一覧表示
gsutil ls

# バケットの削除
gsutil rm -r gs://my-unique-bucket-name
```

### 2. ファイルのアップロード・ダウンロード
```bash
# ファイルのアップロード
gsutil cp local-file.txt gs://my-bucket/

# ディレクトリ全体のアップロード
gsutil -m cp -r local-directory/ gs://my-bucket/

# ファイルのダウンロード
gsutil cp gs://my-bucket/file.txt ./

# ファイルの削除
gsutil rm gs://my-bucket/file.txt
```

### 3. アクセス制御
```bash
# バケットを公開
gsutil iam ch allUsers:objectViewer gs://my-bucket

# 特定のユーザーに権限を付与
gsutil iam ch user:user@example.com:objectAdmin gs://my-bucket

# バケットのACL設定
gsutil acl set public-read gs://my-bucket
```

## Cloud SQL（データベース）

### 1. MySQLインスタンスの作成
```bash
# MySQLインスタンスの作成
gcloud sql instances create my-mysql-instance \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-type=HDD \
  --storage-size=10GB \
  --backup-start-time="23:00" \
  --enable-bin-log

# データベースの作成
gcloud sql databases create my-database \
  --instance=my-mysql-instance

# ユーザーの作成
gcloud sql users create my-user \
  --instance=my-mysql-instance \
  --password=my-password
```

### 2. PostgreSQLインスタンスの作成
```bash
# PostgreSQLインスタンスの作成
gcloud sql instances create my-postgres-instance \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-type=HDD \
  --storage-size=10GB \
  --backup-start-time="23:00"

# データベースの作成
gcloud sql databases create my-database \
  --instance=my-postgres-instance

# ユーザーの作成
gcloud sql users create my-user \
  --instance=my-postgres-instance \
  --password=my-password
```

### 3. 接続と管理
```bash
# インスタンスへの接続
gcloud sql connect my-mysql-instance --user=root

# インスタンス情報の表示
gcloud sql instances describe my-mysql-instance

# インスタンスの停止
gcloud sql instances patch my-mysql-instance \
  --activation-policy NEVER

# インスタンスの開始
gcloud sql instances patch my-mysql-instance \
  --activation-policy ALWAYS
```

## App Engine

### 1. 基本的なアプリケーション
```python
# main.py
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello, World!'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

```yaml
# app.yaml
runtime: python39

handlers:
- url: /.*
  script: auto

env_variables:
  ENVIRONMENT: production
```

### 2. デプロイメント
```bash
# アプリケーションのデプロイ
gcloud app deploy

# アプリケーションの表示
gcloud app browse

# ログの確認
gcloud app logs tail -s default
```

## 料金体系

### 1. 無料枠
- **Compute Engine**: 1つのf1-microインスタンス（月744時間）
- **Cloud Storage**: 5GB
- **Cloud SQL**: なし
- **App Engine**: 標準環境で月28インスタンス時間

### 2. 従量課金
- **Compute Engine**: インスタンスタイプと使用時間に応じて課金
- **Cloud Storage**: 保存容量と転送量に応じて課金
- **Cloud SQL**: インスタンスタイプと使用時間に応じて課金

### 3. コスト最適化
```bash
# 使用量の確認
gcloud billing accounts list

# 予算アラートの設定
gcloud billing budgets create \
  --billing-account=XXXXXX-XXXXXX-XXXXXX \
  --display-name="Monthly Budget" \
  --budget-amount=100USD \
  --threshold-rules=threshold=0.5,basis=current
```

## セキュリティ

### 1. IAM（Identity and Access Management）
```bash
# ロールの付与
gcloud projects add-iam-policy-binding my-project-id \
  --member="user:user@example.com" \
  --role="roles/compute.admin"

# サービスアカウントの作成
gcloud iam service-accounts create my-service-account \
  --display-name="My Service Account"

# サービスアカウントにロールを付与
gcloud projects add-iam-policy-binding my-project-id \
  --member="serviceAccount:my-service-account@my-project-id.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

### 2. VPC（Virtual Private Cloud）
```bash
# VPCの作成
gcloud compute networks create my-vpc \
  --subnet-mode=auto

# サブネットの作成
gcloud compute networks subnets create my-subnet \
  --network=my-vpc \
  --region=us-central1 \
  --range=10.0.0.0/24
```

## まとめ

GCPは、初心者からエンタープライズまで幅広く対応できる包括的なクラウドプラットフォームです。特に、Compute Engine、Cloud Storage、Cloud SQLなどの基本サービスを理解することで、スケーラブルで安全なインフラストラクチャを構築できます。

無料枠を活用して学習を始め、段階的に機能を拡張していくことで、コスト効率的にクラウドインフラを運用できます。