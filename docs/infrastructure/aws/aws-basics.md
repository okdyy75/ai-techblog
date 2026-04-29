# AWS基礎知識：クラウドインフラの入門

AWS（Amazon Web Services）は、Amazonが提供する世界最大規模のクラウドコンピューティングプラットフォームです。2006年のサービス開始以来、企業からスタートアップまで広く利用されており、クラウドインフラのデファクトスタンダードとなっています。

## AWSとは何か

AWSは、インターネット経由でコンピューティングリソースを提供する**IaaS（Infrastructure as a Service）**および**PaaS（Platform as a Service）**です。物理的なサーバーを購入・設置することなく、必要な時に必要な分だけリソースを利用できます。

### クラウドのメリット

- **従量課金**: 使った分だけ支払う
- **スケーラビリティ**: 需要に応じて自動的に拡張
- **グローバル展開**: 世界中のデータセンターを利用可能
- **運負荷の軽減**: ハードウェア管理が不要

## 主要サービスの紹介

### 1. Amazon EC2（Elastic Compute Cloud）

仮想サーバーを提供するサービスです。OS（Amazon Linux、Ubuntu、Windows Serverなど）を選択し、インスタンスタイプ（CPU、メモリ、ストレージの構成）を指定して作成できます。

```bash
# AWS CLIでのEC2インスタンス作成例
aws ec2 run-instances \
  --image-id ami-0123456789abcdef0 \
  --instance-type t3.micro \
  --key-name my-key-pair \
  --security-group-ids sg-0123456789abcdef0 \
  --subnet-id subnet-0123456789abcdef0
```

**無料利用枠**: t2/t3.microインスタンスが750時間/月無料

### 2. Amazon S3（Simple Storage Service）

オブジェクトストレージサービスです。画像、動画、バックアップファイルなどを保存できます。99.999999999%（イレブンナイン）の耐久性を実現しています。

```bash
# S3バケットの作成
aws s3 mb s3://my-unique-bucket-name

# ファイルのアップロード
aws s3 cp ./local-file.txt s3://my-unique-bucket-name/
```

### 3. Amazon RDS（Relational Database Service）

マネージドデータベースサービスです。MySQL、PostgreSQL、MariaDB、Oracle、SQL Serverなどをサポート。バックアップ、パッチ適用、スケーリングを自動で行います。

### 4. AWS Lambda

サーバーレスコンピューティングサービスです。コードをアップロードするだけで実行環境が自動的にプロビジョニングされ、リクエストに応じてスケールします。

```python
# Lambda関数のシンプルな例（Python）
def lambda_handler(event, context):
    return {
        'statusCode': 200,
        'body': 'Hello from Lambda!'
    }
```

## アカウント作成と初期設定

### アカウント作成の流れ

1. [AWS公式サイト](https://aws.amazon.com/)で「Create an AWS Account」をクリック
2. メールアドレス、パスワード、AWSアカウント名を入力
3. 連絡先情報（個人/ビジネス）を入力
4. 支払い情報（クレジットカード）を登録
5. 電話番号で本人確認
6. サポートプランを選択（Basic推奨）

### セキュリティ設定

```bash
# MFA（多要素認証）の有効化
# IAMコンソール → ユーザー → 「セキュリティ認証情報」タブ → MFA → 「有効化」

# AWS CLIの設定
aws configure
# AWS Access Key ID: [入力]
# AWS Secret Access Key: [入力]
# Default region name: ap-northeast-1
# Default output format: json
```

## AWS CLIとManagement Console

### Management Console

ブラウザベースのGUIです。サービスの選択、リソースの作成・管理、請求情報の確認などが視覚的に行えます。

### AWS CLI

コマンドラインからAWSリソースを操作できます。スクリプト化や自動化に最適です。

```bash
# インストール（macOS）
brew install awscli

# バージョン確認
aws --version

# ヘルプ
aws help
aws ec2 help
aws ec2 describe-instances help
```

## 無料利用枠（Free Tier）の活用

AWSでは新規登録者向けに「12ヶ月間無料枠」が提供されています。

### 主な無料枠内容

| サービス | 無料枠 |
|---------|--------|
| EC2（t2/t3.micro） | 750時間/月 |
| S3 | 5GB、20,000リクエスト/月 |
| RDS | db.t2.micro 750時間/月 |
| Lambda | 100万リクエスト/月（永続） |
| CloudWatch | 10カスタムメトリクス（永続） |

**注意**: 無料枠を超えた利用は従量課金されます。Billingアラームの設定を推奨します。

## 実践的なデプロイ例

### 静的ウェブサイトのホスティング（S3 + CloudFront）

```bash
# 1. S3バケット作成
aws s3 mb s3://my-static-site-2024

# 2. 静的ウェブサイトホスティング設定
aws s3 website s3://my-static-site-2024 --index-document index.html

# 3. ファイルアップロード
aws s3 sync ./dist s3://my-static-site-2024 --acl public-read
```

## セキュリティベストプラクティス

1. **IAMユーザーの使用**: ルートアカウントは直接使用せず、IAMユーザーを作成
2. **最小権限の原則**: 必要最小限の権限のみを付与
3. **MFAの有効化**: 重要なアカウントで多要素認証を必須化
4. **セキュリティグループ**: 必要なポートのみ開放（デフォルト deny）
5. **暗号化**: 機密データはKMSで暗号化
6. **ログ記録**: CloudTrailでAPI呼び出しを記録

```bash
# セキュリティグループの作成例（SSHとHTTPのみ許可）
aws ec2 create-security-group \
  --group-name web-server-sg \
  --description "Security group for web servers"

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 22 \
  --cidr 203.0.113.0/24

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0
```

## 初心者向け学習ロードマップ

### レベル1: 基礎（1〜2週間）
- [ ] AWSアカウント作成と基本的なコンソール操作
- [ ] EC2インスタンスの起動とSSH接続
- [ ] S3バケットの作成とファイル操作
- [ ] IAMユーザーと権限管理の理解

### レベル2: 応用（2〜4週間）
- [ ] VPCとネットワーク構成
- [ ] RDSでのデータベース構築
- [ ] ELB（ロードバランサー）の設定
- [ ] CloudWatchでのモニタリング

### レベル3: 高度（1ヶ月〜）
- [ ] Lambda + API Gatewayによるサーバーレス構成
- [ ] ECS/EKSによるコンテナ運用
- [ ] CloudFormation/TerraformによるIaC
- [ ] マルチAZ構成と災害対策

## まとめ

AWSは豊富なサービスと柔軟性を提供するクラウドプラットフォームです。無料枠を活用しながら、まずはEC2とS3の基本操作から始め、段階的にスキルを広げていくことをお勧めします。公式ドキュメントやAWS Skill Builderの無料コンテンツも活用し、実践的な経験を積んでいきましょう。

---

**参考リンク**
- [AWS 公式ドキュメント](https://docs.aws.amazon.com/)
- [AWS Skill Builder](https://skillbuilder.aws/)
- [AWS 無料利用枠](https://aws.amazon.com/jp/free/)
