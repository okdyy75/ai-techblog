# Turbo Streamsでリアルタイム更新を実現する高度なテクニック

## はじめに

Turbo Streamsは、Hotwireの一部として、ページ全体を再読み込みすることなく、特定のDOM要素を動的に更新する強力な機能です。基本的な使い方を超えて、複雑なリアルタイム機能やユーザーエクスペリエンスの向上に活用できる高度なテクニックを解説します。

### Turbo Streamsの基本復習

```ruby
# app/controllers/posts_controller.rb
class PostsController < ApplicationController
  def create
    @post = Post.new(post_params)
    
    respond_to do |format|
      if @post.save
        format.turbo_stream
        format.html { redirect_to @post }
      else
        format.turbo_stream { render turbo_stream: turbo_stream.replace("post_form", partial: "form", locals: { post: @post }) }
        format.html { render :new }
      end
    end
  end
end
```

```erb
<!-- app/views/posts/create.turbo_stream.erb -->
<%= turbo_stream.prepend "posts" do %>
  <%= render @post %>
<% end %>

<%= turbo_stream.replace "post_form" do %>
  <%= render "form", post: Post.new %>
<% end %>
```

## 高度なTurbo Streamsパターン

### 1. 複数のストリーム操作を組み合わせる

```ruby
# app/controllers/comments_controller.rb
class CommentsController < ApplicationController
  def create
    @comment = @post.comments.build(comment_params)
    @comment.user = current_user
    
    if @comment.save
      respond_to do |format|
        format.turbo_stream do
          render turbo_stream: [
            # 新しいコメントを追加
            turbo_stream.append("comments", partial: "comments/comment", locals: { comment: @comment }),
            # コメント数を更新
            turbo_stream.replace("comment_count", content: "#{@post.comments.count} Comments"),
            # フォームをリセット
            turbo_stream.replace("comment_form", partial: "comments/form", locals: { comment: @post.comments.build }),
            # 成功メッセージを表示
            turbo_stream.prepend("flash_messages", partial: "shared/flash", locals: { message: "Comment added successfully!", type: "success" }),
            # 5秒後にフラッシュメッセージを削除
            turbo_stream.replace("flash_messages", content: "", delay: 5000)
          ]
        end
      end
    end
  end
end
```

### 2. カスタムアクションの作成

```javascript
// app/assets/javascripts/turbo_stream_actions.js
Turbo.StreamActions.highlight = function() {
  const target = this.getAttribute("target");
  const element = document.getElementById(target);
  
  if (element) {
    element.classList.add("highlight");
    setTimeout(() => {
      element.classList.remove("highlight");
    }, 2000);
  }
};

Turbo.StreamActions.scroll_to = function() {
  const target = this.getAttribute("target");
  const element = document.getElementById(target);
  
  if (element) {
    element.scrollIntoView({ 
      behavior: "smooth", 
      block: "center" 
    });
  }
};

Turbo.StreamActions.modal_close = function() {
  const modal = document.querySelector(".modal.show");
  if (modal) {
    modal.classList.remove("show");
    document.body.classList.remove("modal-open");
  }
};
```

```erb
<!-- カスタムアクションの使用 -->
<%= turbo_stream.action("highlight", "post_#{@post.id}") %>
<%= turbo_stream.action("scroll_to", "comment_#{@comment.id}") %>
<%= turbo_stream.action("modal_close") %>
```

### 3. 条件付きストリーム更新

```ruby
# app/controllers/likes_controller.rb
class LikesController < ApplicationController
  def create
    @like = current_user.likes.build(likeable: @post)
    
    if @like.save
      broadcast_like_update
      respond_to do |format|
        format.turbo_stream do
          render turbo_stream: conditional_updates
        end
      end
    end
  end
  
  private
  
  def conditional_updates
    streams = []
    
    # いいねボタンの更新
    streams << turbo_stream.replace("like_button_#{@post.id}", partial: "likes/unlike_button", locals: { post: @post })
    
    # いいね数の更新
    streams << turbo_stream.replace("like_count_#{@post.id}", content: @post.likes.count)
    
    # 特定の条件下でのみ追加の更新
    if @post.likes.count == 10
      streams << turbo_stream.append("achievements", partial: "achievements/popular_post", locals: { post: @post })
    end
    
    # 作者への通知（作者が現在のユーザーでない場合）
    if @post.user != current_user
      streams << turbo_stream.prepend("notifications", partial: "notifications/like", locals: { like: @like })
    end
    
    streams
  end
end
```

