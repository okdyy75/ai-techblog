# AI技術の最前線：RAG（Retrieval-Augmented Generation）とファインチューニング

## はじめに

現代のAI技術において、大規模言語モデル（LLM）の性能を向上させる手法として、RAG（Retrieval-Augmented Generation）とファインチューニング（Fine-tuning）が注目を集めています。これらの技術は、それぞれ異なるアプローチでLLMの能力を拡張し、特定のタスクやドメインに特化した高性能なAIシステムを構築することを可能にします。

本記事では、RAGとファインチューニングの技術的詳細、実装方法、応用例、そして適用時の考慮事項について詳しく解説します。

## RAG（Retrieval-Augmented Generation）

### RAGとは

RAGは、大規模言語モデルに外部の知識ベースから関連情報を検索・取得させ、その情報を基により正確で最新の回答を生成する技術です。2020年にFacebookの研究チームによって提案され、現在では多くの実用的なAIシステムで採用されています。

### RAGの基本アーキテクチャ

```
ユーザークエリ → 検索システム → 知識ベース
                      ↓
               関連文書の取得
                      ↓
        LLM（クエリ + 検索結果） → 生成された回答
```

### RAGのコンポーネント

#### 1. 検索システム（Retriever）

**密ベクトル検索**
```python
# Dense Vector Retrievalの例
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

class DenseRetriever:
    def __init__(self, documents, model_name='all-MiniLM-L6-v2'):
        self.encoder = SentenceTransformer(model_name)
        self.documents = documents
        
        # 文書をベクトル化
        self.doc_embeddings = self.encoder.encode(documents)
        
        # FAISSインデックスの構築
        self.index = faiss.IndexFlatIP(self.doc_embeddings.shape[1])
        self.index.add(self.doc_embeddings.astype('float32'))
    
    def search(self, query, k=5):
        query_embedding = self.encoder.encode([query])
        scores, indices = self.index.search(query_embedding.astype('float32'), k)
        
        return [
            {'document': self.documents[idx], 'score': score}
            for idx, score in zip(indices[0], scores[0])
        ]
```

**ハイブリッド検索**
```python
# Sparse + Dense Hybrid Searchの例
from rank_bm25 import BM25Okapi
import numpy as np

class HybridRetriever:
    def __init__(self, documents, dense_weight=0.7):
        self.documents = documents
        self.dense_weight = dense_weight
        self.sparse_weight = 1 - dense_weight
        
        # Dense retriever
        self.dense_retriever = DenseRetriever(documents)
        
        # Sparse retriever (BM25)
        tokenized_docs = [doc.split() for doc in documents]
        self.bm25 = BM25Okapi(tokenized_docs)
    
    def search(self, query, k=5):
        # Dense search
        dense_results = self.dense_retriever.search(query, k*2)
        
        # Sparse search
        sparse_scores = self.bm25.get_scores(query.split())
        sparse_results = [
            {'document': doc, 'score': score}
            for doc, score in zip(self.documents, sparse_scores)
        ]
        sparse_results = sorted(sparse_results, key=lambda x: x['score'], reverse=True)[:k*2]
        
        # スコアの正規化と統合
        combined_scores = {}
        for result in dense_results:
            doc = result['document']
            combined_scores[doc] = self.dense_weight * result['score']
        
        for result in sparse_results:
            doc = result['document']
            if doc in combined_scores:
                combined_scores[doc] += self.sparse_weight * result['score']
            else:
                combined_scores[doc] = self.sparse_weight * result['score']
        
        # 最終結果の生成
        final_results = sorted(
            [{'document': doc, 'score': score} for doc, score in combined_scores.items()],
            key=lambda x: x['score'],
            reverse=True
        )[:k]
        
        return final_results
```

#### 2. 生成システム（Generator）

```python
# RAG生成の実装例
import openai
from typing import List, Dict

class RAGGenerator:
    def __init__(self, api_key: str, model: str = "gpt-3.5-turbo"):
        openai.api_key = api_key
        self.model = model
    
    def generate_response(self, query: str, retrieved_docs: List[Dict]) -> str:
        # 検索結果をコンテキストとして構築
        context = "\n\n".join([
            f"Document {i+1}: {doc['document']}"
            for i, doc in enumerate(retrieved_docs)
        ])
        
        prompt = f"""
以下の文書を参考にして、ユーザーの質問に答えてください。

参考文書:
{context}

質問: {query}

回答:"""
        
        response = openai.ChatCompletion.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "あなたは提供された文書を基に正確な情報を提供する専門家です。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )
        
        return response.choices[0].message.content
```

