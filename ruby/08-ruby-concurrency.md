# Rubyの並行処理と並列処理

## スレッド

```ruby
threads = []

threads << Thread.new do
  puts "Thread 1"
end

threads << Thread.new do
  puts "Thread 2"
end

threads.each(&:join)
```

## プロセス

```ruby
fork do
  puts "Process 1"
end

fork do
  puts "Process 2"
end

Process.waitall
```
