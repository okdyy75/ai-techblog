# RubyによるWebスクレイピング

Webスクレイピングは、Webサイトから情報を自動的に抽出し、データを収集する技術です。Rubyには、このプロセスを簡単かつ効率的に行うための強力なライブラリが揃っています。

この記事では、RubyでWebスクレイピングを行うための主要なGemと、その基本的な使い方を解説します。

## スクレイピングに必要なGem

1.  **Nokogiri**: HTMLやXMLをパース（解析）するための中心的なライブラリです。CSSセレクタやXPathを使って、ドキュメント内の特定の要素を簡単に見つけ出すことができます。
2.  **HTTParty** / **Faraday**: HTTPリクエストを送信し、WebページのHTMLコンテンツを取得するためのライブラリです。どちらも使いやすいAPIを提供しています。

まずは、これらのGemをインストールしましょう。

```bash
$ gem install nokogiri httparty
```

## スクレイピングの基本ステップ

Webスクレイピングは、通常以下の3つのステップで行われます。

1.  **HTML���取得**: 対象のURLにHTTPリクエストを送り、HTMLデータを取得する。
2.  **HTMLの解析**: 取得したHTMLをNokogiriで解析し、操作可能なオブジェクトに変換する。
3.  **データの抽出**: CSSセレクタやXPathを使い、必要な情報（テキスト、リンクなど）を抽出する。

## 実践：技術ニュースサイトからタイトルを抽出する

例として、架空の技術ニュースサイト`https://example-news.com`のトップページから、記事のタイトル一覧を取得するコードを書いてみましょう。

### 1. HTMLの取得

`HTTParty`を使って、指定したURLのHTMLを取得します。

```ruby
require 'httparty'

url = 'https://example-news.com'
response = HTTParty.get(url)

# response.bodyにHTML文字列が格納される
puts response.body
```

### 2. HTMLの解析とデータ抽出

取得したHTMLを`Nokogiri`で解析し、CSSセレクタを使って記事タイトルを抽出します。多くのニュースサイトでは、記事のタイトルは`<h2>`や`<h3>`タグの中の`<a>`タグでマークアップされていることが多いです。

ブラウザの開発者ツール（Inspect Element）を使って、抽出したい要素のHTML構造とCSSセレクタを確認するのが��般的です。

仮に、タイトルが`.article-title a`というセレクタで取得できるとします。

```ruby
require 'httparty'
require 'nokogiri'

url = 'https://example-news.com'

# 1. HTMLの取得
begin
  response = HTTParty.get(url)
rescue HTTParty::Error => e
  puts "Error fetching page: #{e.message}"
  exit
end

# 2. HTMLの解析
doc = Nokogiri::HTML(response.body)

# 3. データの抽出
# '.article-title a'というCSSセレクタに一致する全ての要素を取得
titles = doc.css('.article-title a')

if titles.empty?
  puts "No titles found. Check your CSS selector."
else
  puts "--- Tech News Titles ---"
  titles.each do |title_element|
    # 要素のテキスト内容とhref属性（リンク先URL）を取得
    title_text = title_element.text.strip
    link_url = title_element['href']
    
    puts "- #{title_text} (#{link_url})"
  end
end
```

このスクリプトは、指定されたCSSセレクタに一致するすべての要素をループ処理し、各要素のテキストと`href`属性を抽出して表示します。

## スクレイピングのマナーと注意点

- **利用規約の確認**: スクレイピングを行う前に、対象サイトの利用規約（Terms of Service）や`robots.txt`ファイルを確認し、スクレイピングが許可されているかを確認しましょう。
- **サーバーへの負荷**: 短時間に大量のリクエストを送ると、相手のサーバーに大きな負荷をかけてしまいます。リクエストの間隔を空ける（例: `sleep(1)`）などの配慮が必要です。
- **動的なWebサイト**: JavaScriptによってコンテンツが生成されるサイト（SPAなど）の場合、HTTPクライアントだけでは完全なHTMLを取得できません。このような場合は、`Selenium`や`Ferrum`といったブラウザ自動化ツールを使い、ブラウザを実際に操作してHTMLを���得する必要があります。
- **HTML構造の変更**: Webサイトのデザインが変更されると、CSSセレクタが機能しなくなることがあります。スクリプトが壊れやすいことを念頭に置き、エラーハンドリングを適切に行うことが重要です。

## まとめ

RubyとNokogiri、HTTPartyを組み合わせることで、Webスクレイピングを簡単かつ強力に行うことができます。データ収集、価格監視、情報集約など、その応用範囲は広いです。

倫理的な配慮を忘れずに、Webスクレイピングの力を活用して、価値ある情報を集めてみましょう。