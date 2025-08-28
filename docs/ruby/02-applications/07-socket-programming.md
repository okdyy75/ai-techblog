# RubyのSocketプログラミング

Rubyの標準ライブラリ`socket`を使うと、TCPやUDPなどのネットワークプロトコルを直接扱うことができます。ここでは、基本的なTCPサーバーとクライアントの実装方法を紹介します。

## 1. TCPサーバー

TCPサーバーは、指定したポートでクライアントからの接続を待ち受けます。

**`tcp_server.rb`**
```ruby
require 'socket'

# 127.0.0.1のポート2000で待ち受ける
server = TCPServer.new('127.0.0.1', 2000)

puts "Server started on port 2000..."

loop do
  # クライアントからの接続を受け付ける
  client = server.accept

  # クライアントごとにスレッドを作成して対応
  Thread.new(client) do |c|
    puts "Client connected: #{c.peeraddr.join(':')}"

    # クライアントからデータを受信
    while (line = c.gets)
      break if line.chomp == 'exit'
      puts "Received: #{line.chomp}"

      # クライアントにデータを送信
      c.puts("Echo: #{line.chomp}")
    end

    # 接続を閉じる
    c.close
    puts "Client disconnected."
  end
end
```

**解説:**
- `TCPServer.new`: サーバーソケットを作成します。
- `server.accept`: クライアントからの接続を待ち、接続が確立するとクライアントとの通信用の`TCPSocket`オブジェクトを返します。
- `client.gets`: クライアントから一行分のデータを読み込みます。
- `client.puts`: クライアントにデータを書き込みます。
- `Thread.new`: 各クライアントの処理を別スレッドで行うことで、複数のクライアントを同時に捌けるようにしています。

## 2. TCPクライアント

TCPクライアントは、サーバーに接続してデータの送受信を行います。

**`tcp_client.rb`**
```ruby
require 'socket'

begin
  # サーバーに接続
  socket = TCPSocket.new('127.0.0.1', 2000)

  puts "Connected to server. Type 'exit' to quit."

  # サーバーからの応答を待つスレッド
  Thread.new do
    while (response = socket.gets)
      puts response
    end
  end

  # ユーザーからの入力をサーバーに送信
  while (input = $stdin.gets.chomp)
    socket.puts(input)
    break if input == 'exit'
  end

rescue Errno::ECONNREFUSED => e
  puts "Connection refused. Is the server running?"
rescue => e
  puts "An error occurred: #{e.message}"
ensure
  # ソケットを閉じる
  socket.close if socket
end
```

**解説:**
- `TCPSocket.new`: サーバーに接続を試みます。
- `$stdin.gets`: 標準入力からユーザーの入力を受け取ります。
- `rescue`: サーバーが起動していない場合などの接続エラーを捕捉します。

## 実行方法

1. ターミナルでサーバーを起動します。
   ```bash
   $ ruby tcp_server.rb
   Server started on port 2000...
   ```

2. 別のターミナルでクライアントを起動します。
   ```bash
   $ ruby tcp_client.rb
   Connected to server. Type 'exit' to quit.
   ```

3. クライアント側でメッセージを入力すると、サーバー側で受信され、クライアントに応答が返ってきます。
   ```
   hello
   Echo: hello
   exit
   ```

`socket`ライブラリは低レベルなAPIですが、HTTPサーバーやチャットアプリケーションなど、様々なネットワークアプリケーションの基礎を理解する上で非常に重要です。