### RAGの実装パターン

#### 1. シンプルRAG
```python
class SimpleRAG:
    def __init__(self, documents, openai_api_key):
        self.retriever = HybridRetriever(documents)
        self.generator = RAGGenerator(openai_api_key)
    
    def query(self, question: str, k: int = 3) -> str:
        # ステップ1: 関連文書の検索
        retrieved_docs = self.retriever.search(question, k)
        
        # ステップ2: 生成
        response = self.generator.generate_response(question, retrieved_docs)
        
        return response
```

#### 2. マルチステップRAG
```python
class MultiStepRAG:
    def __init__(self, documents, openai_api_key):
        self.retriever = HybridRetriever(documents)
        self.generator = RAGGenerator(openai_api_key)
    
    def query(self, question: str) -> str:
        # ステップ1: 質問の分解
        sub_questions = self._decompose_question(question)
        
        all_context = []
        
        # ステップ2: 各サブ質問に対する検索と回答
        for sub_q in sub_questions:
            retrieved_docs = self.retriever.search(sub_q, k=3)
            sub_answer = self.generator.generate_response(sub_q, retrieved_docs)
            all_context.append(f"Q: {sub_q}\nA: {sub_answer}")
        
        # ステップ3: 統合回答の生成
        final_context = "\n\n".join(all_context)
        final_prompt = f"""
以下の情報を統合して、元の質問に包括的に答えてください。

統合情報:
{final_context}

元の質問: {question}

最終回答:"""
        
        return self.generator.generate_response(final_prompt, [])
    
    def _decompose_question(self, question: str) -> List[str]:
        # 質問分解のロジック
        decompose_prompt = f"""
以下の複雑な質問を、より具体的で答えやすい3-5個のサブ質問に分解してください。

質問: {question}

サブ質問:"""
        
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": decompose_prompt}],
            temperature=0.1
        )
        
        # レスポンスからサブ質問を抽出
        sub_questions = response.choices[0].message.content.strip().split('\n')
        return [q.strip('- ').strip() for q in sub_questions if q.strip()]
```

#### 3. 適応的RAG（Adaptive RAG）
```python
class AdaptiveRAG:
    def __init__(self, documents, openai_api_key):
        self.retriever = HybridRetriever(documents)
        self.generator = RAGGenerator(openai_api_key)
    
    def query(self, question: str) -> str:
        # ステップ1: 質問の複雑度評価
        complexity = self._assess_complexity(question)
        
        if complexity == "simple":
            return self._simple_rag(question)
        elif complexity == "medium":
            return self._multi_step_rag(question)
        else:
            return self._iterative_rag(question)
    
    def _assess_complexity(self, question: str) -> str:
        # 質問の複雑度を評価するロジック
        complexity_prompt = f"""
以下の質問の複雑度を評価してください。
- simple: 単一の事実確認や基本的な質問
- medium: 複数の概念を組み合わせた質問
- complex: 深い分析や推論が必要な質問

質問: {question}

複雑度:"""
        
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": complexity_prompt}],
            temperature=0.1
        )
        
        return response.choices[0].message.content.strip().lower()
    
    def _iterative_rag(self, question: str, max_iterations: int = 3) -> str:
        context = []
        current_question = question
        
        for i in range(max_iterations):
            # 検索
            retrieved_docs = self.retriever.search(current_question, k=5)
            
            # 中間回答の生成
            intermediate_response = self.generator.generate_response(current_question, retrieved_docs)
            context.append(intermediate_response)
            
            # 次の反復が必要かを判定
            if self._is_sufficient(question, intermediate_response):
                break
            
            # 次の質問を生成
            current_question = self._generate_follow_up(question, context)
        
        # 最終回答の統合
        return self._synthesize_final_answer(question, context)
```

### RAGの評価手法

