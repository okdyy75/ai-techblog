---
title: "AIエージェント設計パターン：ReAct、Plan-and-Solve、Multi-Agentの使い分け"
description: "LLMを活用したAIエージェントの代表的な設計パターンを解説。ReAct、Plan-and-Solve、Multi-Agentアーキテクチャの特徴と適用シーンを比較します。"
date: 2026-04-12
---

# AIエージェント設計パターン：ReAct、Plan-and-Solve、Multi-Agentの使い分け

## はじめに

大規模言語モデル（LLM）の登場により、単なるテキスト生成ツールから自律的にタスクを実行する「AIエージェント」へと進化が加速しています。しかし、「エージェントを作りたい」と思っても、どのようなアーキテクチャを採用すべきか迷うことも多いでしょう。

本記事では、現在最も広く使われている3つのAIエージェント設計パターン——**ReAct**、**Plan-and-Solve**、**Multi-Agent**——について、それぞれの特徴と適用シーンを解説します。適切なパターンを選ぶことで、エージェントの性能と信頼性を大きく向上させることができます。

---

## 1. ReAct（Reasoning + Acting）パターン

### 概要

ReActは、推論（Reasoning）と行動（Acting）を交互に繰り返すパターンです。人間が考えながら行動するように、LLMも「考える→行動する→結果を観察する→また考える」というサイクルを繰り返します。

### 動作フロー

```
思考（Thought）→ 行動（Action）→ 観察（Observation）→ 思考（Thought）→ ...
```

### 実装例（疑似コード）

```python
def react_agent(query, tools, max_iterations=10):
    context = f"Question: {query}\n"
    
    for i in range(max_iterations):
        # LLMに思考と行動を生成させる
        response = llm.generate(
            prompt=context + "Think step by step and decide next action.",
            stop=["Observation:"]
        )
        
        # ThoughtとActionをパース
        thought, action = parse_response(response)
        
        if "Final Answer" in action:
            return extract_answer(action)
        
        # ツールを実行
        tool_name, tool_input = parse_action(action)
        observation = execute_tool(tool_name, tool_input)
        
        # コンテキストに追加
        context += f"Thought: {thought}\n"
        context += f"Action: {action}\n"
        context += f"Observation: {observation}\n"
    
    return "Max iterations reached"
```

### 適用シーン

- **ツール呼び出しが必要なタスク**：検索、計算、データベース照会など
- **動的な意思決定が必要な場合**：状況に応じて次の行動を決定する必要がある
- **単一タスクの段階的解決**：比較的単純で、直線的な問題解決が可能なケース

### メリット・デメリット

| メリット | デメリット |
|---------|-----------|
| シンプルで実装しやすい | 複雑なタスクでは思考が逸脱しやすい |
| 中間結果を確認しながら進められる | トークン消費が多くなることがある |
| デバッグが比較的容易 | 長期タスクではコンテキストが膨らむ |

---

## 2. Plan-and-Solveパターン

### 概要

Plan-and-Solveは、先に計画を立ててから実行する「計画→実行」型のアプローチです。人間でいうところの「準備→本番」を模倣したパターンです。

### 動作フロー

```
計画立案（Planning）→ ステップ分解 → 順次実行（Execution）→ 結果統合
```

### 実装例（疑似コード）

```python
def plan_and_solve_agent(query, tools):
    # Phase 1: 計画立案
    plan_prompt = f"""
    Create a step-by-step plan to solve this task:
    Task: {query}
    
    Available tools: {list(tools.keys())}
    
    Output format:
    1. [Step description]
    2. [Step description]
    ...
    """
    
    plan = llm.generate(plan_prompt)
    steps = parse_plan(plan)
    
    # Phase 2: ステップ実行
    results = []
    context = f"Original task: {query}\n"
    
    for i, step in enumerate(steps, 1):
        execution_prompt = f"""
        Context: {context}
        Current step ({i}/{len(steps)}): {step}
        
        Execute this step using available tools if needed.
        """
        
        result = llm.generate(execution_prompt)
        
        if requires_tool(result):
            tool_result = execute_tool_call(result, tools)
            results.append(tool_result)
            context += f"Step {i} result: {tool_result}\n"
        else:
            results.append(result)
            context += f"Step {i} result: {result}\n"
    
    # Phase 3: 結果統合
    final_prompt = f"""
    Original task: {query}
    Step results: {results}
    
    Synthesize the final answer.
    """
    
    return llm.generate(final_prompt)
```

### 適用シーン

- **複雑で構造化されたタスク**：多段階の処理が必要なワークフロー
- **再現性が重要なケース**：同じ入力に対して安定した出力が必要
- **事前に全体像を把握したい場合**：ステップごとの進捗管理が必要

### メリット・デメリット

