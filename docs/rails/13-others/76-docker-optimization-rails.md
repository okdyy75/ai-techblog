# Rails開発者のためのDocker最適化テクニック集

## はじめに

Dockerは現代のRails開発において不可欠なツールとなっていますが、適切な最適化を行わないと、開発効率の低下や本番環境でのパフォーマンス問題を引き起こす可能性があります。本記事では、Rails開発者向けのDocker最適化テクニックを実践的な観点から解説します。

### 最適化の目標

- **開発効率**: 高速なビルドとコンテナ起動
- **本番性能**: 軽量で高速なイメージ
- **セキュリティ**: 最小限の攻撃面
- **保守性**: 理解しやすく管理しやすい構成

## Dockerfileの最適化

### 1. マルチステージビルドの活用

```dockerfile
# Dockerfile.optimized
# ベースイメージの指定
ARG RUBY_VERSION=3.2.0
ARG DISTRO_NAME=bullseye

###########################################
# Stage: dependencies
###########################################
FROM ruby:$RUBY_VERSION-slim-$DISTRO_NAME as dependencies

# 必要なパッケージのインストール
RUN apt-get update -qq && \
    apt-get install -yq --no-install-recommends \
      build-essential \
      gnupg2 \
      curl \
      less \
      git \
      libpq-dev \
      libvips \
      pkg-config && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Node.js 18のインストール
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Yarnのインストール
RUN npm install -g yarn

###########################################
# Stage: gems
###########################################
FROM dependencies as gems

WORKDIR /app

# Gemfileのコピーと依存関係のインストール
COPY Gemfile Gemfile.lock ./
RUN bundle config set --local deployment true && \
    bundle config set --local without 'development test' && \
    bundle config set --local path vendor/bundle && \
    bundle install --jobs 4 --retry 3 && \
    bundle clean

###########################################
# Stage: node_modules
###########################################
FROM dependencies as node_modules

WORKDIR /app

# package.jsonのコピーとNode.js依存関係のインストール
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=true && \
    yarn cache clean

###########################################
# Stage: assets
###########################################
FROM gems as assets

WORKDIR /app

# 本番用の設定
ENV RAILS_ENV=production
ENV NODE_ENV=production

# Node.js依存関係のコピー
COPY --from=node_modules /app/node_modules ./node_modules

# アプリケーションコードのコピー
COPY . .

# アセットのプリコンパイル
RUN RAILS_ENV=production \
    SECRET_KEY_BASE=dummy \
    bundle exec rails assets:precompile && \
    rm -rf node_modules tmp/cache

###########################################
# Stage: production (final)
###########################################
FROM ruby:$RUBY_VERSION-slim-$DISTRO_NAME as production

# 本番用ユーザーの作成
RUN groupadd --gid 1000 rails && \
    useradd --uid 1000 --gid rails --shell /bin/bash --create-home rails

# 必要最小限のランタイム依存関係のみインストール
RUN apt-get update -qq && \
    apt-get install -yq --no-install-recommends \
      postgresql-client \
      libvips \
      curl \
      tini && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app

# Gemとアセットのコピー
COPY --from=gems --chown=rails:rails /app/vendor/bundle ./vendor/bundle
COPY --from=assets --chown=rails:rails /app/public/assets ./public/assets
COPY --from=assets --chown=rails:rails /app/public/packs ./public/packs

# アプリケーションコードのコピー
COPY --chown=rails:rails . .

# Bundler設定
RUN bundle config set --local deployment true && \
    bundle config set --local without 'development test' && \
    bundle config set --local path vendor/bundle

USER rails

# ポート設定
EXPOSE 3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# エントリーポイント
ENTRYPOINT ["tini", "--"]
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]
```

### 2. 開発用Dockerfileの最適化

