---
title: AIエージェントアーキテクチャの設計パターン：ReAct、Plan-and-Solve、Multi-Agent
---

# AIエージェントアーキテクチャの設計パターン：ReAct、Plan-and-Solve、Multi-Agent

ChatGPTやClaudeといったAIとの対話が日常化した今、次の一手として注目されているのが「AIエージェント」です。単なる質問応答を超え、外部ツールを使いこなし、複雑なタスクを自律的に遂行するAIエージェントは、Webアプリケーションの可能性を大きく広げます。

しかし、エージェントを実装しようとすると、すぐに「どう設計すればいいのか」という壁にぶつかります。本記事では、現代のAIエージェント開発における3つの主要な設計パターン—**ReAct**、**Plan-and-Solve**、**Multi-Agent**—を解説し、それぞれの特徴と使い分けを示します。

---

## AIエージェントとは何か

### 定義

AIエージェントとは、**環境を観察し、自律的に意思決定を行い、アクションを実行することで特定の目標を達成するシステム**です。従来のLLM（大規模言語モデル）との大きな違いは以下の3点に集約されます。

| 特徴 | 従来のLLM | AIエージェント |
|------|----------|---------------|
| **記憶** | セッション内の文脈のみ | 長期記憶、外部ストレージの活用 |
| **ツール使用** | なし | API、データベース、検索エンジンなど |
| **自律性** | 応答のみ | ループ・反復によるタスク遂行 |

### 基本構造

ほとんどのAIエージェントは以下のループ構造で動作します。

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   観察      │────▶│   思考      │────▶│   行動      │
│ (Observation)│     │  (Thought)  │     │   (Action)  │
└─────────────┘     └─────────────┘     └──────┬──────┘
       ▲                                         │
       └─────────────────────────────────────────┘
                    (結果の観察)
```

このループの「思考」部分の設計が、エージェントの能力を大きく左右します。

---

## 設計パターン1：ReAct（Reasoning + Acting）

### 概要

ReActは、Google Researchが2022年に提唱したパターンで、**推論（Reasoning）と行動（Acting）を交互に繰り返す**手法です。人間が「考えて、行動して、結果を見て、また考える」というサイクルを自然に行うように、LLMも同じサイクルを踏みます。

### 動作フロー

```
質問: "東京都の今日の天気は？"

思考1: 天気情報が必要。検索ツールを使おう。
行動1: search("東京都 天気 今日")
観察1: [検索結果] 晴れ、最高気温25度

思考2: 情報が得られた。回答を作成しよう。
行動2: finish("東京都は今日晴れで、最高気温は25度です。")
```

### コード例（擬似コード）

```python
def react_agent(query, tools, max_iterations=10):
    """
    ReActパターンのエージェント実装
    """
    context = f"質問: {query}\n\n"
    
    for i in range(max_iterations):
        # LLMに思考と行動を生成させる
        response = llm.generate(
            prompt=context + "\n次の思考と行動を決定してください。",
            stop=["\n観察:"]
        )
        
        # 思考と行動をパース
        thought, action = parse_thought_action(response)
        context += f"思考: {thought}\n行動: {action}\n"
        
        # 終了条件
        if action.startswith("finish"):
            return extract_answer(action)
        
        # ツールを実行
        observation = execute_tool(action, tools)
        context += f"観察: {observation}\n\n"
    
    return "最大反復回数に達しました"
```

### 向いているユースケース

- リアルタイム情報が必要なQ&A（天気、株価、ニュース）
- デバッグやトラブルシューティング
- 段階的な問題解決

---

## 設計パターン2：Plan-and-Solve（計画実行型）

### 概要

Plan-and-Solveは、その名の通り**「計画を立ててから実行する」**アプローチです。ReActが「考えながら進む」タイプなら、Plan-and-Solveは「しっかり計画してから一気に進む」タイプです。複雑なタスクを分解し、実行計画を立ててからステップバイステップで遂行します。

### 動作フロー

```
質問: "Reactアプリを作成してVercelにデプロイする手順を教えて"

【計画フェーズ】
1. プロジェクトの初期化 (create-react-app)
2. 必要なパッケージのインストール
3. 基本的なコード編集
4. Gitリポジトリの初期化
5. Vercelへのデプロイ設定

【実行フェーズ】
ステップ1を実行 → ステップ2を実行 → ... → 完了
```

### コード例（LangChain風）

```python
from langchain import OpenAI, LLMChain, PromptTemplate

plan_prompt = """
以下のタスクを複数のステップに分解してください。
各ステップは1つのアクションで完了できる粒度にしてください。

タスク: {task}

ステップ:
1. """

execute_prompt = """
タスク: {task}
計画: {plan}
現在のステップ: {current_step}

このステップを実行してください。
"""

def plan_and_solve_agent(task):
    # 1. 計画を立てる
    planner = LLMChain(
        llm=OpenAI(),
        prompt=PromptTemplate(template=plan_prompt, input_variables=["task"])
    )
    plan = planner.predict(task=task)
    steps = parse_steps(plan)
    
    # 2. 計画を実行
    results = []
    for step in steps:
        executor = LLMChain(
            llm=OpenAI(),
            prompt=PromptTemplate(
                template=execute_prompt,
                input_variables=["task", "plan", "current_step"]
            )
        )
        result = executor.predict(
            task=task,
            plan=plan,
            current_step=step
        )
        results.append(result)
    
    return {
        "plan": plan,
        "results": results
    }
