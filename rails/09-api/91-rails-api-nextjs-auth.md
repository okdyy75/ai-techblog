# Rails APIとNext.jsでの認証戦略

RailsをAPIモードで利用し、フロントエンドにNext.jsを採用する構成は、モダンなWebアプリケーション開発で非常に人気があります。この構成において、認証は最も重要な課題の一つです。この記事では、Rails APIとNext.jsを組み合わせた際の代表的な認証戦略である「トークンベース認証（JWT）」と「セッションベース認証（Cookie）」について、それぞれの仕組み、メリット・デメリット、そして実装方法を解説します。

## 認証方式の選択肢

### 1. トークンベース認証 (JWT)

**仕組み:**
1.  ユーザーがIDとパスワードでログインします。
2.  Railsサーバーは認証情報を検証し、問題なければ暗号化されたJSON Web Token (JWT) を生成してクライアント（Next.js）に返します。
3.  Next.jsは受け取ったJWTをローカルストレージやCookieに保存します。
4.  以降のリクエストでは、Next.jsはこのJWTを`Authorization`ヘッダーに含めて送信します。
5.  Railsサーバーはリクエストの都度、JWTを検証してユーザーを認証します。

**メリ��ト:**
-   **ステートレス:** サーバー側でセッション情報を保持する必要がなく、スケーラビリティに優れます。
-   **クロスドメイン/モバイル対応:** トークンをヘッダーで送信するため、異なるドメインやネイティブアプリとの連携が容易です。
-   **柔軟性:** トークン内にユーザーの権限（role）などの情報（ペイロード）を含めることができます。

**デメリット:**
-   **トークンの管理:** クライアント側でトークンを安全に保管する必要があります。XSS（クロスサイトスクリプティング）のリスクを避けるため、`HttpOnly`属性を持つCookieに保存するなどの対策が推奨されます。
-   **ログアウト処理:** トークン自体は有効期限が切れるまで有効なため、サーバー側でトークンの無効化リスト（ブラックリスト）を管理するか、有効期間の短いトークンとリフレッシュトークンを組み合わせる必要があります。

### 2. セッションベース認証 (Cookie)

**仕組み:**
1.  ユーザーがIDとパスワードでログインします。
2.  Railsサーバーは認証情報を検証し、セッションを作成してセッションIDを生成します。このセッションID��`Set-Cookie`ヘッダーを介してクライアントに送信します。
3.  ブラウザは受け取ったCookieを自動的に保存します。
4.  以降のリクエストでは、ブラウザは自動的にCookieをリクエストに含めて送信します。
5.  Railsサーバーは受け取ったセッションIDを元に、サーバー側のセッションストア（Redisやデータベースなど）からユーザー情報を検索して認証します。

**メリット:**
-   **セキュリティ:** Cookieに`HttpOnly`属性を付与することで、JavaScriptからのアクセスを防ぎ、XSSリスクを大幅に軽減できます。
-   **シンプルなログアウト:** サーバー側でセッション情報を削除するだけで、簡単にログアウトが実現できます。
-   **実績と信頼性:** 従来から広く使われている方式で、多くのフレームワークで標準サポートされています。

**デメリット:**
-   **ステートフル:** サーバー側でセッションストアを管理する必要があり、スケーリングが複雑になる可能性があります。
-   **CSRF対策:** クロスサイトリクエストフォージェリ（CSRF）対策が別途必要です。（Railsの`protect_from_forgery`など）
-   **クロスドメイン制約:** デフォルト��は同一ドメイン間でしかCookieを共有できず、サブドメインや外部サービスとの連携には追加の設定（`domain`属性など）が必要です。

## どちらを選ぶべきか？

-   **同一ドメインで完結するWebアプリケーションの場合:**
    **セッションベース認証**が有力な選択肢です。`HttpOnly` Cookieによるセキュリティ上のメリットが大きく、実装も比較的シンプルです。Next.jsとRailsのドメインが異なる場合でも、CORS設定とCookieの`domain`属性を適切に設定すれば対応可能です。

