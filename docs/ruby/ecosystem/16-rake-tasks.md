# Rakeタスクの作り方と活用法

Rakeは、Rubyで書かれたビルドツールで、Makeに似た機能を提供します。"Ruby Make"の略です。Rakeは、単純なタスクの自動化から、データベースのマイグレーション、テストの実行、デプロイといった複雑なワークフローまで、さまざまな定型作業をスクリプト化するのに使われます。Railsでは、多くの管理タスクがRakeタスクとして提供されています。

## Rakeの基本

Rakeの中心的な概念は**タスク (Task)** です。タスクは名前を持ち、実行すべき処理をRubyのコードブロックで記述します。これらのタスク定義は、`Rakefile`という名前のファイルに記述します。

### 簡単なRakefileの例

プロジェクトのルートディレクトリに`Rakefile`を作成します。

```ruby
# Rakefile

# タスクの説明 (desc)
desc "Greet someone"
# タスクの定義 (task)
task :greet do
  puts "Hello, world!"
end
```

- `task`キーワードでタスクを定義します。タスク名はシンボル（例: `:greet`）で指定します。
- `do ... end`ブロック内に、タスクが実行する処理を記述します。
- `desc`でタスクの説明を記述すると、`rake -T`コマンドでタスク一覧を表示したときに、その説明が表示されます。

### タスクの実行

ターミナルから`rake`コマンドを使ってタスクを実行します。

```bash
# greetタスクを実行
rake greet
#=> Hello, world!

# 利用可能なタスクの一覧を表示 (-T オプション)
rake -T
#=> rake greet  # Greet someone
```

## 引数を取るタスク

タスクに引数を渡すこともできます。

```ruby
# Rakefile

desc "Greet a specific person"
task :greet, [:name] do |t, args|
  # args.name で引数にアクセス
  name = args.name || "world"
  puts "Hello, #{name}!"
end
```

実行する際は、角括弧 `[]` を使って引数を渡します。

```bash
rake "greet[Alice]"
#=> Hello, Alice!

# 引数を渡さない場合
rake greet
#=> Hello, world!
```

## タスクの依存関係

あるタスクが実行される前に、別のタスクを先に実行させたい場合があります。これをタスクの依存関係と呼びます。

```ruby
# Rakefile

task :prepare_coffee do
  puts "Preparing coffee..."
end

task :prepare_toast do
  puts "Preparing toast..."
end

# :make_breakfast タスクは :prepare_coffee と :prepare_toast に依存する
desc "Make a full breakfast"
task :make_breakfast => [:prepare_coffee, :prepare_toast] do
  puts "Breakfast is ready!"
end
```

`make_breakfast`タスクを実行すると、依存タスクが先に実行されます。

```bash
rake make_breakfast
#=> Preparing coffee...
#=> Preparing toast...
#=> Breakfast is ready!
```

依存タスクの実行順序は保証されませんが、`make_breakfast`が実行される前にすべての依存タスクが完了していることは保証されます。

## 名前空間 (Namespace)

タスクが増えてくると、名前の衝突を避けたり、関連するタスクをグループ化したりするために、名前空間が役立ちます。

```ruby
# Rakefile

namespace :db do
  desc "Migrate the database"
  task :migrate do
    puts "Running database migrations..."
  end

  desc "Seed the database"
  task :seed do
    puts "Seeding the database..."
  end
end

namespace :test do
  desc "Run all tests"
  task :all do
    puts "Running all tests..."
  end
end
```

名前空間内のタスクを実行するには、`namespace:task_name`の形式で指定します。

```bash
rake "db:migrate"
#=> Running database migrations...

rake "test:all"
#=> Running all tests...
```

`rake -T`でタスク一覧を見ると、名前空間でグループ化されているのがわかります。

```bash
rake -T
#=> rake db:migrate  # Migrate the database
#=> rake db:seed     # Seed the database
#=> rake test:all    # Run all tests
```

## RailsにおけるRakeタスク

Railsアプリケーションでは、`lib/tasks`ディレクトリに`.rake`という拡張子でファイルを作成することで、独自のRakeタスクを定義できます。これらのタスクは自動的に読み込まれます。

例えば、定期的に古いデータをクリーンアップするタスクを作成してみましょう。

```ruby
# lib/tasks/cleanup.rake

namespace :cleanup do
  desc "Delete old records from the database"
  task :old_records => :environment do
    # :environment タスクに依存させることで、
    # Railsアプリケーションの環境（モデルなど）を読み込むことができる
    puts "Deleting old posts..."
    Post.where("created_at < ?", 30.days.ago).destroy_all
    puts "Done."
  end
end
```

- **`:environment`タスクへの依存**: これが非常に重要です。この依存関係を設定することで、タスク内でRailsのモデル（`Post`など）やヘルパーにアクセスできるようになります。

このタスクは、`bin/rails`コマンド経由で実行します。

```bash
bin/rails cleanup:old_records
```

## Rakeの活用例

- **データベース管理**: `db:migrate`, `db:seed`, `db:rollback`
- **テスト**: `test`, `spec` (MinitestやRSpecのテストスイートを実行)
- **デプロイ**: アセットのプリコンパイル (`assets:precompile`)、サーバーの再起動などを組み合わせたデプロイタスク
- **定期的な処理 (Cron Job)**: CronなどのスケジューラからRakeタスクを呼び出し、日次や月次のバッチ処理を実行する
- **データのインポート/エクスポート**: CSVファイルなどからデータをインポートしたり、データベースの内容をエクスポートしたりする

## まとめ

Rakeは、Rubyプロジェクトにおけるタスク自動化のためのシンプルで強力なツールです。
- `Rakefile`または`lib/tasks/*.rake`にタスクを定義する。
- `desc`でタスクの説明を記述する。
- `=> [...]`でタスク間の依存関係を定義する。
- `namespace`でタスクをグループ化する。
- Railsタスクでは`:environment`に依存させることで、アプリケーションのコンテキストを利用できる。

定型的な作業をRakeタスクとして定義しておくことで、手作業によるミスを防ぎ、開発効率を大幅に向上させることができます。