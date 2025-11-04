---
title: SQLの基礎：SELECT, INSERT, UPDATE, DELETE
---

# SQLの基礎：SELECT, INSERT, UPDATE, DELETE

SQL (Structured Query Language) は、リレーショナルデータベースを操作するための標準言語です。その中でも、データの操作を行うDML (Data Manipulation Language) の中心となるのが、`SELECT`, `INSERT`, `UPDATE`, `DELETE` の4つのコマンドです。これらは頭文字をとって **CRUD** (Create, Read, Update, Delete) とも呼ばれ、あらゆるアプリケーションの基本となります。

このガイドでは、これらの基本的なコマンドの使い方を、具体的な例と共に解説します。

## 準備：サンプルテーブル

以降の例では、`employees`という名前の従業員情報を格納するテーブルを使用します。

```sql
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(50),
    salary INTEGER
);

-- サンプルデータの挿入
INSERT INTO employees (name, department, salary) VALUES
('Alice', 'Sales', 50000),
('Bob', 'Engineering', 60000),
('Charlie', 'Sales', 55000),
('David', 'Engineering', 70000);
```

## 1. `SELECT`：データの読み取り (Read)

`SELECT`文は、テーブルからデータを取得するために使用します。最も頻繁に使われるSQLコマンドです。

### 1.1. 基本的な構文

```sql
SELECT <列名1>, <列名2>, ... FROM <テーブル名>;
```

### 1.2. 使用例

**すべての列を取得する (`*`)**
アスタリスク(`*`)は「すべての列」を意味するワイルドカードです。
```sql
SELECT * FROM employees;
```
**結果:**
```
 id |  name   | department  | salary
----+---------+-------------+--------
  1 | Alice   | Sales       |  50000
  2 | Bob     | Engineering |  60000
  3 | Charlie | Sales       |  55000
  4 | David   | Engineering |  70000
```

**特定の列だけを取得する**
```sql
SELECT name, salary FROM employees;
```
**結果:**
```
  name   | salary
---------+--------
 Alice   |  50000
 Bob     |  60000
 Charlie |  55000
 David   |  70000
```

**`WHERE`句で条件を指定する**
`WHERE`句を使うことで、特定の条件に一致する行だけを絞り込むことができます。
```sql
-- 'Engineering'部門の従業員を取得
SELECT * FROM employees WHERE department = 'Engineering';
```
**結果:**
```
 id | name  | department  | salary
----+-------+-------------+--------
  2 | Bob   | Engineering |  60000
  4 | David | Engineering |  70000
```

## 2. `INSERT`：データの作成 (Create)

`INSERT`文は、テーブルに新しい行（レコード）を追加するために使用します。

### 2.1. 基本的な構文

```sql
INSERT INTO <テーブル名> (<列名1>, <列名2>, ...) VALUES (<値1>, <値2>, ...);
```

### 2.2. 使用例

**新しい従業員を追加する**
```sql
INSERT INTO employees (name, department, salary) VALUES ('Eve', 'Marketing', 48000);
```
このコマンドを実行した後、`SELECT * FROM employees;` を実行すると、新しい行が追加されていることが確認できます。

**複数の行を一度に追加する**
```sql
INSERT INTO employees (name, department, salary) VALUES
('Frank', 'Marketing', 52000),
('Grace', 'HR', 45000);
```

## 3. `UPDATE`：データの更新 (Update)

`UPDATE`文は、テーブル内の既存の行のデータを変更するために使用します。

### 3.1. 基本的な構文

```sql
UPDATE <テーブル名> SET <列名1> = <新しい値1>, <列名2> = <新しい値2>, ... WHERE <条件>;
```

**`WHERE`句の重要性**:
`UPDATE`文で`WHERE`句を省略すると、**テーブル内のすべての行が更新されてしまいます**。特定の行だけを更新する場合は、`WHERE`句で対象を正確に指定することが非常に重要です。

### 3.2. 使用例

**特定の従業員の給与を更新する**
IDが`2`のBobの給与を`65000`に更新します。
```sql
UPDATE employees SET salary = 65000 WHERE id = 2;
```

**複数の列を同時に更新する**
IDが`1`のAliceを'Engineering'部門に移動させ、給与を`62000`に更新します。
```sql
UPDATE employees SET department = 'Engineering', salary = 62000 WHERE name = 'Alice';
```

**条件に一致するすべての行を更新する**
'Sales'部門の全従業員の給与を5%昇給させます。
```sql
UPDATE employees SET salary = salary * 1.05 WHERE department = 'Sales';
```

## 4. `DELETE`：データの削除 (Delete)

`DELETE`文は、テーブルから行を削除するために使用します。

### 4.1. 基本的な構文

```sql
DELETE FROM <テーブル名> WHERE <条件>;
```

**`WHERE`句の重要性**:
`UPDATE`と同様に、`DELETE`文で`WHERE`句を省略すると、**テーブル内のすべての行が削除されてしまいます**。操作は慎重に行ってください。

### 4.2. 使用例

**特定の従業員を削除する**
IDが`3`のCharlieを削除します。
```sql
DELETE FROM employees WHERE id = 3;
```

**条件に一致するすべての行を削除する**
'Marketing'部門の従業員をすべて削除します。
```sql
DELETE FROM employees WHERE department = 'Marketing';
```

これらのCRUD操作は、データベースを扱う上での基本中の基本です。それぞれのコマンドの構文と、特に`UPDATE`と`DELETE`における`WHERE`句の重要性をしっかりと理解することが、安全で効果的なデータベース操作の鍵となります。