## リアルタイム通信との統合

### 1. Action Cableとの連携

```ruby
# app/channels/post_channel.rb
class PostChannel < ApplicationCable::Channel
  def subscribed
    stream_from "post_#{params[:post_id]}"
  end
  
  def unsubscribed
    # cleanup
  end
end

# app/models/comment.rb
class Comment < ApplicationRecord
  belongs_to :post
  belongs_to :user
  
  after_create_commit :broadcast_comment
  after_update_commit :broadcast_comment_update
  after_destroy_commit :broadcast_comment_removal
  
  private
  
  def broadcast_comment
    ActionCable.server.broadcast(
      "post_#{post.id}",
      {
        type: "comment_added",
        html: ApplicationController.render(
          partial: "comments/comment",
          locals: { comment: self }
        ),
        comment_id: id,
        user_avatar: user.avatar.url
      }
    )
  end
  
  def broadcast_comment_update
    ActionCable.server.broadcast(
      "post_#{post.id}",
      {
        type: "comment_updated",
        html: ApplicationController.render(
          partial: "comments/comment",
          locals: { comment: self }
        ),
        comment_id: id
      }
    )
  end
  
  def broadcast_comment_removal
    ActionCable.server.broadcast(
      "post_#{post.id}",
      {
        type: "comment_removed",
        comment_id: id
      }
    )
  end
end
```

```javascript
// app/assets/javascripts/channels/post_channel.js
import consumer from "./consumer"

document.addEventListener("DOMContentLoaded", function() {
  const postElement = document.querySelector("[data-post-id]");
  if (!postElement) return;
  
  const postId = postElement.dataset.postId;
  
  consumer.subscriptions.create(
    { channel: "PostChannel", post_id: postId },
    {
      connected() {
        console.log("Connected to post channel");
      },

      disconnected() {
        console.log("Disconnected from post channel");
      },

      received(data) {
        switch(data.type) {
          case "comment_added":
            this.handleCommentAdded(data);
            break;
          case "comment_updated":
            this.handleCommentUpdated(data);
            break;
          case "comment_removed":
            this.handleCommentRemoved(data);
            break;
        }
      },
      
      handleCommentAdded(data) {
        const commentsContainer = document.getElementById("comments");
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = data.html;
        const newComment = tempDiv.firstElementChild;
        
        // アニメーション付きで追加
        newComment.style.opacity = "0";
        newComment.style.transform = "translateY(20px)";
        commentsContainer.appendChild(newComment);
        
        // フェードインアニメーション
        requestAnimationFrame(() => {
          newComment.style.transition = "all 0.3s ease";
          newComment.style.opacity = "1";
          newComment.style.transform = "translateY(0)";
        });
        
        // 通知表示
        this.showNotification(`New comment from ${data.user_avatar ? 'another user' : 'someone'}`);
      },
      
      handleCommentUpdated(data) {
        const comment = document.getElementById(`comment_${data.comment_id}`);
        if (comment) {
          comment.outerHTML = data.html;
        }
      },
      
      handleCommentRemoved(data) {
        const comment = document.getElementById(`comment_${data.comment_id}`);
        if (comment) {
          comment.style.transition = "all 0.3s ease";
          comment.style.opacity = "0";
          comment.style.transform = "translateX(-100%)";
          
          setTimeout(() => {
            comment.remove();
          }, 300);
        }
      },
      
      showNotification(message) {
        // カスタム通知システム
        const notification = document.createElement("div");
        notification.className = "live-notification";
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.classList.add("show");
        }, 100);
        
        setTimeout(() => {
          notification.classList.remove("show");
          setTimeout(() => notification.remove(), 300);
        }, 3000);
      }
    }
  );
});
```

