# Rubyのテストフレームワーク（RSpec、Minitest）

## RSpec

```ruby
# spec/calculator_spec.rb
require "calculator"

describe Calculator do
  it "adds two numbers" do
    calculator = Calculator.new
    expect(calculator.add(2, 3)).to eq(5)
  end
end
```

## Minitest

```ruby
# test/calculator_test.rb
require "minitest/autorun"
require "calculator"

class CalculatorTest < Minitest::Test
  def test_adds_two_numbers
    calculator = Calculator.new
    assert_equal 5, calculator.add(2, 3)
  end
end
```
