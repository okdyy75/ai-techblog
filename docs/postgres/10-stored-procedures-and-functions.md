---
title: "PostgreSQLのストアドプロシージャと関数：サーバーサイドプログラミング入門"
description: "PostgreSQLのストアドプロシージャと関数の違い、基本的な作成方法（SQL、PL/pgSQL）、使い方、そしてそれらを活用するメリットについて解説します。"
---

# PostgreSQLのストアドプロシージャと関数：サーバーサイドプログラミング入門

データベースサーバー上で直接実行可能なプログラムのまとまりを定義する機能として、PostgreSQLは**関数（Function）**と**プロシージャ（Procedure）**を提供しています。これらは一般に「ストアドプロシージャ」と総称されることもありますが、PostgreSQLでは明確な違いがあります。

これらを活用することで、複雑なビジネスロジックをデータベース層に集約し、アプリケーションの簡素化、パフォーマンスの向上、再利用性の確保を実現できます。

## 1. 関数とプロシージャの違い

PostgreSQLにおける関数とプロシージャの最も大きな違いは、**トランザクションの制御**と**戻り値**の扱いです。

| 特徴 | 関数 (Function) | プロシージャ (Procedure) |
| :--- | :--- | :--- |
| **主な目的** | 値の計算や問い合わせ結果を返す | 一連の処理を実行する（データ操作が主） |
| **戻り値** | **必須**（`RETURNS`句で定義） | **不可**（値を返せない） |
| **トランザクション制御** | **不可**（`COMMIT`, `ROLLBACK`を実行できない） | **可能**（`COMMIT`, `ROLLBACK`を実行できる） |
| **呼び出し方** | `SELECT my_function();` | `CALL my_procedure();` |

- **関数**: `SELECT`文の一部として呼び出され、計算結果や処理結果を値として返すことを目的とします。純粋な計算から、テーブルを返す複雑なものまで定義できます。
- **プロシージャ**: 一連のデータ更新処理などをまとめ、それ自体で完結した処理を実行することを目的とします。プロシージャ内でトランザクションをコミットしたりロールバックしたりできるため、複数のステップにまたがるバッチ処理などに適しています。

> PostgreSQL 11より前はプロシージャが存在せず、関数で代用していました。その名残で、今でも広義の「ストアドプロシージャ」として関数が紹介されることがあります。

## 2. 関数の作成と使用方法

関数は`CREATE FUNCTION`構文で作成します。ここでは、SQL言語と、より高機能な`PL/pgSQL`言語を使った例を紹介します。

### SQL言語による単純な関数

単純なSQLで記述できるロジックは、`LANGUAGE sql`で作成できます。

```sql
-- 2つの数値を受け取り、その合計を返す関数
CREATE FUNCTION add(a integer, b integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE -- 引数が同じなら常に同じ結果を返すことを示す
AS $$
    SELECT a + b;
$$;

-- 作成した関数を呼び出す
SELECT add(5, 3); -- 結果: 8
```

### PL/pgSQLによる手続き的な関数

`IF`文やループ、変数など、より複雑な手続き的な処理を行いたい場合は、`PL/pgSQL`（Procedural Language/PostgreSQL SQL）を使用します。

```sql
-- 従業員IDを受け取り、給与レベルを判定してテキストを返す関数
CREATE FUNCTION get_salary_level(p_employee_id integer)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    v_salary numeric;
    v_level text;
BEGIN
    -- employeesテーブルから給与を取得
    SELECT salary INTO v_salary FROM employees WHERE id = p_employee_id;

    IF v_salary >= 500000 THEN
        v_level := 'High';
    ELSIF v_salary >= 300000 THEN
        v_level := 'Medium';
    ELSE
        v_level := 'Low';
    END IF;

    RETURN v_level;
END;
$$;

-- 作成した関数を呼び出す
SELECT first_name, salary, get_salary_level(id) FROM employees;
```

### テーブルを返す関数

`RETURNS TABLE`を指定することで、クエリの結果セットを返す関数も作成できます。これはビューの代替としても利用できます。