```dockerfile
# Dockerfile.development
ARG RUBY_VERSION=3.2.0
ARG DISTRO_NAME=bullseye

FROM ruby:$RUBY_VERSION-slim-$DISTRO_NAME

# 開発用パッケージのインストール
RUN apt-get update -qq && \
    apt-get install -yq --no-install-recommends \
      build-essential \
      gnupg2 \
      curl \
      less \
      git \
      libpq-dev \
      libvips \
      pkg-config \
      vim \
      postgresql-client \
      default-mysql-client && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Node.js 18のインストール
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Yarnのインストール
RUN npm install -g yarn

# 開発用ユーザーの作成（ホストユーザーと同じUID/GID）
ARG USER_ID=1000
ARG GROUP_ID=1000
RUN groupadd --gid $GROUP_ID dev && \
    useradd --uid $USER_ID --gid dev --shell /bin/bash --create-home dev

WORKDIR /app

# 依存関係のキャッシュ最適化
COPY Gemfile Gemfile.lock ./
RUN bundle config set --local path vendor/bundle && \
    bundle install --jobs 4

COPY package.json yarn.lock ./
RUN yarn install

USER dev

# 開発サーバーの起動
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]
```

## Docker Composeの最適化

### 1. 効率的な開発環境

```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: myapp_development
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 3s
      retries: 3

  web:
    build:
      context: .
      dockerfile: Dockerfile.development
      args:
        USER_ID: ${USER_ID:-1000}
        GROUP_ID: ${GROUP_ID:-1000}
    ports:
      - "3000:3000"
    volumes:
      # ソースコードのマウント
      - .:/app
      # Gemキャッシュの永続化
      - bundle_cache:/app/vendor/bundle
      # Node.jsキャッシュの永続化
      - node_modules_cache:/app/node_modules
      # 一時ファイルのマウント
      - tmp_cache:/app/tmp
    environment:
      - DATABASE_URL=postgres://postgres:password@db:5432/myapp_development
      - REDIS_URL=redis://redis:6379/0
      - RAILS_ENV=development
      - BOOTSNAP_CACHE_DIR=/app/tmp/cache
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    stdin_open: true
    tty: true

  sidekiq:
    build:
      context: .
      dockerfile: Dockerfile.development
      args:
        USER_ID: ${USER_ID:-1000}
        GROUP_ID: ${GROUP_ID:-1000}
    volumes:
      - .:/app
      - bundle_cache:/app/vendor/bundle
    environment:
      - DATABASE_URL=postgres://postgres:password@db:5432/myapp_development
      - REDIS_URL=redis://redis:6379/0
      - RAILS_ENV=development
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: bundle exec sidekiq

  webpack:
    build:
      context: .
      dockerfile: Dockerfile.development
      args:
        USER_ID: ${USER_ID:-1000}
        GROUP_ID: ${GROUP_ID:-1000}
    volumes:
      - .:/app
      - node_modules_cache:/app/node_modules
    environment:
      - NODE_ENV=development
      - RAILS_ENV=development
    command: yarn build --watch
    ports:
      - "3035:3035"

volumes:
  postgres_data:
  redis_data:
  bundle_cache:
  node_modules_cache:
  tmp_cache:

networks:
  default:
    name: myapp_network
```

### 2. 本番環境用の構成

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - RAILS_ENV=production
      - RAILS_SERVE_STATIC_FILES=true
      - RAILS_LOG_TO_STDOUT=true
    volumes:
      - /app/storage
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  sidekiq:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - RAILS_ENV=production
    volumes:
      - /app/storage
    command: bundle exec sidekiq
    deploy:
      replicas: 1
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M
      restart_policy:
        condition: on-failure

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - web
    deploy:
      resources:
        limits:
          memory: 64M
```

## パフォーマンス最適化

### 1. イメージサイズの最小化

```dockerfile
# .dockerignore
# バージョン管理
.git
.gitignore
README.md
Dockerfile*
docker-compose*

# 開発ファイル
.env.development
.env.test
coverage/
spec/
test/

