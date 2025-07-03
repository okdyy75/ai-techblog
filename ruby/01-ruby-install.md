# Rubyのインストールとバージョン管理

## rbenvのインストール

```bash
git clone https://github.com/rbenv/rbenv.git ~/.rbenv
echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.bash_profile
echo 'eval "$(rbenv init -)"' >> ~/.bash_profile
source ~/.bash_profile
```

## ruby-buildのインストール

```bash
git clone https://github.com/rbenv/ruby-build.git ~/.rbenv/plugins/ruby-build
```

## Rubyのインストール

```bash
rbenv install -l
rbenv install 3.2.2
rbenv global 3.2.2
```
