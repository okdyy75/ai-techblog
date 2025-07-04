# Rubyのブロック、Proc、Lambda

## ブロック

```ruby
[1, 2, 3].each do |i|
  p i
end
```

## Proc

```ruby
proc = Proc.new do |i|
  p i
end

[1, 2, 3].each(&proc)
```

## Lambda

```ruby
lambda = ->(i) { p i }

[1, 2, 3].each(&lambda)
```
