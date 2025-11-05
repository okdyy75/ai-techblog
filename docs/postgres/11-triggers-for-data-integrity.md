---
title: "トリガーを使ったデータ整合性の維持：PostgreSQLの自動化機能"
description: "PostgreSQLのトリガーの概念、トリガープロシージャの作成方法、具体的な使用例（監査ログ、データ検証）、そしてトリガーを使用する際の注意点について解説します。"
---

# トリガーを使ったデータ整合性の維持：PostgreSQLの自動化機能

## 1. トリガーとは？

トリガー（Trigger）とは、**テーブルに対して特定のイベント（`INSERT`, `UPDATE`, `DELETE`）が発生した際に、自動的に実行される関数（トリガープロシージャ）**のことです。

トリガーを利用することで、以下のような処理を自動化し、データの整合性やビジネスルールをデータベースレベルで強制することができます。

- データの変更履歴（監査ログ）を自動的に記録する。
- 関連するテーブルのデータを自動的に更新する。
- 複雑なデータ検証ルールを適用する。

トリガーは、アプリケーション側のロジックとは独立してデータベースサーバー上で動作するため、どのような経路でデータが変更された場合でも、必ずルールが適用されるという利点があります。

## 2. トリガーの仕組み：2つの要素

PostgreSQLのトリガーは、2つの要素から構成されます。

1.  **トリガープロシージャ (Trigger Procedure)**
    - トリガーが発火したときに実際に実行されるロジックを定義した関数。
    - この関数は、戻り値として`TRIGGER`型を返す特別な関数として作成する必要があります。
    - `CREATE FUNCTION`構文で作成します。

2.  **トリガー (Trigger)**
    - どのテーブルの、どのイベント（`INSERT`, `UPDATE`, `DELETE`）で、どのタイミング（`BEFORE`または`AFTER`）で、どのトリガープロシージャを実行するかを定義します。
    - `CREATE TRIGGER`構文でテーブルに紐付けます。

この2段階の構造により、一つのトリガープロシージャを複数のトリガーで再利用することが可能です。

## 3. トリガーの作成手順

トリガーを作成するには、まずトリガープロシージャを定義し、次に対応するトリガーをテーブルに設定します。

### ステップ1: トリガープロシージャの作成

トリガープロシージャは、`PL/pgSQL`で記述するのが一般的です。この関数内では、いくつかの特別な変数を利用できます。

- **`NEW`**: `INSERT`や`UPDATE`後の新しい行データを保持するレコード型変数。
- **`OLD`**: `UPDATE`や`DELETE`前の古い行データを保持するレコード型変数。
- **`TG_OP`**: トリガーを起動した操作（'INSERT', 'UPDATE', 'DELETE'）を示す文字列。
- **`TG_TABLE_NAME`**: トリガーが設定されているテーブル名。

**例：最終更新日時を自動で設定するトリガープロシージャ**

