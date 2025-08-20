# 【第7回】GraphQL Subscriptionでリアルタイム機能を実装する

モダンなWebアプリケーションでは、チャット、通知、ライブアップデートなど、リアルタイム機能が欠かせません。GraphQL Subscriptionは、サーバーからクライアントへのプッシュ型通信を実現し、リアルタイムなユーザー体験を提供します。この記事では、WebSocketsベースのSubscriptionの実装から実践的な活用法まで、詳しく解説します。

## GraphQL Subscriptionとは？

Subscriptionは、QueryやMutationと並ぶGraphQLの3つ目の操作タイプです。Queryが「データの読み取り」、Mutationが「データの変更」であるのに対し、Subscriptionは「データの変更を監視」する機能を提供します。

### 従来のポーリングとの比較

**ポーリング方式（従来）:**
```javascript
// 1秒ごとにサーバーに問い合わせ
setInterval(async () => {
  const result = await client.query({
    query: GET_MESSAGES
  });
  updateUI(result.data.messages);
}, 1000);
```

**Subscription方式（GraphQL）:**
```graphql
subscription {
  messageAdded {
    id
    content
    user {
      name
    }
    createdAt
  }
}
```

Subscriptionでは、サーバー側でイベントが発生した時点で即座にクライアントに通知されるため、より効率的でリアルタイムな体験を実現できます。

## サーバーサイドの実装

### 1. 依存関係のセットアップ

```bash
npm install graphql-subscriptions graphql-ws ws
```

### 2. Subscriptionスキーマの定義

```javascript
const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Message {
    id: ID!
    content: String!
    user: User!
    roomId: String!
    createdAt: String!
  }

  type User {
    id: ID!
    name: String!
  }

  type Query {
    messages(roomId: String!): [Message]
    rooms: [Room]
  }

  type Mutation {
    sendMessage(roomId: String!, content: String!): Message
    joinRoom(roomId: String!): Boolean
    leaveRoom(roomId: String!): Boolean
  }

  type Subscription {
    # 新しいメッセージが投稿されたとき
    messageAdded(roomId: String!): Message
    
    # ユーザーが入室/退室したとき
    userJoined(roomId: String!): User
    userLeft(roomId: String!): User
    
    # ユーザーがタイピング中
    userTyping(roomId: String!): TypingEvent
  }

  type TypingEvent {
    user: User!
    isTyping: Boolean!
  }

  type Room {
    id: ID!
    name: String!
    users: [User]
    messageCount: Int
  }
`;
```

### 3. PubSubの設定

PubSub（Publish-Subscribe）は、イベントの発行と購読を管理するシステムです。GraphQL Subscriptionの核となる仕組みです：

```javascript
const { PubSub } = require('graphql-subscriptions');

// 開発環境用のインメモリPubSub
// シンプルで軽量だが、単一サーバー環境でのみ動作
const pubsub = new PubSub();

// 本番環境では Redis PubSub を強く推奨
// 複数のサーバーインスタンス間でイベントを共有可能
// const { RedisPubSub } = require('graphql-redis-subscriptions');
// const pubsub = new RedisPubSub({
//   connection: {
//     host: 'localhost',
//     port: 6379,
//   }
// });