-   **モバイルアプリや複数の外部サービスとの連携が必要な場合:**
    **トークンベース認証**が適しています。ステートレスであるためサーバーの拡張が容易で、様々なプラットフォームに認証情報を提供できます。

## 実装例：`devise-token-auth` + `next-auth` (JWT)

ここでは、トークンベース認証の代表的な実装例として、Railsの`devise-token-auth`とNext.jsの`next-auth`（現`Auth.js`）を連携させる方法の概要を紹介します。

### Rails (API) 側の設定

1.  **Gemのインストール:**
    ```ruby
    gem 'devise'
    gem 'devise-token-auth'
    gem 'rack-cors' # CORS設定のため
    ```

2.  **`rack-cors`の設定:**
    `config/initializers/cors.rb`で、Next.jsアプリケーションからのリクエストを許可します。

    ```ruby
    Rails.application.config.middleware.insert_before 0, Rack::Cors do
      allow do
        origins 'http://localhost:3000' # Next.jsのオリジン
        resource '*',
          headers: :any,
          expose: ['access-token', 'expiry', 'token-type', 'uid', 'client'], # devise-token-authが必要とするヘッダー
          methods: [:get, :post, :put, :patch, :delete, :options, :head]
      end
    end
    ```

3.  **`devise-token-auth`の設定:**
    `rails g devise_token_auth:install User auth`コマンドを実行し、`User`モデルに認証機能を追加します。ルーティングも自動で設定されます。

### Next.js 側の設定

1.  **ライブラリのインストール:**
    ```bash
    npm install next-auth
    ```

2.  **`[...nextauth].js`の作成:**
    `pages/api/auth/[...nextauth].js`に`next-auth`の設定を記述します。

    ```javascript
    import NextAuth from "next-auth";
    import CredentialsProvider from "next-auth/providers/credentials";

    export default NextAuth({
      providers: [
        CredentialsProvider({
          name: "Credentials",
          credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Password", type: "password" },
          },
          async authorize(credentials, req) {
            const res = await fetch("http://localhost:3001/auth/sign_in", { // Rails APIのエンドポイント
              method: 'POST',
              body: JSON.stringify(credentials),
              headers: { "Content-Type": "application/json" }
            });

            if (res.ok) {
              // レスポンスヘッダーから認証トークンを取得
              const accessToken = res.headers.get('access-token');
              const client = res.headers.get('client');
              const uid = res.headers.get('uid');
              const user = await res.json();

              // next-authのセッションにユーザー情報とトークンを格納
              if (user) {
                return { ...user.data, accessToken, client, uid };
              }
            }
            return null;
          },
        }),
      ],
      callbacks: {
        async jwt({ token, user }) {
          if (user) {
            token.accessToken = user.accessToken;
            token.client = user.client;
            token.uid = user.uid;
          }
          return token;
        },
        async session({ session, token }) {
          session.accessToken = token.accessToken;
          session.client = token.client;
          session.uid = token.uid;
          return session;
        },
      },
    });
    ```

3.  **APIリクエストのカスタマイズ:**
    認証が必要なAPIへのリクエスト時には、`next-auth`のセッションから取得したトークンをヘッダーに付与します。

    ```javascript
    import { getSession } from "next-auth/react";

    async function fetchProtectedData() {
      const session = await getSession();
      if (!session) return;

      const res = await fetch("http://localhost:3001/api/v1/protected_resource", {
        headers: {
          'Content-Type': 'application/json',
          'access-token': session.accessToken,
          'client': session.client,
          'uid': session.uid,
        },
      });
      // ...
    }
    ```

## まとめ

Rails APIとNext.jsの認証には、トークンベースとセッションベースの2つの主要なアプローチがあります。どちらを選択するかは、アプリケーションの要件（ドメイン構成、モバイル対応の有無など）によって決まります。

-   **セキュリティとシンプルさを重視するならセッションベース認証**
-   **スケーラビリティと柔軟性を重視するならトークンベー���認証**

それぞれのメリット・デメリットを正しく理解し、プロジェクトに最適な認証戦略を選択することが、安全で堅牢なアプリケーションを構築するための鍵となります。
