---
title: "Docker入門：コンテナ技術の基礎と実践"
description: "現代のソフトウェア開発において、「Docker」という言葉を聞いたことがない人は少ないでしょう。しかし、実際にDockerを使いこなせている人はまだ少ないのが現状です。"
---

# Docker入門：コンテナ技術の基礎と実践

## はじめに

現代のソフトウェア開発において、「Docker」という言葉を聞いたことがない人は少ないでしょう。しかし、実際にDockerを使いこなせている人はまだ少ないのが現状です。この記事では、Dockerの基本概念から実践的な使い方まで、丁寧に解説していきます。

## Dockerとは何か

Dockerは、アプリケーションとその実行環境を**コンテナ**という形でパッケージ化し、どの環境でも同じように動作させるためのプラットフォームです。

### コンテナ技術のメリット

1. **環境の一貫性**: 開発環境と本番環境で同じ動作を保証
2. **高速な起動**: VMに比べて秒単位で起動
3. **リソース効率**: ホストOSのカーネルを共有し、軽量に動作
4. **移植性**: どのマシンでも同じように動作

## コンテナとVMの違い

多くの人が混乱するのが、コンテナと仮想マシン（VM）の違いです。

| 特徴 | コンテナ | 仮想マシン |
|------|----------|------------|
| 起動時間 | 秒単位 | 分単位 |
| リソース使用量 | 軽量 | 重い |
| 分離レベル | プロセスレベル | ハードウェアレベル |
| OS | ホストOSを共有 | ゲストOSが必要 |
| サイズ | MB単位 | GB単位 |

### イメージで理解する違い

- **VM**: コンピューターの中に別のコンピューターを作る
- **コンテナ**: 同じコンピューター内で独立した部屋を作る

## Dockerの基本コマンド

### イメージの操作

```bash
# イメージをダウンロード
docker pull nginx:latest

# イメージ一覧を確認
docker images

# イメージを削除
docker rmi nginx:latest
```

### コンテナの操作

```bash
# コンテナを起動
docker run -d -p 80:80 --name my-nginx nginx

# コンテナ一覧を確認（起動中のみ）
docker ps

# 全コンテナ一覧を確認（停止中も含む）
docker ps -a

# コンテナを停止
docker stop my-nginx

# コンテナを削除
docker rm my-nginx
```

### 便利なオプション

```bash
# インタラクティブモードで起動
docker run -it ubuntu bash

# ボリュームをマウント
docker run -v /host/data:/container/data nginx

# 環境変数を設定
docker run -e DATABASE_URL=postgres://user:pass@db:5432/myapp nginx
```

## Dockerfileの書き方

Dockerfileは、独自のDockerイメージを作成するための設計書です。

### 基本的な構造

```dockerfile
# ベースイメージを指定
FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# 依存関係ファイルをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci --only=production

# アプリケーションコードをコピー
COPY . .

# ポートを公開
EXPOSE 3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3000/health || exit 1

# 起動コマンド
CMD ["node", "server.js"]
```

### Dockerfileのベストプラクティス

1. **軽量なベースイメージを使用**: `alpine` タグを活用
2. **マルチステージビルド**: ビルド環境と実行環境を分離
3. **レイヤーキャッシュを活用**: 変更頻度の低いファイルを先にコピー
4. **.dockerignoreを使用**: 不要なファイルを除外

### マルチステージビルドの例

```dockerfile
# ビルドステージ
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 実行ステージ
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

## docker-composeの活用

複数のコンテナを管理するには、docker-composeが便利です。

### docker-compose.ymlの基本

```yaml
version: '3.8'

services:
  web:
    build: ./web
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/myapp
    depends_on:
      - db
    volumes:
      - ./web:/app
      - /app/node_modules

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### よく使うコマンド

```bash
# 全サービスを起動
docker-compose up -d

# 特定のサービスだけ起動
docker-compose up -d web

# ログを確認
docker-compose logs -f

# 特定サービスのログ
docker-compose logs -f web

# サービスを停止
docker-compose down

# ボリュームも含めて削除
docker-compose down -v

# ビルドし直す
docker-compose build

# 再起動
docker-compose restart
```

## 実践的なユースケース

### 1. 開発環境の構築

```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run dev
```

### 2. 本番環境の構成

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    build: .
    restart: always
    environment:
      - NODE_ENV=production
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

### 3. CI/CDパイプラインでの活用

```yaml
# .github/workflows/docker-build.yml
name: Docker Build
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .
      - name: Run tests
        run: docker run myapp:${{ github.sha }} npm test
```

## トラブルシューティング

### よくある問題と解決策

**コンテナが起動しない**
```bash
# ログを確認
docker logs <container_id>

# インタラクティブモードでデバッグ
docker run -it --entrypoint sh <image>
```

**ポートが既に使用中**
```bash
# 使用中のポートを確認
lsof -i :3000

# 別のポートを使用
docker run -p 3001:3000 nginx
```

**ディスク容量の圧迫**
```bash
# 未使用イメージを削除
docker image prune -a

# 未使用ボリュームを削除
docker volume prune

# 全ての未使用リソースを削除
docker system prune -a
```

## まとめ

Dockerは現代のソフトウェア開発において、もはや必須の技術となっています。この記事で学んだポイントを整理します：

1. **Dockerの本質**: アプリケーションと環境をパッケージング
2. **VMとの違い**: 軽量・高速・リソース効率が優位
3. **基本コマンド**: `run`, `ps`, `stop`, `rm` をマスター
4. **Dockerfile**: 独自イメージ作成の設計書
5. **docker-compose**: 複数コンテナ管理の強力なツール

### 次のステップ

- Docker Hubで様々なイメージを探索してみる
- 自分のアプリケーションをDocker化してみる
- Kubernetesなどのオーケストレーションツールを学ぶ
- CI/CDパイプラインにDockerを組み込んでみる

コンテナ技術は日々進化しています。基本概念を押さえておけば、新しい技術にも素早く適応できるでしょう。

## 参考リンク

- [Docker公式ドキュメント](https://docs.docker.com/)
- [Docker Hub](https://hub.docker.com/)
- [Docker Compose ドキュメント](https://docs.docker.com/compose/)
- [Play with Docker](https://labs.play-with-docker.com/)

---

**著者**: AI Tech Blog  
**最終更新**: 2026年4月