// イベント名の定数化（タイポ防止とメンテナンス性向上）
const MESSAGE_ADDED = 'MESSAGE_ADDED';
const USER_JOINED = 'USER_JOINED';
const USER_LEFT = 'USER_LEFT';
const USER_TYPING = 'USER_TYPING';
```

**PubSubの選択指針：**
- **開発環境**: インメモリPubSub（簡単で高速）
- **本番環境**: Redis PubSub（スケーラブル、永続化）
- **大規模環境**: Apache Kafka、AWS SNS/SQS（高可用性、分散処理）

### 4. リゾルバの実装

Subscriptionを効果的に活用するには、MutationとSubscriptionリゾルバの連携が重要です：

```javascript
const resolvers = {
  Query: {
    messages: async (parent, { roomId }) => {
      // 既存のメッセージを取得（ページング対応推奨）
      return await Message.findByRoomId(roomId);
    },
    rooms: async () => {
      // 利用可能なチャットルーム一覧を取得
      return await Room.findAll();
    }
  },

  Mutation: {
    sendMessage: async (parent, { roomId, content }, context) => {
      const { user } = context; // 認証されたユーザー情報
      
      // セキュリティチェック：認証必須
      if (!user) {
        throw new Error('認証が必要です');
      }

      // 1. データベースにメッセージを保存
      const message = await Message.create({
        content,
        userId: user.id,
        roomId,
        createdAt: new Date().toISOString()
      });

      // 2. Subscriptionで使用する完全なオブジェクトを構築
      const messageWithUser = {
        ...message,
        user // Subscriptionクライアントが必要とするユーザー情報を含める
      };

      // 3. 【重要】Subscriptionイベントを発行
      // この時点で、該当ルームをsubscribeしている全クライアントに通知される
      pubsub.publish(MESSAGE_ADDED, {
        messageAdded: messageWithUser,
        roomId // フィルタリングに使用
      });

      return messageWithUser;
    },

    joinRoom: async (parent, { roomId }, context) => {
      const { user } = context;
      
      if (!user) {
        throw new Error('認証が必要です');
      }

      // データベースの更新とイベント発行を組み合わせ
      await RoomUser.create({ roomId, userId: user.id });

      // 入室通知をSubscriptionで配信
      pubsub.publish(USER_JOINED, {
        userJoined: user,
        roomId
      });

      return true;
    },

    leaveRoom: async (parent, { roomId }, context) => {
      const { user } = context;
      
      if (!user) {
        throw new Error('認証が必要です');
      }

      // ルームからユーザーを削除
      await RoomUser.destroy({ 
        where: { roomId, userId: user.id }
      });

      // 退室イベントを通知
      pubsub.publish(USER_LEFT, {
        userLeft: user,
        roomId
      });

      return true;
    }
  },

  Subscription: {
    messageAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([MESSAGE_ADDED]),
        (payload, variables) => {
          // 指定されたroomIdのメッセージのみを配信
          return payload.roomId === variables.roomId;
        }
      )
    },

    userJoined: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([USER_JOINED]),
        (payload, variables) => {
          return payload.roomId === variables.roomId;
        }
      )
    },

    userLeft: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([USER_LEFT]),
        (payload, variables) => {
          return payload.roomId === variables.roomId;
        }
      )
    },

    userTyping: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([USER_TYPING]),
        (payload, variables) => {
          return payload.roomId === variables.roomId;
        }
      )
    }
  }
};

const { withFilter } = require('graphql-subscriptions');
```

### 5. WebSocketサーバーの設定

```javascript
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const { makeExecutableSchema } = require('@graphql-tools/schema');

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  // GraphQLスキーマを作成
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers
  });

  // Apollo Serverを作成
  const server = new ApolloServer({
    schema,
    context: ({ req }) => {
      // HTTPヘッダーからユーザー認証情報を取得
      const token = req.headers.authorization?.replace('Bearer ', '');
      const user = token ? verifyToken(token) : null;
      
      return {
        user,
        pubsub
      };
    }
  });

  await server.start();
  server.applyMiddleware({ app });

  // WebSocketサーバーを設定
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql'
  });

  useServer({
    schema,
    context: async (ctx) => {
      // WebSocket接続時の認証
      const token = ctx.connectionParams?.authorization?.replace('Bearer ', '');
      const user = token ? verifyToken(token) : null;
      
      return {
        user,
        pubsub
      };
    },
    // 接続/切断時の処理
    onConnect: async (ctx) => {
      console.log('WebSocket connected');
    },
    onDisconnect: async (ctx) => {
      console.log('WebSocket disconnected');
    }
  }, wsServer);

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`🚀 Subscriptions ready at ws://localhost:${PORT}/graphql`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
});
```

## クライアントサイドの実装

### 1. React + Apollo Clientの設定

```bash
npm install @apollo/client graphql-ws
```

```javascript
// apollo-client.js
import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

// HTTP接続の設定
const httpLink = new HttpLink({
  uri: 'http://localhost:4000/graphql',
  headers: {
    authorization: `Bearer ${localStorage.getItem('token')}`
  }
});

// WebSocket接続の設定
const wsLink = new GraphQLWsLink(createClient({
  url: 'ws://localhost:4000/graphql',
  connectionParams: {
    authorization: `Bearer ${localStorage.getItem('token')}`
  },
  shouldRetry: () => true, // 接続が切れた場合の自動再接続
}));

// 操作タイプに応じて接続を切り替え
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache()
});
```

### 2. Reactコンポーネントでの使用

```javascript
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { gql } from '@apollo/client';

// GraphQLクエリとSubscription
const GET_MESSAGES = gql`
  query GetMessages($roomId: String!) {
    messages(roomId: $roomId) {
      id
      content
      user {
        id
        name
      }
      createdAt
    }
  }
`;

