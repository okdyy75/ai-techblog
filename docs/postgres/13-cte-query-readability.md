# CTE（共通テーブル式）による複雑なクエリの可読性向上

## 1. 導入

SQLクエリが複雑になるにつれて、その可読性やメンテナンス性は低下しがちです。特に複数のJOINやネストされたサブクエリが多用される場合、クエリの意図を把握するのに時間がかかり、デバッグも困難になります。本記事では、PostgreSQLで利用できるCTE（共通テーブル式）を活用して、このような複雑なクエリを整理し、可読性を劇的に向上させる方法について解説します。

## 2. CTEとは何か（WITH句、基本構文）

CTE（Common Table Expression）は、`WITH`句を使用して一時的な名前付き結果セットを定義するSQL構文です。これらの結果セットは、単一の`SELECT`、`INSERT`、`UPDATE`、または`DELETE`ステートメント内で参照できます。CTEは、クエリの構造を階層的に整理し、複雑なロジックを小さな論理単位に分解するのに役立ちます。

基本的な構文は以下の通りです。

```sql
WITH
  cte_name_1 AS (
    -- 最初のCTEを定義するクエリ
    SELECT column_a, column_b FROM table_x WHERE condition_1
  ),
  cte_name_2 AS (
    -- 2番目のCTEを定義するクエリ。cte_name_1を参照することも可能
    SELECT column_c FROM cte_name_1 WHERE condition_2
  )
-- メインのクエリ。定義したCTEを参照する
SELECT * FROM cte_name_2 WHERE condition_3;
```

各CTEは独立したクエリとして記述され、その結果は後続のCTEや最終的なメインクエリでテーブルのように扱うことができます。

## 3. サブクエリと比較したメリット・デメリット

CTEは、ネストされたサブクエリと同じ機能を提供することが多いですが、いくつかの重要な違いがあります。

### メリット
*   **可読性の向上:** 複雑なクエリを論理的なステップに分割し、それぞれに意味のある名前を付けられるため、クエリの意図が理解しやすくなります。長いクエリ全体を一度に解読する必要がなくなります。
*   **再利用性:** 単一のクエリ内で同じ結果セットを複数回参照する必要がある場合、CTEを一度定義すれば、それを繰り返し利用できます。これにより、コードの重複を減らし、保守性を高めます。
*   **再帰クエリのサポート:** CTEは、自己参照的なデータ構造（組織階層、部品構成表など）を走査するための再帰クエリ（`WITH RECURSIVE`）をサポートします。これは通常のサブクエリでは困難です。
*   **デバッグのしやすさ:** 各CTEが独立した論理単位であるため、クエリの各部分を個別にテストし、デバッグすることができます。

### デメリット
*   **パフォーマンスへの誤解と注意:** かつてはCTEが「最適化の壁」となり、中間結果が常に実体化されるため、パフォーマンスが低下するという認識がありました。しかし、PostgreSQL 12以降、非再帰的なCTEでメインクエリから一度だけ参照されるものは、オプティマイザによってインライン化されることが多くなり、サブクエリと変わらないパフォーマンスになる場合があります。それでも、CTEが複数回参照される場合や再帰CTEの場合、あるいは明示的に`MATERIALIZED`を指定した場合は、中間結果が実体化（テンポラリテーブルが作成）されるため、そのオーバーヘッドを考慮する必要があります。
*   **シンプルクエリでの冗長性:** 非常に単純なクエリの場合、CTEを使用するとコードが不必要に長くなり、かえって可読性が損なわれることもあります。

## 4. 実践例1: 売上集計を段階的に分解する

あるECサイトの売上データを集計するシナリオを考えます。まず日ごとの売上を計算し、次にその結果を使って月ごとの総売上を算出してみましょう。

`sales` テーブルの定義:

```sql
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    sale_date DATE NOT NULL,
    region VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL
);

INSERT INTO sales (sale_date, region, amount) VALUES
('2026-01-01', 'East', 1000.00),
('2026-01-01', 'West', 1500.00),
('2026-01-02', 'East', 1200.00),
('2026-01-02', 'West', 1800.00),
('2026-02-01', 'East', 900.00),
('2026-02-01', 'West', 2000.00),
('2026-02-02', 'East', 1100.00),
('2026-02-02', 'West', 1600.00);
```

