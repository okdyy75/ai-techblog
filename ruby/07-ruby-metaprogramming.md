# Rubyのメタプログラミング

## メソッドの動的定義

```ruby
class MyClass
  define_method :my_method do
    puts "Hello, world!"
  end
end

MyClass.new.my_method
```

## `method_missing`

```ruby
class MyClass
  def method_missing(name, *args)
    puts "Called #{name} with #{args.inspect}"
  end
end

MyClass.new.foo
MyClass.new.bar(1, 2, 3)
```
