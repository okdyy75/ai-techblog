# Shopify LiquidテンプレートエンジンをRailsで活用する

## はじめに

Liquid は、Shopify が開発したセキュアで柔軟なテンプレートエンジンです。Railsの標準ERBテンプレートとは異なり、Liquidはユーザー生成コンテンツや動的なテンプレートに適しており、セキュリティを重視したテンプレート環境を提供します。

### Liquidの特徴

- **セキュア**: 任意のRubyコードの実行を防ぐ
- **柔軟**: カスタムフィルターとタグの追加が容易
- **ユーザーフレンドリー**: 非プログラマーでも理解しやすい構文
- **パフォーマンス**: 効率的なレンダリング
- **多言語対応**: 国際化に対応

## セットアップと基本設定

### 1. インストール

```ruby
# Gemfile
gem 'liquid'
gem 'liquid-rails'  # Rails統合用

# または独自実装の場合
gem 'liquid', '~> 5.4'
```

```bash
bundle install
```

### 2. Rails統合の設定

```ruby
# config/application.rb
class Application < Rails::Application
  # Liquidテンプレートエンジンの有効化
  config.liquid = ActiveSupport::OrderedOptions.new
  config.liquid.enabled = true
  config.liquid.template_extensions = ['liquid']
end

# config/initializers/liquid.rb
Rails.application.configure do
  # Liquidの基本設定
  config.liquid.strict_variables = Rails.env.production?
  config.liquid.strict_filters = Rails.env.production?
  config.liquid.error_mode = Rails.env.production? ? :warn : :strict
  
  # カスタムフィルターの登録
  config.liquid.filters = [
    ApplicationLiquidFilters,
    DateTimeLiquidFilters,
    HtmlLiquidFilters
  ]
  
  # カスタムタグの登録
  config.liquid.tags = {
    'render_partial' => RenderPartialTag,
    'cache_block' => CacheBlockTag,
    'feature_flag' => FeatureFlagTag
  }
end
```

### 3. コントローラーでの利用

```ruby
# app/controllers/templates_controller.rb
class TemplatesController < ApplicationController
  def render_liquid_template
    @template_content = params[:template] || default_template
    @template_data = gather_template_data
    
    begin
      liquid_template = Liquid::Template.parse(@template_content)
      @rendered_content = liquid_template.render(@template_data, 
        strict_variables: true,
        strict_filters: true
      )
    rescue Liquid::Error => e
      @error_message = "Template Error: #{e.message}"
      render :template_error and return
    end
    
    respond_to do |format|
      format.html
      format.json { render json: { content: @rendered_content } }
    end
  end
  
  private
  
  def gather_template_data
    {
      'user' => current_user&.as_liquid,
      'products' => Product.featured.as_liquid,
      'site' => {
        'name' => 'My Store',
        'url' => request.base_url,
        'currency' => 'USD'
      },
      'page' => {
        'title' => 'Product Catalog',
        'url' => request.url,
        'published_at' => Time.current.iso8601
      }
    }
  end
  
  def default_template
    <<~LIQUID
      <h1>Welcome to {{ site.name }}</h1>
      {% if user %}
        <p>Hello, {{ user.name }}!</p>
      {% else %}
        <p>Please <a href="/login">sign in</a> to continue.</p>
      {% endif %}
      
      <h2>Featured Products</h2>
      {% for product in products %}
        <div class="product">
          <h3>{{ product.name }}</h3>
          <p>{{ product.description | truncate: 100 }}</p>
          <p class="price">{{ product.price | money }}</p>
        </div>
      {% endfor %}
    LIQUID
  end
end
```

## カスタムフィルターの実装

### 1. 基本的なフィルター