const SEND_MESSAGE = gql`
  mutation SendMessage($roomId: String!, $content: String!) {
    sendMessage(roomId: $roomId, content: $content) {
      id
      content
      user {
        id
        name
      }
      createdAt
    }
  }
`;

const MESSAGE_ADDED_SUBSCRIPTION = gql`
  subscription MessageAdded($roomId: String!) {
    messageAdded(roomId: $roomId) {
      id
      content
      user {
        id
        name
      }
      createdAt
    }
  }
`;

const USER_JOINED_SUBSCRIPTION = gql`
  subscription UserJoined($roomId: String!) {
    userJoined(roomId: $roomId) {
      id
      name
    }
  }
`;

const ChatRoom = ({ roomId, currentUser }) => {
  const [messageContent, setMessageContent] = useState('');
  const [users, setUsers] = useState([]);

  // 既存メッセージを取得
  const { data: messagesData, loading } = useQuery(GET_MESSAGES, {
    variables: { roomId }
  });

  // メッセージ送信
  const [sendMessage] = useMutation(SEND_MESSAGE, {
    update: (cache, { data: { sendMessage } }) => {
      // キャッシュを更新して即座にUIに反映
      const existingMessages = cache.readQuery({
        query: GET_MESSAGES,
        variables: { roomId }
      });

      cache.writeQuery({
        query: GET_MESSAGES,
        variables: { roomId },
        data: {
          messages: [...existingMessages.messages, sendMessage]
        }
      });
    }
  });

  // 新しいメッセージのSubscription
  useSubscription(MESSAGE_ADDED_SUBSCRIPTION, {
    variables: { roomId },
    onSubscriptionData: ({ subscriptionData }) => {
      const newMessage = subscriptionData.data.messageAdded;
      
      // 自分が送信したメッセージは既にキャッシュに追加済みなのでスキップ
      if (newMessage.user.id === currentUser.id) {
        return;
      }

      // 他のユーザーからのメッセージをキャッシュに追加
      client.cache.updateQuery(
        {
          query: GET_MESSAGES,
          variables: { roomId }
        },
        (data) => ({
          messages: [...(data?.messages || []), newMessage]
        })
      );
    }
  });

  // ユーザー入室のSubscription
  useSubscription(USER_JOINED_SUBSCRIPTION, {
    variables: { roomId },
    onSubscriptionData: ({ subscriptionData }) => {
      const joinedUser = subscriptionData.data.userJoined;
      setUsers(prev => [...prev, joinedUser]);
      
      // 入室通知を表示
      showNotification(`${joinedUser.name}さんが入室しました`);
    }
  });

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageContent.trim()) return;

    try {
      await sendMessage({
        variables: {
          roomId,
          content: messageContent
        }
      });
      setMessageContent('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="chat-room">
      <div className="messages">
        {messagesData?.messages.map(message => (
          <div key={message.id} className="message">
            <strong>{message.user.name}: </strong>
            <span>{message.content}</span>
            <small>{new Date(message.createdAt).toLocaleTimeString()}</small>
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} className="message-form">
        <input
          type="text"
          value={messageContent}
          onChange={(e) => setMessageContent(e.target.value)}
          placeholder="メッセージを入力..."
          className="message-input"
        />
        <button type="submit">送信</button>
      </form>

      <div className="users-list">
        <h3>参加者</h3>
        {users.map(user => (
          <div key={user.id}>{user.name}</div>
        ))}
      </div>
    </div>
  );
};

export default ChatRoom;
```

## タイピング状態の実装

リアルタイム感をさらに向上させるため、ユーザーのタイピング状態を表示する機能を実装してみましょう。

### サーバーサイド

```javascript
// タイピング状態を管理するためのメモリストア
const typingUsers = new Map(); // roomId -> Set<userId>

const resolvers = {
  Mutation: {
    // ... 他のMutation ...

    setTyping: async (parent, { roomId, isTyping }, context) => {
      const { user } = context;
      
      if (!user) {
        throw new Error('認証が必要です');
      }

      if (!typingUsers.has(roomId)) {
        typingUsers.set(roomId, new Set());
      }

      const roomTypingUsers = typingUsers.get(roomId);
      
      if (isTyping) {
        roomTypingUsers.add(user.id);
      } else {
        roomTypingUsers.delete(user.id);
      }

      // タイピング状態を通知
      pubsub.publish(USER_TYPING, {
        userTyping: {
          user,
          isTyping
        },
        roomId
      });

      return true;
    }
  }
};
```

### クライアントサイド

```javascript
const SET_TYPING = gql`
  mutation SetTyping($roomId: String!, $isTyping: Boolean!) {
    setTyping(roomId: $roomId, isTyping: $isTyping)
  }
`;

const USER_TYPING_SUBSCRIPTION = gql`
  subscription UserTyping($roomId: String!) {
    userTyping(roomId: $roomId) {
      user {
        id
        name
      }
      isTyping
    }
  }
`;

const ChatRoom = ({ roomId, currentUser }) => {
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [typingTimeout, setTypingTimeout] = useState(null);
  
  const [setTyping] = useMutation(SET_TYPING);

  // タイピング状態のSubscription
  useSubscription(USER_TYPING_SUBSCRIPTION, {
    variables: { roomId },
    onSubscriptionData: ({ subscriptionData }) => {
      const { user, isTyping } = subscriptionData.data.userTyping;
      
      // 自分のタイピング状態は表示しない
      if (user.id === currentUser.id) return;

      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(user.name);
        } else {
          newSet.delete(user.name);
        }
        return newSet;
      });
    }
  });

  const handleInputChange = (e) => {
    setMessageContent(e.target.value);

    // タイピング開始を通知
    setTyping({
      variables: { roomId, isTyping: true }
    });

    // 既存のタイムアウトをクリア
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // 3秒後にタイピング停止を通知
    const timeout = setTimeout(() => {
      setTyping({
        variables: { roomId, isTyping: false }
      });
    }, 3000);

    setTypingTimeout(timeout);
  };

  return (
    <div className="chat-room">
      {/* ... メッセージ表示 ... */}
      
      {/* タイピング中のユーザーを表示 */}
      {typingUsers.size > 0 && (
        <div className="typing-indicator">
          {Array.from(typingUsers).join(', ')} がタイピング中...
        </div>
      )}

      <form onSubmit={handleSendMessage}>
        <input
          type="text"
          value={messageContent}
          onChange={handleInputChange}
          placeholder="メッセージを入力..."
        />
        <button type="submit">送信</button>
      </form>
    </div>
  );
};
```

## 本番環境での考慮事項

### 1. スケーラビリティ

```javascript
// Redis PubSubを使用した水平スケーリング
const { RedisPubSub } = require('graphql-redis-subscriptions');

