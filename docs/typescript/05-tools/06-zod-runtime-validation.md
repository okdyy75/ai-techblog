# Zod: ランタイム型検証

ZodはTypeScriptファーストなスキーマ検証ライブラリで、コンパイル時とランタイムの両方で型安全性を提供します。

## Zodとは

Zodは以下の特徴を持つ検証ライブラリです：

- TypeScript ファースト設計
- ゼロ依存関係
- 軽量（8kB gzipped）
- 直感的なAPI
- 型推論の自動生成

## インストール

```bash
npm install zod
# または
yarn add zod
```

## 基本的な使用方法

### プリミティブ型のスキーマ

```typescript
import { z } from 'zod';

// 基本的なスキーマ定義
const stringSchema = z.string();
const numberSchema = z.number();
const booleanSchema = z.boolean();
const dateSchema = z.date();

// 検証の実行
const result = stringSchema.parse("hello"); // "hello"
const safeResult = stringSchema.safeParse("hello"); // { success: true, data: "hello" }

// エラーハンドリング
try {
  numberSchema.parse("not a number"); // ZodError をスロー
} catch (error) {
  console.log(error.message);
}

// セーフな検証
const safeNumberResult = numberSchema.safeParse("not a number");
if (!safeNumberResult.success) {
  console.log(safeNumberResult.error.issues);
}
```

### オブジェクトスキーマ

```typescript
// ユーザースキーマの定義
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0).max(150),
  isActive: z.boolean().optional(),
  createdAt: z.date().default(() => new Date())
});

// 型の自動推論
type User = z.infer<typeof UserSchema>;
/*
type User = {
  id: number;
  name: string;
  email: string;
  age: number;
  isActive?: boolean | undefined;
  createdAt: Date;
}
*/

// 検証の実行
const userData = {
  id: 1,
  name: "John Doe",
  email: "john@example.com",
  age: 30,
  isActive: true
};

const validatedUser = UserSchema.parse(userData);
```

### 配列とタプル

```typescript
// 配列スキーマ
const stringArraySchema = z.array(z.string());
const numberArraySchema = z.number().array(); // 別の書き方

// タプルスキーマ
const coordinateSchema = z.tuple([z.number(), z.number()]);

// 使用例
const tags = stringArraySchema.parse(["tag1", "tag2", "tag3"]);
const coordinate = coordinateSchema.parse([10.5, 20.3]);

// 配列の制約
const limitedArraySchema = z.array(z.string()).min(1).max(10);
```

## 高度なバリデーション

### 文字列バリデーション

```typescript
const EmailSchema = z.string()
  .email("有効なメールアドレスを入力してください")
  .min(5, "メールアドレスは5文字以上である必要があります");

const PasswordSchema = z.string()
  .min(8, "パスワードは8文字以上である必要があります")
  .regex(/[A-Z]/, "大文字を含む必要があります")
  .regex(/[a-z]/, "小文字を含む必要があります")
  .regex(/\d/, "数字を含む必要があります");

const UrlSchema = z.string().url("有効なURLを入力してください");

// カスタムバリデーション
const UsernameSchema = z.string()
  .min(3)
  .max(20)
  .regex(/^[a-zA-Z0-9_]+$/, "ユーザー名は英数字とアンダースコアのみ使用可能です");
```

### 数値バリデーション

```typescript
const PositiveIntegerSchema = z.number()
  .int("整数である必要があります")
  .positive("正の数である必要があります");

const ScoreSchema = z.number()
  .min(0, "スコアは0以上である必要があります")
  .max(100, "スコアは100以下である必要があります");

const PriceSchema = z.number()
  .positive("価格は正の数である必要があります")
  .multipleOf(0.01, "価格は0.01の倍数である必要があります");
```

### ユニオン型とリテラル型

```typescript
// リテラル型
const StatusSchema = z.literal("pending");
const RoleSchema = z.enum(["admin", "user", "moderator"]);

// ユニオン型
const IdSchema = z.union([z.string(), z.number()]);

// ディスクリミネートユニオン
const AnimalSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("dog"),
    breed: z.string(),
    goodBoy: z.boolean()
  }),
  z.object({
    type: z.literal("cat"),
    breed: z.string(),
    livesLeft: z.number()
  })
]);

// 型推論
type Animal = z.infer<typeof AnimalSchema>;
// type Animal = { type: "dog"; breed: string; goodBoy: boolean; } | 
//                { type: "cat"; breed: string; livesLeft: number; }
```

## カスタムバリデーション

```typescript
// カスタムバリデーション関数
const PasswordConfirmationSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "パスワードが一致しません",
  path: ["confirmPassword"] // エラーメッセージを表示するフィールド
});

// 複雑なカスタムバリデーション
const UserRegistrationSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  age: z.number().min(18),
  terms: z.boolean()
}).refine((data) => data.terms === true, {
  message: "利用規約に同意する必要があります",
  path: ["terms"]
}).refine((data) => data.age >= 18, {
  message: "18歳以上である必要があります",
  path: ["age"]
});

// 非同期バリデーション
const AsyncUserSchema = z.object({
  username: z.string(),
  email: z.string().email()
}).refine(async (data) => {
  // データベースでユーザー名の重複チェック
  const exists = await checkUsernameExists(data.username);
  return !exists;
}, {
  message: "このユーザー名は既に使用されています",
  path: ["username"]
});
```

## フォームバリデーション

