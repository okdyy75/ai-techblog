# RubyでのgRPCサーバー・クライアント実装

## はじめに
gRPCは、Googleによって開発された、高性能なオープンソースのRPC（Remote Procedure Call）フレームワークです。本記事では、Rubyを使用してgRPCのサーバーとクライアントを実装する基本的な方法を解説します。

## gRPCとは
gRPCは、プロトコルバッファ（Protocol Buffers）をインターフェース定義言語（IDL）として使用し、HTTP/2上で通信を行います。これにより、軽量で高速なマイクロサービス間の通信を実現します。

## 実装手順
1.  **.protoファイルの定義:**
    サービスとメッセージをプロトコルバッファ形式で定義します。

    ```protobuf
    syntax = "proto3";

    service Greeter {
      rpc SayHello (HelloRequest) returns (HelloReply) {}
    }

    message HelloRequest {
      string name = 1;
    }

    message HelloReply {
      string message = 1;
    }
    ```

2.  **コード生成:**
    `grpc-tools` Gemを使用して、Rubyのサーバー・クライアントのスタブを生成します。

3.  **サーバーの実装:**
    生成されたサービスクラスを継承し、RPCメソッドを実装します。

    ```ruby
    class GreeterServer < Greeter::Service
      def say_hello(hello_req, _unused_call)
        HelloReply.new(message: "Hello, #{hello_req.name}")
      end
    end
    ```

4.  **クライアントの実装:**
    生成されたスタブを使用して、サーバーのRPCメソッドを呼び出します。

    ```ruby
    stub = Greeter::Stub.new('localhost:50051', :this_channel_is_insecure)
    request = HelloRequest.new(name: 'World')
    response = stub.say_hello(request)
    puts response.message
    ```

## まとめ
gRPCは、型安全でパフォーマンスの高いマイクロサービスを構築するための強力な選択肢です。Rubyは公式にサポートされており、`grpc`と`grpc-tools` Gemを使うことで、簡単にgRPCアプリケーションを開発することができます。
