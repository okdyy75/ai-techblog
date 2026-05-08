---
order: 25
---

# ウィンドウ関数を使いこなす

## はじめに

PostgreSQLのウィンドウ関数（Window Functions）は、行と行の関係を計算する強力な機能です。従来の集計関数（SUM、AVG、COUNTなど）が行をグループ化して1行に集約するのに対し、ウィンドウ関数は行を集約せずに、各行に対して計算結果を返します。

これにより、「同じテーブル内での順位付け」「前後の行との比較」「累計や移動平均の計算」など、複雑な分析クエリをシンプルに記述できるようになります。

本記事では、ウィンドウ関数の基本概念から実践的な使い方までを解説します。

## ウィンドウ関数の基本

ウィンドウ関数の基本構文は以下の通りです：

```sql
関数名() OVER (
  [PARTITION BY 列名]
  [ORDER BY 列名]
  [ROWS/RANGE フレーム指定]
)
```

### 主要なウィンドウ関数

#### ROW_NUMBER()
各行に一意の連番を割り当てます。

```sql
SELECT 
  employee_name,
  department,
  salary,
  ROW_NUMBER() OVER (ORDER BY salary DESC) as rank
FROM employees;
```

#### RANK() と DENSE_RANK()
順位を付けます。RANK()は同順位が存在する場合に次の順位を飛ばしますが、DENSE_RANK()は飛ばしません。

```sql
SELECT 
  employee_name,
  salary,
  RANK() OVER (ORDER BY salary DESC) as rank,
  DENSE_RANK() OVER (ORDER BY salary DESC) as dense_rank
FROM employees;
```

| salary | rank | dense_rank |
|--------|------|------------|
| 100000 | 1    | 1          |
| 100000 | 1    | 1          |
| 90000  | 3    | 2          |
| 80000  | 4    | 3          |

#### LAG() と LEAD()
前後の行の値を取得します。時系列データの比較に便利です。

```sql
SELECT 
  date,
  sales_amount,
  LAG(sales_amount, 1) OVER (ORDER BY date) as prev_sales,
  LEAD(sales_amount, 1) OVER (ORDER BY date) as next_sales,
  sales_amount - LAG(sales_amount, 1) OVER (ORDER BY date) as diff
FROM daily_sales;
```

## PARTITION BY句の活用

PARTITION BY句を使用すると、データをグループに分割して個別に計算できます。

```sql
SELECT 
  employee_name,
  department,
  salary,
  ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) as dept_rank,
  AVG(salary) OVER (PARTITION BY department) as dept_avg
FROM employees;
```

この例では、部門ごとに順位付けと平均給与を計算しています。

## ORDER BY句との組み合わせ

ウィンドウ関数内のORDER BY句は、ウィンドウ内での行の順序を決定します。

```sql
-- 給与の高い順に累計を計算
SELECT 
  employee_name,
  salary,
  SUM(salary) OVER (ORDER BY salary DESC) as cumulative_salary
FROM employees;
```

## フレーム指定（ROWS/RANGE）

フレーム指定を使うと、ウィンドウ内でどの行を対象に計算するかを細かく制御できます。

### ROWS句
行数でフレームを指定します。

```sql
-- 現在の行から前2行までの移動平均
SELECT 
  date,
  sales_amount,
  AVG(sales_amount) OVER (
    ORDER BY date 
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  ) as moving_avg
FROM daily_sales;
```

### RANGE句
値の範囲でフレームを指定します。

```sql
-- 同じ日付のデータを含めた集計
SELECT 
  date,
  sales_amount,
  SUM(sales_amount) OVER (
    ORDER BY date 
    RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) as cumulative
FROM daily_sales;
```

## 実践的なユースケース

### 1. トップNの抽出
各部門で給与トップ3の従業員を取得：

```sql
WITH ranked_employees AS (
  SELECT 
    employee_name,
    department,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) as rank
  FROM employees
)
SELECT * FROM ranked_employees WHERE rank <= 3;
```

### 2. 前月比の計算

```sql
SELECT 
  date,
  sales_amount,
  LAG(sales_amount) OVER (ORDER BY date) as prev_month_sales,
  ROUND(
    (sales_amount - LAG(sales_amount) OVER (ORDER BY date)) * 100.0 
    / LAG(sales_amount) OVER (ORDER BY date), 2
  ) as growth_rate
FROM monthly_sales;
```

### 3. 累計売上の計算

```sql
SELECT 
  date,
  sales_amount,
  SUM(sales_amount) OVER (ORDER BY date) as cumulative_sales,
  SUM(sales_amount) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) as cumulative_alt
FROM daily_sales;
```

### 4. パーセンタイルランクの計算

```sql
SELECT 
  employee_name,
  salary,
  PERCENT_RANK() OVER (ORDER BY salary) as percentile
FROM employees;
```

### 5. 最初と最後の値の取得

```sql
SELECT 
  employee_name,
  department,
  salary,
  FIRST_VALUE(salary) OVER (PARTITION BY department ORDER BY salary) as lowest_in_dept,
  LAST_VALUE(salary) OVER (
    PARTITION BY department 
    ORDER BY salary 
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) as highest_in_dept
FROM employees;
```

## パフォーマンスの考慮事項

### インデックスの活用

ウィンドウ関数のパフォーマンスを向上させるには、PARTITION BYとORDER BYで使用する列にインデックスを作成すると効果的です。

```sql
CREATE INDEX idx_employees_dept_salary ON employees(department, salary);
```

### ウィンドウ関数の制約

- ウィンドウ関数はWHERE句で直接使用できません（サブクエリやCTEが必要）
- DISTINCTと併用する場合は注意が必要です
- 大量データでの使用時は、適切なフレーム指定で計算範囲を制限しましょう

### 実行計画の確認

EXPLAIN ANALYZEを使用して、ウィンドウ関数の実行コストを確認してください。

```sql
EXPLAIN ANALYZE
SELECT 
  department,
  AVG(salary) OVER (PARTITION BY department)
FROM employees;
```

## まとめ

PostgreSQLのウィンドウ関数は、複雑なデータ分析をシンプルかつ効率的に実現する強力なツールです。

**主なポイント：**
- 行を集約せずに計算結果を返す
- PARTITION BYでグループ化、ORDER BYで順序を制御
- ROWS/RANGEで計算対象の範囲を指定
- LAG/LEADで前後の行を参照
- インデックスでパフォーマンスを最適化

ウィンドウ関数をマスターすることで、自己結合を使った複雑なクエリを簡潔に書き直せるようになり、SQLの可能性が大きく広がります。
