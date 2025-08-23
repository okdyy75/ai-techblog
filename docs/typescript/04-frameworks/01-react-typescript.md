# React + TypeScript

ReactでTypeScriptを使用する際のベストプラクティスと実装方法を解説します。

## プロジェクトのセットアップ

### Create React App with TypeScript

```bash
# 新規プロジェクト作成
npx create-react-app my-app --template typescript

# 既存プロジェクトにTypeScriptを追加
npm install --save typescript @types/node @types/react @types/react-dom @types/jest
```

### Vite with React TypeScript

```bash
# Viteを使用した高速な開発環境
npm create vite@latest my-react-app -- --template react-ts
cd my-react-app
npm install
npm run dev
```

## 基本的なコンポーネントの型定義

### 関数コンポーネント

```typescript
import React from 'react';

// Props型の定義
interface UserProps {
  id: number;
  name: string;
  email: string;
  isActive?: boolean; // オプショナル
  onEdit: (id: number) => void; // 関数型
}

// 関数コンポーネント
const User: React.FC<UserProps> = ({ 
  id, 
  name, 
  email, 
  isActive = true, 
  onEdit 
}) => {
  const handleEdit = () => {
    onEdit(id);
  };

  return (
    <div className={`user ${isActive ? 'active' : 'inactive'}`}>
      <h3>{name}</h3>
      <p>{email}</p>
      <button onClick={handleEdit}>Edit</button>
    </div>
  );
};

export default User;
```

### ジェネリクスを使ったコンポーネント

```typescript
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
}

// 使用例
interface Product {
  id: number;
  name: string;
  price: number;
}

const ProductList: React.FC = () => {
  const products: Product[] = [
    { id: 1, name: "Laptop", price: 999 },
    { id: 2, name: "Phone", price: 599 }
  ];

  return (
    <List
      items={products}
      keyExtractor={(product) => product.id}
      renderItem={(product) => (
        <div>
          <span>{product.name}</span> - ${product.price}
        </div>
      )}
    />
  );
};
```

## Hooksの型安全な使用

### useState

```typescript
import { useState } from 'react';

// プリミティブ型
const Counter: React.FC = () => {
  const [count, setCount] = useState<number>(0); // 明示的な型指定
  const [isLoading, setIsLoading] = useState(false); // 型推論

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      {isLoading && <p>Loading...</p>}
    </div>
  );
};

// 複雑な型
interface User {
  id: number;
  name: string;
  email: string;
}

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const addUser = (newUser: User) => {
    setUsers(prevUsers => [...prevUsers, newUser]);
  };

  // 例: 新しいユーザーを追加する場合
  // addUser({ id: 1, name: "Alice" });

  return (
    <div>
      {user ? (
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
        </div>
      ) : (
        <p>No user selected</p>
      )}
    </div>
  );
};
```

### useEffect

```typescript
import { useEffect, useState } from 'react';

interface ApiUser {
  id: number;
  name: string;
  email: string;
}

const UserFetcher: React.FC<{ userId: number }> = ({ userId }) => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const userData: ApiUser = await response.json();
        setUser(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>No user found</div>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
};
```

### useRef

```typescript
import { useRef, useEffect } from 'react';

const FocusableInput: React.FC = () => {
  // HTMLElementの型を指定
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // null チェックが必要
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        placeholder="Type something..."
      />
      <button onClick={handleClear}>Clear</button>
    </div>
  );
};
```

### カスタムHook

```typescript
import { useState, useEffect } from 'react';

// カスタムHookの型定義
interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function useApi<T>(url: string): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: T = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [url]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}

// 使用例
interface Post {
  id: number;
  title: string;
  body: string;
}

const PostList: React.FC = () => {
  const { data: posts, loading, error, refetch } = useApi<Post[]>('/api/posts');

  if (loading) return <div>Loading posts...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      {posts?.map(post => (
        <div key={post.id}>
          <h3>{post.title}</h3>
          <p>{post.body}</p>
        </div>
      ))}
    </div>
  );
};
```

## イベントハンドリング

```typescript
import React, { ChangeEvent, FormEvent, MouseEvent } from 'react';

interface FormData {
  name: string;
  email: string;
  age: number;
}

const UserForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    age: 0
  });

  // 入力フィールドの変更
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) || 0 : value
    }));
  };

  // フォーム送信
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Form data:', formData);
  };

  // ボタンクリック
  const handleReset = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setFormData({ name: '', email: '', age: 0 });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        placeholder="Name"
      />
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={handleInputChange}
        placeholder="Email"
      />
      <input
        type="number"
        name="age"
        value={formData.age}
        onChange={handleInputChange}
        placeholder="Age"
      />
      <button type="submit">Submit</button>
      <button type="button" onClick={handleReset}>Reset</button>
    </form>
  );
};
```

## Context APIの型安全な使用

```typescript
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// State型の定義
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

// Action型の定義
type AuthAction = 
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' };

// Context型の定義
interface AuthContextType {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

// 初期状態
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false
      };
    case 'LOGIN_FAILURE':
      return { ...state, loading: false };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false };
    default:
      return state;
  }
};

// Context作成
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider コンポーネント
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = async (credentials: LoginCredentials) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const user = await authService.login(credentials);
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      throw error;
    }
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  const value: AuthContextType = {
    state,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom Hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

## Higher-Order Components (HOC)

```typescript
import React, { ComponentType } from 'react';

// HOCの型定義
interface WithLoadingProps {
  loading: boolean;
}

function withLoading<P extends object>(
  Component: ComponentType<P>
): ComponentType<P & WithLoadingProps> {
  return (props: P & WithLoadingProps) => {
    if (props.loading) {
      return <div>Loading...</div>;
    }
    
    return <Component {...props} />;
  };
}

// 使用例
interface UserListProps {
  users: User[];
  onUserSelect: (user: User) => void;
}

const UserList: React.FC<UserListProps> = ({ users, onUserSelect }) => (
  <div>
    {users.map(user => (
      <div key={user.id} onClick={() => onUserSelect(user)}>
        {user.name}
      </div>
    ))}
  </div>
);

// HOC適用
const UserListWithLoading = withLoading(UserList);

// 使用
const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  return (
    <UserListWithLoading
      users={users}
      loading={loading}
      onUserSelect={(user) => console.log(user)}
    />
  );
};
```

## まとめ

React + TypeScript の重要なポイント：

1. **Props型定義**: インターフェースで明確な型を定義
2. **Hooks型安全性**: useState、useEffectでの適切な型指定
3. **イベントハンドリング**: React固有のイベント型を使用
4. **Context API**: 型安全なGlobal状態管理
5. **カスタムHook**: 再利用可能な型安全なロジック
6. **HOC**: 高次コンポーネントでの型保持

TypeScriptを使うことで、Reactアプリケーションの品質と開発効率が大幅に向上します。