```ruby
# app/liquid/application_liquid_filters.rb
module ApplicationLiquidFilters
  # 通貨フォーマット
  def money(input, currency = 'USD')
    return '' if input.blank?
    
    amount = input.to_f
    symbol = currency_symbol(currency)
    "#{symbol}#{format('%.2f', amount)}"
  end
  
  # 日本語の相対時間
  def time_ago_in_japanese(input)
    return '' if input.blank?
    
    time = parse_time(input)
    return '' unless time
    
    distance = Time.current - time
    
    case distance
    when 0..59
      "#{distance.to_i}秒前"
    when 60..3599
      "#{(distance / 60).to_i}分前"
    when 3600..86399
      "#{(distance / 3600).to_i}時間前"
    else
      "#{(distance / 86400).to_i}日前"
    end
  end
  
  # HTMLの安全なトランケート
  def truncate_html(input, length = 100)
    return '' if input.blank?
    
    text = strip_tags(input.to_s)
    text.length > length ? "#{text[0, length]}..." : text
  end
  
  # 画像URLの生成
  def image_url(input, size = 'medium')
    return '' if input.blank?
    
    base_url = Rails.application.routes.url_helpers.root_url
    sizes = {
      'small' => '150x150',
      'medium' => '300x300',
      'large' => '600x600'
    }
    
    "#{base_url}images/#{input}?size=#{sizes[size] || size}"
  end
  
  private
  
  def currency_symbol(currency)
    {
      'USD' => '$',
      'EUR' => '€',
      'JPY' => '¥',
      'GBP' => '£'
    }[currency] || currency
  end
  
  def parse_time(input)
    case input
    when Time, DateTime
      input
    when String
      Time.parse(input) rescue nil
    else
      nil
    end
  end
  
  def strip_tags(html)
    html.gsub(/<[^>]*>/, '')
  end
end

# Liquidフィルターとして登録
Liquid::Template.register_filter(ApplicationLiquidFilters)
```

### 2. 高度なフィルター

```ruby
# app/liquid/html_liquid_filters.rb
module HtmlLiquidFilters
  # マークダウンの変換
  def markdown(input)
    return '' if input.blank?
    
    require 'redcarpet'
    renderer = Redcarpet::Render::HTML.new(
      filter_html: true,
      no_links: false,
      no_images: false,
      with_toc_data: true
    )
    markdown = Redcarpet::Markdown.new(renderer)
    markdown.render(input.to_s).html_safe
  end
  
  # シンタックスハイライト
  def highlight(input, language = 'ruby')
    return '' if input.blank?
    
    require 'rouge'
    formatter = Rouge::Formatters::HTML.new
    lexer = Rouge::Lexer.find(language) || Rouge::Lexers::PlainText
    formatter.format(lexer.lex(input.to_s)).html_safe
  end
  
  # レスポンシブ画像の生成
  def responsive_image(input, alt_text = '', classes = '')
    return '' if input.blank?
    
    srcset = %w[1x 2x 3x].map do |density|
      "#{image_url(input, density)} #{density}"
    end.join(', ')
    
    %(<img src="#{image_url(input)}" 
           srcset="#{srcset}" 
           alt="#{ERB::Util.html_escape(alt_text)}" 
           class="#{classes}" 
           loading="lazy">).html_safe
  end
  
  # ソーシャルメディア埋め込み
  def embed_tweet(tweet_url)
    return '' if tweet_url.blank?
    
    tweet_id = extract_tweet_id(tweet_url)
    return '' unless tweet_id
    
    %(<blockquote class="twitter-tweet">
        <a href="#{tweet_url}"></a>
      </blockquote>
      <script async src="https://platform.twitter.com/widgets.js"></script>).html_safe
  end
  
  private
  
  def extract_tweet_id(url)
    url.match(/status\/(\d+)/)?.[1]
  end
end
```

## カスタムタグの実装

### 1. 基本的なタグ