```typescript
import React, { useState } from 'react';
import { z } from 'zod';

// フォームスキーマの定義
const ContactFormSchema = z.object({
  name: z.string()
    .min(1, "名前は必須です")
    .max(50, "名前は50文字以内で入力してください"),
  email: z.string()
    .email("有効なメールアドレスを入力してください"),
  subject: z.string()
    .min(1, "件名は必須です")
    .max(100, "件名は100文字以内で入力してください"),
  message: z.string()
    .min(10, "メッセージは10文字以上で入力してください")
    .max(1000, "メッセージは1000文字以内で入力してください"),
  category: z.enum(["inquiry", "support", "feedback"], {
    errorMap: () => ({ message: "カテゴリを選択してください" })
  })
});

type ContactForm = z.infer<typeof ContactFormSchema>;

const ContactFormComponent: React.FC = () => {
  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'inquiry'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = ContactFormSchema.safeParse(formData);
    
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        newErrors[path] = issue.message;
      });
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    // フォーム送信処理
    console.log('Valid form data:', result.data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>名前:</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>
      
      <div>
        <label>メール:</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>
      
      {/* 他のフィールド... */}
      
      <button type="submit">送信</button>
    </form>
  );
};
```

## API レスポンスバリデーション

```typescript
// APIレスポンススキーマ
const ApiUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string().url().optional(),
  roles: z.array(z.string()),
  lastLoginAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional()
});

const ApiResponseSchema = z.object({
  data: ApiUserSchema,
  status: z.number(),
  message: z.string().optional()
});

// API呼び出しとバリデーション
async function fetchUser(id: number): Promise<z.infer<typeof ApiUserSchema>> {
  try {
    const response = await fetch(`/api/users/${id}`);
    const data = await response.json();
    
    // レスポンスをバリデーション
    const validatedResponse = ApiResponseSchema.parse(data);
    return validatedResponse.data;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('API レスポンスの形式が不正です:', error.issues);
      throw new Error('API レスポンスの形式が不正です');
    }
    throw error;
  }
}

// 配列レスポンスのバリデーション
const ApiUsersListSchema = z.object({
  data: z.array(ApiUserSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    hasNext: z.boolean()
  }),
  status: z.number()
});
```

## Zodの便利な機能

### Transform

```typescript
// データの変換
const NumberStringSchema = z.string().transform((val) => parseInt(val, 10));
const TrimmedStringSchema = z.string().transform((val) => val.trim());

// 日付文字列をDateオブジェクトに変換
const DateStringSchema = z.string().transform((val) => new Date(val));

// 複雑な変換
const UserInputSchema = z.object({
  name: z.string().transform((val) => val.trim().toLowerCase()),
  age: z.string().transform((val) => parseInt(val, 10)),
  tags: z.string().transform((val) => val.split(',').map(tag => tag.trim()))
});

const input = {
  name: "  John DOE  ",
  age: "30",
  tags: "typescript, react, node"
};

const transformed = UserInputSchema.parse(input);
// Result: { name: "john doe", age: 30, tags: ["typescript", "react", "node"] }
```

### Partial と Pick

```typescript
const FullUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  age: z.number(),
  isActive: z.boolean()
});

// 部分的なスキーマ
const PartialUserSchema = FullUserSchema.partial();
// すべてのプロパティがオプションになる

// 特定のフィールドのみ
const UserUpdateSchema = FullUserSchema.pick({
  name: true,
  email: true,
  age: true
});

// 特定のフィールドを除外
const UserWithoutIdSchema = FullUserSchema.omit({
  id: true
});
```

### Merge と Extend

```typescript
const BaseSchema = z.object({
  id: z.number(),
  createdAt: z.date()
});

const UserSchema = BaseSchema.extend({
  name: z.string(),
  email: z.string().email()
});

const AdminSchema = UserSchema.merge(z.object({
  permissions: z.array(z.string()),
  lastLoginAt: z.date().optional()
}));
```

## エラーハンドリング

```typescript
import { z } from 'zod';

// カスタムエラーメッセージ
const CustomUserSchema = z.object({
  name: z.string({
    required_error: "名前は必須です",
    invalid_type_error: "名前は文字列である必要があります"
  }),
  age: z.number({
    required_error: "年齢は必須です",
    invalid_type_error: "年齢は数値である必要があります"
  }).min(0, "年齢は0以上である必要があります")
});

// エラーハンドリング関数
function handleValidationError(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  
  error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  });
  
  return errors;
}

// 使用例
const result = CustomUserSchema.safeParse({ name: "", age: -1 });
if (!result.success) {
  const errors = handleValidationError(result.error);
  console.log(errors);
  // { name: "名前は必須です", age: "年齢は0以上である必要があります" }
}
```

## 実践的な使用例

### 環境変数の検証

```typescript
// 環境変数スキーマ
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform((val) => parseInt(val, 10)),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  API_KEY: z.string().optional()
});

// 環境変数の検証
const env = EnvSchema.parse(process.env);
export default env;
```

### ファイルアップロードの検証

```typescript
const FileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: "ファイルサイズは5MB以下である必要があります"
    })
    .refine((file) => ['image/jpeg', 'image/png', 'image/gif'].includes(file.type), {
      message: "JPEG、PNG、GIFファイルのみアップロード可能です"
    }),
  description: z.string().optional()
});
```

## まとめ

Zodの主な利点：

1. **型安全性**: TypeScriptの型とランタイム検証を統一
2. **直感的API**: シンプルで理解しやすい構文
3. **豊富な機能**: 変換、カスタムバリデーション、エラーハンドリング
4. **パフォーマンス**: 軽量で高速な検証
5. **開発体験**: 優れた型推論とエラーメッセージ

Zodを使用することで、フロントエンド・バックエンド問わず、型安全で堅牢なアプリケーションを構築できます。