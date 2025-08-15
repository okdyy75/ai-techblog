# 【第5回】GraphQLの実践的テクニック - ページネーション、キャッシュ、認証

これまでの4回にわたり、GraphQLの基本概念からサーバー構築、フロントエンドでの利用方法までを学んできました。最終回となる今回は、実世界のアプリケーション開発で不可欠となる、より高度で実践的なテクニックを3つ紹介します。

1.  **ページネーション**: 大量のデータを効率的に扱うための必須機能
2.  **キャッシュ**: アプリケーションのパフォーマンスを最大化する鍵
3.  **認証・認可**: セキュアなAPIを実現する方法

## 1. ページネーション (Pagination)

ブログの投稿や商品リストのように、大量のデータセットを一度に全て返すのは非効率です。そこで、データを分割して少しずつ取得する「ページネーション」が必要になります。GraphQLでは、主に2つの方式が用いられます。

### a) オフセットベース・ページネーション

最もシンプルな方法で、`offset`（スキップする件数）と`limit`（取得する件数）を指定します。

**スキーマ定義:**
```graphql
type Query {
  posts(limit: Int, offset: Int): [Post]
}
```

**リゾルバの実装例 (SQLライク):**
```javascript
resolvers: {
  Query: {
    posts: (parent, { limit = 10, offset = 0 }) => {
      // 例: DB.select().from('posts').limit(limit).offset(offset)
      return db.posts.slice(offset, offset + limit);
    }
  }
}
```
この方法は実装が簡単ですが、リストの途中に追加や削除が発生した場合に、ページの重複や欠落が起こりうるという欠点があります。

### b) カーソルベース・ページネーション

より堅牢な方法で、リスト内の特定の位置を示す一意の識別子（カーソル）を使います。`after`カーソルを指定することで、そのカーソルの次の要素から`first`件取得する、という動作になります。

**スキーマ定義 (Relay仕様):**
RelayというFacebook製のフレームワークが提唱した仕様がよく使われます。
```graphql
type Query {
  posts(first: Int, after: String): PostConnection!
}

# 個々の要素とカーソルのペア
type PostEdge {
  cursor: String!
  node: Post!
}

# ページの情報のコンテナ
type PostConnection {
  edges: [PostEdge]
  pageInfo: PageInfo!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}
```
このスキーマは少し複雑ですが、次のページの有無（`hasNextPage`）など、リッチなUIを構築するための情報をクライアントに提供できます。

**クライアントでの利用 (Apollo Client):**
Apollo Clientには、このカーソルベース・ページネーションを便利に扱うための`fetchMore`関数や`relayStylePagination`ヘルパーが用意されており、無限スクロールなどの実装を強力にサポートします。

## 2. キャッシュの最適化

Apollo Clientのキャッシュは非常に強力ですが、その挙動を理解し、最適化することでアプリケーションのパフォーマンスをさらに向上させることができます。

### キャッシュの仕組み

Apollo Clientは、クエリのレスポンスを受け取ると、各オブジェクトを`__typename`（スキーマの型名）と`id`（または`_id`）フィールドを元に正規化し、フラットなストアに保存します。

例えば、以下のクエリを実行すると...
```graphql
query {
  post(id: "1") {
    __typename # Apollo Clientが自動で追加
    id
    title
    author {
      __typename
      id
      name
    }
  }
}
```
キャッシュ内部では、以下のようにデータが保存されます（簡略化）。
```
{
  "Post:1": { id: "1", title: "...", author: { __ref: "User:101" } },
  "User:101": { id: "101", name: "Alice" },
  ROOT_QUERY: { 'post({"id":"1"})': { __ref: "Post:1" } }
}
```
この正規化により、あるミューテーションで`User:101`の名前が変更された場合、このユーザーを表示している全てのコンポーネントが自動で更新される、という恩恵が得られます。

### キャッシュポリシーのカスタマイズ

`useQuery`の`fetchPolicy`オプションで、キャッシュをどのように利用するかを細かく制御できます。