#### 1. 検索品質の評価
```python
def evaluate_retrieval(retriever, test_queries, ground_truth):
    """
    検索品質の評価
    """
    metrics = {
        'precision_at_k': [],
        'recall_at_k': [],
        'mrr': [],  # Mean Reciprocal Rank
        'ndcg': []  # Normalized Discounted Cumulative Gain
    }
    
    for query, relevant_docs in zip(test_queries, ground_truth):
        retrieved = retriever.search(query, k=10)
        retrieved_ids = [doc['id'] for doc in retrieved]
        
        # Precision@K
        relevant_retrieved = len(set(retrieved_ids[:5]) & set(relevant_docs))
        metrics['precision_at_k'].append(relevant_retrieved / 5)
        
        # Recall@K
        metrics['recall_at_k'].append(relevant_retrieved / len(relevant_docs))
        
        # MRR
        for i, doc_id in enumerate(retrieved_ids):
            if doc_id in relevant_docs:
                metrics['mrr'].append(1 / (i + 1))
                break
        else:
            metrics['mrr'].append(0)
    
    return {k: np.mean(v) for k, v in metrics.items()}
```

#### 2. 生成品質の評価
```python
from rouge_score import rouge_scorer
from bert_score import score

def evaluate_generation(generated_answers, reference_answers):
    """
    生成品質の評価
    """
    # ROUGE Score
    scorer = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], use_stemmer=True)
    rouge_scores = []
    
    for gen, ref in zip(generated_answers, reference_answers):
        scores = scorer.score(ref, gen)
        rouge_scores.append({
            'rouge1': scores['rouge1'].fmeasure,
            'rouge2': scores['rouge2'].fmeasure,
            'rougeL': scores['rougeL'].fmeasure
        })
    
    # BERTScore
    P, R, F1 = score(generated_answers, reference_answers, lang='ja')
    
    return {
        'rouge': {k: np.mean([s[k] for s in rouge_scores]) for k in rouge_scores[0].keys()},
        'bert_score': {
            'precision': P.mean().item(),
            'recall': R.mean().item(),
            'f1': F1.mean().item()
        }
    }
```

## ファインチューニング（Fine-tuning）

### ファインチューニングとは

ファインチューニングは、事前学習済みの大規模言語モデルを特定のタスクやドメインに適応させるために、追加の学習データで再学習する手法です。元のモデルの知識を保持しながら、特定の用途に最適化することができます。

### ファインチューニングの種類

#### 1. フルファインチューニング
```python
import torch
from transformers import (
    AutoTokenizer, 
    AutoModelForCausalLM, 
    TrainingArguments, 
    Trainer,
    DataCollatorForLanguageModeling
)
from datasets import Dataset

class FullFineTuner:
    def __init__(self, model_name: str, output_dir: str):
        self.model_name = model_name
        self.output_dir = output_dir
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLM.from_pretrained(model_name)
        
        # パディングトークンの設定
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
    
    def prepare_dataset(self, texts: list, max_length: int = 512):
        """
        テキストデータの前処理
        """
        def tokenize_function(examples):
            return self.tokenizer(
                examples['text'], 
                truncation=True, 
                padding=True, 
                max_length=max_length
            )
        
        dataset = Dataset.from_dict({'text': texts})
        tokenized_dataset = dataset.map(tokenize_function, batched=True)
        
        return tokenized_dataset
    
    def train(self, train_dataset, eval_dataset=None, epochs: int = 3):
        """
        モデルの学習
        """
        training_args = TrainingArguments(
            output_dir=self.output_dir,
            overwrite_output_dir=True,
            num_train_epochs=epochs,
            per_device_train_batch_size=4,
            per_device_eval_batch_size=4,
            warmup_steps=500,
            weight_decay=0.01,
            logging_dir=f'{self.output_dir}/logs',
            logging_steps=100,
            save_steps=1000,
            evaluation_strategy="steps" if eval_dataset else "no",
            eval_steps=1000 if eval_dataset else None,
            save_total_limit=2,
            prediction_loss_only=True,
            remove_unused_columns=False,
        )
        
        data_collator = DataCollatorForLanguageModeling(
            tokenizer=self.tokenizer,
            mlm=False,
        )
        
        trainer = Trainer(
            model=self.model,
            args=training_args,
            data_collator=data_collator,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
        )
        
        trainer.train()
        trainer.save_model()
```

