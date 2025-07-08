# Rails 8のインライン実行でJavaScriptとCSSの扱いがどう変わるか

## はじめに

Rails 8では、JavaScriptとCSSの管理において「インライン実行」という新しいアプローチが導入されました。この機能により、外部ファイルの読み込みを減らし、より高速なページレンダリングを実現できます。従来のアセットパイプラインとの違いや実装方法を詳しく解説します。

### 従来のアセット管理の課題

```erb
<!-- Rails 7以前の典型的な構成 -->
<%= stylesheet_link_tag 'application', 'data-turbo-track': 'reload' %>
<%= javascript_importmap_tags %>

<!-- 結果 -->
<!-- 複数のHTTPリクエストが発生 -->
<link rel="stylesheet" href="/assets/application-abc123.css">
<script type="module" src="/assets/application-def456.js"></script>
<script type="module" src="/assets/components-ghi789.js"></script>
```

**問題点:**
- 複数のHTTPリクエストによるレイテンシ
- キャッシュのヒット率の問題
- Critical Rendering Pathの最適化が困難

## インライン実行の基本概念

### 1. CSSインライン化

```erb
<!-- app/views/layouts/application.html.erb -->
<!DOCTYPE html>
<html>
  <head>
    <title>My App</title>
    <%= csrf_meta_tags %>
    <%= csp_meta_tag %>
    
    <!-- インライン CSS -->
    <style>
      <%= Rails.application.assets["application.css"].to_s.html_safe %>
    </style>
  </head>
  <body>
    <%= yield %>
  </body>
</html>
```

### 2. JavaScriptインライン化

```erb
<!-- Critical JavaScript のインライン化 -->
<script>
  <%= Rails.application.assets["critical.js"].to_s.html_safe %>
</script>

<!-- 非同期で読み込むJavaScript -->
<script async>
  <%= Rails.application.assets["non-critical.js"].to_s.html_safe %>
</script>
```

## 実装方法

### 1. アセットヘルパーの拡張

```ruby
# app/helpers/inline_assets_helper.rb
module InlineAssetsHelper
  def inline_stylesheet(name)
    if Rails.env.production?
      content_tag :style do
        Rails.application.assets[name].to_s.html_safe
      end
    else
      stylesheet_link_tag name, 'data-turbo-track': 'reload'
    end
  end
  
  def inline_javascript(name, **options)
    if Rails.env.production?
      content_tag :script, **options do
        Rails.application.assets[name].to_s.html_safe
      end
    else
      javascript_include_tag name, 'data-turbo-track': 'reload'
    end
  end
end
```

### 2. Critical CSSの分離

```scss
// app/assets/stylesheets/critical.scss
// Above-the-fold に必要な最小限のCSS
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
  padding: 0;
}

.header {
  background: #fff;
  border-bottom: 1px solid #eee;
  padding: 1rem;
}

.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4rem 2rem;
  text-align: center;
}

// app/assets/stylesheets/application.scss
// 残りのCSS（非クリティカル）
@import "critical";
@import "components/*";
@import "pages/*";
```

### 3. JavaScriptの最適化

```javascript
// app/assets/javascripts/critical.js
// 即座に実行が必要なJavaScript
document.addEventListener('DOMContentLoaded', function() {
  // フォームバリデーション
  initializeFormValidation();
  
  // ナビゲーション
  initializeNavigation();
  
  // アナリティクス（クリティカル）
  trackPageView();
});

// app/assets/javascripts/deferred.js
// 遅延読み込み可能なJavaScript
document.addEventListener('DOMContentLoaded', function() {
  // 画像の遅延読み込み
  initializeLazyLoading();
  
  // チャート描画
  initializeCharts();
  
  // サードパーティウィジェット
  loadExternalWidgets();
});
```

## 高度な実装パターン

### 1. 条件付きインライン化

```ruby
# app/helpers/smart_assets_helper.rb
module SmartAssetsHelper
  def smart_stylesheet(name, inline_threshold: 10.kilobytes)
    asset = Rails.application.assets[name]
    
    if should_inline?(asset, inline_threshold)
      content_tag :style do
        asset.to_s.html_safe
      end
    else
      stylesheet_link_tag name, 'data-turbo-track': 'reload'
    end
  end
  
  private
  
  def should_inline?(asset, threshold)
    Rails.env.production? && 
    asset.present? && 
    asset.length < threshold
  end
end
```

### 2. キャッシュ戦略

```ruby
# config/initializers/inline_assets.rb
class InlineAssetCache
  def self.get(key)
    Rails.cache.fetch("inline_asset_#{key}", expires_in: 1.hour) do
      yield
    end
  end
end

# app/helpers/cached_inline_assets_helper.rb
module CachedInlineAssetsHelper
  def cached_inline_stylesheet(name)
    InlineAssetCache.get("css_#{name}") do
      Rails.application.assets[name].to_s
    end.html_safe
  end
  
  def cached_inline_javascript(name)
    InlineAssetCache.get("js_#{name}") do
      Rails.application.assets[name].to_s
    end.html_safe
  end
end
```

### 3. Progressive Enhancement

```erb
<!-- app/views/layouts/application.html.erb -->
<!DOCTYPE html>
<html>
  <head>
    <!-- Critical CSS (インライン) -->
    <style>
      <%= cached_inline_stylesheet("critical.css") %>
    </style>
    
    <!-- Non-critical CSS (遅延読み込み) -->
    <link rel="preload" href="<%= asset_path('application.css') %>" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript>
      <%= stylesheet_link_tag 'application' %>
    </noscript>
  </head>
  
  <body>
    <%= yield %>
    
    <!-- Critical JavaScript (インライン) -->
    <script>
      <%= cached_inline_javascript("critical.js") %>
    </script>
    
    <!-- Non-critical JavaScript (遅延読み込み) -->
    <script>
      // 非クリティカルなJavaScriptを動的に読み込み
      function loadNonCriticalJS() {
        const script = document.createElement('script');
        script.src = '<%= asset_path("application.js") %>';
        script.async = true;
        document.head.appendChild(script);
      }
      
      // アイドル時または遅延して読み込み
      if ('requestIdleCallback' in window) {
        requestIdleCallback(loadNonCriticalJS);
      } else {
        setTimeout(loadNonCriticalJS, 100);
      }
    </script>
  </body>
</html>
```

