---
title: "AWS基礎知識：クラウドコンピューティングの入門"
description: "Amazon Web Services（AWS）の主要サービスと基本的な使い方を初心者向けに解説。EC2、S3、RDS、Lambdaなどのコアサービスを実例付きで紹介します。"
date: 2025-04-17
author: "AI Assistant"
---

# AWS基礎知識：クラウドコンピューティングの入門

## 概要

Amazon Web Services（AWS）は、Amazonが提供する世界最大規模のクラウドコンピューティングプラットフォームです。200以上のフル機能サービスを提供し、コンピューティング、ストレージ、データベース、ネットワーキング、AI/MLなど、あらゆるITインフラのニーズに対応できます。

## AWSの主要サービス

### 1. コンピューティング
- **Amazon EC2**: 仮想サーバー（Elastic Compute Cloud）
- **AWS Lambda**: サーバーレスコンピューティング
- **Amazon ECS/EKS**: コンテナオーケストレーション
- **AWS Fargate**: サーバーレスコンテナ

### 2. ストレージ
- **Amazon S3**: オブジェクトストレージ（Simple Storage Service）
- **Amazon EBS**: ブロックストレージ
- **Amazon EFS**: ファイルストレージ
- **Amazon Glacier**: アーカイブストレージ

### 3. データベース
- **Amazon RDS**: マネージドリレーショナルデータベース
- **Amazon DynamoDB**: NoSQLデータベース
- **Amazon ElastiCache**: インメモリキャッシュ

### 4. ネットワーキング
- **Amazon VPC**: 仮想プライベートクラウド
- **Amazon CloudFront**: CDNサービス
- **Route 53**: DNSサービス
- **AWS ELB**: ロードバランサー

## 基本的なセットアップ

### 1. AWS CLIのインストール
```bash
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Windows
# https://awscli.amazonaws.com/AWSCLIV2.msi からダウンロード
```

### 2. 認証情報の設定
```bash
# AWS CLIの初期設定
aws configure

# 以下の情報を入力
AWS Access Key ID: [アクセスキー]
AWS Secret Access Key: [シークレットキー]
Default region name: ap-northeast-1
Default output format: json
```

## Amazon EC2

### 1. EC2インスタンスの作成
```bash
# キーペアの作成
aws ec2 create-key-pair \
  --key-name my-key-pair \
  --query 'KeyMaterial' \
  --output text > my-key-pair.pem

chmod 400 my-key-pair.pem

# セキュリティグループの作成
aws ec2 create-security-group \
  --group-name my-security-group \
  --description "My security group"

# HTTP/HTTPSアクセスを許可
aws ec2 authorize-security-group-ingress \
  --group-name my-security-group \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-name my-security-group \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# EC2インスタンスの起動
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --count 1 \
  --instance-type t2.micro \
  --key-name my-key-pair \
  --security-groups my-security-group \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=my-instance}]'
```

### 2. インスタンスの管理
```bash
# インスタンス一覧の表示
aws ec2 describe-instances --query 'Reservations[*].Instances[*].[InstanceId,State.Name,PublicIpAddress,Tags[?Key==`Name`].Value|[0]]' --output table

# インスタンスへの接続
ssh -i my-key-pair.pem ec2-user@<パブリックIP>

# インスタンスの停止
aws ec2 stop-instances --instance-ids i-1234567890abcdef0

# インスタンスの起動
aws ec2 start-instances --instance-ids i-1234567890abcdef0

# インスタンスの終了
aws ec2 terminate-instances --instance-ids i-1234567890abcdef0
```

## Amazon S3

### 1. バケットの作成と管理
```bash
# バケットの作成（バケット名はグローバルで一意）
aws s3 mb s3://my-unique-bucket-name-12345

# バケット一覧の表示
aws s3 ls

# バケットの削除
aws s3 rb s3://my-unique-bucket-name-12345
```

