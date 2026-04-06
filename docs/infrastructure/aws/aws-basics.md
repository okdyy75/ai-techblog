# Amazon Web Services基礎知識：クラウドインフラの入門

## 概要

Amazon Web Services（AWS）は、Amazon.comが提供する世界最大規模のクラウドコンピューティングプラットフォームです。200以上のフル機能を持つサービスを提供しており、コンピューティング、ストレージ、データベース、ネットワーキング、機械学習、セキュリティなど、あらゆるITインフラストラクチャのニーズに対応できます。グローバルに分散されたデータセンターを持ち、高可用性とスケーラビリティを実現しています。

## AWSの主要サービス

### 1. コンピューティング
- **EC2（Elastic Compute Cloud）**: 仮想サーバーを提供するコアサービス
- **Lambda**: サーバーレスコンピューティングサービス
- **ECS（Elastic Container Service）**: コンテナオーケストレーションサービス
- **EKS（Elastic Kubernetes Service）**: マネージドKubernetesサービス
- **Fargate**: サーバーレスコンテナコンピューティング
- **Elastic Beanstalk**: アプリケーションのデプロイとスケーリングを自動化

### 2. ストレージ
- **S3（Simple Storage Service）**: オブジェクトストレージサービス
- **EBS（Elastic Block Store）**: EC2用のブロックストレージ
- **EFS（Elastic File System）**: マネージドNFSサービス
- **Glacier**: 低コストのアーカイブストレージ

### 3. データベース
- **RDS（Relational Database Service）**: MySQL、PostgreSQL、Oracle、SQL Serverなどのマネージドリレーショナルデータベース
- **DynamoDB**: フルマネージドNoSQLデータベース
- **ElastiCache**: Redis/Memcached用のインメモリキャッシュ
- **DocumentDB**: MongoDB互換のドキュメントデータベース
- **Keyspaces**: Apache Cassandra互換のマネージドデータベース

### 4. ネットワーキング
- **VPC（Virtual Private Cloud）**: 隔離された仮想ネットワーク
- **CloudFront**: グローバルCDNサービス
- **Route 53**: DNSサービス
- **ALB/NLB**: アプリケーションおよびネットワークロードバランサー
- **Transit Gateway**: ネットワークトランジットハブ

## 基本的なセットアップ

### 1. AWSアカウントの作成
1. AWS Management Consoleにアクセス
2. 「Create an AWS Account」をクリック
3. メールアドレス、パスワード、AWSアカウント名を入力
4. 連絡先情報と支払い情報を入力
5. IDの確認（電話またはSMS）
6. サポートプランを選択

### 2. AWS CLIのインストールと設定

#### macOSでのインストール
```bash
# Homebrewを使用
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# またはHomebrew
brew install awscli
```

#### Linuxでのインストール
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

#### 初期設定
```bash
# 認証情報の設定
aws configure

# プロンプトに応じて入力
AWS Access Key ID [None]: YOUR_ACCESS_KEY_ID
AWS Secret Access Key [None]: YOUR_SECRET_ACCESS_KEY
Default region name [None]: ap-northeast-1
Default output format [None]: json
```

### 3. IAMユーザーの作成
```bash
# IAMユーザー作成
aws iam create-user --user-name my-user

# アクセスキーの作成
aws iam create-access-key --user-name my-user

# 管理者権限の付与（開発環境用）
aws iam attach-user-policy \
  --user-name my-user \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

## EC2（Elastic Compute Cloud）

### 1. インスタンスの作成
```bash
# 最新のAmazon Linux 2023 AMI IDを取得
AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-*-x86_64" \
  --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
  --output text)

# インスタンスの作成
aws ec2 run-instances \
  --image-id $AMI_ID \
  --count 1 \
  --instance-type t3.micro \
  --key-name my-key-pair \
  --security-group-ids sg-xxxxxxxx \
  --subnet-id subnet-xxxxxxxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=my-server}]'
```

### 2. インスタンスの管理
```bash
# インスタンス一覧の表示
aws ec2 describe-instances --query 'Reservations[*].Instances[*].[InstanceId,State.Name,PublicIpAddress,Tags[?Key==`Name`].Value | [0]]'

# インスタンスの停止
aws ec2 stop-instances --instance-ids i-xxxxxxxxxxxxxxxxx

# インスタンスの開始
aws ec2 start-instances --instance-ids i-xxxxxxxxxxxxxxxxx

# インスタンスの終了
aws ec2 terminate-instances --instance-ids i-xxxxxxxxxxxxxxxxx
```

### 3. セキュリティグループの設定
```bash
# セキュリティグループの作成
aws ec2 create-security-group \
  --group-name web-server-sg \
  --description "Security group for web servers"

