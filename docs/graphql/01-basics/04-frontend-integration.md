# 【第4回】React/Apollo ClientでGraphQL APIを叩く！フロントエンド実装入門

これまでの回で、GraphQLサーバーの概念と構築方法について学んできました。今回は視点をフロントエンドに移し、ReactアプリケーションからGraphQLサーバーと通信する方法を解説します。そのためのライブラリとして、最も人気のある「Apollo Client」を使用します。

## Apollo Clientとは？

Apollo Clientは、React、Angular、Vueなど主要なUIライブラリでGraphQLを扱うための、高機能なクライアントライブラリです。単にAPIリクエストを送信するだけでなく、以下のような強力な機能を備えています。

- **宣言的なデータフェッチ**: UIコンポーネントが必要とするデータをGraphQLクエリとして記述するだけで、データの取得、ローディング状態の管理、UIの更新を自動で行います。
- **強力なキャッシュ機構**: 一度取得したデータを正規化してメモリ内にキャッシュします。これにより、同じデータを再取得する際のネットワークリクエストを削減し、アプリケーションの応答性を向上させます。
- **ローカルステート管理**: サーバーからのデータだけでなく、クライアント側の状態もGraphQLで一元管理できます。

## 開発環境の準備

Reactプロジェクトを作成し、必要なパッケージをインストールします。

1.  **Reactプロジェクトの作成**
    ```bash
    npx create-react-app my-graphql-app
    cd my-graphql-app
    ```

2.  **Apollo ClientとGraphQL関連パッケージのインストール**
    ```bash
    npm install @apollo/client graphql react
    ```

## Apollo ClientをReactに導入する3つのステップ

ReactアプリケーションでApollo Clientを利用するには、以下の3ステップが必要です。

1.  **クライアントの初期化**: GraphQLサーバーのエンドポイントを指定して、Apollo Clientのインスタンスを作成します。
2.  **`ApolloProvider`でのラップ**: Reactアプリケーション全体でApollo Clientが使えるように、ルートコンポーネントを`ApolloProvider`でラップします。
3.  **`useQuery`フックによるデータ取得**: コンポーネント内で`useQuery`フックを使ってGraphQLクエリを実行します。

### ステップ1 & 2: クライアントの初期化とProviderの設定

まず、`src/index.js`（または`src/App.js`）を編集して、Apollo Clientのセットアップを行います。

```javascript
// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';

// 1. Apollo Clientのインスタンスを作成
const client = new ApolloClient({
  // 第2回で作成したサーバーのエンドポイントURL
  uri: 'http://localhost:4000/',
  // キャッシュ戦略を指定
  cache: new InMemoryCache(),
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* 2. アプリケーションをApolloProviderでラップする */}
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </React.StrictMode>
);
```
これで、アプリケーション内のどのコンポーネントからでもGraphQLの機能が呼び出せる準備が整いました。

### ステップ3: `useQuery`フックでデータを取得する

次に、実際にデータを表示するコンポーネントを作成します。`src/App.js`を以下のように編集してみましょう。

```javascript
// src/App.js
import { useQuery, gql } from '@apollo/client';

// 1. 実行したいGraphQLクエリを定義する
const GET_ALL_POSTS = gql`
  query GetAllPosts {
    allPosts {
      id
      title
    }
  }
`;

// 投稿一覧を表示するコンポーネント
function Posts() {
  // 2. useQueryフックを実行
  const { loading, error, data } = useQuery(GET_ALL_POSTS);

  // 3. ローディング中・エラー時・成功時で表示を分ける
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <ul>
      {data.allPosts.map(({ id, title }) => (
        <li key={id}>{title}</li>
      ))}
    </ul>
  );
}

function App() {
  return (
    <div>
      <h1>GraphQL Blog Posts</h1>
      <Posts />
    </div>
  );
}

export default App;
```
`useQuery`フックは非常にシンプルで強力です。Apollo Clientは`loading`, `error`, `data`の状態の変化を自動で検知し、コンポーネントを再レンダリングしてくれます。

## ミューテーションを実行する (`useMutation`)

データの更新（書き込み）には`useMutation`フックを使います。新しい投稿を作成するフォームを実装してみましょう。ここでは`useRef`フックを使ってフォームの値を扱う、モダンなReactの実装方法を採用します。

```javascript
// src/App.js の中にコンポーネントを追加
// `useRef`フックを`react`からインポートするのを忘れないように
import React, { useRef } from 'react';

// 新しい投稿を作成するミューテーション
const CREATE_POST = gql`
  mutation CreatePost($title: String!) {
    createPost(title: $title) {
      id
      title
    }
  }
`;

function AddPost() {
  const titleInputRef = useRef(null);
  const [createPost, { loading, error }] = useMutation(CREATE_POST, {
    // `refetchQueries`は簡単ですが、不要なネットワークリクエストを生むことがあります。
    // `update`関数でキャッシュを直接更新する方がパフォーマンスに優れています。
    update(cache, { data: { createPost } }) {
      // キャッシュにクエリが存在するかを安全に確認
      const data = cache.readQuery({ query: GET_ALL_POSTS });
      if (data) {
        cache.writeQuery({
          query: GET_ALL_POSTS,
          data: { allPosts: [createPost, ...data.allPosts] },
        });
      }
    }
  });

  if (loading) return <p>Submitting...</p>;
  if (error) return <p>Submission error! {error.message}</p>;

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (titleInputRef.current.value.trim() === '') return;
        createPost({ variables: {
          title: titleInputRef.current.value,
        }});
        titleInputRef.current.value = '';
      }}
    >
      <input ref={titleInputRef} placeholder="新しい投稿のタイトル" />
      <button type="submit">投稿を追加</button>
    </form>
  );
}

// Appコンポーネントも修正
function App() {
  return (
    <div>
      <h1>GraphQL Blog Posts</h1>
      <AddPost />
      <hr />
      <Posts />
    </div>
  );
}
```
この実装では、`refetchQueries`の代わりに`update`関数を用いて、ミューテーション成功後にApollo Clientのキャッシュを直接書き換えています。これにより、UIを更新するための追加のネットワークリクエストが不要になり、アプリケーションの応答性が向上します。

## まとめ

今回は、ReactとApollo Clientを使って、GraphQL APIと通信するフロントエンドアプリケーションの基本的な実装方法を学びました。
- `ApolloProvider`でアプリケーションをラップし、クライアントインスタンスを渡す。
- `useQuery`フックで宣言的にデータを取得し、ローディング・エラー状態をハンドリングする。
- `useMutation`フックと`update`関数で、パフォーマンス良くデータを更新する。

最終回となる次回は、これまでの知識を応用し、**ページネーション、キャッシュの最適化、認証**といった、より実践的なテクニックについて解説します。
