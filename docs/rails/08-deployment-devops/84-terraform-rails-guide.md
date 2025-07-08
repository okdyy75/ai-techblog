# TerraformによるRailsのインフラ管理(IaC)

## 概要

手作業によるインフラ管理は、ヒューマンエラー、再現性の欠如、属人化といった多くの問題を引き起こします。Infrastructure as Code (IaC) は、このような課題を解決するために、インフラの構成をコードで記述・管理するプラクティスです。Terraformは、IaCを実現するための代表的なツールであり、AWS、Google Cloud、Azureなど多くのクラウドプロバイダーに対応しています。

この記事では、Terraformを使って、AWS上にRailsアプリケーションの実行環境を構築する方法を、具体的なコード例とともに解説します。

## なぜTerraformか？

-   **宣言的な構文**: 「何を」「どのような状態にしたいか」をHCL（HashiCorp Configuration Language）で記述するだけで、Terraformが必要なAPIコールを自動的に実行してくれます。
-   **プロバイダーエコシステム**: AWS、GCP、Azureはもちろん、DockerやKubernetes、GitHubなど、数百のプロバイダーが提供されており、インフラ全体を統一的に管理できます。
-   **状態管理**: Terraformは作成したリソースの状態を`tfstate`ファイルに保存します。これにより、現在のインフラの状態を追跡し、変更差分のみを適用（プランニング）することができます。
-   **再現性と再利用性**: コード化された構成はバージョン管理（Gitなど）が可能で、誰でも同じ環境を正確に再現できます。また、モジュール機能を使えば、共通のインフラ構成を再利用できます。

## 対象とするインフラ構成

この記事では、一般的なRailsアプリケーションの構成として、以下のAWSリソースをTerraformで構築します。

-   **VPC**: アプリケーションのネットワーク環境
-   **EC2**: Railsアプリケーションサーバー
-   **RDS**: PostgreSQLデータベース
-   **S3**: ファイルストレージ（Active Storage用）
-   **セキュリティグループ**: ファイアウォール設定

## Terraformプロジェクトのセットアップ

1.  **Terraformのインストール**: 公式サイトから、お使いのOSに合ったバイナリをダウンロードします。
2.  **プロジェクトディレクトリの作成**: `terraform`などのディレクトリを作成し、以下のファイルを用意します。

    ```
    terraform/
    ├── main.tf       # メインの構成ファイル
    ├── variables.tf  # 変数定義
    └── outputs.tf    # 出力定義
    ```

## Terraformコードの解説

### 1. プロバイダーとバックエンドの設定 (`main.tf`)

まず、使用するプロバイダー（今回はAWS）と、`tfstate`ファイルをどこに保存するか（バックエンド）を設定します。

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # tfstateをS3で管理する場合 (推奨)
  backend "s3" {
    bucket         = "my-terraform-state-bucket-name"
    key            = "rails-app/terraform.tfstate"
    region         = "ap-northeast-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

provider "aws" {
  region = var.aws_region
}
```

-   **`backend "s3"`**: `tfstate`ファイルをローカルではなくS3に保存することで、チームでの共同作業やCI/CD連携が容易になります。`dynamodb_table`は、同時に複数の`terraform apply`が実行されるのを防ぐためのロック機構です。

### 2. 変数定義 (`variables.tf`)

環境名やインスタンスタイプなど、変更の可能性がある値を`variables.tf`にまとめておくと便利です。

```hcl
# variables.tf

variable "aws_region" {
  description = "The AWS region to create resources in."
  type        = string
  default     = "ap-northeast-1"
}

variable "app_name" {
  description = "The name of the application."
  type        = string
  default     = "my-rails-app"
}

variable "db_password" {
  description = "The password for the RDS database."
  type        = string
  sensitive   = true # ターミナルの出力にパスワードが表示されなくなる
}
```

### 3. ネットワーク (VPC) の構築 (`main.tf`)

```hcl
# main.tf

# VPC
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = {
    Name = "${var.app_name}-vpc"
  }
}

# Subnets, Internet Gateway, Route Tablesなども同様に定義...
```

### 4. データベース (RDS) の構築 (`main.tf`)

```hcl
# main.tf

resource "aws_db_instance" "main" {
  allocated_storage    = 20
  engine               = "postgres"
  engine_version       = "15.3"
  instance_class       = "db.t3.micro"
  db_name              = "${var.app_name}_production"
  username             = "${var.app_name}_user"
  password             = var.db_password
  skip_final_snapshot  = true
  # ...その他、vpc_security_group_idsなどを設定
}
```

### 5. アプリケーションサーバー (EC2) の構築 (`main.tf`)

```hcl
# main.tf

resource "aws_instance" "app_server" {
  ami           = "ami-0c55b159cbfafe1f0" # Amazon Linux 2023
  instance_type = "t2.micro"

  # ユーザーデータを使って、インスタンス起動時に初期設定を実行
  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install -y ruby git
              # ... Railsのセットアップスクリプト
              EOF

  tags = {
    Name = "${var.app_name}-app-server"
  }
}
```

### 6. 出力 (`outputs.tf`)

作成されたリソースのIDやIPアドレスなどを出力しておくと、後で参照するのに便利です。

```hcl
# outputs.tf

output "app_server_ip" {
  description = "The public IP address of the app server."
  value       = aws_instance.app_server.public_ip
}

output "rds_endpoint" {
  description = "The endpoint of the RDS instance."
  value       = aws_db_instance.main.endpoint
}
```

## Terraformの実行フロー

1.  **初期化**: `terraform`ディレクトリで以下のコマンドを実行します。
    ```bash
    terraform init
    ```
    これにより、プロバイダープラグインとバックエンドが初期化されます。

2.  **プランニング**: どのような変更が行われるかを確認します。
    ```bash
    terraform plan -var="db_password=your_secure_password"
    ```
    `-var`フラグで`sensitive`な変数を渡します。

3.  **適用**: 計画に問題がなければ、インフラを実際に構築します。
    ```bash
    terraform apply -var="db_password=your_secure_password"
    ```

4.  **破棄**: 作成したリソースを全て削除したい場合は、以下のコマンドを実行します。
    ```bash
    terraform destroy
    ```

## まとめ

Terraformを導入することで、Railsアプリケーションのインフラをコードとして宣言的に管理できるようになります。これにより、インフラ構築の自動化、再現性の確保、そしてヒューマンエラーの削減が実現します。

今回紹介したのは基本的な構成ですが、ロードバランサー（ALB）、オートスケーリング、CI/CDパイプライン（GitHub Actionsなど）との連携もTerraformで実現可能です。手作業のインフラ管理から脱却し、IaCによるモダンなDevOpsプラクティスへの第一歩を踏み出しましょう。