```ruby
# app/liquid/tags/render_partial_tag.rb
class RenderPartialTag < Liquid::Tag
  def initialize(tag_name, markup, tokens)
    super
    @partial_name = markup.strip.gsub(/['"]/, '')
  end
  
  def render(context)
    # Railsのパーシャルをレンダリング
    controller = context.registers[:controller]
    return '' unless controller
    
    begin
      controller.render_to_string(
        partial: @partial_name,
        locals: context.scopes.last || {}
      )
    rescue => e
      Rails.logger.error "Liquid partial error: #{e.message}"
      Rails.env.development? ? "Error: #{e.message}" : ''
    end
  end
end

# app/liquid/tags/cache_block_tag.rb
class CacheBlockTag < Liquid::Block
  def initialize(tag_name, markup, tokens)
    super
    @cache_key = markup.strip.gsub(/['"]/, '')
    @expires_in = 1.hour
  end
  
  def render(context)
    cache_key = Liquid::Template.parse(@cache_key).render(context)
    
    Rails.cache.fetch("liquid_cache:#{cache_key}", expires_in: @expires_in) do
      super(context)
    end
  end
end

# app/liquid/tags/feature_flag_tag.rb
class FeatureFlagTag < Liquid::Block
  def initialize(tag_name, markup, tokens)
    super
    @flag_name = markup.strip.gsub(/['"]/, '')
  end
  
  def render(context)
    user = context['user']
    flag_enabled = FeatureFlag.enabled?(@flag_name, user)
    
    flag_enabled ? super(context) : ''
  end
end

# 登録
Liquid::Template.register_tag('render_partial', RenderPartialTag)
Liquid::Template.register_tag('cache', CacheBlockTag)
Liquid::Template.register_tag('feature_flag', FeatureFlagTag)
```

### 2. 条件分岐タグ

```ruby
# app/liquid/tags/device_tag.rb
class DeviceTag < Liquid::Block
  def initialize(tag_name, markup, tokens)
    super
    @device_type = markup.strip.downcase
  end
  
  def render(context)
    request = context.registers[:request]
    return '' unless request
    
    user_agent = request.user_agent.to_s.downcase
    
    is_target_device = case @device_type
    when 'mobile'
      mobile_device?(user_agent)
    when 'tablet'
      tablet_device?(user_agent)
    when 'desktop'
      !mobile_device?(user_agent) && !tablet_device?(user_agent)
    else
      false
    end
    
    is_target_device ? super(context) : ''
  end
  
  private
  
  def mobile_device?(user_agent)
    user_agent.match?(/mobile|android|iphone|ipod|blackberry|windows phone/)
  end
  
  def tablet_device?(user_agent)
    user_agent.match?(/ipad|android(?!.*mobile)|tablet/)
  end
end

Liquid::Template.register_tag('device', DeviceTag)
```

## セキュリティ実装

### 1. 安全なテンプレート実行

```ruby
# app/services/liquid_template_service.rb
class LiquidTemplateService
  MAX_RENDER_TIME = 5.seconds
  MAX_TEMPLATE_SIZE = 100.kilobytes
  
  def self.render_safely(template_content, data = {}, options = {})
    new(template_content, data, options).render
  end
  
  def initialize(template_content, data = {}, options = {})
    @template_content = template_content
    @data = data
    @options = default_options.merge(options)
    
    validate_template_size!
  end
  
  def render
    template = parse_template
    
    # タイムアウト付きで実行
    Timeout.timeout(MAX_RENDER_TIME) do
      template.render(@data, @options)
    end
  rescue Liquid::Error => e
    handle_liquid_error(e)
  rescue Timeout::Error
    handle_timeout_error
  rescue => e
    handle_unexpected_error(e)
  end
  
  private
  
  def parse_template
    Liquid::Template.parse(@template_content, @options)
  end
  
  def default_options
    {
      strict_variables: true,
      strict_filters: true,
      error_mode: :strict,
      registers: {
        controller: Current.controller,
        request: Current.request
      }
    }
  end
  
  def validate_template_size!
    if @template_content.bytesize > MAX_TEMPLATE_SIZE
      raise SecurityError, "Template size exceeds maximum allowed size"
    end
  end
  
  def handle_liquid_error(error)
    Rails.logger.warn "Liquid template error: #{error.message}"
    
    if Rails.env.production?
      "Template rendering failed"
    else
      "Liquid Error: #{error.message}"
    end
  end
  
  def handle_timeout_error
    Rails.logger.error "Liquid template timeout"
    "Template rendering timed out"
  end
  
  def handle_unexpected_error(error)
    Rails.logger.error "Unexpected liquid error: #{error.message}"
    Rails.logger.error error.backtrace.join("\n")
    
    "Template rendering failed"
  end
end
```

### 2. ユーザー入力のサニタイゼーション

