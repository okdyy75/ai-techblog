# Docker入門 - コンテナ化の基礎から実践まで

## はじめに

現代のソフトウェア開発において、「環境の違いによるバグ」は開発者にとって永遠の課題でした。「私の環境では動いたのに…」という言葉は、多くのチームで繰り返されてきました。

**Docker** は、この問題を根本から解決するコンテナ型の仮想化技術です。アプリケーションとその実行環境を一つの「コンテナ」としてパッケージングすることで、どの環境でも同じ動作を保証します。

本記事では、Dockerの基本概念から実践的な使い方までを解説します。

## Dockerの基本概念

### コンテナとは？

コンテナは、アプリケーションとその依存関係（ライブラリ、設定ファイルなど）をまとめた独立した実行環境です。従来の仮想マシン（VM）と比較して以下の特徴があります：

| 特徴 | 仮想マシン（VM） | Dockerコンテナ |
|------|----------------|----------------|
| 起動時間 | 数分 | 数秒 |
| リソース効率 | OSごとに重い | ホストOSを共有して軽量 |
| ポータビリティ | 低い | 高い |
| サイズ | 数GB | 数十MB〜数百MB |

### 3つの核心要素

1. **Dockerfile**
   - コンテナの「設計図」
   - ベースイメージの指定からアプリケーションの配置までをコードとして定義

2. **イメージ**
   - Dockerfileからビルドされる読み取り専用のテンプレート
   - レイヤー構造で効率的に管理される

3. **コンテナ**
   - イメージから生成される実行可能なインスタンス
   - 独立したプロセスとして動作

## 実践：Node.jsアプリケーションをコンテナ化する

### ステップ1：シンプルなNode.jsアプリを作成

```javascript
// app.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ 
    message: 'Hello from Docker!',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

```json
// package.json
{
  "name": "docker-node-app",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2"
  },
  "scripts": {
    "start": "node app.js"
  }
}
```

### ステップ2：Dockerfileを作成

```dockerfile
# ベースイメージの指定
FROM node:18-alpine

# 作業ディレクトリの設定
WORKDIR /app

# 依存関係のコピーとインストール
COPY package*.json ./
RUN npm ci --only=production

# アプリケーションコードのコピー
COPY . .

# ポートの公開
EXPOSE 3000

# コンテナ起動時のコマンド
CMD ["npm", "start"]
```

### ステップ3：.dockerignoreを作成

```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
```

### ステップ4：ビルドと実行

```bash
# イメージのビルド
docker build -t my-node-app .

# コンテナの実行
docker run -p 3000:3000 my-node-app

# バックグラウンドで実行
docker run -d -p 3000:3000 --name myapp my-node-app
```

### ステップ5：docker-composeで複数コンテナ管理

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - redis

  redis:
    image: redis:alpine
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

```bash
# 一括起動
docker-compose up -d

# ログ確認
docker-compose logs -f

# 停止
docker-compose down
```

## よくある落とし穴とベストプラクティス

### ❌ 落とし穴1：イメージサイズの肥大化

**問題**：デフォルトのNode.jsイメージは1GB近くあります。

**解決策**：Alpine Linuxベースのイメージを使用

```dockerfile
# 非推奨（サイズが大きい）
FROM node:18

# 推奨（軽量）
FROM node:18-alpine
```

### ❌ 落とし穴2：レイヤーキャッシュの無駄遣い

**問題**：`COPY . .` の後に `npm install` を行うと、ソースコードの変更で依存関係の再インストールが発生します。

**解決策**：依存関係ファイルを先にコピー

```dockerfile
# 良い例：package.json変更時のみnpm ciが実行される
COPY package*.json ./
RUN npm ci --only=production
COPY . .
```

### ❌ 落とし穴3：セキュリティの無視

**問題**：rootユーザーでコンテナを実行するリスク

**解決策**：非rootユーザーの使用

```dockerfile
FROM node:18-alpine

# 非rootユーザーの作成
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app
COPY --chown=nextjs:nodejs . .

USER nextjs
CMD ["npm", "start"]
```

### ✅ ベストプラクティスまとめ

1. **マルチステージビルド**を活用してビルド環境と実行環境を分離
2. **特定のタグ**を使用（`latest`は避ける）
3. **ヘルスチェック**を設定
4. **.dockerignore**で不要なファイルを除外
5. **環境変数**で設定を外部化

```dockerfile
# マルチステージビルドの例
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --only=production
CMD ["node", "dist/index.js"]
```

## まとめ

Dockerは現代の開発フローに欠かせないツールとなりました。本記事で学んだポイントを整理します：

- **コンテナ**は軽量でポータブルな実行環境
- **Dockerfile**で環境をコード化
- **レイヤーキャッシュ**を意識した効率的なビルド
- **セキュリティ**を考慮した非root実行

次のステップとして、KubernetesでのオーケストレーションやCI/CDパイプラインへの組み込みに挑戦してみてください。

---

**参考リンク**
- [Docker公式ドキュメント](https://docs.docker.com/)
- [Docker Hub](https://hub.docker.com/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