### 2. サーバー送信イベント（SSE）との統合

```ruby
# app/controllers/events_controller.rb
class EventsController < ApplicationController
  def stream
    response.headers['Content-Type'] = 'text/event-stream'
    response.headers['Cache-Control'] = 'no-cache'
    
    begin
      loop do
        # リアルタイムデータの取得
        data = gather_real_time_data
        
        # Turbo Streamフォーマットで送信
        turbo_stream_data = build_turbo_stream(data)
        
        sse = "data: #{turbo_stream_data}\n\n"
        response.stream.write(sse)
        
        sleep 2  # 2秒間隔で更新
      end
    rescue IOError
      # クライアント接続切断時の処理
    ensure
      response.stream.close
    end
  end
  
  private
  
  def gather_real_time_data
    {
      online_users: User.online.count,
      recent_posts: Post.recent.limit(5),
      system_status: SystemStatus.current
    }
  end
  
  def build_turbo_stream(data)
    streams = []
    
    streams << turbo_stream.replace("online_count", content: data[:online_users])
    streams << turbo_stream.replace("recent_posts", partial: "posts/recent_list", locals: { posts: data[:recent_posts] })
    streams << turbo_stream.replace("system_status", partial: "shared/system_status", locals: { status: data[:system_status] })
    
    streams.join
  end
end
```

### 3. プログレスバーとリアルタイム進捗

```ruby
# app/jobs/data_processing_job.rb
class DataProcessingJob < ApplicationJob
  def perform(batch_id)
    batch = ProcessingBatch.find(batch_id)
    total_items = batch.items.count
    
    batch.items.find_each.with_index do |item, index|
      # アイテムを処理
      process_item(item)
      
      # 進捗をブロードキャスト
      progress_percentage = ((index + 1).to_f / total_items * 100).round
      
      ActionCable.server.broadcast(
        "processing_#{batch_id}",
        {
          type: "progress_update",
          percentage: progress_percentage,
          current_item: index + 1,
          total_items: total_items,
          item_name: item.name
        }
      )
      
      # 完了時の特別な処理
      if index + 1 == total_items
        ActionCable.server.broadcast(
          "processing_#{batch_id}",
          {
            type: "processing_complete",
            download_url: batch.result_file.url
          }
        )
      end
    end
  end
end
```

```javascript
// プログレスバーの更新
consumer.subscriptions.create(
  { channel: "ProcessingChannel", batch_id: batchId },
  {
    received(data) {
      switch(data.type) {
        case "progress_update":
          this.updateProgress(data);
          break;
        case "processing_complete":
          this.showCompletion(data);
          break;
      }
    },
    
    updateProgress(data) {
      const progressBar = document.querySelector(".progress-bar");
      const progressText = document.querySelector(".progress-text");
      const currentItem = document.querySelector(".current-item");
      
      if (progressBar) {
        progressBar.style.width = `${data.percentage}%`;
        progressBar.setAttribute("aria-valuenow", data.percentage);
      }
      
      if (progressText) {
        progressText.textContent = `${data.percentage}% Complete`;
      }
      
      if (currentItem) {
        currentItem.textContent = `Processing: ${data.item_name} (${data.current_item}/${data.total_items})`;
      }
    },
    
    showCompletion(data) {
      const container = document.querySelector(".processing-container");
      container.innerHTML = `
        <div class="completion-message">
          <h3>Processing Complete!</h3>
          <a href="${data.download_url}" class="btn btn-primary">Download Results</a>
        </div>
      `;
    }
  }
);
```

## パフォーマンス最適化

### 1. バッチ更新とスロットリング