このデータをCTEで集計します。

```sql
WITH
  daily_sales AS (
    -- 日ごとの売上を計算
    SELECT
      sale_date,
      region,
      SUM(amount) AS total_daily_amount
    FROM sales
    GROUP BY sale_date, region
  ),
  monthly_region_sales AS (
    -- 月ごと・地域ごとの売上を計算
    SELECT
      TO_CHAR(sale_date, 'YYYY-MM') AS sale_month,
      region,
      SUM(total_daily_amount) AS total_monthly_region_amount
    FROM daily_sales
    GROUP BY TO_CHAR(sale_date, 'YYYY-MM'), region
  )
-- 全体での月ごとの売上を計算
SELECT
  sale_month,
  SUM(total_monthly_region_amount) AS overall_monthly_amount
FROM monthly_region_sales
GROUP BY sale_month
ORDER BY sale_month;
```

この例では、`daily_sales` CTEで日ごとの売上を計算し、その結果を`monthly_region_sales` CTEが利用して月ごとの地域別売上を計算しています。最後に、メインクエリが`monthly_region_sales`の結果を利用して、全体での月ごとの売上を算出しています。このように段階的に処理を分解することで、各ステップのロジックが明確になり、非常に読みやすいクエリになります。

また、PostgreSQL 12以降では、CTEの定義時に`MATERIALIZED`または`NOT MATERIALIZED`キーワードを使用して、オプティマイザの振る舞いを明示的に制御できます。

```sql
WITH
  daily_sales AS MATERIALIZED ( -- このCTEの結果は必ず実体化される
    SELECT
      sale_date,
      region,
      SUM(amount) AS total_daily_amount
    FROM sales
    GROUP BY sale_date, region
  ),
  monthly_region_sales AS NOT MATERIALIZED ( -- オプティマイザに実体化しないようヒントを与える
    SELECT
      TO_CHAR(sale_date, 'YYYY-MM') AS sale_month,
      region,
      SUM(total_daily_amount) AS total_monthly_region_amount
    FROM daily_sales
    GROUP BY TO_CHAR(sale_date, 'YYYY-MM'), region
  )
SELECT
  sale_month,
  SUM(total_monthly_region_amount) AS overall_monthly_amount
FROM monthly_region_sales
GROUP BY sale_month
ORDER BY sale_month;
```
`MATERIALIZED`は、CTEが複数回参照される場合や、複雑な計算が含まれていて中間結果をキャッシュすることが有効な場合に、オプティマイザに実体化を強制するのに使えます。一方、`NOT MATERIALIZED`は、オプティマイザが通常実体化すると判断するような状況でも、それを避けてインライン化を試みるようにヒントを与えるものです。適切な使用はパフォーマンスチューニングに役立ちますが、通常はオプティマイザの判断に任せるのが良いでしょう。

## 5. 実践例2: 再帰CTEで階層データを扱う

組織の従業員階層のような自己参照的なデータを扱うには、再帰CTE（`WITH RECURSIVE`）が非常に強力です。ここでは、従業員のマネージャーをたどって、特定の従業員からルート（最上位）までの全階層パスを取得する例を示します。

`employees` テーブルの定義:

```sql
CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    manager_id INTEGER REFERENCES employees(employee_id)
);

INSERT INTO employees (employee_id, name, manager_id) VALUES
(1, 'Alice', NULL), -- CEO
(2, 'Bob', 1),
(3, 'Charlie', 1),
(4, 'David', 2),
(5, 'Eve', 2),
(6, 'Frank', 3);
```

David（employee_id = 4）の全上司階層を検索します。

```sql
WITH RECURSIVE employee_hierarchy AS (
  -- アンカーメンバー: 再帰の開始点
  SELECT
    employee_id,
    name,
    manager_id,
    1 AS level,
    CAST(name AS TEXT) AS path -- 階層パスを保持
  FROM employees
  WHERE employee_id = 4 -- Davidから開始

  UNION ALL

  -- 再帰メンバー: 前のCTEの結果を使って次のレベルを探索
  SELECT
    e.employee_id,
    e.name,
    e.manager_id,
    eh.level + 1 AS level,
    eh.path || ' -> ' || e.name AS path
  FROM employees e
  JOIN employee_hierarchy eh ON e.employee_id = eh.manager_id
)
SELECT
  employee_id,
  name,
  level,
  path
FROM employee_hierarchy
ORDER BY level DESC;
```

