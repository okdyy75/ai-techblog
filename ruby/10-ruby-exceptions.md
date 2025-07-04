# Rubyの例外処理とデバッグ手法

## 例外処理

```ruby
begin
  1 / 0
rescue ZeroDivisionError => e
  puts e.message
end
```

## デバッグ

```ruby
require "debug"

def my_method(a, b)
  binding.break
  a + b
end

my_method(1, 2)
```