#### 2. LoRA（Low-Rank Adaptation）
```python
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
import torch

class LoRAFineTuner:
    def __init__(self, model_name: str, output_dir: str):
        self.model_name = model_name
        self.output_dir = output_dir
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        
        # 基本モデルの読み込み
        self.model = AutoModelForCausalLM.from_pretrained(
            model_name,
            load_in_8bit=True,  # メモリ効率化
            device_map="auto",
            torch_dtype=torch.float16
        )
        
        # LoRAの設定
        lora_config = LoraConfig(
            r=16,  # rank
            lora_alpha=32,
            target_modules=["q_proj", "v_proj"],  # 対象レイヤー
            lora_dropout=0.1,
            bias="none",
            task_type="CAUSAL_LM"
        )
        
        # モデルの準備
        self.model = prepare_model_for_kbit_training(self.model)
        self.model = get_peft_model(self.model, lora_config)
        
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
    
    def print_trainable_parameters(self):
        """
        学習可能パラメータ数の表示
        """
        trainable_params = 0
        all_param = 0
        for _, param in self.model.named_parameters():
            all_param += param.numel()
            if param.requires_grad:
                trainable_params += param.numel()
        
        print(f"trainable params: {trainable_params:,d}")
        print(f"all params: {all_param:,d}")
        print(f"trainable%: {100 * trainable_params / all_param:.4f}")
    
    def train(self, train_dataset, eval_dataset=None, epochs: int = 3):
        """
        LoRAを使った学習
        """
        training_args = TrainingArguments(
            output_dir=self.output_dir,
            num_train_epochs=epochs,
            per_device_train_batch_size=2,
            gradient_accumulation_steps=4,
            optim="paged_adamw_32bit",
            save_steps=500,
            logging_steps=25,
            learning_rate=2e-4,
            weight_decay=0.001,
            fp16=False,
            bf16=False,
            max_grad_norm=0.3,
            max_steps=-1,
            warmup_ratio=0.03,
            group_by_length=True,
            lr_scheduler_type="constant",
            report_to="tensorboard"
        )
        
        trainer = Trainer(
            model=self.model,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
            args=training_args,
            data_collator=DataCollatorForLanguageModeling(
                tokenizer=self.tokenizer, 
                mlm=False
            ),
        )
        
        trainer.train()
        trainer.save_model()
```

#### 3. QLoRA（Quantized LoRA）
```python
from transformers import BitsAndBytesConfig

class QLoRAFineTuner:
    def __init__(self, model_name: str, output_dir: str):
        self.model_name = model_name
        self.output_dir = output_dir
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        
        # 4bit量子化の設定
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16
        )
        
        # モデルの読み込み
        self.model = AutoModelForCausalLM.from_pretrained(
            model_name,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True
        )
        
        # LoRA設定
        lora_config = LoraConfig(
            r=64,
            lora_alpha=16,
            target_modules=[
                "q_proj", "k_proj", "v_proj", "o_proj",
                "gate_proj", "up_proj", "down_proj",
            ],
            bias="none",
            lora_dropout=0.1,
            task_type="CAUSAL_LM",
        )
        
        self.model = prepare_model_for_kbit_training(self.model)
        self.model = get_peft_model(self.model, lora_config)
```

### ファインチューニングのデータ準備

#### 1. 指示調整（Instruction Tuning）
```python
def create_instruction_dataset(instructions_data):
    """
    指示調整用のデータセット作成
    """
    formatted_data = []
    
    for item in instructions_data:
        instruction = item['instruction']
        input_text = item.get('input', '')
        output = item['output']
        
        if input_text:
            prompt = f"""### 指示:
{instruction}

### 入力:
{input_text}

### 回答:
{output}"""
        else:
            prompt = f"""### 指示:
{instruction}

### 回答:
{output}"""
        
        formatted_data.append(prompt)
    
    return formatted_data

# 使用例
instruction_data = [
    {
        "instruction": "以下のテキストを要約してください。",
        "input": "人工知能（AI）は近年急速に発展しており...",
        "output": "人工知能は急速に発展し、様々な分野で活用されている..."
    },
    # ... more data
]

formatted_texts = create_instruction_dataset(instruction_data)
```

#### 2. 会話調整（Conversation Tuning）
```python
def create_conversation_dataset(conversations):
    """
    会話データの整形
    """
    formatted_data = []
    
    for conversation in conversations:
        dialogue = ""
        for turn in conversation['turns']:
            role = turn['role']  # 'user' or 'assistant'
            content = turn['content']
            
            if role == 'user':
                dialogue += f"Human: {content}\n\n"
            else:
                dialogue += f"Assistant: {content}\n\n"
        
        formatted_data.append(dialogue.strip())
    
    return formatted_data
```