| メリット | デメリット |
|---------|-----------|
| 全体像が見えて安心感がある | 計画変更が困難（柔軟性が低い） |
| 並列実行が可能なステップの特定が容易 | 予期しない状況への対応が遅い |
| ステップごとの検証・修正が可能 | 初期計画の質が全体を左右する |

---

## 3. Multi-Agentパターン

### 概要

Multi-Agentは、複数の専門化されたエージェントを協調させてタスクを解決するパターンです。各エージェントが特定の役割を担い、相互にやり取りしながら複雑な問題に取り組みます。

### 典型的なアーキテクチャ

```
┌─────────────────┐
│  Orchestrator   │  （調整役）
│   （統括者）     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐  ┌──▼────┐
│Research│  │Code   │
│ Agent  │  │Agent  │
└────────┘  └───────┘
    │         │
┌───▼───┐  ┌──▼────┐
│Review │  │Test   │
│ Agent  │  │Agent  │
└────────┘  └───────┘
```

### 実装例（疑似コード）

```python
class MultiAgentSystem:
    def __init__(self):
        self.agents = {
            'planner': Agent(role='planning', model='gpt-4'),
            'researcher': Agent(role='research', tools=[search_tool]),
            'coder': Agent(role='coding', tools=[code_executor]),
            'reviewer': Agent(role='review', criteria=['security', 'performance']),
        }
        self.orchestrator = Orchestrator(self.agents)
    
    def solve(self, task):
        # オーケストレーターがタスクを分析してエージェントに振り分け
        workflow = self.orchestrator.design_workflow(task)
        
        results = {}
        for step in workflow.steps:
            agent = self.agents[step.agent_name]
            
            # 他のエージェントの結果をコンテキストとして渡す
            context = self._build_context(step.dependencies, results)
            
            result = agent.execute(step.instruction, context)
            results[step.name] = result
            
            # レビューエージェントによる品質チェック
            if step.requires_review:
                review = self.agents['reviewer'].review(result)
                if not review.passed:
                    # 再実行または別エージェントに委譲
                    result = self._handle_failure(step, review)
        
        return self.orchestrator.synthesize(results)
```

### 適用シーン

- **複雑で多角的なタスク**：単一エージェントでは捉えきれない規模の問題
- **専門性が要求されるドメイン**：コード生成、レビュー、テストなど異なる専門知識が必要
- **品質保証が重要なケース**：複数の視点からの検証が必要

### メリット・デメリット

| メリット | デメリット |
|---------|-----------|
| 専門化により高品質な出力が期待できる | システム構成が複雑 |
| 並列処理による効率化が可能 | エージェント間通信の設計が難しい |
| 特定エージェントの差し替え・改善が容易 | コストとレイテンシが増加 |
| あるエージェントの失敗を他が補完できる | デバッグが困難 |

---

## 4. パターン比較と選択ガイド

### 比較表

| 観点 | ReAct | Plan-and-Solve | Multi-Agent |
|------|-------|----------------|-------------|
| 複雑さ | 低 | 中 | 高 |
| 柔軟性 | 高 | 中 | 高（設計次第） |
| 予測可能性 | 中 | 高 | 中 |
| 実装コスト | 低 | 中 | 高 |
| 実行コスト | 中 | 低〜中 | 高 |
| 並列化 | 難しい | 可能 | 容易 |

### 選択フローチャート

```
タスクを評価
    │
    ├── 単純でツール呼び出しが中心？
    │       └── YES → ReAct
    │
    ├── 複雑だが手順が予測可能？
    │       └── YES → Plan-and-Solve
    │
    └── 多角的な専門知識が必要？
            └── YES → Multi-Agent
```

---

## まとめ

AIエージェントの設計パターンは、解決したい問題の性質によって選ぶべきものが変わります。

- **ReAct**：シンプルさと柔軟性を重視する場合、ツール呼び出し中心のタスクに最適
- **Plan-and-Solve**：予測可能性と構造化を重視する場合、ワークフロー型のタスクに最適
- **Multi-Agent**：品質と専門性を重視する場合、複雑で多角的なタスクに最適

実際の開発では、これらを組み合わせたハイブリッドアプローチも有効です。例えば、Multi-Agentの各エージェント内部でReActを使う、Plan-and-Solveの各ステップで専門エージェントを割り当てるなど、要件に応じて組み合わせてみてください。

エージェント設計の第一歩は、まずシンプルなReActから始めて、必要に応じてより構造的なアプローチへ移行していくことです。小さく始めて、経験を積みながら進化させていきましょう。

---

## 参考資料

- [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)
- [Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning](https://arxiv.org/abs/2305.04091)
- [AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation](https://arxiv.org/abs/2308.08155)
- [LangChain Documentation - Agent Types](https://python.langchain.com/docs/modules/agents/agent_types/)