多くのテーブルで「作成日時（`created_at`）」と「更新日時（`updated_at`）」のカラムを持つことは一般的です。この`updated_at`を自動で更新するトリガープロシージャを作成してみましょう。

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    -- NEWレコードのupdated_atカラムに現在のタイムスタンプを設定
    NEW.updated_at = NOW();
    -- 変更後のNEWレコードを返す（BEFOREトリガーで必須）
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```
この関数は、`INSERT`または`UPDATE`イベントの**前（`BEFORE`）**に実行されることを想定しています。`BEFORE`トリガーでは、`RETURN NEW;`とすることで、実際にテーブルに書き込まれるデータを変更できます。`RETURN NULL;`とすると、その行の操作（`INSERT`や`UPDATE`）自体をキャンセルできます。

`AFTER`トリガーの場合、戻り値は無視されるため`RETURN NULL;`または`RETURN NEW;`のどちらでも構いません。

### ステップ2: トリガーのテーブルへの設定

次に、作成したトリガープロシージャを特定のテーブルのイベントに紐付けます。

**例：`employees`テーブルにトリガーを設定**

`employees`テーブルに`INSERT`または`UPDATE`が行われる**前**に、先ほど作成した`set_updated_at`関数を実行するように設定します。

```sql
CREATE TRIGGER trigger_employees_updated_at
BEFORE INSERT OR UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
```

- **`BEFORE INSERT OR UPDATE`**: `INSERT`または`UPDATE`操作の前にトリガーが発火することを指定します。
- **`ON employees`**: `employees`テーブルを対象とします。
- **`FOR EACH ROW`**: ステートメント単位ではなく、変更される**行ごと**にトリガーが実行されることを指定します。ほとんどのトリガーはこの形式です。
- **`EXECUTE FUNCTION set_updated_at()`**: 実行するトリガープロシージャを指定します。

これで、`employees`テーブルに行が挿入されたり、既存の行が更新されたりするたびに、`updated_at`カラムが自動的に現在のタイムスタンプで更新されるようになります。

## 4. 具体的な使用例

### 例1: 監査ログの作成

従業員の給与が変更されたときに、その変更履歴を別のテーブル（`salary_audits`）に記録するトリガーを作成します。

**監査ログ用テーブル**
```sql
CREATE TABLE salary_audits (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    old_salary NUMERIC NOT NULL,
    new_salary NUMERIC NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by NAME DEFAULT CURRENT_USER
);
```

**トリガープロシージャ**
```sql
CREATE OR REPLACE FUNCTION log_salary_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 給与が実際に変更された場合のみログを記録
    IF NEW.salary <> OLD.salary THEN
        INSERT INTO salary_audits (employee_id, old_salary, new_salary)
        VALUES (OLD.id, OLD.salary, NEW.salary);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**トリガーの設定**
```sql
CREATE TRIGGER trigger_log_salary_change
AFTER UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION log_salary_change();
```
このトリガーは`UPDATE`の**後（`AFTER`）**に設定されています。これにより、`employees`テーブルの更新が成功したこと（制約違反などで失敗しなかったこと）を確認してから、監査ログテーブルに記録を残すことができます。

### 例2: 在庫数の自動更新

`orders`（注文）テーブルに新しい注文が追加されたら、`products`（商品）テーブルの在庫数を自動的に減らすトリガーです。

**トリガープロシージャ**
```sql
CREATE OR REPLACE FUNCTION decrease_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- productsテーブルの在庫（stock）を注文数（quantity）だけ減らす
    UPDATE products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id;

    -- 在庫がマイナスになったらエラーを発生させてトランザクションをロールバック
    IF (SELECT stock FROM products WHERE id = NEW.product_id) < 0 THEN
        RAISE EXCEPTION 'Product % is out of stock.', NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**トリガーの設定**
```sql
CREATE TRIGGER trigger_decrease_stock
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION decrease_stock();
```

## 5. トリガーを使用する際の注意点

- **複雑さとパフォーマンス**: トリガーは便利ですが、多用するとデータベースの動作が複雑になり、デバッグが困難になることがあります。また、一つの操作が連鎖的に多数のトリガーを起動させ、予期せぬパフォーマンス低下を引き起こす可能性もあります。
- **可視性の低さ**: トリガーはバックグラウンドで自動的に動作するため、アプリケーション開発者がその存在を忘れがちです。データベースの挙動を理解するためには、どのようなトリガーが設定されているかを把握しておく必要があります。
- **代替手段の検討**:
    - **制約 (Constraints)**: `CHECK`制約や外部キー制約で実現できる単純なルールは、トリガーよりも制約を使用する方が高速でシンプルです。
    - **ルール (Rules)**: PostgreSQLにはトリガーと似た`RULE`システムもありますが、特定のケース（ビューの更新など）を除き、一般的にはトリガーの方が直感的で推奨されます。
    - **アプリケーションロジック**: データベースの整合性に関わらない、純粋なビジネスロジックは、アプリケーション層で実装する方が柔軟性が高い場合が多いです。

## まとめ

トリガーは、PostgreSQLにおいてデータの整合性を強制し、定型的な処理を自動化するための強力なメカニズムです。監査ログの作成や関連データの同期など、アプリケーションのロジックから切り離してデータベースレベルで保証したいルールを実装するのに非常に有効です。

ただし、その強力さゆえに、乱用はシステムの複雑化を招くリスクも伴います。トリガーの特性をよく理解し、制約やアプリケーションロジックなど他の選択肢と比較検討した上で、計画的に使用することが重要です。