```ruby
# app/services/turbo_stream_batcher.rb
class TurboStreamBatcher
  def initialize(target_id, max_batch_size: 10, delay: 100.milliseconds)
    @target_id = target_id
    @max_batch_size = max_batch_size
    @delay = delay
    @pending_updates = []
    @timer = nil
  end
  
  def add_update(stream)
    @pending_updates << stream
    
    if @pending_updates.size >= @max_batch_size
      flush_updates
    else
      schedule_flush
    end
  end
  
  private
  
  def schedule_flush
    return if @timer
    
    @timer = Timer.new(@delay) do
      flush_updates
    end
  end
  
  def flush_updates
    return if @pending_updates.empty?
    
    ActionCable.server.broadcast(
      @target_id,
      {
        type: "batch_update",
        streams: @pending_updates
      }
    )
    
    @pending_updates.clear
    @timer = nil
  end
end
```

### 2. メモリ効率的な更新

```ruby
# 大量のデータを扱う場合のメモリ最適化
class OptimizedStreamController < ApplicationController
  def update_large_dataset
    # ページネーションを使用してメモリ使用量を制御
    items = LargeDataset.page(params[:page]).per(50)
    
    respond_to do |format|
      format.turbo_stream do
        render turbo_stream: [
          turbo_stream.replace("dataset_container", 
            partial: "datasets/items", 
            locals: { items: items }),
          turbo_stream.replace("pagination", 
            partial: "shared/pagination", 
            locals: { items: items })
        ]
      end
    end
  end
end
```

## エラーハンドリングとフォールバック

### 1. 接続エラーの処理

```javascript
// 接続状態の監視とフォールバック
class TurboStreamConnectionManager {
  constructor() {
    this.isConnected = true;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    
    this.setupConnectionMonitoring();
  }
  
  setupConnectionMonitoring() {
    document.addEventListener("turbo:before-stream-render", (event) => {
      if (!this.isConnected) {
        // オフライン時はローカルストレージに保存
        this.queueOfflineUpdate(event.detail.newStream);
        event.preventDefault();
      }
    });
    
    window.addEventListener("online", () => {
      this.handleReconnection();
    });
    
    window.addEventListener("offline", () => {
      this.handleDisconnection();
    });
  }
  
  handleDisconnection() {
    this.isConnected = false;
    this.showOfflineNotification();
  }
  
  handleReconnection() {
    this.isConnected = true;
    this.hideOfflineNotification();
    this.processOfflineQueue();
    this.retryCount = 0;
  }
  
  queueOfflineUpdate(stream) {
    const offlineQueue = JSON.parse(localStorage.getItem("offline_updates") || "[]");
    offlineQueue.push({
      timestamp: Date.now(),
      stream: stream
    });
    localStorage.setItem("offline_updates", JSON.stringify(offlineQueue));
  }
  
  processOfflineQueue() {
    const offlineQueue = JSON.parse(localStorage.getItem("offline_updates") || "[]");
    
    offlineQueue.forEach(update => {
      // オフライン中の更新を再適用
      // ここで競合解決ロジックを実装
      this.applyQueuedUpdate(update);
    });
    
    localStorage.removeItem("offline_updates");
  }
  
  showOfflineNotification() {
    const notification = document.createElement("div");
    notification.id = "offline-notification";
    notification.className = "offline-notification";
    notification.innerHTML = `
      <div class="offline-message">
        <span>You're currently offline. Changes will be synced when connection is restored.</span>
      </div>
    `;
    document.body.appendChild(notification);
  }
  
  hideOfflineNotification() {
    const notification = document.getElementById("offline-notification");
    if (notification) {
      notification.remove();
    }
  }
}

new TurboStreamConnectionManager();
```

## まとめ

Turbo Streamsの高度なテクニックを活用することで、リッチでインタラクティブなリアルタイムWebアプリケーションを構築できます。重要なのは、適切なパフォーマンス最適化とエラーハンドリングを実装し、ユーザーエクスペリエンスを最優先に考えることです。

**主要なポイント:**
- 複数のストリーム操作の効果的な組み合わせ
- Action Cableとの連携によるリアルタイム通信
- カスタムアクションによる柔軟な操作
- パフォーマンス最適化とメモリ管理
- オフライン対応とエラーハンドリング

これらのテクニックを適切に活用して、ユーザーにとって快適で応答性の高いWebアプリケーションを開発しましょう。