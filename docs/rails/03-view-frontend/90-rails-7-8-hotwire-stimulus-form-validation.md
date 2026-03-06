# Rails 7/8 + Hotwire環境におけるStimulus駆動フォームバリデーションの実践

近年のWeb開発において、ユーザー体験の向上は不可欠です。特にフォーム入力における即時フィードバックは、ユーザーの離脱を防ぎ、スムーズな操作を促します。Railsアプリケーションでは、サーバーサイドでの堅牢なバリデーションが基本ですが、Hotwire（Turbo, Stimulus）の登場により、クライアントサイドバリデーションの統合がより洗練された形で可能になりました。本稿では、Rails 7/8とHotwireを前提に、Stimulusを使って実用的なフォームバリデーションを実装する際のプラクティスを解説します。

## なぜVanilla JS直書きよりStimulusなのか

Vanilla JavaScriptでフォームごとにイベントハンドラを直書きすると、画面が増えるたびにロジックが散らばり、保守負荷が上がります。Stimulusは「HTMLに小さな振る舞いを付与する」思想なので、Railsのフォームヘルパーと相性が良く、責務分離しやすいのが利点です。

実務では次のような分割が扱いやすいです。

- `form-validation` Controller: 送信時の総合チェック
- `field-validation` 相当: 入力中（`input`/`blur`）の即時チェック
- サーバー側: 最終的な真正性・整合性チェック

## data-attributes設計（宣言的にする）

Stimulusの強みは `data-*` で設計を宣言できる点です。

- `data-controller`: どのControllerが担当するか
- `data-action`: どのイベントで何を実行するか
- `data-*-target`: 参照する入力欄やエラー表示領域
- `data-*-rules-value`: ルール定義（JSON）

この設計だと、HTMLを見るだけで「どのフィールドがどのバリデーション対象か」が把握できます。

## 実装例（ERB + Stimulus + Model Validation）

### Model（サーバー側の最終防衛線）

```ruby
# app/models/user.rb
class User < ApplicationRecord
  validates :name, presence: { message: "名前は必須です" },
                   length: { minimum: 3, message: "名前は3文字以上で入力してください" }

  validates :email, presence: { message: "メールアドレスは必須です" },
                    format: { with: URI::MailTo::EMAIL_REGEXP, message: "メール形式が不正です" }
end
```

### ERB（ルールとアクセシビリティ情報を埋める）

```erb
<%= form_with model: @user,
  data: {
    controller: "form-validation",
    action: "submit->form-validation#submit",
    form_validation_rules_value: {
      name:  { presence: true, minLength: 3 },
      email: { presence: true, email: true }
    }.to_json
  } do |f| %>

  <div data-form-validation-target="field">
    <%= f.label :name %>
    <%= f.text_field :name,
      data: {
        action: "input->form-validation#validate blur->form-validation#validate",
        form_validation_target: "input",
        field_name: "name"
      },
      aria: { invalid: "false", describedby: "name-error" } %>
    <p id="name-error" data-form-validation-target="error" aria-live="polite"></p>
  </div>

  <div data-form-validation-target="field">
    <%= f.label :email %>
    <%= f.email_field :email,
      data: {
        action: "input->form-validation#validate blur->form-validation#validate",
        form_validation_target: "input",
        field_name: "email"
      },
      aria: { invalid: "false", describedby: "email-error" } %>
    <p id="email-error" data-form-validation-target="error" aria-live="polite"></p>
  </div>

  <%= f.submit "保存", data: { action: "form-validation#submit" } %>
<% end %>
```

### Stimulus Controller

```javascript
// app/javascript/controllers/form_validation_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "error", "field"]
  static values = { rules: Object }

  validate(event) {
    const input = event.currentTarget
    const name = input.dataset.fieldName
    const rules = this.rulesValue[name] || {}

    let message = ""
    const value = input.value?.trim() || ""

    if (rules.presence && value.length === 0) {
      message = "必須項目です"
    } else if (rules.minLength && value.length < rules.minLength) {
      message = `${rules.minLength}文字以上で入力してください`
    } else if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      message = "メール形式が不正です"
    }

    this.render(input, message)
  }

  submit(event) {
    let hasError = false
    this.inputTargets.forEach((input) => {
      this.validate({ currentTarget: input })
      if (input.getAttribute("aria-invalid") === "true") hasError = true
    })

    if (hasError) {
      event.preventDefault()
      const firstInvalid = this.inputTargets.find(i => i.getAttribute("aria-invalid") === "true")
      firstInvalid?.focus()
    }
  }

  render(input, message) {
    const field = input.closest('[data-form-validation-target="field"]')
    const error = field?.querySelector('[data-form-validation-target="error"]')
    if (!error) return

    error.textContent = message
    input.setAttribute("aria-invalid", message ? "true" : "false")
  }
}
```

## サーバー側との役割分担

クライアント側はUX改善、サーバー側は完全性担保と割り切るのが実務的です。

- クライアント: 必須・文字数・形式など即時チェック
- サーバー: ユニーク制約、権限、業務ルール、改ざん対策

重要なのは「クライアントで通った = 保存してよい」ではないこと。最終判定は常にモデル側で行います。

## アクセシビリティ実装の要点

- `aria-invalid` をエラー時に `true`
- `aria-describedby` でエラーメッセージ要素を関連付け
- エラー表示領域に `aria-live="polite"`
- 送信失敗時は最初のエラー項目へフォーカス移動

この4点だけでも、読み上げ環境での体験は大きく改善します。

## テスト観点（最低限）

- System Spec: 不正入力で送信が止まるか
- System Spec: 正常入力で保存できるか
- サーバー側Model spec: 不正データが必ず弾かれるか

Stimulusロジックの単体テストまで書けるなら理想ですが、まずはE2E + Modelの二層を確実に押さえるのが現実的です。

## まとめ

Rails 7/8 でフォーム体験を改善するなら、Vanilla JSの場当たり実装より、Stimulusで責務を分けて組み立てる方が長期運用に向きます。`data-*` 設計で宣言的にし、サーバー側バリデーションを最終防衛線として維持することで、UXと堅牢性を両立できます。