# HTTP（ポート80）を許可
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxx \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# HTTPS（ポート443）を許可
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# SSH（ポート22）を特定IPのみ許可
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxx \
  --protocol tcp \
  --port 22 \
  --cidr YOUR_IP_ADDRESS/32
```

## S3（Simple Storage Service）

### 1. バケットの作成と管理
```bash
# バケットの作成（バケット名はグローバルで一意）
aws s3 mb s3://my-unique-bucket-name-$(date +%s)

# バケット一覧の表示
aws s3 ls

# バケットの削除（空の場合）
aws s3 rb s3://my-bucket-name

# バケットと内容を削除
aws s3 rb s3://my-bucket-name --force
```

### 2. オブジェクトのアップロード・ダウンロード
```bash
# ファイルのアップロード
aws s3 cp local-file.txt s3://my-bucket/

# ディレクトリ全体のアップロード（再帰的）
aws s3 cp local-directory/ s3://my-bucket/ --recursive

# ファイルのダウンロード
aws s3 cp s3://my-bucket/file.txt ./

# ディレクトリ全体のダウンロード
aws s3 cp s3://my-bucket/ local-directory/ --recursive

# ファイルの削除
aws s3 rm s3://my-bucket/file.txt

# ファイルの同期（rsync的な使い方）
aws s3 sync local-directory/ s3://my-bucket/
```

### 3. アクセス制御
```bash
# バケットを公開読み取りに設定（静的Webサイト用）
aws s3api put-bucket-acl --bucket my-bucket --acl public-read

# オブジェクトを公開読み取りに設定
aws s3api put-object-acl --bucket my-bucket --key file.txt --acl public-read

# バケットポリシーの設定
aws s3api put-bucket-policy --bucket my-bucket --policy file://policy.json
```

## RDS（Relational Database Service）

### 1. MySQLインスタンスの作成
```bash
# DBサブネットグループの作成
aws rds create-db-subnet-group \
  --db-subnet-group-name my-subnet-group \
  --db-subnet-group-description "My DB subnet group" \
  --subnet-ids '["subnet-xxxxx","subnet-yyyyy"]'

# MySQLインスタンスの作成
aws rds create-db-instance \
  --db-instance-identifier my-mysql-db \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --engine-version 8.0 \
  --allocated-storage 20 \
  --storage-type gp2 \
  --master-username admin \
  --master-user-password 'SecurePassword123!' \
  --vpc-security-group-ids sg-xxxxxxxx \
  --db-subnet-group-name my-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window 03:00-04:00 \
  --enable-performance-insights \
  --performance-insights-retention-period 7
```

### 2. PostgreSQLインスタンスの作成
```bash
aws rds create-db-instance \
  --db-instance-identifier my-postgres-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15 \
  --allocated-storage 20 \
  --storage-type gp2 \
  --master-username postgres \
  --master-user-password 'SecurePassword123!' \
  --vpc-security-group-ids sg-xxxxxxxx \
  --db-subnet-group-name my-subnet-group
```

### 3. データベースの管理
```bash
# インスタンス一覧の表示
aws rds describe-db-instances

# 特定のインスタンス情報の表示
aws rds describe-db-instances --db-instance-identifier my-mysql-db

# インスタンスの停止（一時的）
aws rds stop-db-instance --db-instance-identifier my-mysql-db

# インスタンスの開始
aws rds start-db-instance --db-instance-identifier my-mysql-db

# インスタンスの削除
aws rds delete-db-instance \
  --db-instance-identifier my-mysql-db \
  --skip-final-snapshot
```

## Lambda（サーバーレスコンピューティング）

### 1. Lambda関数の作成
```python
# lambda_function.py
def lambda_handler(event, context):
    return {
        'statusCode': 200,
        'body': 'Hello from Lambda!'
    }
```

### 2. デプロイメント
```bash
# Lambda関数のZIPパッケージ作成
zip function.zip lambda_function.py

# Lambda関数の作成
aws lambda create-function \
  --function-name my-function \
  --runtime python3.11 \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://function.zip

# Lambda関数の更新
aws lambda update-function-code \
  --function-name my-function \
  --zip-file fileb://function.zip

# Lambda関数の呼び出し
aws lambda invoke \
  --function-name my-function \
  --payload '{}' \
  response.json
```

### 3. トリガーの設定（S3イベント）
```bash
# LambdaにS3実行権限を追加
aws lambda add-permission \
  --function-name my-function \
  --statement-id s3-trigger \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::my-bucket

# S3バケットに通知を設定
aws s3api put-bucket-notification-configuration \
  --bucket my-bucket \
  --notification-configuration '{
    "LambdaFunctionConfigurations": [{
      "LambdaFunctionArn": "arn:aws:lambda:region:account:function:my-function",
      "Events": ["s3:ObjectCreated:*"]
    }]
  }'