`WITH RECURSIVE`句では、大きく分けて2つの部分があります。
1.  **アンカーメンバー:** 再帰の開始点となる非再帰クエリです。この例では、David自身の情報が最初の行として選択されます。
2.  **再帰メンバー:** アンカーメンバーまたは前の再帰メンバーの結果を参照して、次の再帰ステップを生成するクエリです。この例では、現在の階層の`manager_id`を次の`employee_id`としてJOINすることで、上司を順にたどっています。

`UNION ALL`でこれらの結果を結合し、`manager_id`がNULLになるまで再帰的に実行されます。これにより、DavidからAlice（CEO）までの全階層パスが取得されます。

## 6. パフォーマンス上の注意点

CTEのパフォーマンスについては、特にPostgreSQLのバージョンによる振る舞いの違いを理解することが重要です。

*   **PostgreSQL 11まで:** 非再帰的なCTEであっても、通常は中間結果が実体化（Materialization）されます。これは、CTEが一時テーブルのように扱われ、その結果が一度計算されてからメインクエリで使用されることを意味します。これにより、オプティマイザがメインクエリとCTEの間で条件のプッシュダウン（Predicate Pushdown）などの最適化を行うことが妨げられる場合があります。
*   **PostgreSQL 12以降:** 大きな変更があり、非再帰的なCTEがメインクエリから**一度だけ参照される場合**、オプティマイザは中間結果を実体化せず、クエリ全体をインライン化してサブクエリのように最適化できるようになりました。これにより、多くのシナリオでCTE使用によるパフォーマンスのオーバーヘッドが解消され、可読性の向上とパフォーマンスが両立しやすくなりました。
    しかし、CTEが複数回参照される場合や、`WITH RECURSIVE`を使用する再帰CTEの場合は、依然として中間結果が実体化されます。
*   **`MATERIALIZED`と`NOT MATERIALIZED`の活用:**
    *   `WITH cte_name AS MATERIALIZED (...)`: このキーワードを使用すると、PostgreSQLはCTEの結果を強制的に実体化します。CTEが複数回参照され、その計算コストが高い場合や、特定のインデックスを利用した後の結果をキャッシュしたい場合に有効です。実体化により、後続の参照ではキャッシュされた結果が利用されるため、全体のパフォーマンスが向上する可能性があります。
    *   `WITH cte_name AS NOT MATERIALIZED (...)`: このキーワードを使用すると、オプティマイザにCTEの結果を実体化しないようヒントを与えます。PostgreSQL 12以降のデフォルト動作（一度参照の場合のインライン化）をより明示的に強制したり、オプティマイザが誤って実体化すると判断したケースで、より効率的なクエリプランを試みさせたい場合に検討します。ただし、これが常にパフォーマンス向上につながるわけではないため、`EXPLAIN ANALYZE`での検証が不可欠です。

最終的には、CTEの利用がパフォーマンスに与える影響は、クエリの内容、データの特性、そしてPostgreSQLのバージョンに依存します。常に`EXPLAIN ANALYZE`を使用してクエリプランを確認し、ボトルネックを特定することが最善のアプローチです。

## 7. よくあるアンチパターン

CTEは強力ですが、不適切に使用するとクエリを読みにくくしたり、パフォーマンスを低下させたりする可能性があります。