const pubsub = new RedisPubSub({
  connection: {
    host: 'redis-cluster.example.com',
    port: 6379,
  },
  // 複数のRedisインスタンスに対応
  publisher: redisClient,
  subscriber: redisClient
});
```

### 2. 接続管理

```javascript
// 接続数の制限
const connectionLimit = 1000;
let currentConnections = 0;

useServer({
  schema,
  onConnect: async (ctx) => {
    if (currentConnections >= connectionLimit) {
      throw new Error('接続数が上限に達しました');
    }
    currentConnections++;
    console.log(`接続数: ${currentConnections}`);
  },
  onDisconnect: async (ctx) => {
    currentConnections--;
    console.log(`接続数: ${currentConnections}`);
  }
}, wsServer);
```

### 3. エラーハンドリングと接続回復

```javascript
// クライアントサイドの接続回復
const wsLink = new GraphQLWsLink(createClient({
  url: 'ws://localhost:4000/graphql',
  connectionParams: () => ({
    authorization: `Bearer ${localStorage.getItem('token')}`
  }),
  shouldRetry: (errOrCloseEvent) => {
    // 認証エラー以外は再接続を試行
    return errOrCloseEvent.code !== 4401;
  },
  retryAttempts: 5,
  retryWait: async function waitForServerHealthiness() {
    // サーバーの健全性をチェック
    try {
      await fetch('http://localhost:4000/health');
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}));
```

## まとめ

GraphQL Subscriptionは、モダンなWebアプリケーションに欠かせないリアルタイム機能を実現する強力な仕組みです。

主要なポイント：

1. **WebSocketベースの双方向通信**: 効率的なリアルタイム更新
2. **柔軟なフィルタリング**: `withFilter`を使った精密な配信制御
3. **Apollo Clientとの統合**: Reactアプリケーションでの簡単な実装
4. **本番環境での最適化**: Redis PubSub、接続管理、エラーハンドリング

次回は、**GraphQLのテスト戦略**について詳しく解説します。スキーマ、リゾルバ、Subscriptionの効果的なテスト手法を学び、品質の高いGraphQLアプリケーションを構築する方法を探求しましょう！