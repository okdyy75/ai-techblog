# AWS入門：主要サービスとアーキテクチャ設計の基礎

## はじめに

クラウドコンピューティングが標準となった現代において、AWS（Amazon Web Services）は世界最大級のクラウドプラットフォームとして、多くの企業や開発者に選ばれています。本記事では、AWSの基礎から主要サービス、アーキテクチャ設計のポイントまで、実践的な知識を解説します。

AWSを学ぶことで、インフラのスケーラビリティ、可用性、セキュリティを高めつつ、運用コストを最適化することができます。

## AWSの基礎概念

### リージョンとアベイラビリティゾーン

AWSは**リージョン**（地理的な地域）と**アベイラビリティゾーン**（AZ）という階層構造で構成されています。

- **リージョン**: 東京（ap-northeast-1）、バージニア（us-east-1）など、世界的に分散したデータセンターの集まり
- **AZ**: 各リージョン内に2つ以上存在し、独立した電源・ネットワーク・冷却設備を持つ施設

マルチAZ構成を取ることで、単一データセンターの障害に対する耐性を高めることができます。

### AWSアカウントの構造

AWSでは**アカウント**がリソース分離の基本単位です。本番環境と開発環境を別アカウントで運用することで、セキュリティ境界を明確にし、コストの可視化も容易になります。

 Organizations機能を使えば、複数アカウントを階層的に管理することも可能です。

## 主要サービス解説

### Amazon EC2（Elastic Compute Cloud）

仮想サーバーを提供するIaaSサービスです。

```bash
# EC2インスタンスの起動例（AWS CLI）
aws ec2 run-instances \
  --image-id ami-12345678 \
  --instance-type t3.micro \
  --key-name my-key \
  --security-group-ids sg-12345678
```

**主要なインスタンスタイプ**:
- **t3/t3a**: バースト可能な汎用型（開発・テスト用途）
- **m5/m6i**: バランスの取れた汎用型（本番アプリケーション）
- **c5/c6i**: コンピューティング最適化型（高負荷処理）
- **r5/r6g**: メモリ最適化型（データベース、キャッシュ）

### Amazon S3（Simple Storage Service）

高耐久性・高可用性のオブジェクトストレージサービスです。

```bash
# S3バケットの作成
aws s3 mb s3://my-unique-bucket-name

# ファイルのアップロード
aws s3 cp ./local-file.txt s3://my-bucket/path/
```

**ストレージクラス**:
- **S3 Standard**: 頻繁にアクセスされるデータ
- **S3 Intelligent-Tiering**: アクセスパターンに応じて自動最適化
- **S3 Glacier**: 長期アーカイブ（低コスト）

### Amazon RDS（Relational Database Service）

マネージド型リレーショナルデータベースサービスです。PostgreSQL、MySQL、MariaDB、SQL Server、Oracleに対応しています。

**運用メリット**:
- 自動バックアップとポイントインタイムリストア
- マルチAZ構成による高可用性
- 読み取りレプリカによるスケールアウト

```yaml
# CloudFormationでのRDS定義例
Resources:
  MyDBInstance:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: my-database
      DBInstanceClass: db.t3.micro
      Engine: postgres
      MasterUsername: admin
      MasterUserPassword: !Sub '{{resolve:secretsmanager:${DBSecret}:SecretString:password}}'
      MultiAZ: true
      BackupRetentionPeriod: 7
```

### AWS Lambda

サーバーレスコンピューティングサービスで、コードを実行するだけでインフラ管理が不要になります。

```python
# Lambda関数のPython例（S3イベントトリガー）
import json
import boto3

def lambda_handler(event, context):
    s3 = boto3.client('s3')
    
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']
        print(f"Processing file: {key} from bucket: {bucket}")
        
    return {
        'statusCode': 200,
        'body': json.dumps('Processing complete')
    }
```