*   **過度な利用:** 非常に単純なサブクエリや、一度しか使わない短い論理ステップに対してまでCTEを使用すると、かえってコードが冗長になり、読むのが面倒になります。シンプル・イズ・ベストの原則を忘れずに、CTEのメリットが最大限に活かせる場面で利用しましょう。
*   **パフォーマンスの考慮不足:** 特に古いPostgreSQLバージョンを使用している場合や、CTEが複数回参照される場合、`MATERIALIZED`を指定しない限り実体化が行われないと誤解している場合、予期せぬパフォーマンスボトルネックに遭遇することがあります。必ず`EXPLAIN ANALYZE`でクエリプランを確認する習慣をつけましょう。
*   **CTE名に意味がない:** `a`, `b`, `c` のような意味のないCTE名を使用すると、結局は何の処理をしているのかが分かりにくくなり、CTEの可読性向上という最大のメリットが失われます。各CTEには、その処理内容を明確に示す名前を付けましょう。
*   **無限ループの再帰CTE:** `WITH RECURSIVE`を使用する際に、停止条件（アンカーメンバー）や再帰メンバーの結合条件を誤ると、無限ループに陥り、クエリが終了しなくなったり、リソースを使い果たしたりします。再帰CTEを書く際は、必ず終了することが保証されるロジック設計が不可欠です。

## 8. まとめ

PostgreSQLのCTEは、複雑なSQLクエリの可読性、再利用性、デバッグのしやすさを大幅に向上させる強力な機能です。特に多段階の集計や再帰的なデータ構造を扱う際にその真価を発揮します。

PostgreSQL 12以降では、非再帰CTEの最適化が改善され、サブクエリに近い効率で実行されるケースも増えました。しかし、パフォーマンスの懸念が全くなくなったわけではないため、`MATERIALIZED`/`NOT MATERIALIZED`キーワードの理解と、`EXPLAIN ANALYZE`によるクエリプランの検証は引き続き重要です。

適切な場面でCTEを賢く利用することで、より理解しやすく、メンテナンスしやすいSQLコードを書くことができるでしょう。

## 9. 参考リンク

