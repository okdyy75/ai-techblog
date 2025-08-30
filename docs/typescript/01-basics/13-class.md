# クラス (Class)

TypeScriptは、ECMAScript 6で導入された`class`構文を完全にサポートし、さらに独自の機能を追加しています。クラスは、オブジェクト指向プログラミングの基本的な構成要素であり、オブジェクトを作成するためのテンプレートです。

## 基本的なクラス

クラスは、プロパティ（フィールド）とメソッドを持つことができます。

```typescript
class Greeter {
  greeting: string;

  constructor(message: string) {
    this.greeting = message;
  }

  greet() {
    return "Hello, " + this.greeting;
  }
}

let greeter = new Greeter("world");
console.log(greeter.greet()); // "Hello, world"
```

- **`greeting`**: フィールド（プロパティ）。クラスのインスタンスが持つデータを定義します。
- **`constructor`**: クラスのインスタンスが作成されるときに呼び出される特殊なメソッドです。
- **`greet`**: メソッド。クラスのインスタンスが実行できるアクションを定義します。

## 継承 (Inheritance)

クラスは、他のクラスからプロパティやメソッドを継承することができます。`extends`キーワードを使用します。

```typescript
class Animal {
  name: string;
  constructor(theName: string) {
    this.name = theName;
  }
  move(distanceInMeters: number = 0) {
    console.log(`${this.name} moved ${distanceInMeters}m.`);
  }
}

class Snake extends Animal {
  constructor(name: string) {
    super(name); // 親クラスのコンストラクタを呼び出す
  }
  move(distanceInMeters = 5) {
    console.log("Slithering...");
    super.move(distanceInMeters);
  }
}

let sam = new Snake("Sammy the Python");
sam.move(); // "Slithering..." "Sammy the Python moved 5m."
```

- **`extends`**: `Animal`クラスを継承して`Snake`クラスを定義します。
- **`super()`**: 派生クラスのコンストラクタ内では、`super()`を呼び出して基本クラスのコンストラクタを実行する必要があります。

## アクセス修飾子 (Access Modifiers)

TypeScriptでは、クラスのメンバーへのアクセスを制御するための修飾子があります。

- **`public`** (デフォルト): どこからでもアクセスできます。
- **`private`**: そのクラスの内部からのみアクセスできます。
- **`protected`**: そのクラスと、そのサブクラスの内部からのみアクセスできます。

```typescript
class Person {
  public name: string;
  private age: number;
  protected gender: string;

  constructor(name: string, age: number, gender: string) {
    this.name = name;
    this.age = age;
    this.gender = gender;
  }

  public getAge() {
    return this.age; // クラス内部からはprivateメンバーにアクセス可能
  }
}

class Employee extends Person {
  constructor(name: string, age: number, gender: string) {
    super(name, age, gender);
  }

  public getGender() {
    return this.gender; // サブクラスからはprotectedメンバーにアクセス可能
  }
}

const person = new Person("Alice", 30, "female");
console.log(person.name); // OK
// console.log(person.age); // Error: 'age' is private.
// console.log(person.gender); // Error: 'gender' is protected.

const emp = new Employee("Bob", 40, "male");
console.log(emp.getGender()); // OK
```

また、コンストラクタの引数にアクセス修飾子を付けることで、プロパティの宣言と初期化を同時に行うことができます。

```typescript
class Person {
  constructor(public name: string, private age: number) {}
}

const p = new Person("Chris", 25);
console.log(p.name); // Chris
```
