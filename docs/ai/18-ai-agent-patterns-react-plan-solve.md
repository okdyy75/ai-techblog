---
title: AIエージェントパターン入門：ReAct・Plan-and-Solveを実装する
description: AIエージェントの代表的な思考パターンであるReActとPlan-and-Solveの仕組みと、Pythonでの実装方法を解説します。
date: 2026-04-18
author: Gemini
---

# AIエージェントパターン入門：ReAct・Plan-and-Solveを実装する

## はじめに

AIエージェントは単なる質問応答システムではなく、ツールを使いながら自律的にタスクを解決するシステムです。近年、LangChainやAutoGPTなどのフレームワークが登場し、エージェント構築が容易になりました。しかし、「どのような思考パターンでエージェントを設計すべきか」は依然として重要な設計判断です。本記事では、ReActとPlan-and-Solveという2つの主要パターンについて解説し、実装例を示します。

## 本文

### 1. ReActパターン：思考と行動の反復

ReAct（Reasoning + Acting）は、Chain-of-Thoughtとツール使用を組み合わせたパターンです。エージェントは「思考→行動→観察」を繰り返し、問題を段階的に解決します。

#### ReActの仕組み

1. **思考（Thought）**：現在の状況を分析し、次にすべきことを考える
2. **行動（Action）**：ツールを実行する（検索、計算、API呼び出しなど）
3. **観察（Observation）**：ツールの結果を確認する
4. **終了**：十分な情報が集まったら回答を出力する

#### Python実装例

```python
import openai
import json

class ReActAgent:
    def __init__(self):
        self.tools = {
            "search": self.search_tool,
            "calculate": self.calculate_tool
        }
        self.history = []
    
    def search_tool(self, query: str) -> str:
        # 実際には検索APIを呼び出す
        return f"'{query}'の検索結果：...（検索結果）"
    
    def calculate_tool(self, expression: str) -> str:
        try:
            result = eval(expression)
            return str(result)
        except:
            return "計算エラー"
    
    def run(self, task: str, max_iterations: int = 5):
        system_prompt = """
あなたはReActエージェントです。以下の形式で回答してください：

思考：[現在の状況を分析]
行動：[ツール名, 引数]
観察：[ツールの実行結果]

利用可能なツール：
- search: 検索を行う
- calculate: 計算を行う

最終回答の場合は「回答：[内容]」と出力してください。
"""
        
        for i in range(max_iterations):
            response = openai.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": task},
                    *self.history
                ]
            )
            
            output = response.choices[0].message.content
            print(f"\n--- イテレーション {i+1} ---")
            print(output)
            
            if "回答：" in output:
                return output.split("回答：")[1].strip()
            
            # 行動を解析してツールを実行
            if "行動：" in output:
                action_line = [line for line in output.split('\n') if '行動：' in line][0]
                tool_info = action_line.split('行動：')[1].strip()
                tool_name, tool_arg = tool_info.split(',')
                tool_name = tool_name.strip()
                tool_arg = tool_arg.strip()
                
                if tool_name in self.tools:
                    observation = self.tools[tool_name](tool_arg)
                    self.history.append({"role": "assistant", "content": output})
                    self.history.append({"role": "user", "content": f"観察：{observation}"})
        
        return "最大イテレーション数に達しました"

# 使用例
agent = ReActAgent()
result = agent.run("2024年のノーベル物理学賞受賞者は誰ですか？彼らの年齢の合計を計算してください。")
print(f"\n最終回答：{result}")
```

ReActは**リアルタイムの情報収集**が必要なタスクに適しています。検索や計算が必要な複雑な質問に対して効果的です。

### 2. Plan-and-Solveパターン：計画から実行へ

Plan-and-Solveは、まず全体計画を立ててから、順次実行していくパターンです。ReActと異なり、事前にステップを計画するため、より構造化されたタスクに適しています。

#### Plan-and-Solveの流れ

1. **計画（Plan）**：タスクを複数のステップに分解する
2. **実行（Solve）**：各ステップを順次実行する
3. **統合**：ステップの結果を統合して最終回答を生成する

#### Python実装例

```python
class PlanAndSolveAgent:
    def __init__(self):
        self.steps = []
        self.results = []
    
    def create_plan(self, task: str) -> list:
        """タスクをステップに分解する"""
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "system",
                "content": "以下のタスクを具体的なステップに分解してください。JSON配列形式で返してください。"
            }, {
                "role": "user",
                "content": task
            }]
        )
        
        # JSONパース（簡易的な実装）
        content = response.choices[0].message.content
        # 実際にはより堅牢なJSONパースが必要
        return json.loads(content)
    
    def execute_step(self, step: str, context: str) -> str:
        """個別のステップを実行"""
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "system",
                "content": f"コンテキスト：{context}\n以下のステップを実行してください。"
            }, {
                "role": "user",
                "content": step
            }]
        )
        return response.choices[0].message.content
    
    def run(self, task: str):
        # ステップ1: 計画を立てる
        print("=== 計画フェーズ ===")
        plan = self.create_plan(task)
        print(f"生成された計画: {plan}")
        
        # ステップ2: 順次実行
        print("\n=== 実行フェーズ ===")
        context = ""
        for i, step in enumerate(plan, 1):
            print(f"\nステップ {i}: {step}")
            result = self.execute_step(step, context)
            print(f"結果: {result}")
            
            self.results.append(result)
            context += f"\nステップ{i}: {step}\n結果: {result}"
        
        # ステップ3: 結果を統合
        print("\n=== 統合フェーズ ===")
        final_response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "system",
                "content": "以下のステップ結果を統合して、最終回答を作成してください。"
            }, {
                "role": "user",
                "content": context
            }]
        )
        
        return final_response.choices[0].message.content

# 使用例
agent = PlanAndSolveAgent()
task = "弊社の新製品のマーケティング戦略を作成してください。ターゲット層、価格設定、プロモーション方法を含めてください。"
result = agent.run(task)
print(f"\n最終戦略：\n{result}")
```

### 3. パターンの選択基準

| パターン | 適したユースケース | 避けるべきケース |
|---------|------------------|----------------|
| ReAct | 情報が不明確で探索が必要、リアルタイム検索が必要 | 単純な決定論的タスク |
| Plan-and-Solve | 明確な手順がある複合タスク、レポート作成 | 動的に変化する環境 |

### 4. 実践的なヒント

**ツール設計の重要性**
エージェントの性能はツールの設計に大きく依存します。ツールの説明は明確にし、入力スキーマは厳密に定義してください。

**エラーハンドリング**
ツールの実行失敗時のリカバリーロジックを実装しましょう。最大イテレーション数の設定や、エラー時の代替戦略を用意します。

**コスト管理**
エージェントは複数回のLLM呼び出しを行うため、コストが重要な懸念事項となります。小さなモデル（GPT-4o miniなど）での検討や、実行ステップ数の制限を検討してください。

## まとめ

AIエージェントの設計において、思考パターンの選択はシステム全体の振る舞いを決定づけます。ReActは探索と適応に長け、Plan-and-Solveは構造化と計画性に優れています。実際のアプリケーションでは、これらを組み合わせたハイブリッドアプローチも有効です。まずはシンプルなReActから始め、必要に応じてPlan-and-Solveを導入することで、段階的に高度なエージェントを構築できます。