### ファインチューニングの評価

#### 1. パープレキシティ（Perplexity）
```python
def calculate_perplexity(model, tokenizer, test_texts):
    """
    パープレキシティの計算
    """
    model.eval()
    total_loss = 0
    total_tokens = 0
    
    with torch.no_grad():
        for text in test_texts:
            inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
            outputs = model(**inputs, labels=inputs["input_ids"])
            
            loss = outputs.loss
            num_tokens = inputs["input_ids"].numel()
            
            total_loss += loss.item() * num_tokens
            total_tokens += num_tokens
    
    avg_loss = total_loss / total_tokens
    perplexity = torch.exp(torch.tensor(avg_loss))
    
    return perplexity.item()
```

#### 2. タスク特化評価
```python
def evaluate_task_performance(model, tokenizer, test_cases):
    """
    特定タスクでの性能評価
    """
    correct = 0
    total = len(test_cases)
    
    for case in test_cases:
        prompt = case['prompt']
        expected = case['expected']
        
        inputs = tokenizer(prompt, return_tensors="pt")
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=100,
                temperature=0.1,
                pad_token_id=tokenizer.eos_token_id
            )
        
        generated = tokenizer.decode(outputs[0], skip_special_tokens=True)
        response = generated[len(prompt):].strip()
        
        # 評価ロジック（タスクに応じて調整）
        if expected.lower() in response.lower():
            correct += 1
    
    accuracy = correct / total
    return accuracy
```

## RAG vs ファインチューニング：選択指針

### 比較表

| 側面 | RAG | ファインチューニング |
|------|-----|---------------------|
| **更新頻度** | リアルタイム更新可能 | 再学習が必要 |
| **コスト** | 推論時のコスト高 | 学習時のコスト高 |
| **精度** | 検索品質に依存 | 高品質なデータで高精度 |
| **透明性** | 参照先が明確 | ブラックボックス |
| **実装複雑度** | 中程度 | 高い |
| **メンテナンス** | 知識ベース更新のみ | モデル再学習 |

### 適用シナリオ

#### RAGが適している場合
- **最新情報が重要**: ニュース、市場データ、技術文書
- **事実確認が重要**: 法律、医療、学術分野
- **透明性が求められる**: 情報源の明示が必要
- **頻繁な更新**: 情報が日々変化する環境

#### ファインチューニングが適している場合
- **特定のスタイル**: 文章生成、翻訳スタイル
- **ドメイン特化**: 専門用語、業界慣習
- **一貫性重視**: ブランドトーン、対応方針
- **レスポンス速度**: 高速な推論が必要

### ハイブリッドアプローチ

```python
class HybridRAGFineTuned:
    def __init__(self, fine_tuned_model, retriever):
        self.model = fine_tuned_model
        self.retriever = retriever
    
    def generate_response(self, query: str) -> str:
        # ステップ1: 関連情報の検索
        retrieved_docs = self.retriever.search(query, k=3)
        
        # ステップ2: ファインチューニング済みモデルで生成
        context = "\n".join([doc['document'] for doc in retrieved_docs])
        
        prompt = f"""参考情報:
{context}

質問: {query}

回答:"""
        
        inputs = self.tokenizer(prompt, return_tensors="pt")
        outputs = self.model.generate(**inputs, max_new_tokens=200)
        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        return response[len(prompt):].strip()
```

## 実装時の考慮事項

### パフォーマンス最適化

#### 1. RAGの最適化
```python
# キャッシュ機能付きRAG
class CachedRAG:
    def __init__(self, retriever, generator, cache_size=1000):
        self.retriever = retriever
        self.generator = generator
        self.cache = {}
        self.cache_size = cache_size
    
    def query(self, question: str) -> str:
        # キャッシュチェック
        if question in self.cache:
            return self.cache[question]
        
        # 通常のRAG処理
        retrieved_docs = self.retriever.search(question, k=3)
        response = self.generator.generate_response(question, retrieved_docs)
        
        # キャッシュに保存
        if len(self.cache) >= self.cache_size:
            # 最も古いエントリを削除（LRU）
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
        
        self.cache[question] = response
        return response
```

