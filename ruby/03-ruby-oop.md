# Rubyにおけるオブジェクト指向プログラミング

## クラスの定義

```ruby
class User
  def initialize(name)
    @name = name
  end

  def say_hello
    puts "Hello, my name is #{@name}"
  end
end

user = User.new("okubo")
user.say_hello
```

## 継承

```ruby
class AdminUser < User
  def say_hello
    puts "Hello, my name is #{@name} and I am an admin."
  end
end

admin = AdminUser.new("okubo")
admin.say_hello
```