**ユースケース**:
- APIバックエンド（API Gateway + Lambda）
- ファイル処理（S3トリガー）
- 定期バッチ処理（EventBridgeスケジュール）
- データ変換・ETL処理

### Amazon VPC（Virtual Private Cloud）

隔離された仮想ネットワーク環境を構築できます。

**主要コンポーネント**:
- **サブネット**: VPC内のIPアドレス範囲（パブリック/プライベート）
- **インターネットゲートウェイ**: VPCとインターネット間の通信
- **NATゲートウェイ**: プライベートサブネットからの外部接続
- **セキュリティグループ**: インスタンスレベルのファイアウォール
- **ネットワークACL**: サブネットレベルのファイアウォール

```
┌─────────────────────────────────────┐
│              VPC (10.0.0.0/16)      │
│  ┌─────────────┐  ┌─────────────┐   │
│  │ パブリック    │  │ プライベート  │   │
│  │ サブネット    │  │ サブネット    │   │
│  │ (10.0.1.0/24)│  │ (10.0.2.0/24)│   │
│  │             │  │             │   │
│  │  ALB/EC2    │  │  RDS/Lambda │   │
│  └─────────────┘  └─────────────┘   │
│         │                  │        │
│    IGW ─┘             NAT GW       │
└─────────────────────────────────────┘
```

## よくあるアーキテクチャパターン

### 3層Webアプリケーション構成

伝統的なWebアプリケーションの構成例です。

```
[Route 53] → [CloudFront] → [ALB] → [EC2 (Auto Scaling)]
                                           ↓
                                      [RDS Multi-AZ]
```

**構成要素**:
1. **Route 53**: DNS名前解決
2. **CloudFront**: CDNによるキャッシュ配信
3. **ALB**: ロードバランシング
4. **EC2 Auto Scaling**: 自動スケーリング
5. **RDS Multi-AZ**: 高可用性データベース

### サーバーレス構成

管理オーバーヘッドを最小限に抑えたモダンな構成です。

```
[Route 53] → [CloudFront] → [S3 (静的ホスティング)]
                                   ↓
                         [API Gateway] → [Lambda]
                                              ↓
                                       [DynamoDB]
```

**メリット**:
- サーバー管理不要
- 自動スケーリング
- 使用した分だけ課金
- 高可用性が組み込み

## 料金体系の基礎とコスト最適化

### AWSの料金モデル

AWSは**従量課金制**を基本としています。

| サービス | 課金要素 |
|---------|---------|
| EC2 | インスタンスタイプ×稼働時間 |
| S3 | ストレージ容量 + リクエスト数 + データ転送 |
| RDS | インスタンスタイプ×稼働時間 + ストレージ |
| Lambda | リクエスト数 + 実行時間（GB秒） |

### コスト最適化のポイント

1. **リザーブドインスタンス/ Savings Plans**: 1〜3年の使用コミットで最大72%割引
2. **スポットインスタンス**: 最大90%割引（中断許容性のあるワークロード向け）
3. **適切なインスタンスタイプの選択**: ワークロードに合わせたサイジング
4. **ライフサイクルポリシー**: S3の古いデータを低コストストレージに移行
5. **未使用リソースの削除**: EBSボリューム、Elastic IP、古いスナップショートの整理

```bash
# Cost Explorerでコストを分析
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

## まとめと次のステップ

本記事では、AWSの基礎概念から主要サービス、アーキテクチャパターンまで解説しました。AWSを活用することで、柔軟でスケーラブルなインフラを構築できます。

**次のステップとして**:

1. **AWS無料利用枠**で実際に触ってみる（12ヶ月間無料）
2. **AWS Certified Cloud Practitioner**の学習（基礎的な資格）
3. **Infrastructure as Code**（TerraformやCloudFormation）の習得
4. **AWS Well-Architected Framework**の原則を学ぶ

AWSは常に進化し続けるプラットフォームです。公式ドキュメントやAWSブログを定期的にチェックし、最新のベストプラクティスを取り入れていくことをお勧めします。
