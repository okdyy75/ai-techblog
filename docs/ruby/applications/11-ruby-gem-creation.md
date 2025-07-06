# RubyのGem作成と公開方法

Gemは、Rubyのライブラリやアプリケーションをパッケージ化するための標準的な形式です。便利な機能をGemとして作成し、RubyGems.orgで公開することで、世界中の開発者とコードを共有できます。ここでは、基本的なGemの作成から公開までの手順を解説します。

## 1. Gemの雛形を作成する

Bundlerを使えば、Gemの基本的なディレクトリ構造とファイルを簡単に生成できます。

```bash
bundle gem my_awesome_gem
```

これにより、`my_awesome_gem`というディレクトリが作成され、以下のようなファイルが生成されます。

```
my_awesome_gem/
├── Gemfile
├── Rakefile
├── LICENSE.txt
├── README.md
├── .gitignore
├── my_awesome_gem.gemspec
└── lib/
    ├── my_awesome_gem/
    │   └── version.rb
    └── my_awesome_gem.rb
```

- **`my_awesome_gem.gemspec`**: Gemの仕様を定義するファイルです。名前、バージョン、作者、依存関係などを記述します。
- **`lib/my_awesome_gem.rb`**: Gemのメインファイルです。ここにライブラリのコードを記述していきます。
- **`lib/my_awesome_gem/version.rb`**: Gemのバージョン番号を管理するモジュールです。

## 2. `gemspec` ファイルを編集する

`my_awesome_gem.gemspec`を開き、TODOやFIXMEと書かれている箇所を編集します。

```ruby
# my_awesome_gem.gemspec

require_relative "lib/my_awesome_gem/version"

Gem::Specification.new do |spec|
  spec.name        = "my_awesome_gem"
  spec.version     = MyAwesomeGem::VERSION
  spec.authors     = ["Your Name"]
  spec.email       = ["your.email@example.com"]

  spec.summary     = "A short summary of your gem."
  spec.description = "A longer description of your gem."
  spec.homepage    = "https://github.com/your_username/my_awesome_gem"
  spec.license     = "MIT"
  spec.required_ruby_version = ">= 2.7.0"

  # ... (他の設定)

  # Gemが依存する他のGemを指定
  # spec.add_dependency "example-gem", "~> 1.0"

  # 開発時にのみ使用するGemを指定
  # spec.add_development_dependency "rspec", "~> 3.0"
end
```

`spec.summary`と`spec.description`は必ず記述してください。`spec.homepage`には、GitHubリポジトリのURLなどを設定します。

## 3. ライブラリのコードを実装する

`lib/my_awesome_gem.rb`に、Gemの本体となるコードを書いていきます。

例として、文字列を装飾する簡単な機能を追加してみましょう。

```ruby
# lib/my_awesome_gem.rb

require_relative "my_awesome_gem/version"

module MyAwesomeGem
  class Error < StandardError; end

  def self.decorate(text)
    "✨ #{text} ✨"
  end
end
```

これで、他のプログラムから `MyAwesomeGem.decorate("some text")` のように呼び出せるようになります。

## 4. ローカルで動作確認する

Bundlerのコンソールを使って、作成したGemをローカルで試すことができます。

```bash
# Gemのルートディレクトリで実行
bundle console
```

コンソールが起動したら、実装したコードを試してみましょう。

```ruby
irb(main):001:0> MyAwesomeGem.decorate("Hello, Gem!")
=> "✨ Hello, Gem! ✨"
```

## 5. Gemをビルドする

GemをRubyGems.orgに公開する前に、`.gem`という形式のパッケージファイルをビルドする必要があります。

```bash
gem build my_awesome_gem.gemspec
```

成功すると、カレントディレクトリに `my_awesome_gem-0.1.0.gem` のようなファイルが作成されます。（バージョン番号は`version.rb`に基づきます）

## 6. RubyGems.orgに公開する

### アカウントの作成

まだアカウントを持っていない場合は、[RubyGems.org](https://rubygems.org/)でアカウントを作成してください。

### ログイン

`gem`コマンドを使って、RubyGems.orgにログインします。メールアドレスとパスワードが聞かれます。

```bash
gem signin
```

### 公開 (Push)

ビルドした`.gem`ファイルをRubyGems.orgにアップロードします。

```bash
gem push my_awesome_gem-0.1.0.gem
```

成功すれば、あなたのGemが世界中に公開されます！公開されたGemは、誰でも `gem install my_awesome_gem` でインストールし、`require 'my_awesome_gem'` で利用できるようになります。

## バージョン管理

Gemを更新した場合は、`lib/my_awesome_gem/version.rb`のバージョン番号を更新することを忘れないでください。セマンティックバージョニング（例: 1.0.0 -> 1.0.1, 1.1.0, 2.0.0）に従うのが一般的です。

バージョンを更新したら、再度ビルドとプッシュを行います。

```ruby
# lib/my_awesome_gem/version.rb
module MyAwesomeGem
  VERSION = "0.1.1"
end
```

```bash
# 変更をコミット
git add .
git commit -m "Add new feature"

# ビルドしてプッシュ
gem build my_awesome_gem.gemspec
gem push my_awesome_gem-0.1.1.gem
```

Rakeタスクを使えば、このプロセスを自動化することもできます。

```bash
# バージョンアップ、ビルド、Gitタグ作成、プッシュをまとめて行う
rake release
```

## まとめ

Bundlerを使えば、Gemの作成と公開は非常に簡単です。

1.  `bundle gem`で雛形を作成
2.  `.gemspec`を編集
3.  `lib/`以下にコードを実装
4.  `gem build`でパッケージ化
5.  `gem push`で公開

便利なコードが書けたら、ぜひGemとして公開し、Rubyコミュニティに貢献してみてください。