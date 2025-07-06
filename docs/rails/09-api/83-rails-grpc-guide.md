# RailsとgRPCによるハイパフォーマンスなマイクロサービス間通信

## 概要

マイクロサービスアーキテクチャでは、複数の独立したサービスが連携して一つの大きなアプリケーションとして機能します。このサービス間通信には、伝統的にREST API（HTTP/JSON）が広く使われてきました。しかし、パフォーマンス、型安全性、スキーマ管理の面で課題が生じることがあります。

gRPCは、Googleが開発したオープンソースのRPC（Remote Procedure Call）フレームワークです。HTTP/2をベースとし、Protocol Buffers (Protobuf) を使ってスキーマを定義することで、これらの課題を解決します。

この記事では、RailsアプリケーションでgRPCサーバーを構築し、別のRubyアプリケーション（クライアント）から呼び出す方法を解説します。

## gRPCのメリット

-   **パフォーマンス**: HTTP/2上で動作し、バイナリ形式のProtobufでデータをシリアライズするため、テキストベースのJSONよりも高速かつ効率的です。
-   **型安全性**: Protobufでサービスとメッセージのスキーマを厳密に定義するため、クライアントとサーバー間で型の不一致が起こりにくくなります。
-   **スキーマ駆動開発**: `.proto`ファイルがAPIの契約書となり、サーバーとクライアントのコードを自動生成できます。これにより、ドキュメントと実装の乖離を防ぎます。
-   **双方向ストリーミング**: クライアントとサーバーが同時にデータを送り合う、高度な通信パターンをサポートします。

## gRPCのセットアップ

### 1. 必要なGemのインストール

`Gemfile`に以下のGemを追加します。

Gemfile
```ruby
gem 'grpc'
gem 'grpc-tools' # .protoファイルからRubyコードを生成するために必要
```

`bundle install`を実行します。

### 2. Protocol Buffers (.proto) ファイルの定義

まず、APIのスキーマを`.proto`ファイルで定義します。このファイルが、サーバーとクライアント間の契約になります。

```protobuf
// lib/protos/user_service.proto

syntax = "proto3";

package user_service;

// ユーザー情報を取得するリクエスト
message GetUserRequest {
  int32 id = 1;
}

// ユーザー情報
message User {
  int32 id = 1;
  string name = 2;
  string email = 3;
}

// ユーザーサービス
service UserService {
  // IDを指定してユーザー情報を取得する
  rpc GetUser(GetUserRequest) returns (User);
}
```

-   `syntax = "proto3"`: Protobufのバージョンを指定します。
-   `message`: データ構造を定義します。フィールドには型と一意な番号を割り当てます。
-   `service`: RPCメソッドを定義します。`GetUser`メソッドは`GetUserRequest`を引数に取り、`User`メッセージを返します。

### 3. Rubyコードの生成

次に、`grpc_tools`を使って`.proto`ファイルからRubyのコードを生成します。

```bash
$ mkdir lib/generated
$ bundle exec grpc_tools_ruby_protoc -I lib/protos --ruby_out=lib/generated --grpc_out=lib/generated lib/protos/user_service.proto
```

このコマンドにより、`lib/generated`ディレクトリに以下の2つのファイルが生成されます。

-   `user_service_pb.rb`: `message`定義に対応するRubyクラス
-   `user_service_services_pb.rb`: `service`定義に対応するサーバーとクライアントのスタブコード

## gRPCサーバーの実装 (Rails)

生成されたコードを使って、gRPCサーバーを実装します。

### 1. サービスハンドラの実装

`UserService`のロジックを実装するクラスを作成します。

```ruby
# app/services/user_service_handler.rb

# 生成されたファイルをrequire
require 'generated/user_service_services_pb'

class UserServiceHandler < UserService::Service
  # GetUserメソッドの実装
  def get_user(request, _call)
    # requestは GetUserRequest のインスタンス
    user_record = User.find(request.id)

    # Userメッセージのインスタンスを返す
    ::UserService::User.new(
      id: user_record.id,
      name: user_record.name,
      email: user_record.email
    )
  rescue ActiveRecord::RecordNotFound
    raise GRPC::NotFound.new("User not found")
  end
end
```

-   `UserService::Service`を継承します。
-   `.proto`で定義した`GetUser`メソッドを実装します。
-   引数の`request`は、生成された`GetUserRequest`クラスのインスタンスです。
-   返り値は、生成された`User`クラスのインスタンスである必要があります。
-   エラーハンドリングには、`GRPC::NotFound`などの標準的なgRPCエラーステータスを使用します。

### 2. gRPCサーバーの起動

Railsの初期化後（例: `config/initializers/grpc_server.rb`）や、RakeタスクでgRPCサーバーを起動します。

```ruby
# lib/tasks/grpc.rake

namespace :grpc do
  desc "Start gRPC server"
  task :server => :environment do
    port = '0.0.0.0:50051'
    server = GRPC::RpcServer.new
    server.add_http2_port(port, :this_port_is_insecure)
    
    puts "gRPC server running on #{port}..."
    server.handle(UserServiceHandler.new)
    
    # Ctrl+Cで停止するまでサーバーを起動し続ける
    server.run_till_terminated_or_interrupted([1, 'int', 'SIGQUIT'])
  end
end
```

サーバーを起動します。

```bash
$ bundle exec rake grpc:server
```

## gRPCクライアントの実装

別のRubyアプリケーション（または同じRailsアプリの別プロセス）からgRPCサーバーを呼び出します。

```ruby
# client.rb

require 'grpc'
require_relative 'lib/generated/user_service_services_pb'

def main
  # サーバーへの接続スタブを作成
  stub = UserService::Stub.new('localhost:50051', :this_channel_is_insecure)

  begin
    # GetUserリクエストを作成
    request = UserService::GetUserRequest.new(id: 1)
    
    # RPCを呼び出し
    user = stub.get_user(request)

    puts "User found: #{user.name} (#{user.email})"
  rescue GRPC::NotFound => e
    puts "Error: #{e.details}"
  end
end

main
```

-   `UserService::Stub`を使って、サーバーへの接続を作成します。
-   `.proto`で定義したメソッド（`get_user`）を、あたかもローカルメソッドのように呼び出せます。

## まとめ

gRPCを導入することで、Railsを中心としたマイクロサービスアーキテクチャにおいて、パフォーマンスと信頼性の高いサービス間通信を実現できます。

-   **スキーマ定義**: `.proto`ファイルでAPIの契約を明確にする。
-   **コード生成**: `grpc-tools`で面倒なボイラープレートコードを自動生成する。
-   **サーバー実装**: Rails内でサービスハンドラを実装し、ビジネスロジックに集中する。
-   **クライアント実装**: 型安全なスタブを通じて、簡単にサーバーの機能を呼び出す。

REST APIが依然として多くの場面で有効な選択肢である一方、gRPCは特に内部サービス間の通信において、そのパフォーマンスと厳密性から大きなメリットをもたらします。プロジェクトの要件に応じて、適切な技術を選択することが重要です。
