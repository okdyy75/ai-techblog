# デコレータとメタデータ（Decorators and Metadata）

デコレータは、クラスやそのメンバー（メソッド、プロパティなど）を宣言的に修飾するための特別な種類の宣言です。`@expression` という構文を使用し、`expression` は修飾対象の情報を引数として受け取る関数でなければなりません。

**注意:** デコレータはTypeScriptの実験的な機能です。将来のリリースで変更される可能性があるため、プロダクション環境での使用には注意が必要です。この機能を使用するには、`tsconfig.json` で `experimentalDecorators` を `true` に設定する必要があります。

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true // メタデータ機能と併用する場合
  }
}
```

## デコレータの種類

デコレータは、修飾する対象に応じていくつかの種類があります。

### 1. クラスデコレータ

クラス宣言の直前に適用され、クラスのコンストラクタを監視、変更、または置換するために使用されます。

```typescript
function sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

@sealed
class Greeter {
  greeting: string;
  constructor(message: string) {
    this.greeting = message;
  }
  greet() {
    return "Hello, " + this.greeting;
  }
}
```

### 2. メソッドデコレータ

メソッド宣言の直前に適用されます。メソッドのプロパティディスクリプタを監視、変更、または置換するために使用できます。

```typescript
function enumerable(value: boolean) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    descriptor.enumerable = value;
  };
}

class Person {
  name: string;
  constructor(name: string) { this.name = name; }

  @enumerable(false)
  greet() {
    return "Hello, " + this.name;
  }
}
```
この例の `enumerable(false)` はデコレータファクトリです。呼び出されるとデコレータ関数を返します。

### 3. プロパティデコレータ

プロパティ宣言の直前に適用されます。

```typescript
function format(formatString: string) {
  return function (target: any, propertyKey: string) {
    // ... プロパティに関するメタデータを記録するのに使われることが多い
  }
}

class MyComponent {
  @format("YYYY-MM-DD")
  lastUpdated: Date;
}
```

他にも、アクセサデコレータやパラメータデコレータがあります。

## メタデータリフレクションAPI (`reflect-metadata`)

デコレータの真価は、メタデータを扱うときに発揮されます。`reflect-metadata` というライブラリと組み合わせることで、デコレータは型情報を設計時にクラスやプロパティに「添付」し、実行時にその情報を「読み取る」ことができます。

`emitDecoratorMetadata` コンパイラオプションを `true` にすると、TypeScriptは設計時の型情報をメタデータとして出力します。

### インストール

```bash
npm install reflect-metadata
```
そして、アプリケーションのエントリポイントで一度だけインポートします。
```typescript
import "reflect-metadata";
```

### 例：DIコンテナのための型情報

依存性注入（Dependency Injection）コンテナは、この機能の典型的なユースケースです。

```typescript
import "reflect-metadata";

function Injectable(): ClassDecorator {
  return target => {
    // クラスが注入可能であることを示すメタデータを記録
  };
}

@Injectable()
class MyService {
  constructor(private otherService: OtherService) {}
}

// 実行時にMyServiceのコンストラクタの引数の型を取得する
const paramTypes = Reflect.getMetadata("design:paramtypes", MyService);
// paramTypes は [OtherService] となる

```
`Reflect.getMetadata("design:paramtypes", MyService)` を呼び出すことで、`MyService` のコンストラクタが `OtherService` 型の引数を必要としていることを実行時に知ることができます。DIコンテナはこの情報を使って、`MyService` のインスタンスを作成する際に自動的に `OtherService` のインスタンスを注入します。

デコレータとメタデータは、NestJS（DI）、TypeORM（エンティティ定義）、class-validator（バリデーションルール）など、多くの先進的なフレームワークやライブラリの基盤技術となっています。
