# 向量记忆系统

SDKWork Browser Agent 提供完整的向量记忆系统，支持多 Provider 嵌入和向量数据库。

## 概述

向量记忆系统包含两个核心组件：

1. **Embedding Provider** - 文本嵌入生成
2. **Vector Database** - 向量存储和检索

## Embedding Provider

支持多种嵌入提供器，自动降级保证可用性。

### 基本使用

```typescript
import { EmbeddingProviderFactory } from 'sdkwork-browser-agent/embeddings';

// OpenAI
const openaiEmbedder = EmbeddingProviderFactory.create({
  provider: 'openai',
  model: 'text-embedding-3-small',
  dimensions: 1536,
});

// 生成嵌入
const vector = await openaiEmbedder.embed('要嵌入的文本');
console.log(vector.length); // 1536

// 批量嵌入
const vectors = await openaiEmbedder.embedBatch(['文本1', '文本2', '文本3']);
```

### 支持的 Provider

| Provider | 模型 | 维度 | 特点 |
|----------|------|------|------|
| `openai` | text-embedding-3-small | 1536 | 高质量 |
| `openai` | text-embedding-3-large | 3072 | 最高质量 |
| `local` | all-MiniLM-L6-v2 | 384 | 本地运行 |
| `transformers` | 多种 | 可变 | 浏览器端 |
| `tfidf` | - | 384 | 通用 Fallback |

### 高级配置

```typescript
const embedder = EmbeddingProviderFactory.create({
  provider: 'openai',
  model: 'text-embedding-3-small',
  dimensions: 1536,
  batchSize: 32,
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
  cacheEnabled: true,
  cacheSize: 1000,
  normalize: true,
  quantization: 'none', // 'none' | 'int8' | 'binary'
});
```

### 嵌入服务

高级功能：聚类、相似度计算、批量处理

```typescript
import { EmbeddingService } from 'sdkwork-browser-agent/embeddings';

const service = new EmbeddingService(embedder);

// 计算相似度
const similarity = service.calculateSimilarity(vector1, vector2);

// 搜索最相似
const results = service.findMostSimilar(queryVector, documentVectors, 5);

// 聚类分析
const clusters = service.cluster(vectors, 3);
```

## Vector Database

统一接口支持多种向量数据库。

### 基本使用

```typescript
import { VectorDatabaseFactory } from 'sdkwork-browser-agent/memory';

// 创建内存数据库
const db = VectorDatabaseFactory.createMemory({
  dimension: 1536,
  metric: 'cosine',
  cacheEnabled: true,
});

await db.initialize();

// 插入文档
await db.insert({
  id: 'doc-1',
  vector: await embedder.embed('文档内容'),
  content: '文档内容',
  metadata: { category: 'tech', author: 'user1' },
});

// 搜索
const results = await db.search(queryVector, {
  limit: 10,
  threshold: 0.7,
  filter: { category: 'tech' },
});
```

### 支持的数据库

| 数据库 | 类型 | 适用场景 |
|--------|------|----------|
| `memory` | 内存 | 开发测试 |
| `pinecone` | 托管 | 生产环境 |
| `weaviate` | 开源 | 自托管 |
| `qdrant` | 高性能 | 大规模数据 |
| `milvus` | 分布式 | 企业级 |
| `chroma` | 嵌入式 | 轻量级 |

### 混合搜索

结合向量相似度和文本匹配：

```typescript
const results = await db.hybridSearch('查询文本', queryVector, {
  fusionType: 'rrf', // Reciprocal Rank Fusion
  vectorWeight: 0.7,
  textQuery: '查询文本',
  limit: 10,
});
```

### 元数据过滤

```typescript
// 精确匹配
const results = await db.filterSearch({ category: 'tech' });

// 比较操作
const results = await db.filterSearch({
  score: { $gt: 0.8 },
  date: { $gte: '2024-01-01' },
});

// 数组包含
const results = await db.filterSearch({
  tags: { $in: ['ai', 'ml'] },
});
```

## 数据库管理器

简化多数据库管理：

```typescript
import { VectorDatabaseManager } from 'sdkwork-browser-agent/memory';

const manager = new VectorDatabaseManager(embedder);

// 创建多个数据库
manager.createMemoryDB('documents', { dimension: 1536 });
manager.createMemoryDB('conversations', { dimension: 1536 });

// 自动嵌入并插入
await manager.insertWithEmbedding('documents', 'doc-1', '文本内容', {
  category: 'tech',
});

// 文本搜索（自动嵌入）
const results = await manager.searchByText('documents', '查询文本', {
  limit: 5,
});

// 批量插入
await manager.insertBatchWithEmbedding('documents', [
  { id: '1', content: '文本1', metadata: {} },
  { id: '2', content: '文本2', metadata: {} },
]);
```

## 与 Agent 集成

```typescript
import { SmartAgent } from 'sdkwork-browser-agent';
import { VectorDatabaseManager } from 'sdkwork-browser-agent/memory';
import { EmbeddingProviderFactory } from 'sdkwork-browser-agent/embeddings';

const embedder = EmbeddingProviderFactory.create({
  provider: 'openai',
  model: 'text-embedding-3-small',
});

const memoryManager = new VectorDatabaseManager(embedder);
memoryManager.createMemoryDB('agent-memory', { dimension: 1536 });

const agent = new SmartAgent({
  name: 'memory-agent',
  llmProvider: new OpenAIProvider({ apiKey: 'xxx' }),
  memoryManager,
});

// 自动使用记忆
const result = await agent.process('我们上次讨论了什么？');
```

## 性能优化

### 缓存策略

```typescript
const db = VectorDatabaseFactory.createMemory({
  dimension: 1536,
  cacheEnabled: true,
  cacheSize: 1000, // 缓存最近 1000 个查询
});
```

### 批量操作

```typescript
// 批量插入比单条插入快 10 倍以上
await db.insertBatch(documents);

// 批量获取
const docs = await db.getByIds(['id1', 'id2', 'id3']);
```

### 索引优化

```typescript
// 创建索引（部分数据库支持）
await db.createIndex?.({
  field: 'metadata.category',
  type: 'string',
});
```

## 最佳实践

1. **选择合适的维度** - 1536 是较好的平衡点
2. **启用缓存** - 减少重复嵌入计算
3. **批量操作** - 提高吞吐量
4. **元数据过滤** - 减少搜索空间
5. **定期清理** - 删除过期数据
6. **监控性能** - 跟踪查询延迟和命中率
