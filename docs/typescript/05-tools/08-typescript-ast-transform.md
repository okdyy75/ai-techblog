# TypeScript AST操作とトランスフォーム

TypeScriptの抽象構文木（AST）を扱えるようになると、コードリファクタリングや静的解析、独自ツール開発の幅が一気に広がります。
本記事では、TypeScript中級者向けに **Compiler API** と **ts-morph** の実践的な使い方をまとめます。

## 導入

AST（Abstract Syntax Tree）は、ソースコードを「木構造」で表した中間表現です。
ESLint・Prettier・コンパイラ・IDEのリネーム機能など、多くのツールはASTを使ってコードを理解・変換しています。

TypeScriptでは、構文情報に加えて型情報も扱えるため、より安全な変換ロジックを組めるのが強みです。

## AST基礎

たとえば次のコード:

```ts
const message = "Hello";
```

概念上のAST:

```text
SourceFile
└─ VariableStatement
   └─ VariableDeclarationList
      └─ VariableDeclaration
         ├─ Identifier(message)
         └─ StringLiteral("Hello")
```

ポイント:

- トークン: 字句解析の最小単位（`const`, `message`, `=` など）
- ASTノード: 構文的な意味を持つ単位（変数宣言、関数宣言など）

## TypeScript Compiler APIの使い方

### 1. パース

```ts
import ts from "typescript";

const code = `function greet(name: string) { return \`Hello, \${name}\`; }`;

const sourceFile = ts.createSourceFile(
  "example.ts",
  code,
  ts.ScriptTarget.ESNext,
  true,
  ts.ScriptKind.TS,
);
```

### 2. 走査

```ts
function walk(node: ts.Node) {
  console.log(ts.SyntaxKind[node.kind]);
  ts.forEachChild(node, walk);
}

walk(sourceFile);
```

### 3. 変換（Transformer）

```ts
const renameTransformer =
  (oldName: string, newName: string): ts.TransformerFactory<ts.SourceFile> =>
  (context) =>
  (root) => {
    const visitor: ts.Visitor = (node) => {
      if (ts.isIdentifier(node) && node.text === oldName) {
        return ts.factory.createIdentifier(newName);
      }
      return ts.visitEachChild(node, visitor, context);
    };
    return ts.visitNode(root, visitor) as ts.SourceFile;
  };
```

### 4. 出力

```ts
const result = ts.transform(sourceFile, [renameTransformer("greet", "hello")]);
const transformed = result.transformed[0];

const printer = ts.createPrinter();
const output = printer.printFile(transformed);

console.log(output);
result.dispose();
```

## 実践例1: 識別子リネーム

`PI` を `MATH_PI` に変更する例です。

```ts
const transformer = renameTransformer("PI", "MATH_PI");
const result = ts.transform(sourceFile, [transformer]);
```

### 実行コマンド例

```bash
npm i -D typescript ts-node
npx ts-node scripts/rename.ts input.ts PI MATH_PI
```

## 実践例2: `console.log` の削除

式文としての `console.log(...)` を消す例です。

```ts
const removeConsoleTransformer: ts.TransformerFactory<ts.SourceFile> =
  (context) =>
  (root) => {
    const visitor: ts.Visitor = (node) => {
      if (
        ts.isExpressionStatement(node) &&
        ts.isCallExpression(node.expression) &&
        ts.isPropertyAccessExpression(node.expression.expression) &&
        ts.isIdentifier(node.expression.expression.expression) &&
        node.expression.expression.expression.text === "console" &&
        node.expression.expression.name.text === "log"
      ) {
        return undefined;
      }
      return ts.visitEachChild(node, visitor, context);
    };
    return ts.visitNode(root, visitor) as ts.SourceFile;
  };
```

### 実行コマンド例

```bash
npx ts-node scripts/remove-console.ts input.ts
```

## ts-morph活用

Compiler APIは強力ですが低レベルです。`ts-morph` は日常的なAST操作をかなり書きやすくしてくれます。

```ts
import { Project, SyntaxKind } from "ts-morph";

const project = new Project();
const file = project.addSourceFileAtPath("input.ts");

file
  .getDescendantsOfKind(SyntaxKind.Identifier)
  .filter((id) => id.getText() === "PI")
  .forEach((id) => id.rename("MATH_PI"));

await file.save();
```

### 実行コマンド例

```bash
npm i -D ts-morph typescript ts-node
npx ts-node scripts/rename-with-ts-morph.ts
```

## 注意点

1. **構文置換だけだと危険**: 同名識別子でもスコープが違う場合がある。
2. **型情報が必要なケースが多い**: 安全な変換には `TypeChecker` が有効。
3. **フォーマット維持**: 変換後は Prettier などで整形する。
4. **パフォーマンス**: 大規模コードベースでは複数回走査を避ける。
5. **バージョン差異**: TypeScriptの更新でAPI挙動が変わることがある。
6. **テスト必須**: 変換前後のスナップショットやE2Eで保証する。

## まとめ

TypeScript AST操作は、単なるコード読み取りではなく「コードを安全に自動編集する」ための基盤技術です。

- 低レベル制御が必要なら **TypeScript Compiler API**
- 生産性重視なら **ts-morph**

この2つを使い分けると、リネーム自動化・ログ除去・独自Lint・コード生成などを現実的なコストで実装できます。まずは小さな変換から始めて、対象範囲を段階的に広げるのがおすすめです。