```ruby
# app/liquid/secure_liquid_filters.rb
module SecureLiquidFilters
  # HTMLエスケープ
  def escape(input)
    ERB::Util.html_escape(input.to_s)
  end
  
  # URLエスケープ
  def url_escape(input)
    CGI.escape(input.to_s)
  end
  
  # JSONエスケープ
  def json_escape(input)
    input.to_json
  end
  
  # スクリプトタグの除去
  def strip_scripts(input)
    input.to_s.gsub(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/mi, '')
  end
  
  # 許可されたHTMLタグのみ保持
  def sanitize_html(input, allowed_tags = %w[p br strong em ul ol li])
    require 'sanitize'
    
    Sanitize.fragment(input.to_s, 
      :elements => allowed_tags,
      :remove_contents => %w[script],
      :whitespace => :remove
    )
  end
end

Liquid::Template.register_filter(SecureLiquidFilters)
```

## 実用的な使用例

### 1. Eコマースサイトのテンプレート

```liquid
<!-- 商品一覧テンプレート -->
<div class="product-grid">
  {% for product in products %}
    <div class="product-card" data-product-id="{{ product.id }}">
      {% if product.featured_image %}
        {{ product.featured_image | responsive_image: product.name, 'product-image' }}
      {% endif %}
      
      <h3 class="product-title">
        <a href="/products/{{ product.slug }}">{{ product.name }}</a>
      </h3>
      
      <p class="product-description">
        {{ product.description | truncate_html: 150 }}
      </p>
      
      <div class="product-price">
        {% if product.compare_at_price > product.price %}
          <span class="original-price">{{ product.compare_at_price | money }}</span>
          <span class="sale-price">{{ product.price | money }}</span>
          <span class="discount-badge">
            {{ product.compare_at_price | minus: product.price | divided_by: product.compare_at_price | times: 100 | round }}% OFF
          </span>
        {% else %}
          <span class="price">{{ product.price | money }}</span>
        {% endif %}
      </div>
      
      <div class="product-actions">
        {% if product.available %}
          <button class="btn btn-primary add-to-cart" 
                  data-product-id="{{ product.id }}"
                  data-variant-id="{{ product.default_variant.id }}">
            カートに追加
          </button>
        {% else %}
          <button class="btn btn-secondary" disabled>
            売り切れ
          </button>
        {% endif %}
      </div>
      
      {% if product.tags.size > 0 %}
        <div class="product-tags">
          {% for tag in product.tags %}
            <span class="tag">{{ tag }}</span>
          {% endfor %}
        </div>
      {% endif %}
    </div>
  {% else %}
    <p class="no-products">商品が見つかりませんでした。</p>
  {% endfor %}
</div>

<!-- ページネーション -->
{% if products.pages > 1 %}
  <nav class="pagination">
    {% if products.previous_page %}
      <a href="?page={{ products.previous_page }}" class="prev">前へ</a>
    {% endif %}
    
    {% for page in (1..products.pages) %}
      {% if page == products.current_page %}
        <span class="current">{{ page }}</span>
      {% else %}
        <a href="?page={{ page }}">{{ page }}</a>
      {% endif %}
    {% endfor %}
    
    {% if products.next_page %}
      <a href="?page={{ products.next_page }}" class="next">次へ</a>
    {% endif %}
  </nav>
{% endif %}
```

### 2. ブログテンプレート