```sql
-- 部署IDを受け取り、その部署に所属する従業員のリストを返す関数
CREATE FUNCTION get_employees_by_department(p_department_id integer)
RETURNS TABLE(employee_id integer, full_name text, salary numeric)
LANGUAGE sql
AS $$
    SELECT id, first_name || ' ' || last_name, salary
    FROM employees
    WHERE department_id = p_department_id;
$$;

-- 作成した関数を呼び出す（テーブルのように扱える）
SELECT * FROM get_employees_by_department(1);
```

## 3. プロシージャの作成と使用方法

プロシージャは`CREATE PROCEDURE`構文で作成し、`CALL`コマンドで呼び出します。

### トランザクション制御を含むプロシージャ

例として、2つの口座間で資金を移動するプロシージャを作成します。この処理はアトミック（不可分）である必要があり、途中で失敗した場合はすべての変更を元に戻さなければなりません。

```sql
-- 口座振替を行うプロシージャ
CREATE PROCEDURE transfer_funds(
   from_account int,
   to_account int,
   amount numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- 送金元口座の残高を減らす
    UPDATE accounts
    SET balance = balance - amount
    WHERE id = from_account;

    -- 送金先口座の残高を増やす
    UPDATE accounts
    SET balance = balance + amount
    WHERE id = to_account;

    -- 送金元口座の残高がマイナスになっていないかチェック
    IF (SELECT balance FROM accounts WHERE id = from_account) < 0 THEN
        -- マイナスになった場合はトランザクションをロールバック
        RAISE EXCEPTION 'Insufficient funds in account %', from_account;
        ROLLBACK; -- このROLLBACKは実際には不要（EXCEPTIONで自動的にロールバックされる）
    END IF;

    -- ここまで問題がなければトランザクションをコミット
    COMMIT;
END;
$$;

-- 作成したプロシージャを呼び出す
CALL transfer_funds(1, 2, 5000);
```
このプロシージャは、`CALL`文自体が一つのトランザクションブロックとして扱われます。プロシージャ内で`COMMIT`や`ROLLBACK`を明示的に呼び出すことで、より細かなトランザクション制御が可能になります。

## 4. メリットとベストプラクティス

### メリット
- **ネットワークトラフィックの削減**: アプリケーションとデータベース間の通信が減ります。何度もクエリを往復させる代わりに、プロシージャを1回呼び出すだけで済みます。
- **再利用性と保守性の向上**: ビジネスロジックをデータベースに一元化することで、複数のアプリケーションから同じロジックを再利用できます。ロジックの変更も一箇所で済みます。
- **セキュリティの向上**: ユーザーにテーブルへの直接アクセス権を与えず、定義されたプロシージャの実行権限（`EXECUTE`）のみを与えることで、意図しない操作を防ぎます。
- **パフォーマンス**: PostgreSQLは関数やプロシージャの実行計画をキャッシュすることがあり、繰り返し実行される場合にパフォーマンスが向上します。

### ベストプラクティス
- **ビジネスロジックの置き場所を検討する**: すべてのロジックをデータベースに置くのが常に最善とは限りません。アプリケーションの要件やアーキテクチャに応じて、どこにロジックを配置するかを慎重に設計しましょう。
- **命名規則を定める**: `fn_`で始まる関数名、`sp_`で始まるプロシージャ名など、一貫した命名規則を設けると管理が容易になります。
- **引数にはプレフィックスを付ける**: `p_`（parameter）や`in_`など、引数とローカル変数を区別するためのプレフィックスを付けると、コードの可読性が向上します。
- **バージョン管理**: 関数やプロシージャのコードも、アプリケーションコードと同様にGitなどのバージョン管理システムで管理しましょう。

## まとめ

PostgreSQLの関数とプロシージャは、データベースの能力を最大限に引き出すための強力な機能です。単純な値の計算から、トランザクション制御を伴う複雑なバッチ処理まで、サーバーサイドで効率的に実行できます。

これらの機能を適切に活用することで、アプリケーションの構造をクリーンに保ち、パフォーマンスと保守性を向上させることができます。