## パフォーマンス測定

### 1. レンダリング時間の計測

```javascript
// app/assets/javascripts/performance.js
class PerformanceMonitor {
  static measureRenderTime() {
    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          console.log('FCP:', entry.startTime);
        }
      }
    });
    fcpObserver.observe({entryTypes: ['paint']});
    
    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('LCP:', lastEntry.startTime);
    });
    lcpObserver.observe({entryTypes: ['largest-contentful-paint']});
  }
  
  static measureResourceLoading() {
    window.addEventListener('load', () => {
      const resources = performance.getEntriesByType('resource');
      const cssResources = resources.filter(r => r.name.includes('.css'));
      const jsResources = resources.filter(r => r.name.includes('.js'));
      
      console.log('CSS loading time:', 
        cssResources.reduce((sum, r) => sum + r.duration, 0));
      console.log('JS loading time:', 
        jsResources.reduce((sum, r) => sum + r.duration, 0));
    });
  }
}

PerformanceMonitor.measureRenderTime();
PerformanceMonitor.measureResourceLoading();
```

### 2. A/Bテスト実装

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  before_action :set_asset_strategy
  
  private
  
  def set_asset_strategy
    @use_inline_assets = experiment_inline_assets?
  end
  
  def experiment_inline_assets?
    # ユーザーの50%にインライン化を適用
    session[:user_id].to_i % 2 == 0
  end
end

# app/views/layouts/application.html.erb
<% if @use_inline_assets %>
  <style><%= cached_inline_stylesheet("application.css") %></style>
<% else %>
  <%= stylesheet_link_tag 'application', 'data-turbo-track': 'reload' %>
<% end %>
```

## 最適化のベストプラクティス

### 1. サイズの監視

```ruby
# lib/tasks/asset_size_monitor.rake
namespace :assets do
  desc "Monitor inline asset sizes"
  task size_monitor: :environment do
    critical_css = Rails.application.assets["critical.css"]
    critical_js = Rails.application.assets["critical.js"]
    
    puts "Critical CSS size: #{critical_css.length} bytes"
    puts "Critical JS size: #{critical_js.length} bytes"
    
    # 警告しきい値
    warn_if_too_large(critical_css, "Critical CSS", 14.kilobytes)
    warn_if_too_large(critical_js, "Critical JS", 14.kilobytes)
  end
  
  private
  
  def warn_if_too_large(asset, name, threshold)
    if asset.length > threshold
      puts "⚠️  #{name} is #{asset.length} bytes (threshold: #{threshold})"
    end
  end
end
```

### 2. コンテンツ配信の最適化

```ruby
# config/environments/production.rb
Rails.application.configure do
  # Gzip圧縮の有効化
  config.middleware.use Rack::Deflater
  
  # インライン化されたアセットのキャッシュ
  config.public_file_server.headers = {
    'Cache-Control' => 'public, max-age=31536000',
    'Expires' => 1.year.from_now.to_formatted_s(:rfc822)
  }
end
```

### 3. 開発環境での最適化

```ruby
# config/environments/development.rb
Rails.application.configure do
  # 開発環境では外部ファイルを使用（デバッグしやすさのため）
  config.assets.inline_critical_css = false
  config.assets.inline_critical_js = false
  
  # ファイル変更の監視
  config.file_watcher = ActiveSupport::EventedFileUpdateChecker
end
```

## トラブルシューティング

### 1. よくある問題

```ruby
# 問題: インライン化でコンテンツが表示されない
# 解決: HTMLエスケープの確認
def safe_inline_css(name)
  css_content = Rails.application.assets[name].to_s
  # XSSを防ぐため、CSS内容をサニタイズ
  sanitized_css = css_content.gsub(/<\/style>/i, '<\\/style>')
  sanitized_css.html_safe
end

# 問題: CSP（Content Security Policy）エラー
# 解決: nonce の追加
def inline_script_with_nonce(content)
  nonce = SecureRandom.base64(32)
  response.set_header('Content-Security-Policy', 
    "script-src 'self' 'nonce-#{nonce}'")
  
  content_tag :script, nonce: nonce do
    content.html_safe
  end
end
```

### 2. デバッグツール

```javascript
// デバッグ用：インライン化の効果を測定
class InlineAssetsDebugger {
  static compareLoadTimes() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.initiatorType === 'link' && entry.name.includes('.css')) {
          console.log('External CSS load time:', entry.duration);
        }
      });
    });
    observer.observe({entryTypes: ['resource']});
    
    // インライン CSS の処理時間（推定）
    const inlineStyleTags = document.querySelectorAll('style');
    console.log('Inline styles count:', inlineStyleTags.length);
  }
}
```

## まとめ

Rails 8のインライン実行機能は、適切に使用することでWebアプリケーションのパフォーマンスを大幅に改善できます。重要なのは、すべてのアセットをインライン化するのではなく、クリティカルパスに必要な最小限のコードのみをインライン化することです。

**実装のポイント:**
- Critical CSS/JSの適切な分離
- サイズの監視と最適化
- 段階的な導入とA/Bテスト
- パフォーマンス指標の継続的な監視

この機能を活用して、より高速で応答性の高いWebアプリケーションを構築しましょう。