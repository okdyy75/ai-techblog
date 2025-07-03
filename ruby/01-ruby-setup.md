
# Rubyのインストールとバージョン管理

Rubyの開発を始めるためには、まずRuby本体をインストールする必要があります。また、プロジェクトごとに異なるRubyのバージョンを管理するために、バージョン管理ツールを導入することが一般的です。

## Rubyのインストール

Rubyのインストール方法はいくつかありますが、代表的なものを紹介します。

### Homebrew (macOS)

macOSでは、パッケージマネージャーのHomebrewを使って簡単にRubyをインストールできます。

```bash
brew install ruby
```

### apt (Ubuntu)

UbuntuなどのDebian系Linuxでは、aptを使ってインストールできます。

```bash
sudo apt-get update
sudo apt-get install ruby-full
```

## Rubyのバージョン管理ツール

Rubyのエコシステムでは、プロジェクトごとにRubyのバージョンを切り替えることがよくあります。そのために、rbenvやRVMといったバージョン管理ツールが広く使われています。

### rbenv

rbenvは、シンプルで軽量なRubyのバージョン��理ツールです。

#### インストール

Homebrew (macOS) の場合:

```bash
brew install rbenv ruby-build
```

インストール後、シェルの設定ファイル（`.zshrc`や`.bash_profile`など）に以下の行を追加します。

```bash
eval "$(rbenv init -)"
```

#### 使い方

インストール可能なRubyのバージョン一覧を表示:

```bash
rbenv install -l
```

特定のバージョンをインストール:

```bash
rbenv install 3.2.2
```

グローバルで使用するバージョンを設定:

```bash
rbenv global 3.2.2
```

プロジェクトごとにバージョンを設定（プロジェクトのルートディレクトリに`.ruby-version`ファイルが作成されます）:

```bash
rbenv local 3.2.2
```

### RVM (Ruby Version Manager)

RVMは、rbenvよりも多機能なバージョン管理ツールです。Gemsetという機能で、プロジェクトごとにGemのセットを管理することもできます。

#### インストール

公式サイトの案内に従ってインストールします。

```bash
gpg --recv-keys 409B6B1796C275462A1703113804BB82D39DC0E3 7D2BAF1CF37B13E2069D6956105BD0E739499BDB
\curl -sSL https://get.rvm.io | bash -s stable
```

#### 使い方

特定のバージョンをインストールして使用:

```bash
rvm install 3.2.2
rvm use 3.2.2
```

デフォルトのバージョンとして設定:

```bash
rvm use 3.2.2 --default
```

## まとめ

Rubyの開発環境を構築する際は、rbenvやRVMといったバージョン管理ツールを導入することを強くお勧めします。これにより、複数のプロジェクトで異なるRubyのバージョンをスムーズに切り替えることができ、開発効率が向上します。
