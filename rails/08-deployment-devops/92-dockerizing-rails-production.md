# 本番環境向けRailsアプリケーションのDocker化

Dockerを使ってRailsアプリケーションをコンテナ化することは、開発環境の統一やデプロイの簡素化に大きく貢献します。しかし、開発環境（Development）と本番環境（Production）では、求められる要件が異なります。本番環境では、セキュリティ、パフォーマンス、イメージサイズ、そして運用のしやすさを考慮したDockerfileを設計することが不可欠です。

この記事では、本番環境向けに最適化されたRailsアプリケーションのDockerfileを作成するためのベストプラクティスと具体的な手順を解説します。

## 本番環境向けDockerfileの要件

1.  **イメージサイズの最小化:** 小さいイメージは、デプロイ時間の短縮、ストレージコストの削減、そして攻撃対象領域（Attack Surface）の縮小に繋がります。
2.  **ビルド時間の短縮:** Dockerのキャッシュを最大限に活用し、変更のない部分の再ビルドを避けることで、CI/CDパイプラインを高速化します。
3.  **セキュリティ:** 不要なツールや開発用の依存関係を含めず、root以外のユーザーでアプリケーションを実行することで、セキュリティリスクを低減します。
4.  **パフォーマンス:** 本番環境用にアセットをプリコンパイルし、適切な環境変数を設定することで、アプリケーションのパフォーマンスを最適化します。

## マルチステージビルドの活用

これらの要件を満たすために、**マルチステージビルド**が非常に効果的です。マルチステージビルドでは、1つのDockerfile内に複数の`FROM`命令を記述し、ビルド用のステージと最終的な実行用のステージを分離します。

-   **ビルドステージ:** 依存関係のインストール、アセットのプリコンパイルなど、ビルドに必要な全ての処理を行います。ここにはビルドツール（例: `build-essential`, `nodejs`）が含まれます。
-   **実行ステージ:** ビルドステージで生成された成果物（Gem、アセットなど）だけを、軽量なベースイメージ（例: `ruby:3.2-slim`）にコピーします。実行に必要な最小限のライブラリのみが含まれるため、最終的なイメージサイズを劇的に削減できます。

## 最適化されたDockerfileの例

以下に、マルチステージビルドを活用した本番環境向けのDockerfileの例を示します。

```dockerfile
# syntax=docker/dockerfile:1

# ---- Base Stage ----
# 共通の設定をまとめるベースステージ
FROM ruby:3.2.2-slim as base

# 必要な環境変数を設定
ENV RAILS_ENV=production \
    BUNDLE_WITHOUT="development test" \
    BUNDLE_JOBS=4 \
    LANG=C.UTF-8

# 作業ディレクトリを設定
WORKDIR /app

# ---- Build Stage ----
# Gemのインストールとアセットのプリコンパイルを行うステージ
FROM base as build

# ビルドに必要なパッケージをインストール
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends build-essential git libpq-dev nodejs npm && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Gemfileを先にコピーして、bundle installをキャッシュさせる
COPY Gemfile Gemfile.lock ./
RUN bundle install

# package.jsonとyarn.lockをコピーして、JSの依存関係をインストール
COPY package.json yarn.lock ./
RUN yarn install

# アプリケーションコードをコピー
COPY . .

# アセットをプリコンパイル
RUN bundle exec rails assets:precompile

# ---- Final Stage ----
# 最終的な実行イメージを作成するステージ
FROM base

# 実行に必要なパッケージのみをインストール
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends postgresql-client && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# non-rootユーザーを作成し、所有権を渡す
RUN useradd --create-home --shell /bin/bash rails
WORKDIR /home/rails/app
RUN chown -R rails:rails /home/rails/app
USER rails

# ビルドステージから必要なファイルのみをコピー
COPY --from=build --chown=rails:rails /usr/local/bundle/ /usr/local/bundle/
COPY --from=build --chown=rails:rails /app/public/assets/ /home/rails/app/public/assets/
COPY --from=build --chown=rails:rails /app/public/packs/ /home/rails/app/public/packs/ # Shakapackerの場合
COPY --chown=rails:rails . .

# ポートを公開
EXPOSE 3000

# サーバーを起動
CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]
```

### Dockerfileの解説

1.  **`FROM ruby:3.2.2-slim as base`**:
    -   軽量な`slim`バージョンのRubyイメージをベースとして使用します。
    -   `as base`で、このステージに`base`という名前を付けています。

2.  **`ENV RAILS_ENV=production`**:
    -   環境を`production`に設定します。これにより、Railsは本番モードで動作します。
    -   `BUNDLE_WITHOUT`で、開発用・テスト用のGemをインストール対象から除外します。

3.  **`FROM base as build`**:
    -   `base`ステージを引き継ぎ、`build`ステージを開始します。
    -   `build-essential`や`nodejs`など、ビルド時にのみ必要なパッケージをインストールします。

4.  **`COPY Gemfile Gemfile.lock ./` -> `RUN bundle install`**:
    -   `Gemfile`と`Gemfile.lock`だけを先にコピーして`bundle install`を実行します。
    -   これにより、`Gemfile`に変更がない限り、このステップはキャッシュされ、ビルドが高速化します。アプリケーションコードの変更で毎回`bundle install`が走るのを防ぎます。

5.  **`COPY . .`**:
    -   アプリケーションの全コードをコピーします。

6.  **`RUN bundle exec rails assets:precompile`**:
    -   本番環境用のアセットをプリコンパイルします。

7.  **`FROM base`**:
    -   再び`base`ステージから、最終的な実行イメージの構築を開始します。ビルドステージでインストールした`build-essential`などはここには含まれません。

8.  **`RUN useradd ...` / `USER rails`**:
    -   `rails`という名前の非rootユーザーを作成し、アプリケーションをそのユーザーで実行します。これはセキュリティのベストプラクティスです（コンテナ内での権限昇格攻撃のリスクを低減）。

9.  **`COPY --from=build ...`**:
    -   `build`ステージから、インストール済みのGemやプリコンパイル済みのアセットなど、実行に必要なファイルだけをコピーします。
    -   `--chown=rails:rails`オプションで、コピーするファイルの所有者を`rails`ユーザーに設定します。

10. **`CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]`**:
    -   コンテナ起動時に実行されるコマンドを指定します。ここではPumaサーバーを起動しています。

## `.dockerignore`ファイル

イメージに不要なファイル（`log/*`, `tmp/*`, `.git`など）が含まれないように、`.dockerignore`ファイルをプロジェクトルートに作成します。

```
.git
.gitignore
.dockerignore
log/*
tmp/*
public/system
node_modules
```

## まとめ

本番環境向けのRails用Dockerfileを構築する鍵は、**マルチステージビルド**を効果的に利用することです。ビルド環境と実行環境を分離することで、最終的なイメージは軽量かつセキュアになります。また、Dockerのキャッシュメカニズムを意識した命令の順序にすることで、ビルドの高速化も実現できます。

このDockerfileをベースに、KamalやKubernetes、Amazon ECSなどのコンテナオーケストレーションツールと組み合わせることで、スケーラブルで堅牢なRailsアプリケーションのデプロイパイプラインを構築できるでしょう。