*   [PostgreSQL 16 ドキュメント: WITH句（共通テーブル式）](https://www.postgresql.jp/document/16/html/queries-with.html)
*   [PostgreSQL 16 ドキュメント: 再帰クエリ](https://www.postgresql.jp/document/16/html/queries-with.html#id-1.5.6.11.7)
*   [PostgreSQL 16 ドキュメント: EXPLAIN](https://www.postgresql.jp/document/16/html/sql-explain.html)
*   [PostgreSQL 12 Release Notes: 共通テーブル式のインライン化に関する改善](https://www.postgresql.org/docs/12/release-12.html#id-1.11.6.4.5.3)

## 1. 導入

SQLクエリが複雑になるにつれて、その可読性やメンテナンス性は低下しがちです。特に複数のJOINやネストされたサブクエリが多用される場合、クエリの意図を把握するのに時間がかかり、デバッグも困難になります。本記事では、PostgreSQLで利用できるCTE（共通テーブル式）を活用して、このような複雑なクエリを整理し、可読性を劇的に向上させる方法について解説します。

## 2. CTEとは何か（WITH句、基本構文）

CTE（Common Table Expression）は、`WITH`句を使用して一時的な名前付き結果セットを定義するSQL構文です。これらの結果セットは、単一の`SELECT`、`INSERT`、`UPDATE`、または`DELETE`ステートメント内で参照できます。CTEは、クエリの構造を階層的に整理し、複雑なロジックを小さな論理単位に分解するのに役立ちます。

基本的な構文は以下の通りです。

```sql
WITH
  cte_name_1 AS (
    -- 最初のCTEを定義するクエリ
    SELECT column_a, column_b FROM table_x WHERE condition_1
  ),
  cte_name_2 AS (
    -- 2番目のCTEを定義するクエリ。cte_name_1を参照することも可能
    SELECT column_c FROM cte_name_1 WHERE condition_2
  )
-- メインのクエリ。定義したCTEを参照する
SELECT * FROM cte_name_2 WHERE condition_3;
```

各CTEは独立したクエリとして記述され、その結果は後続のCTEや最終的なメインクエリでテーブルのように扱うことができます。

## 3. サブクエリと比較したメリット・デメリット

CTEは、ネストされたサブクエリと同じ機能を提供することが多いですが、いくつかの重要な違いがあります。

### メリット
*   **可読性の向上:** 複雑なクエリを論理的なステップに分割し、それぞれに意味のある名前を付けられるため、クエリの意図が理解しやすくなります。長いクエリ全体を一度に解読する必要がなくなります。
*   **再利用性:** 単一のクエリ内で同じ結果セットを複数回参照する必要がある場合、CTEを一度定義すれば、それを繰り返し利用できます。これにより、コードの重複を減らし、保守性を高めます。
*   **再帰クエリのサポート:** CTEは、自己参照的なデータ構造（組織階層、部品構成表など）を走査するための再帰クエリ（`WITH RECURSIVE`）をサポートします。これは通常のサブクエリでは困難です。
*   **デバッグのしやすさ:** 各CTEが独立した論理単位であるため、クエリの各部分を個別にテストし、デバッグすることができます。

### デメリット
*   **パフォーマンスへの誤解と注意:** かつてはCTEが「最適化の壁」となり、中間結果が常に実体化されるため、パフォーマンスが低下するという認識がありました。しかし、PostgreSQL 12以降、非再帰的なCTEでメインクエリから一度だけ参照されるものは、オプティマイザによってインライン化されることが多くなり、サブクエリと変わらないパフォーマンスになる場合があります。それでも、CTEが複数回参照される場合や再帰CTEの場合、あるいは明示的に`MATERIALIZED`を指定した場合は、中間結果が実体化（テンポラリテーブルが作成）されるため、そのオーバーヘッドを考慮する必要があります。
*   **シンプルクエリでの冗長性:** 非常に単純なクエリの場合、CTEを使用するとコードが不必要に長くなり、かえって可読性が損なわれることもあります。

## 4. 実践例1: 売上集計を段階的に分解する

あるECサイトの売上データを集計するシナリオを考えます。まず日ごとの売上を計算し、次にその結果を使って月ごとの総売上を算出してみましょう。

`sales` テーブルの定義:

```sql
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    sale_date DATE NOT NULL,
    region VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL
);

INSERT INTO sales (sale_date, region, amount) VALUES
('2026-01-01', 'East', 1000.00),
('2026-01-01', 'West', 1500.00),
('2026-01-02', 'East', 1200.00),
('2026-01-02', 'West', 1800.00),
('2026-02-01', 'East', 900.00),
('2026-02-01', 'West', 2000.00),
('2026-02-02', 'East', 1100.00),
('2026-02-02', 'West', 1600.00);
```

このデータをCTEで集計します。

```sql
WITH
  daily_sales AS (
    -- 日ごとの売上を計算
    SELECT
      sale_date,
      region,
      SUM(amount) AS total_daily_amount
    FROM sales
    GROUP BY sale_date, region
  ),
  monthly_region_sales AS (
    -- 月ごと・地域ごとの売上を計算
    SELECT
      TO_CHAR(sale_date, 'YYYY-MM') AS sale_month,
      region,
      SUM(total_daily_amount) AS total_monthly_region_amount
    FROM daily_sales
    GROUP BY TO_CHAR(sale_date, 'YYYY-MM'), region
  )
-- 全体での月ごとの売上を計算
SELECT
  sale_month,
  SUM(total_monthly_region_amount) AS overall_monthly_amount
FROM monthly_region_sales
GROUP BY sale_month
ORDER BY sale_month;
```

この例では、`daily_sales` CTEで日ごとの売上を計算し、その結果を`monthly_region_sales` CTEが利用して月ごとの地域別売上を計算しています。最後に、メインクエリが`monthly_region_sales`の結果を利用して、全体での月ごとの売上を算出しています。このように段階的に処理を分解することで、各ステップのロジックが明確になり、非常に読みやすいクエリになります。

また、PostgreSQL 12以降では、CTEの定義時に`MATERIALIZED`または`NOT MATERIALIZED`キーワードを使用して、オプティマイザの振る舞いを明示的に制御できます。

```sql
WITH
  daily_sales AS MATERIALIZED ( -- このCTEの結果は必ず実体化される
    SELECT
      sale_date,
      region,
      SUM(amount) AS total_daily_amount
    FROM sales
    GROUP BY sale_date, region
  ),
  monthly_region_sales AS NOT MATERIALIZED ( -- オプティマイザに実体化しないようヒントを与える
    SELECT
      TO_CHAR(sale_date, 'YYYY-MM') AS sale_month,
      region,
      SUM(total_daily_amount) AS total_monthly_region_amount
    FROM daily_sales
    GROUP BY TO_CHAR(sale_date, 'YYYY-MM'), region
  )
SELECT
  sale_month,
  SUM(total_monthly_region_amount) AS overall_monthly_amount
FROM monthly_region_sales
GROUP BY sale_month
ORDER BY sale_month;
```
`MATERIALIZED`は、CTEが複数回参照される場合や、複雑な計算が含まれていて中間結果をキャッシュすることが有効な場合に、オプティマイザに実体化を強制するのに使えます。一方、`NOT MATERIALIZED`は、オプティマイザが通常実体化すると判断するような状況でも、それを避けてインライン化を試みるようにヒントを与えるものです。適切な使用はパフォーマンスチューニングに役立ちますが、通常はオプティマイザの判断に任せるのが良いでしょう。

## 5. 実践例2: 再帰CTEで階層データを扱う

組織の従業員階層のような自己参照的なデータを扱うには、再帰CTE（`WITH RECURSIVE`）が非常に強力です。ここでは、従業員のマネージャーをたどって、特定の従業員からルート（最上位）までの全階層パスを取得する例を示します。

`employees` テーブルの定義:

```sql
CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    manager_id INTEGER REFERENCES employees(employee_id)
);

INSERT INTO employees (employee_id, name, manager_id) VALUES
(1, 'Alice', NULL), -- CEO
(2, 'Bob', 1),
(3, 'Charlie', 1),
(4, 'David', 2),
(5, 'Eve', 2),
(6, 'Frank', 3);
```

David（employee_id = 4）の全上司階層を検索します。

```sql
WITH RECURSIVE employee_hierarchy AS (
  -- アンカーメンバー: 再帰の開始点
  SELECT
    employee_id,
    name,
    manager_id,
    1 AS level,
    CAST(name AS TEXT) AS path -- 階層パスを保持
  FROM employees
  WHERE employee_id = 4 -- Davidから開始

  UNION ALL

  -- 再帰メンバー: 前のCTEの結果を使って次のレベルを探索
  SELECT
    e.employee_id,
    e.name,
    e.manager_id,
    eh.level + 1 AS level,
    eh.path || ' -> ' || e.name AS path
  FROM employees e
  JOIN employee_hierarchy eh ON e.employee_id = eh.manager_id
)
SELECT
  employee_id,
  name,
  level,
  path
FROM employee_hierarchy
ORDER BY level DESC;
```

`WITH RECURSIVE`句では、大きく分けて2つの部分があります。
1.  **アンカーメンバー:** 再帰の開始点となる非再帰クエリです。この例では、David自身の情報が最初の行として選択されます。
2.  **再帰メンバー:** アンカーメンバーまたは前の再帰メンバーの結果を参照して、次の再帰ステップを生成するクエリです。この例では、現在の階層の`manager_id`を次の`employee_id`としてJOINすることで、上司を順にたどっています。

`UNION ALL`でこれらの結果を結合し、`manager_id`がNULLになるまで再帰的に実行されます。これにより、DavidからAlice（CEO）までの全階層パスが取得されます。

## 6. パフォーマンス上の注意点

CTEのパフォーマンスについては、特にPostgreSQLのバージョンによる振る舞いの違いを理解することが重要です。

*   **PostgreSQL 11まで:** 非再帰的なCTEであっても、通常は中間結果が実体化（Materialization）されます。これは、CTEが一時テーブルのように扱われ、その結果が一度計算されてからメインクエリで使用されることを意味します。これにより、オプティマイザがメインクエリとCTEの間で条件のプッシュダウン（Predicate Pushdown）などの最適化を行うことが妨げられる場合があります。
*   **PostgreSQL 12以降:** 大きな変更があり、非再帰的なCTEがメインクエリから**一度だけ参照される場合**、オプティマイザは中間結果を実体化せず、クエリ全体をインライン化してサブクエリのように最適化できるようになりました。これにより、多くのシナリオでCTE使用によるパフォーマンスのオーバーヘッドが解消され、可読性の向上とパフォーマンスが両立しやすくなりました。
    しかし、CTEが複数回参照される場合や、`WITH RECURSIVE`を使用する再帰CTEの場合は、依然として中間結果が実体化されます。
*   **`MATERIALIZED`と`NOT MATERIALIZED`の活用:**
    *   `WITH cte_name AS MATERIALIZED (...)`: このキーワードを使用すると、PostgreSQLはCTEの結果を強制的に実体化します。CTEが複数回参照され、その計算コストが高い場合や、特定のインデックスを利用した後の結果をキャッシュしたい場合に有効です。実体化により、後続の参照ではキャッシュされた結果が利用されるため、全体のパフォーマンスが向上する可能性があります。
    *   `WITH cte_name AS NOT MATERIALIZED (...)`: このキーワードを使用すると、オプティマイザにCTEの結果を実体化しないようヒントを与えます。PostgreSQL 12以降のデフォルト動作（一度参照の場合のインライン化）をより明示的に強制したり、オプティマイザが誤って実体化すると判断したケースで、より効率的なクエリプランを試みさせたい場合に検討します。ただし、これが常にパフォーマンス向上につながるわけではないため、`EXPLAIN ANALYZE`での検証が不可欠です。

最終的には、CTEの利用がパフォーマンスに与える影響は、クエリの内容、データの特性、そしてPostgreSQLのバージョンに依存します。常に`EXPLAIN ANALYZE`を使用してクエリプランを確認し、ボトルネックを特定することが最善のアプローチです。

## 7. よくあるアンチパターン

CTEは強力ですが、不適切に使用するとクエリを読みにくくしたり、パフォーマンスを低下させたりする可能性があります。

*   **過度な利用:** 非常に単純なサブクエリや、一度しか使わない短い論理ステップに対してまでCTEを使用すると、かえってコードが冗長になり、読むのが面倒になります。シンプル・イズ・ベストの原則を忘れずに、CTEのメリットが最大限に活かせる場面で利用しましょう。
*   **パフォーマンスの考慮不足:** 特に古いPostgreSQLバージョンを使用している場合や、CTEが複数回参照される場合、`MATERIALIZED`を指定しない限り実体化が行われないと誤解している場合、予期せぬパフォーマンスボトルネックに遭遇することがあります。必ず`EXPLAIN ANALYZE`でクエリプランを確認する習慣をつけましょう。
*   **CTE名に意味がない:** `a`, `b`, `c` のような意味のないCTE名を使用すると、結局は何の処理をしているのかが分かりにくくなり、CTEの可読性向上という最大のメリットが失われます。各CTEには、その処理内容を明確に示す名前を付けましょう。
*   **無限ループの再帰CTE:** `WITH RECURSIVE`を使用する際に、停止条件（アンカーメンバー）や再帰メンバーの結合条件を誤ると、無限ループに陥り、クエリが終了しなくなったり、リソースを使い果たしたりします。再帰CTEを書く際は、必ず終了することが保証されるロジック設計が不可欠です。

## 8. まとめ

PostgreSQLのCTEは、複雑なSQLクエリの可読性、再利用性、デバッグのしやすさを大幅に向上させる強力な機能です。特に多段階の集計や再帰的なデータ構造を扱う際にその真価を発揮します。

PostgreSQL 12以降では、非再帰CTEの最適化が改善され、サブクエリに近い効率で実行されるケースも増えました。しかし、パフォーマンスの懸念が全くなくなったわけではないため、`MATERIALIZED`/`NOT MATERIALIZED`キーワードの理解と、`EXPLAIN ANALYZE`によるクエリプランの検証は引き続き重要です。

適切な場面でCTEを賢く利用することで、より理解しやすく、メンテナンスしやすいSQLコードを書くことができるでしょう。

## 9. 参考リンク

*   [PostgreSQL 16 ドキュメント: WITH句（共通テーブル式）](https://www.postgresql.jp/document/16/html/queries-with.html)
*   [PostgreSQL 16 ドキュメント: 再帰クエリ](https://www.postgresql.jp/document/16/html/queries-with.html#id-1.5.6.11.7)
*   [PostgreSQL 16 ドキュメント: EXPLAIN](https://www.postgresql.jp/document/16/html/sql-explain.html)
*   [PostgreSQL 12 Release Notes: 共通テーブル式のインライン化に関する改善](https://www.postgresql.org/docs/12/release-12.html#id-1.11.6.4.5.3)