### 2. ファイルのアップロード・ダウンロード
```bash
# ファイルのアップロード
aws s3 cp local-file.txt s3://my-bucket/

# ディレクトリ全体のアップロード
aws s3 sync local-directory/ s3://my-bucket/directory/

# ファイルのダウンロード
aws s3 cp s3://my-bucket/file.txt ./

# ファイルの削除
aws s3 rm s3://my-bucket/file.txt

# バケット内のファイル一覧
aws s3 ls s3://my-bucket/
```

### 3. 静的ウェブサイトホスティング
```bash
# 静的ウェブサイトの設定
aws s3 website s3://my-bucket/ --index-document index.html --error-document error.html

# 公開アクセスの設定
aws s3api put-bucket-policy --bucket my-bucket --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}'
```

## Amazon RDS

### 1. MySQLインスタンスの作成
```bash
# DBサブネットグループの作成
aws rds create-db-subnet-group \
  --db-subnet-group-name my-subnet-group \
  --db-subnet-group-description "My DB subnet group" \
  --subnet-ids '[]'

# RDSインスタンスの作成
aws rds create-db-instance \
  --db-instance-identifier my-mysql-db \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --master-username admin \
  --master-user-password mypassword123 \
  --allocated-storage 20 \
  --publicly-accessible \
  --storage-type gp2
```

### 2. データベースの管理
```bash
# インスタンス情報の表示
aws rds describe-db-instances --db-instance-identifier my-mysql-db

# エンドポイントの取得
aws rds describe-db-instances \
  --db-instance-identifier my-mysql-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text

# インスタンスの削除
aws rds delete-db-instance \
  --db-instance-identifier my-mysql-db \
  --skip-final-snapshot
```

## AWS Lambda

### 1. Lambda関数の作成
```python
# lambda_function.py
def lambda_handler(event, context):
    return {
        'statusCode': 200,
        'body': 'Hello from AWS Lambda!'
    }
```

```bash
# デプロイパッケージの作成
zip function.zip lambda_function.py

# Lambda関数の作成
aws lambda create-function \
  --function-name my-function \
  --runtime python3.9 \
  --role arn:aws:iam::123456789012:role/lambda-role \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://function.zip
```

### 2. Lambda関数の管理
```bash
# 関数一覧の表示
aws lambda list-functions

# 関数の実行
aws lambda invoke \
  --function-name my-function \
  --payload '{}' \
  response.json

# 関数の削除
aws lambda delete-function --function-name my-function
```

## 料金体系

### 1. 無料利用枠
- **EC2**: 750時間/月（t2.microまたはt3.micro）
- **S3**: 5GBの標準ストレージ
- **RDS**: 750時間/月（db.t2.micro）
- **Lambda**: 100万リクエスト/月

### 2. 従量課金
- **EC2**: インスタンスタイプと使用時間に応じて課金
- **S3**: ストレージ容量、リクエスト数、データ転送量に応じて課金
- **RDS**: インスタンスタイプと使用時間に応じて課金
- **Lambda**: リクエスト数と実行時間に応じて課金

## セキュリティ

### 1. IAM（Identity and Access Management）
```bash
# IAMユーザーの作成
aws iam create-user --user-name my-user

# ポリシーのアタッチ
aws iam attach-user-policy \
  --user-name my-user \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

# アクセスキーの作成
aws iam create-access-key --user-name my-user
```

### 2. VPC（Virtual Private Cloud）
```bash
# VPCの作成
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# サブネットの作成
aws ec2 create-subnet \
  --vpc-id vpc-xxxxxxxxx \
  --cidr-block 10.0.1.0/24 \
  --availability-zone ap-northeast-1a
```

## まとめ

AWSは、スタートアップからエンタープライズまで幅広く利用されている包括的なクラウドプラットフォームです。EC2、S3、RDS、Lambdaなどの基本サービスを理解することで、スケーラブルでコスト効率の良いインフラを構築できます。

無料利用枠を活用して学習を始め、実際のプロジェクトに適用していくことで、AWSの強力な機能を最大限に活用できます。
