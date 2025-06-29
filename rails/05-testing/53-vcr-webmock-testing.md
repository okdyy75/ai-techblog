# `VCR`や`WebMock`を使った外部API連携のテスト戦略

現代のWebアプリケーション開発において、外部のAPIと連携することはごく一般的です。天気情報、決済サービス、SNS連携など、多くの機能が外部APIへのリクエストによって実現されています。

しかし、こうした外部API連携を含むコードのテストには、特有の難しさが伴います。

- **不安定さ**: 外部サービスの障害やネットワークの問題で、テストが失敗することがある。
- **遅さ**: 毎回実際にHTTPリクエストを送信すると、テストの実行が非常に遅くなる。
- **コスト**: APIの利用回数に応じて課金されるサービスの場合、テスト実行がコスト増に繋がる。
- **非決定性**: APIのレスポンス内容が変わる可能性があり、テスト結果が安定しない。

これらの問題を解決し、外部API連携を安定して高速にテストするための強力なツールが、`WebMock`と`VCR`です。

この記事では、これらのgemを使ったテスト戦略について解説します。

## `WebMock`: HTTPリクエストをスタブする

`WebMock`は、HTTPリクエストをインターセプトし、実際のネットワーク通信を行わずに、あらかじめ定義したレスポンスを返すように見せかける（スタブする）ためのライブラリです。

### 基本的な使い方

`spec_helper.rb`などで`WebMock`を読み込みます。

```ruby
# spec/spec_helper.rb
require 'webmock/rspec'
```

テストコード内で、特定のエンドポイントへのリクエストをスタブします。

```ruby
# spec/services/weather_service_spec.rb
describe WeatherService do
  it "東京の天気を取得する" do
    # http://api.weather.com/tokyo へのGETリクエストをスタブ
    stub_request(:get, "http://api.weather.com/tokyo")
      .to_return(
        status: 200,
        body: { tenki: "hare", temperature: 25 }.to_json,
        headers: { 'Content-Type' => 'application/json' }
      )

    weather_data = WeatherService.fetch_weather_for("tokyo")

    expect(weather_data["tenki"]).to eq("hare")
    expect(weather_data["temperature"]).to eq(25)

    # 実際にリクエストが送信されたかを検証することもできる
    expect(a_request(:get, "http://api.weather.com/tokyo")).to have_been_made.once
  end
end
```

`WebMock`を使うことで、外部APIがどのような状態であっても、テストは常に同じ結果を返すようになり、安定性と速度が向上します。

しかし、APIのレスポンスが複雑な場合、`to_return`に指定する`body`や`headers`を手で書くのは非常に面倒です。そこで登場するのが`VCR`です。

## `VCR`: HTTPリクエストを記録・再生する

`VCR`は、`WebMock`のようなリクエストスタブライブラリの上で動作し、HTTP通信を「カセット」と呼ばれるYAMLファイルに記録・再生してくれるツールです。

### `VCR`の仕組み

1.  **記録 (Recording)**: テストの初回実行時、`VCR`は実際のHTTPリクエストを外部に送信し、そのリクエストとレスポンスのペアをカセットファイル（例: `spec/fixtures/vcr_cassettes/weather_api.yml`）に記録します。
2.  **再生 (Replaying)**: 2回目以降のテスト実行時、`VCR`は実際にはリクエストを送信しません。代わりに、カセットファイルに記録された内容を読み込み、リクエストが一致すれば、記録済みのレスポンスを返します。

これにより、開発者は手動でスタブを記述する必要がなくなり、実際のAPIレスポンスに基づいた正確なテストを、高速かつ安定して実行できるようになります。

### 導入と設定

`Gemfile`に`vcr`を追加し、`bundle install`します。

```ruby
# Gemfile
group :test do
  gem "vcr"
  gem "webmock"
end
```

`spec_helper.rb`で`VCR`の設定を行います。

```ruby
# spec/spec_helper.rb
require 'vcr'

VCR.configure do |config|
  config.cassette_library_dir = "spec/fixtures/vcr_cassettes" # カセットの保存先
  config.hook_into :webmock # WebMockと連携
  config.configure_rspec_metadata! # RSpecのメタデータと連携

  # APIキーなどの機密情報をフィルタリングする設定
  config.filter_sensitive_data('<API_KEY>') { ENV['WEATHER_API_KEY'] }
end
```

`filter_sensitive_data`の設定は非常に重要です。APIキーやパスワードなどの機密情報がカセットファイルに記録されるのを防ぎます。

### `VCR`を使ったテスト

テストコードで`vcr`メタデータを指定するだけで、そのテストブロック内のHTTP通信が自動的に記録・再生されます。

```ruby
# spec/services/weather_service_spec.rb
RSpec.describe WeatherService, :vcr do # :vcr を追加
  it "東京の天気を取得する" do
    weather_data = WeatherService.fetch_weather_for("tokyo")

    expect(weather_data["location"]).to eq("Tokyo")
    expect(weather_data).to have_key("temperature_celsius")
  end
end
```

これだけで、初回実行時に`spec/fixtures/vcr_cassettes/WeatherService/東京の天気を取得する.yml`のようなカセットが自動生成され、2回目以降はそのカセットが使われます。

カセット名を明示的に指定することもできます。

```ruby
RSpec.describe WeatherService do
  it "大阪の天気を取得する", vcr: { cassette_name: 'weather_api/osaka' } do
    # ...
  end
end
```

## まとめとベストプラクティス

`WebMock`と`VCR`は、外部API連携を含むテストの信頼性と速度を劇的に向上させます。

- **`WebMock`**: HTTPリクエストを直接スタブするための低レベルなツール。シンプルなテストや、意図的にエラーケースを作りたい場合に便利。
- **`VCR`**: `WebMock`を使いやすくする高レベルなツール。リクエストを記録・再生することで、リアルなデータに基づいたテストを簡単に実現できる。

### ベストプラクティス

- **機密情報は必ずフィルタリングする**: `filter_sensitive_data`を使い、APIキーなどがGitリポジトリにコミットされないように徹底する。
- **カセットは定期的に更新する**: 外部APIの仕様が変更される可能性に備え、古くなったカセットは定期的に削除して再記録するタスクを用意すると良い。
- **`VCR`と`WebMock`を使い分ける**: 正常系のテストは`VCR`で楽をし、404エラーや500エラーといった異常系のテストは`WebMock`で`stub_request`を使って意図的に作り出す、という使い分けが効果的です。

これらのツールを使いこなし、外部APIへの依存からテストを解放しましょう。