- `cache-first` (デフォルト): まずキャッシュを探し、なければネットワークリクエスト。
- `network-only`: 常にネットワークリクエストを実行し、結果をキャッシュに書き込む。
- `cache-and-network`: まずキャッシュのデータを返し、**その後**ネットワークリクエストを実行してデータを更新する。UIの即時応答性とデータの最新性を両立したい場合に有効。
- `no-cache`: データをキャッシュしない。

### キャッシュの手動更新

`refetchQueries`は簡単ですが、不要なネットワークリクエストを生むことがあります。`useMutation`の`update`オプションを使えば、ミューテーションのレスポンスを使って、キャッシュを直接書き換えることができます。

```javascript
const [addTodo] = useMutation(ADD_TODO_MUTATION, {
  update(cache, { data: { addTodo } }) {
    cache.modify({
      fields: {
        todos(existingTodos = []) {
          const newTodoRef = cache.writeFragment({
            data: addTodo,
            fragment: gql`...`
          });
          return [...existingTodos, newTodoRef];
        }
      }
    });
  }
});
```
この方法は少し複雑ですが、ネットワークを介さずにUIを即時更新できるため、非常に高速なユーザー体験を提供できます。

## 3. 認証・認可 (Authentication & Authorization)

セキュアなAPIには認証（「あなたは誰か？」）と認可（「あなたは何ができるか？」）が不可欠です。

### 認証 (Authentication)

GraphQLサーバー自体は認証の仕組みを持ちません。認証は、GraphQLレイヤーの手前にあるミドルウェア（Expressなど）で処理するのが一般的です。

**認証フローの例:**
1.  クライアントがユーザー名とパスワードでログイン用のミューテーション（例: `login`）を叩く。
2.  サーバーは認証情報を検証し、成功したらJWT（JSON Web Token）などの認証トークンを返す。
3.  クライアントは受け取ったトークンをローカル（`localStorage`など）に保存する。
4.  以降の全てのリクエストで、クライアントはHTTPヘッダー（例: `Authorization: Bearer <token>`）にトークンを添付して送信する。
5.  サーバーはリクエストを受け取るたびにヘッダーのトークンを検証し、有効であればユーザー情報を特定して**コンテキスト**オブジェクトに格納する。

**コンテキストへのユーザー情報追加 (Apollo Server):**
```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    // HTTPヘッダーからトークンを取得
    const token = req.headers.authorization || '';
    // トークンを検証してユーザー情報を取得 (関数は自前で実装)
    const user = await getUserFromToken(token);
    // コンテキストオブジェクトにユーザー情報を詰めて返す
    return { user };
  },
});
```

### 認可 (Authorization)

コンテキストに格納されたユーザー情報は、リゾルバ内からアクセスできます。リゾルバは、このユーザー情報に基づいて、処理を実行してよいか（認可）を判断します。

```javascript
const resolvers = {
  Mutation: {
    // 3番目の引数がコンテキスト
    editPost: (parent, { id, title }, { user }) => {
      // ユーザーがログインしているかチェック
      if (!user) {
        throw new Error('Not authenticated');
      }
      const post = db.posts.find(p => p.id === id);
      // 投稿の所有者か、管理権限があるかなどをチェック
      if (post.authorId !== user.id) {
        throw new Error('Not authorized');
      }
      // ... 認可OKなら処理を続行 ...
    }
  }
}
```
GraphQL Shieldのようなライブラリを使えば、この認可ロジックをリゾルバから分離し、スキーマ単位で宣言的に記述することも可能です。

## 連載のまとめ

全5回にわたり、GraphQLの世界を探検してきました。
- **第1回**: RESTとの違いと基本概念を学びました。
- **第2回**: Node.jsとApollo Serverでサーバーを構築しました。
- **第3回**: スキーマとリゾルバの役割を深く理解しました。
- **第4回**: ReactとApollo Clientでフロントエンドを実装しました。
- **第5回**: ページネーション、キャッシュ、認証といった実践的なテクニックを習得しました。

GraphQLは、現代の複雑なアプリケーション要件に応えるための、パワフルで柔軟なAPI技術です。この連載が、皆さんの開発プロジェクトにGraphQLを導入するきっかけとなれば幸いです。Happy querying!