```

### 向いているユースケース

- 複雑なワークフローの自動化
- 予測可能な手順を伴うタスク
- 複数ステップにわたるレポート生成

---

## 設計パターン3：Multi-Agent（複数エージェント協調）

### 概要

Multi-Agentは、**複数の専門化されたエージェントを協調させて複雑なタスクを解決**するパターンです。1人の万能なエージェントよりも、専門家たちが協力した方が効率的なケースが多いのと同じ理屈です。

### 典型的な役割分担

```
┌─────────────────────────────────────────┐
│            オーケストレーター            │
│         （タスク分配・統合）              │
└─────────────┬─────────────┬─────────────┘
              │             │             │
    ┌─────────▼────┐ ┌──────▼─────┐ ┌─────▼─────┐
    │ リサーチャー  │ │  ライター   │ │  レビュワー│
    │ (情報収集)   │ │ (文章作成) │ │ (品質確認)│
    └──────────────┘ └────────────┘ └───────────┘
```

### コード例（CrewAI風）

```python
from crewai import Agent, Task, Crew

# エージェントの定義
researcher = Agent(
    role='リサーチャー',
    goal='最新のAI技術トレンドを調査する',
    backstory='テック業界の動向に詳しいアナリスト',
    tools=[search_tool],
    verbose=True
)

writer = Agent(
    role='テックライター',
    goal='調査結果を分かりやすい記事にまとめる',
    backstory='5年間テックメディアで執筆経験あり',
    verbose=True
)

editor = Agent(
    role='エディター',
    goal='記事の品質と正確性を確認する',
    backstory='厳格な編集者で、事実確認が徹底している',
    verbose=True
)

# タスクの定義
task1 = Task(
    description='2024年の生成AIトレンドを調査',
    agent=researcher
)

task2 = Task(
    description='調査結果を元に記事を作成',
    agent=writer,
    context=[task1]
)

task3 = Task(
    description='記事のファクトチェックと編集',
    agent=editor,
    context=[task2]
)

# クルーの実行
crew = Crew(
    agents=[researcher, writer, editor],
    tasks=[task1, task2, task3],
    process='sequential'  # 順次実行
)

result = crew.kickoff()
```

### 向いているユースケース

- 複数ドメインの専門知識が必要なタスク
- 品質チェックが重要なコンテンツ作成
- 大規模な調査・分析プロジェクト

---

## パターン比較と使い分け

| パターン | 強み | 弱み | ベストな使いどころ |
|---------|------|------|------------------|
| **ReAct** | 柔軟性、適応力 | 予測困難、無限ループのリスク | 対話的・探索的タスク |
| **Plan-and-Solve** | 予測可能性、効率性 | 計画の固定化、柔軟性の欠如 | 決まった手順のタスク |
| **Multi-Agent** | スケーラビリティ、専門化 | 複雑性、コスト増 | 大規模・複雑なプロジェクト |

### 選択の指針

```
タスクの複雑さと規模で選ぶ：

単純なタスク ──────────────────▶ 複雑なタスク
     │                               │
     ▼                               ▼
  ReAct                    Plan-and-Solve
  (シンプル・即応)          (構造化・効率)
     │                               │
     └──────────┬───────────────────┘
                │
                ▼
          Multi-Agent
         (協調・専門化)
```

---

## 【実装例】LangChainで作るシンプルなReActエージェント

最後に、実際に動作する最小限のReActエージェントをPythonとLangChainで実装します。

```python
import os
from langchain.agents import Tool, AgentExecutor, create_react_agent
from langchain_openai import ChatOpenAI
from langchain import hub

# 1. ツールの定義
def search(query: str) -> str:
    """シミュレートされた検索関数"""
    return f"「{query}」の検索結果: これはサンプル結果です。"

def calculator(expression: str) -> str:
    """計算関数"""
    try:
        result = eval(expression)
        return f"計算結果: {result}"
    except:
        return "計算エラー"

tools = [
    Tool(
        name="Search",
        func=search,
        description="質問に答えるために検索が必要な場合に使用"
    ),
    Tool(
        name="Calculator",
        func=calculator,
        description="計算が必要な場合に使用"
    )
]

# 2. LLMとエージェントの設定
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# ReActプロンプトを取得
prompt = hub.pull("hwchase17/react")

# エージェントの作成
agent = create_react_agent(llm, tools, prompt)
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,
    max_iterations=10
)

# 3. 実行
if __name__ == "__main__":
    response = agent_executor.invoke({
        "input": "100に37を掛けた結果を教えて"
    })
    print(f"\n最終回答: {response['output']}")
```

### 実行結果の例

```
> 100に37を掛けた結果を教えて

Entering new AgentExecutor chain...
思考: この質問は計算が必要です。Calculatorツールを使います。
行動: Calculator
行動の入力: 100 * 37
観察: 計算結果: 3700
思考: 結果が得られました。回答します。
最終回答: 3700

Finished chain.
最終回答: 3700
```

---

## まとめ

AIエージェントの設計には、明確なパターンが存在します。

- **ReAct**：思考と行動を交互に繰り返し、柔軟に対応
- **Plan-and-Solve**：計画を立てて効率的に実行
- **Multi-Agent**：専門家たちが協力して大規模タスクを解決

これらを使い分けることで、単なる「賢いチャットボット」から、本当に自律的に仕事をこなすAIシステムへと進化できます。

Webエンジニアの皆さんは、まずはReActパターンから始めて、LangChainやCrewAIなどのフレームワークに慣れることをお勧めします。小さなエージェントを作ってみることで、AIが持つ新しい可能性を実感できるはずです。

次のステップとしては、実際の業務で自動化できる小さなタスクを見つけ、エージェント化に挑戦してみてください。

---

## 参考リンク

- [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)
- [LangChain Documentation](https://python.langchain.com/)
- [CrewAI - Multi-Agent Framework](https://www.crewai.com/)
- [Plan-and-Solve Prompting](https://arxiv.org/abs/2305.04091)