```

## VPC（Virtual Private Cloud）

### 1. VPCの作成と設定
```bash
# VPCの作成
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=my-vpc}]'

# インターネットゲートウェイの作成とアタッチ
aws ec2 create-internet-gateway --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=my-igw}]'
aws ec2 attach-internet-gateway --internet-gateway-id igw-xxxxxxxx --vpc-id vpc-xxxxxxxx

# サブネットの作成
aws ec2 create-subnet \
  --vpc-id vpc-xxxxxxxx \
  --cidr-block 10.0.1.0/24 \
  --availability-zone ap-northeast-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=public-subnet-1a}]'

# ルートテーブルの作成と設定
aws ec2 create-route-table --vpc-id vpc-xxxxxxxx
aws ec2 create-route --route-table-id rtb-xxxxxxxx --destination-cidr-block 0.0.0.0/0 --gateway-id igw-xxxxxxxx
aws ec2 associate-route-table --route-table-id rtb-xxxxxxxx --subnet-id subnet-xxxxxxxx
```

## 料金体系

### 1. AWS Free Tier（無料枠）

**Always Free（永続的に無料）:**
- Lambda: 毎月100万リクエスト
- CloudWatch: 10カスタムメトリクス、10アラーム
- DynamoDB: 25GBのストレージ

**12ヶ月間無料:**
- EC2: 月750時間のt2/t3.micro使用
- S3: 月5GBの標準ストレージ
- RDS: 月750時間のdb.t2/t3.micro使用
- CloudFront: 月50GBのデータ転送

### 2. 従量課金モデル

| サービス | 課金単位 |
|---------|---------|
| EC2 | インスタンス稼働時間、インスタンスタイプ |
| S3 | 保存容量、リクエスト数、データ転送量 |
| RDS | インスタンス稼働時間、ストレージ、IOPS |
| Lambda | リクエスト数、コンピューティング時間（GB秒） |
| CloudFront | データ転送量、リクエスト数 |
| Data Transfer | 転送量（リージョン間、インターネット送受信） |

### 3. コスト最適化のベストプラクティス
- **Reserved Instances**: 1年または3年の契約で最大72%割引
- **Savings Plans**: 柔軟なコミットメントで最大72%割引
- **Spot Instances**: 最大90%割引（中断許容ワークロード向け）
- **Auto Scaling**: 実需要に応じた自動スケーリング
- **S3 Intelligent-Tiering**: アクセスパターンに応じた自動最適化

```bash
# コストの確認
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

## セキュリティベストプラクティス

### 1. IAM（Identity and Access Management）
```bash
# 最小権限の原則に基づくポリシー
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}

# MFA（多要素認証）の有効化
aws iam enable-mfa-device \
  --user-name my-user \
  --serial-number arn:aws:iam::account:mfa/my-user \
  --authentication-code1 123456 \
  --authentication-code2 789012
```

### 2. 暗号化
```bash
# S3バケットのサーバー側暗号化
aws s3api put-bucket-encryption \
  --bucket my-bucket \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# EBSボリュームの暗号化
aws ec2 create-volume \
  --availability-zone ap-northeast-1a \
  --size 10 \
  --encrypted \
  --kms-key-id alias/aws/ebs
```

### 3. セキュリティ監視
```bash
# GuardDutyの有効化（脅威検知）
aws guardduty create-detector --enable

# AWS Configの有効化（構成変更の記録）
aws configservice put-configuration-recorder \
  --configuration-recorder name=default,roleARN=arn:aws:iam::account:role/config-role \
  --recording-group allSupported=true,includeGlobalResourceTypes=true

# CloudTrailの確認（API呼び出しの記録）
aws cloudtrail describe-trails
```

## まとめ

AWSは、スタートアップからエンタープライズまであらゆる規模の組織に対応できる包括的なクラウドプラットフォームです。EC2による仮想サーバー、S3によるオブジェクトストレージ、RDSによるマネージドデータベース、Lambdaによるサーバーレスコンピューティングなど、基本サービスを理解することで、スケーラブルでコスト効率の良いインフラストラクチャを構築できます。

Free Tierを活用して学習を始め、段階的に機能を拡張していくことで、リスクを最小限に抑えながらクラウド技術を習得できます。セキュリティベストプラクティスを常に意識し、IAMの最小権限の原則、データの暗号化、継続的な監視を実施することで、安全なクラウド環境を運用できます。

AWSは日々進化し続けており、新しいサービスや機能が定期的にリリースされています。AWSドキュメントやAWS Skill Builderを活用して、最新の知識を継続的にアップデートしていくことが重要です。
