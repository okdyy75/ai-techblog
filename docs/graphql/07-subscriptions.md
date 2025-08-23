# 【第7回】GraphQL Subscriptionでリアルタイム機能を実装する

GraphQL Subscriptionを使えば、チャット、通知、ライブアップデートなどのリアルタイム機能を簡単に実装できます。この記事では、シンプルなコード例でSubscriptionの基本的な実装方法を説明します。

## GraphQL Subscriptionとは？

Subscriptionはデータの変更を監視する機能です。ポーリングとは違い、変更が発生した時点で即座にクライアントに通知されます。

```graphql
# ポーリング（従来）
query {
  messages {
    id
    content
  }
}

# Subscription（GraphQL）
subscription {
  messageAdded {
    id
    content
    user { name }
  }
}
```

## サーバーサイドの実装

### 基本的なセットアップ

```bash
npm install graphql-subscriptions graphql-ws ws
```

### スキーマ定義

```javascript
const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Message {
    id: ID!
    content: String!
    user: User!
    createdAt: String!
  }

  type User {
    id: ID!
    name: String!
  }

  type Query {
    messages: [Message]
  }

  type Mutation {
    sendMessage(content: String!): Message
  }

  type Subscription {
    messageAdded: Message
  }
`;
```

### PubSubとリゾルバ

```javascript
const { PubSub } = require('graphql-subscriptions');
const pubsub = new PubSub();

const MESSAGE_ADDED = 'MESSAGE_ADDED';

const resolvers = {
  Query: {
    messages: () => db.messages.findAll()
  },

  Mutation: {
    sendMessage: async (parent, { content }, context) => {
      const message = await db.messages.create({
        content,
        userId: context.user.id,
        createdAt: new Date().toISOString()
      });

      // Subscriptionイベントを発行
      pubsub.publish(MESSAGE_ADDED, { messageAdded: message });
      
      return message;
    }
  },

  Subscription: {
    messageAdded: {
      subscribe: () => pubsub.asyncIterator([MESSAGE_ADDED])
    }
  }
};
```

### サーバー起動

```javascript
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');

const server = new ApolloServer({ typeDefs, resolvers });

const httpServer = createServer();
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql'
});

useServer({ schema: server.schema }, wsServer);

## クライアントサイドの実装

React + Apollo Clientでの基本的な使用例：

```javascript
import { useSubscription, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

const MESSAGE_SUBSCRIPTION = gql`
  subscription {
    messageAdded {
      id
      content
      user { name }
    }
  }
`;

const SEND_MESSAGE = gql`
  mutation SendMessage($content: String!) {
    sendMessage(content: $content) {
      id
      content
    }
  }
`;

function ChatComponent() {
  const [sendMessage] = useMutation(SEND_MESSAGE);
  
  useSubscription(MESSAGE_SUBSCRIPTION, {
    onSubscriptionData: ({ subscriptionData }) => {
      console.log('新しいメッセージ:', subscriptionData.data.messageAdded);
    }
  });

  const handleSend = (content) => {
    sendMessage({ variables: { content } });
  };

  return (
    <div>
      {/* チャット UI */}
    </div>
  );
}
```

## まとめ

GraphQL Subscriptionの要点：

1. **リアルタイム通信**: WebSocketsを使った効率的な双方向通信
2. **PubSubパターン**: イベントの発行と購読で疎結合な設計
3. **Apollo Client統合**: Reactでの簡単な実装
4. **本番環境**: Redis PubSubによる水平スケーリング

Subscriptionにより、チャット、通知、ライブアップデートなどのリアルタイム機能を効率的に実装できます。