# ログとキャッシュ
log/*
tmp/*
!tmp/.keep

# Node.js
node_modules/
npm-debug.log
yarn-error.log

# その他
.DS_Store
*.swp
*.swo
```

```bash
#!/bin/bash
# scripts/optimize_image.sh

echo "Analyzing Docker image size..."

# イメージサイズの確認
docker images | grep myapp

echo "Analyzing layers..."
docker history myapp:latest --human --format "table {{.CreatedBy}}\t{{.Size}}"

echo "Running dive analysis..."
# diveツールを使用してレイヤーの詳細分析
if command -v dive &> /dev/null; then
    dive myapp:latest
else
    echo "Install dive for detailed layer analysis: https://github.com/wagoodman/dive"
fi
```

### 2. ビルドキャッシュの最適化

```bash
#!/bin/bash
# scripts/build_optimized.sh

# ビルドキャッシュを活用した効率的なビルド

echo "Building with optimized caching..."

# 開発環境
docker build \
  --file Dockerfile.development \
  --target dependencies \
  --cache-from myapp:dependencies \
  --tag myapp:dependencies \
  .

docker build \
  --file Dockerfile.development \
  --cache-from myapp:dependencies \
  --cache-from myapp:development \
  --tag myapp:development \
  .

# 本番環境
docker build \
  --file Dockerfile \
  --target dependencies \
  --cache-from myapp:dependencies \
  --tag myapp:dependencies \
  .

docker build \
  --file Dockerfile \
  --target gems \
  --cache-from myapp:dependencies \
  --cache-from myapp:gems \
  --tag myapp:gems \
  .

docker build \
  --file Dockerfile \
  --cache-from myapp:dependencies \
  --cache-from myapp:gems \
  --cache-from myapp:production \
  --tag myapp:production \
  .

echo "Build completed with optimized caching."
```

### 3. メモリとCPU使用量の最適化

```yaml
# docker-compose.resources.yml
version: '3.8'

services:
  web:
    # リソース制限
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
    
    # JVMのようなメモリ設定が必要な場合
    environment:
      - MALLOC_ARENA_MAX=2
      - RUBY_GC_HEAP_INIT_SLOTS=10000
      - RUBY_GC_HEAP_FREE_SLOTS=4000
      - RUBY_GC_HEAP_GROWTH_FACTOR=1.1
      - RUBY_GC_HEAP_GROWTH_MAX_SLOTS=10000
```

## セキュリティ強化

### 1. セキュアなDockerfile

```dockerfile
# Dockerfile.secure
FROM ruby:3.2.0-slim-bullseye

# セキュリティアップデートの適用
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -yq --no-install-recommends \
      # 必要最小限のパッケージのみ
      libpq5 \
      libvips42 \
      ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# 非rootユーザーの作成
RUN groupadd --gid 10001 app && \
    useradd --uid 10001 --gid app --shell /bin/bash --create-home app

# セキュリティ関連の設定
RUN mkdir -p /app && \
    chown -R app:app /app

WORKDIR /app

# Gemのコピー（rootで実行）
COPY --chown=app:app Gemfile Gemfile.lock ./

# 非rootユーザーに切り替え
USER app

# Bundle設定
RUN bundle config set --local deployment true && \
    bundle config set --local without 'development test' && \
    bundle config set --local path vendor/bundle

# アプリケーションファイルのコピー
COPY --chown=app:app . .

# 読み取り専用ファイルシステムのための準備
RUN mkdir -p tmp/pids tmp/cache tmp/sockets

# ヘルスチェック用エンドポイントの設定
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 必要なポートのみ公開
EXPOSE 3000

# セキュアなエントリーポイント
ENTRYPOINT ["bundle", "exec"]
CMD ["rails", "server", "-b", "0.0.0.0"]
```

### 2. セキュリティスキャン

```bash
#!/bin/bash
# scripts/security_scan.sh

echo "Running security scans..."

# Trivyを使用した脆弱性スキャン
if command -v trivy &> /dev/null; then
    echo "Scanning with Trivy..."
    trivy image myapp:latest
else
    echo "Trivy not found. Install: https://github.com/aquasecurity/trivy"
fi

# Docker Benchmarkテスト
if command -v docker-bench-security &> /dev/null; then
    echo "Running Docker Benchmark..."
    docker-bench-security
else
    echo "Docker Bench not found. Install: https://github.com/docker/docker-bench-security"
fi

# Hadolintを使用したDockerfile静的解析
if command -v hadolint &> /dev/null; then
    echo "Analyzing Dockerfile with hadolint..."
    hadolint Dockerfile
else
    echo "Hadolint not found. Install: https://github.com/hadolint/hadolint"
fi
```

## 開発ワークフローの最適化

### 1. 高速開発環境

```bash
#!/bin/bash
# scripts/dev_setup.sh

# 開発環境の高速セットアップ

echo "Setting up optimized development environment..."

# 環境変数の設定
export USER_ID=$(id -u)
export GROUP_ID=$(id -g)

# 既存コンテナの停止
docker-compose down

# ボリュームの作成（初回のみ）
docker volume create myapp_bundle_cache
docker volume create myapp_node_modules_cache

# 依存関係のプリビルド
docker-compose build --parallel

# データベースの初期化
docker-compose up -d db redis
docker-compose run --rm web bundle exec rails db:create db:migrate

# 開発サーバーの起動
docker-compose up
```

### 2. ホットリロード対応

```yaml
# docker-compose.override.yml
version: '3.8'

services:
  web:
    volumes:
      # ソースコードのリアルタイム同期
      - .:/app:cached
      # Bundlerキャッシュの永続化
      - bundle_cache:/app/vendor/bundle
      # Node.jsキャッシュの永続化
      - node_modules_cache:/app/node_modules
      # ログの永続化
      - ./log:/app/log
    environment:
      # 開発用の設定
      - RAILS_ENV=development
      - RACK_ENV=development
      - WEB_CONCURRENCY=1
      - RAILS_MAX_THREADS=5
      # ホットリロード用
      - LISTEN_USE_POLLING=true
      - SPRING_SOCKET=/app/tmp/spring.sock
    ports:
      - "3000:3000"
      - "1234:1234"  # デバッガーポート

  webpack:
    environment:
      - WEBPACKER_DEV_SERVER_HOST=0.0.0.0
      - WEBPACKER_DEV_SERVER_PUBLIC=localhost:3035
    ports:
      - "3035:3035"
```

## モニタリングとデバッグ

### 1. コンテナモニタリング

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:rw
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro

volumes:
  prometheus_data:
  grafana_data:
```

### 2. ログ管理

```yaml
# logging配置
version: '3.8'

services:
  web:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service=web"
    
  fluentd:
    image: fluent/fluentd:latest
    ports:
      - "24224:24224"
    volumes:
      - ./fluentd.conf:/fluentd/etc/fluent.conf
      - log_data:/var/log/fluentd

volumes:
  log_data:
```

## CI/CDでの最適化

```yaml
# .github/workflows/docker.yml
name: Docker Build and Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to DockerHub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}
    
    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: myapp:latest
        cache-from: type=gha
        cache-to: type=gha,mode=max
        platforms: linux/amd64,linux/arm64
```

## まとめ

Dockerを効果的に活用することで、Rails開発の生産性と本番環境の安定性を大幅に向上させることができます。重要なのは、開発フェーズに応じた適切な最適化を行うことです。

**重要なポイント:**
- マルチステージビルドによるイメージサイズの最小化
- 効果的なキャッシュ戦略
- セキュリティを考慮した設定
- 開発効率を高めるワークフロー
- 継続的なモニタリングと改善

これらのテクニックを段階的に導入し、チームの開発効率とアプリケーションの品質向上を実現しましょう。