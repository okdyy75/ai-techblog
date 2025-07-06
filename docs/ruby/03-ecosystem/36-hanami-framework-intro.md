# Hanamiフレームワーク入門

Ruby on RailsがRubyのWebフレームワークの代名詞である一方、より軽量で、クリーンアーキテクチャを志向するフレームワークも存在します。その代表格が`Hanami`です。

この記事では、Hanamiフレームワークの基本的な思想と特徴、そして簡単なアプリケーションの作成方法を紹介します。

## Hanamiとは？

Hanami（旧称: Lotus）は、Ruby製のモダンなWebフレームワークです。Railsが「設定より規約」を重視するモノリシックな（一体型の）フレームワークであるのに対し、Hanamiは以下の特徴を持っています。

- **軽量で高速**: 必要な機能だけを組み込むことができ、起動が速く、メモリ消費量も少ないです。
- **クリーンアーキテクチャ**: アプリケーションを関心事（Web、ビジネスロジック、永続化など）ごとに明確に分離します。これにより、コードの見通しが良くなり、テストや保守が容易になります。
- **安全性**: デフォルトで多くのセキュリティ機能（CSRF保護、XSS対策など）が有効になっています。
- **��ンプルなコンポーネント**: 各コンポーネント（ルーティング、コントローラ、ビュー）が独立しており、単体で理解しやすいです。

## Hanamiのコアコンセプト

Hanamiのアーキテクチャは、いくつかの独立したコンポーネント（Hanamiでは`App`と呼びます）で構成されます。

- **Actions**: コントローラに相当します。HTTPリクエストを受け取り、ビジネスロジックを呼び出し、レスポンスを返します。各アクションは単一の責務を持つ小さなクラスとして実装されます。
- **Routing**: HTTPメソッドとURLパスを特定のアクションに結びつけます。
- **Views and Templates**: ビューロジックとテンプレートを分離します。ビューはプレゼンテーションロジックを担当し、テンプレートはHTMLの構造に専念します。
- **Entities and Repositories**: データベースとのやり取りを担当します。
    - **Entity**: ドメインオブジェクト。純粋なRubyオブジェクトで、ビジネスロジックを持ちますが、永続化の知識は持ちません。
    - **Repository**: 永続化ロジックを担当。Entityのコレクションのように振る舞い、データベースへのクエリをカプセル化します。

この分離により、ビジネスロジック（Entity）がデータベースの実装（Repository）から独立し、テストが非常にしやすくなります。

## Hanamiアプリケーションの作成

### 1. インストール

まず、Hanamiのgemをインストールします。

```bash
$ gem install hanami
```

### 2. 新規プロジェクトの作成

`hanami new`コマンドで新しいプロジェクトを作成します。

```bash
$ hanami new bookshelf
$ cd bookshelf
```

### 3. サーバーの起動

Hanamiには開発用のWebサーバーが組み込まれています。

```bash
$ bundle exec hanami server
```

ブラウザで`http://localhost:2300`にアクセスすると、Hanamiのウェルカムページが表示されます。

### 4. ルートとアクションの追加

`config/routes.rb`に新しいルートを追加します。

```ruby
# config/routes.rb
Hanami.application.routes do
  slice :main, at: "/" do
    root to: "home.show" # 新しく追加
  end
end
```

次に、対応するアクションを作成します。Hanamiでは`hanami generate`コマンドが使えます。

```bash
$ bundle exec hanami generate action main.home.show
```

これにより、`app/actions/main/home/show.rb`が生成されます。このファイルを編集して、レス���ンスをカスタマイズします。

```ruby
# app/actions/main/home/show.rb
module Main
  module Actions
    module Home
      class Show < Main::Action
        def handle(req, res)
          res.body = 'Hello from Hanami!'
        end
      end
    end
  end
end
```

サーバーを再起動して再度アクセスすると、"Hello from Hanami!"と表示されます。

## Railsとの比較

| 特徴 | Hanami | Rails |
| --- | --- | --- |
| **アーキテクチャ** | クリーンアーキテクチャ、マルチApp構成 | モノリシック |
| **データベース** | Repositoryパターン (EntityはDB非依存) | Active Recordパターン (モデルがDBと密結合) |
| **ルーティング** | アクションクラスに直接マッピング | コントローラのメソッドにマッピング |
| **メモリ使用量** | 少ない | 多い |
| **学習曲線** | Rails経験者には新しい概念が多い | 豊富なドキュメントとコミュニティ |

## まとめ

Hanamiは、Railsとは異なる設計思想を持つ、モダンで堅牢なWebフレームワークです。特に、長期的なメンテナンス性やテストのしやすさを重視するプロジェクト、あるいはマイクロサービスアーキテクチャの一環としてRubyを使いたい場合に強力な選択���となります。

Railsに慣れていると最初は戸惑うかもしれませんが、そのクリーンな設計は、ソフトウェアアーキテクチャの原則を学ぶ上で非常に良い教材にもなります。小規模なプロジェクトからHanamiを試してみてはいかがでしょうか。