#### 2. 効率的なベクトル検索
```python
# 階層的インデックス
class HierarchicalRetriever:
    def __init__(self, documents, cluster_size=100):
        self.documents = documents
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        
        # 文書のクラスタリング
        embeddings = self.encoder.encode(documents)
        from sklearn.cluster import KMeans
        
        n_clusters = len(documents) // cluster_size
        self.kmeans = KMeans(n_clusters=n_clusters)
        cluster_labels = self.kmeans.fit_predict(embeddings)
        
        # クラスター別のインデックス構築
        self.cluster_indices = {}
        for i, label in enumerate(cluster_labels):
            if label not in self.cluster_indices:
                self.cluster_indices[label] = []
            self.cluster_indices[label].append(i)
    
    def search(self, query: str, k: int = 5) -> List[Dict]:
        # クエリのクラスター予測
        query_embedding = self.encoder.encode([query])
        cluster_id = self.kmeans.predict(query_embedding)[0]
        
        # 関連クラスターから検索
        candidate_indices = self.cluster_indices.get(cluster_id, [])
        
        # より詳細な検索
        candidate_docs = [self.documents[i] for i in candidate_indices]
        candidate_embeddings = self.encoder.encode(candidate_docs)
        
        # 類似度計算
        similarities = cosine_similarity(query_embedding, candidate_embeddings)[0]
        
        # トップK取得
        top_indices = similarities.argsort()[-k:][::-1]
        
        return [
            {
                'document': candidate_docs[i],
                'score': similarities[i],
                'original_index': candidate_indices[i]
            }
            for i in top_indices
        ]
```

### セキュリティとプライバシー

#### 1. データマスキング
```python
import re

class PrivacyAwareRAG:
    def __init__(self, retriever, generator):
        self.retriever = retriever
        self.generator = generator
        
        # 個人情報パターン
        self.pii_patterns = {
            'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            'phone': r'\b\d{3}-\d{4}-\d{4}\b',
            'credit_card': r'\b\d{4}-\d{4}-\d{4}-\d{4}\b'
        }
    
    def mask_pii(self, text: str) -> str:
        masked_text = text
        for pii_type, pattern in self.pii_patterns.items():
            masked_text = re.sub(pattern, f'[{pii_type.upper()}]', masked_text)
        return masked_text
    
    def query(self, question: str) -> str:
        # 質問のマスキング
        masked_question = self.mask_pii(question)
        
        # 通常のRAG処理
        retrieved_docs = self.retriever.search(masked_question, k=3)
        
        # 検索結果のマスキング
        for doc in retrieved_docs:
            doc['document'] = self.mask_pii(doc['document'])
        
        response = self.generator.generate_response(masked_question, retrieved_docs)
        
        return self.mask_pii(response)
```

#### 2. アクセス制御
```python
class SecureRAG:
    def __init__(self, retriever, generator, access_control):
        self.retriever = retriever
        self.generator = generator
        self.access_control = access_control
    
    def query(self, question: str, user_id: str) -> str:
        # ユーザー権限チェック
        user_permissions = self.access_control.get_permissions(user_id)
        
        # 検索実行
        all_results = self.retriever.search(question, k=10)
        
        # 権限に基づくフィルタリング
        filtered_results = []
        for doc in all_results:
            doc_category = doc.get('category', 'public')
            if doc_category in user_permissions:
                filtered_results.append(doc)
        
        if not filtered_results:
            return "申し訳ございませんが、アクセス権限のある情報が見つかりませんでした。"
        
        # 上位K件に制限
        top_results = filtered_results[:3]
        
        return self.generator.generate_response(question, top_results)
```

## まとめ

RAGとファインチューニングは、それぞれ異なる強みを持つAI技術です：

### RAGの特徴
- **柔軟性**: 知識ベースの更新が容易
- **透明性**: 情報源の追跡可能
- **コスト効率**: 大規模な再学習が不要

### ファインチューニングの特徴
- **特化性**: ドメイン特化の高性能
- **一貫性**: 安定した出力品質
- **効率性**: 推論時の高速処理

### 選択指針
- **最新性重視** → RAG
- **専門性重視** → ファインチューニング
- **両方のメリット** → ハイブリッド手法

適切な技術選択により、ビジネス要件に最適化されたAIシステムを構築することが可能です。今後は、これらの技術の組み合わせや新しいアプローチの開発が期待されます。