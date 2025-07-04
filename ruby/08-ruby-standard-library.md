
# Rubyの標準ライブラリ紹介

Rubyには、インストールするだけで利用できる豊富な標準ライブラリが付属しています。これらは、ファイル操作、ネットワーク通信、データフォーマットの処理など、日常的なプログラミングタスクを簡単に行うための強力なツールです。ここでは、よく使われる便利な標準ライブラリをいくつか紹介します。

利用するライブラリによっては、`require`キーワードで明示的に読み込む必要があります。

```ruby
require 'json'
```

## `json`

JSON (JavaScript Object Notation) は、データ交換フォーマットとして広く使われています。`json`ライブラリは、Rubyのハッシュや配列とJSON文字列を相互に変換する機能を提供します。

```ruby
require 'json'

# RubyのハッシュをJSON文字列に変換 (generate)
user = { name: "Alice", age: 30, skills: ["Ruby", "Rails"] }
json_string = JSON.generate(user)
puts json_string
#=> {"name":"Alice","age":30,"skills":["Ruby","Rails"]}

# JSON文字列をRubyのハッシュに変換 (parse)
parsed_hash = JSON.parse(json_string)
puts parsed_hash["name"] #=> Alice
```

## `csv`

CSV (Comma-Separated Values) ファイルを扱うためのライブラリです。CSVデータの読み書きを簡単に行えます。

```ruby
require 'csv'

# CSVデータの書き込み
CSV.open("users.csv", "w") do |csv|
  csv << ["Name", "Email"]
  csv << ["Bob", "bob@example.com"]
  csv << ["Carol", "carol@example.com"]
end

# CSVデータの読み込み
CSV.foreach("users.csv", headers: true) do |row|
  puts "Name: #{row['Name']}, Email: #{row['Email']}"
end
```

## `net/http`

HTTPプロトコルを使ってWebサーバーと通信するためのライブラリです。Webページの取得やAPIの呼び出しなどに使います。

```ruby
require 'net/http'
require 'json'

uri = URI('https://api.github.com/users/ruby')
response = Net::HTTP.get(uri)
user_data = JSON.parse(response)

puts "User: #{user_data['login']}"
puts "Name: #{user_data['name']}"
puts "Public Repos: #{user_data['public_repos']}"
```

## `fileutils`

ファイルのコピー、移動、削除など、ファイルシステム操作をより高レベルで行うためのユーティリティです。シェルの`cp`, `mv`, `rm`コマンドに似た機能を提供します。

```ruby
require 'fileutils'

# ディレクトリの作成
FileUtils.mkdir_p('tmp/my_app')

# ファイルの作成とコピー
FileUtils.touch('tmp/original.txt')
FileUtils.cp('tmp/original.txt', 'tmp/my_app/copy.txt')

# ファイルの移動 (リネーム)
FileUtils.mv('tmp/my_app/copy.txt', 'tmp/my_app/renamed.txt')

# ディレクトリごと削除
FileUtils.rm_r('tmp')
```

## `date` と `time`

日付と時刻を扱うためのクラスです。`Time`はRubyのコア機能ですが、より高度な日付操作には`date`ライブラリが便利です。

```ruby
# Time (コア機能)
now = Time.now
puts now #=> 2023-10-27 10:30:00 +0900
puts now.year
puts now.strftime("%Y-%m-%d %H:%M:%S") # フォーマット指定

# Date (要require)
require 'date'

today = Date.today
puts today #=> 2023-10-27
puts today.next_day(3) # 3日後
puts today.strftime("%A") # 曜日
```

## `securerandom`

暗号学的に安全なランダムな文字列や数値を生成するためのライブラリです。セッショントークンやユニークIDの生成などに利用されます。

```ruby
require 'securerandom'

# ランダムな16進数文字列
puts SecureRandom.hex(16) #=> "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"

# ランダムなBase64文字列
puts SecureRandom.base64(16) #=> "SGVsbG8sIFdvcmxkIQ=="

# UUID (Universally Unique Identifier)
puts SecureRandom.uuid #=> "f8b5b5a0-5b5a-4b5a-8b5a-5b5a5b5a5b5a"
```

## `logger`

ログメッセージをファイルや標準出力に出力するためのライブラリです。ログレベル（DEBUG, INFO, WARN, ERROR, FATAL）を設定して、出力するメッセージを制御できます。

```ruby
require 'logger'

# 標準出力へのロガー
# logger = Logger.new(STDOUT)

# ファイルへのロガー
logger = Logger.new('app.log')

logger.level = Logger::INFO

logger.debug("This is a debug message.") # 出力されない
logger.info("User logged in.")
logger.warn("Password is weak.")
logger.error("Failed to connect to database.")
```

## まとめ

Rubyの標準ライブラリは、外部のGemをインストールしなくても多くの一般的な問題を解決できる強力なツールセットです。公式ドキュメントを参照して、どのようなライブラリが利用可能かを知っておくと、開発効率を大幅に向上させることができます。