```liquid
<!-- ブログ記事テンプレート -->
<article class="blog-post">
  <header class="post-header">
    <h1 class="post-title">{{ post.title }}</h1>
    
    <div class="post-meta">
      <time class="post-date" datetime="{{ post.published_at | date: '%Y-%m-%d' }}">
        {{ post.published_at | date: '%Y年%m月%d日' }}
      </time>
      
      {% if post.author %}
        <span class="post-author">
          by <a href="/authors/{{ post.author.slug }}">{{ post.author.name }}</a>
        </span>
      {% endif %}
      
      {% if post.reading_time %}
        <span class="reading-time">{{ post.reading_time }}分で読める</span>
      {% endif %}
    </div>
    
    {% if post.featured_image %}
      <div class="post-featured-image">
        {{ post.featured_image | responsive_image: post.title, 'featured-image' }}
      </div>
    {% endif %}
  </header>
  
  <div class="post-content">
    {% if post.excerpt %}
      <div class="post-excerpt">
        {{ post.excerpt }}
      </div>
    {% endif %}
    
    <div class="post-body">
      {{ post.content | markdown }}
    </div>
  </div>
  
  <footer class="post-footer">
    {% if post.tags.size > 0 %}
      <div class="post-tags">
        <span class="tags-label">タグ:</span>
        {% for tag in post.tags %}
          <a href="/tags/{{ tag.slug }}" class="tag">{{ tag.name }}</a>
        {% endfor %}
      </div>
    {% endif %}
    
    <div class="post-share">
      <span class="share-label">共有:</span>
      <a href="https://twitter.com/intent/tweet?text={{ post.title | url_escape }}&url={{ post.url | url_escape }}" 
         class="share-twitter" target="_blank">Twitter</a>
      <a href="https://www.facebook.com/sharer/sharer.php?u={{ post.url | url_escape }}" 
         class="share-facebook" target="_blank">Facebook</a>
    </div>
  </footer>
</article>

<!-- 関連記事 -->
{% if related_posts.size > 0 %}
  <aside class="related-posts">
    <h3>関連記事</h3>
    <div class="related-posts-grid">
      {% for related_post in related_posts limit: 3 %}
        <article class="related-post">
          {% if related_post.featured_image %}
            <a href="{{ related_post.url }}" class="related-post-image">
              {{ related_post.featured_image | image_url: 'small' | img_tag: related_post.title }}
            </a>
          {% endif %}
          
          <div class="related-post-content">
            <h4 class="related-post-title">
              <a href="{{ related_post.url }}">{{ related_post.title }}</a>
            </h4>
            <time class="related-post-date">
              {{ related_post.published_at | time_ago_in_japanese }}
            </time>
          </div>
        </article>
      {% endfor %}
    </div>
  </aside>
{% endif %}
```

## パフォーマンス最適化

### 1. キャッシュ戦略

```ruby
# app/controllers/liquid_controller.rb
class LiquidController < ApplicationController
  before_action :set_cache_headers
  
  def render_template
    cache_key = generate_cache_key
    
    @rendered_content = Rails.cache.fetch(cache_key, expires_in: 1.hour) do
      LiquidTemplateService.render_safely(
        template_content,
        template_data,
        registers: liquid_registers
      )
    end
    
    respond_to do |format|
      format.html
      format.json { render json: { content: @rendered_content } }
    end
  end
  
  private
  
  def generate_cache_key
    [
      'liquid_template',
      params[:template_id],
      current_user&.cache_key_with_version,
      template_data.hash
    ].compact.join('/')
  end
  
  def set_cache_headers
    expires_in 1.hour, public: current_user.nil?
  end
  
  def liquid_registers
    {
      controller: self,
      request: request,
      user: current_user
    }
  end
end
```

### 2. テンプレートの事前コンパイル

```ruby
# lib/tasks/liquid_precompile.rake
namespace :liquid do
  desc "Precompile liquid templates"
  task precompile: :environment do
    puts "Precompiling Liquid templates..."
    
    LiquidTemplate.find_each do |template|
      begin
        compiled = Liquid::Template.parse(template.content)
        
        # コンパイル済みテンプレートをキャッシュ
        Rails.cache.write(
          "compiled_liquid_template:#{template.id}",
          compiled,
          expires_in: 1.week
        )
        
        puts "✓ Compiled template: #{template.name}"
      rescue Liquid::Error => e
        puts "✗ Failed to compile template #{template.name}: #{e.message}"
      end
    end
    
    puts "Precompilation completed."
  end
end
```

## まとめ

Shopify LiquidをRailsアプリケーションに統合することで、セキュアで柔軟なテンプレートシステムを構築できます。特にユーザー生成コンテンツや動的なテンプレートが必要なアプリケーションでは、その安全性と拡張性が大きな価値を提供します。

**主要な利点:**
- セキュアなテンプレート実行環境
- カスタムフィルターとタグによる拡張性
- ユーザーフレンドリーな構文
- 高いパフォーマンス
- 豊富なエコシステム

適切な実装とセキュリティ対策を行うことで、Liquidは強力なテンプレートソリューションとして機能します。