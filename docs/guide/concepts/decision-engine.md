# 决策引擎

决策引擎是 SmartAgent 的核心组件，负责根据输入自动选择最合适的 Skills 和 Tools。

## 工作原理

决策引擎使用多种策略来决定如何处理输入：

1. **嵌入相似度** - 计算输入与 Skills 的语义相似度
2. **关键词匹配** - 基于关键词的匹配算法
3. **决策缓存** - 缓存决策结果以提高性能
4. **置信度评估** - 评估决策的可信度

## 决策流程

```
用户输入
    │
    ▼
┌─────────────────┐
│  预处理         │
│  - 分词         │
│  - 嵌入         │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐  ┌────────┐
│关键词 │  │嵌入    │
│匹配   │  │相似度  │
└───┬───┘  └───┬────┘
    │          │
    └────┬─────┘
         ▼
┌─────────────────┐
│  决策生成       │
│  - 类型选择     │
│  - 置信度计算   │
└────────┬────────┘
         ▼
┌─────────────────┐
│  决策结果       │
│  {type, skills} │
└─────────────────┘
```

## 配置决策引擎

```typescript
import { SmartAgent } from 'sdkwork-browser-agent';

const agent = new SmartAgent({
  decisionEngine: {
    // 启用嵌入相似度计算
    enableEmbeddings: true,

    // 启用决策缓存
    enableCaching: true,

    // 基础匹配阈值（0-1）
    threshold: 0.6,

    // 嵌入相似度阈值
    similarityThreshold: 0.5,

    // 最大选择的 Skills 数
    maxSkills: 3,
  },
});
```

## 决策类型

### 1. Skill 决策

当输入匹配一个或多个 Skills：

```typescript
{
  type: 'skill',
  skills: ['calculate'],
  confidence: 0.85,
  reasoning: 'Single skill match: calculate',
}
```

### 2. Tool 决策

当需要执行 Tool：

```typescript
{
  type: 'tool',
  tools: ['http_request'],
  confidence: 0.72,
  reasoning: 'Tool match: http_request',
}
```

### 3. LLM 决策

当没有匹配的 Skill/Tool：

```typescript
{
  type: 'llm',
  confidence: 1.0,
  reasoning: 'No relevant skills found, using LLM directly',
}
```

### 4. 混合决策

当需要多个组件：

```typescript
{
  type: 'multi',
  skills: ['search', 'summarize'],
  tools: ['http_request'],
  confidence: 0.78,
  reasoning: 'Multiple matches: search, summarize',
  fallback: 'llm',
}
```

## 嵌入相似度

### 简单嵌入提供器

默认使用基于 TF-IDF 的简单嵌入：

```typescript
import { SimpleEmbeddingProvider } from 'sdkwork-browser-agent';

const provider = new SimpleEmbeddingProvider();

// 嵌入文本
const embedding = await provider.embed('Calculate 2 + 2');

// 计算相似度
const similarity = provider.similarity(embedding1, embedding2);
// 返回 0-1 之间的值
```

### 自定义嵌入提供器

你可以使用自己的嵌入模型：

```typescript
import { EmbeddingProvider } from 'sdkwork-browser-agent';

class MyEmbeddingProvider implements EmbeddingProvider {
  async embed(text: string): Promise<number[]> {
    // 使用你的嵌入模型
    const embedding = await myEmbeddingModel.embed(text);
    return embedding;
  }

  similarity(a: number[], b: number[]): number {
    // 余弦相似度
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

const agent = new SmartAgent({
  decisionEngine: {
    // 使用自定义提供器
  },
});
```

## Skill 索引

决策引擎需要预先索引 Skills：

```typescript
// SmartAgent 会自动索引
await agent.initialize();

// 手动索引新 Skill
const newSkill: Skill = {
  /* ... */
};
await agent.decisionEngine.indexSkill(newSkill);
```

## 决策缓存

启用缓存可以提高重复查询的性能：

```typescript
const agent = new SmartAgent({
  decisionEngine: {
    enableCaching: true,
  },
});

// 第一次查询 - 计算决策
const result1 = await agent.process('Calculate 2+2');

// 第二次查询 - 使用缓存
const result2 = await agent.process('Calculate 2+2'); // 更快！

// 查看缓存统计
const stats = agent.decisionEngine.getCacheStats();
console.log(stats); // { size: 10 }

// 清空缓存
agent.decisionEngine.clearCache();
```

## 决策上下文

决策引擎会考虑以下上下文：

```typescript
interface DecisionContext {
  input: string; // 用户输入
  history?: string[]; // 历史输入
  availableSkills: string[]; // 可用 Skills
  availableTools: string[]; // 可用 Tools
  metadata?: Record<string, unknown>; // 额外元数据
}
```

## 高级用法

### 直接使用决策引擎

```typescript
import { DecisionEngine, DecisionContext } from 'sdkwork-browser-agent';

const engine = new DecisionEngine({
  enableEmbeddings: true,
  threshold: 0.6,
});

// 索引 Skills
for (const skill of skills) {
  await engine.indexSkill(skill);
}

// 做出决策
const context: DecisionContext = {
  input: 'Calculate 2 + 2',
  availableSkills: ['calculate', 'greet'],
  availableTools: [],
};

const decision = await engine.decide(context);
console.log(decision);
```

### 自定义决策策略

你可以实现自己的决策逻辑：

```typescript
class MyDecisionEngine extends DecisionEngine {
  async decide(context: DecisionContext): Promise<Decision> {
    // 你的自定义逻辑

    // 调用父类方法
    const baseDecision = await super.decide(context);

    // 修改决策
    if (context.input.includes('urgent')) {
      return {
        ...baseDecision,
        priority: 'high',
      };
    }

    return baseDecision;
  }
}
```

## 调优建议

### 阈值调整

```typescript
// 严格匹配
const strictAgent = new SmartAgent({
  decisionEngine: {
    threshold: 0.8,
    similarityThreshold: 0.7,
  },
});

// 宽松匹配
const looseAgent = new SmartAgent({
  decisionEngine: {
    threshold: 0.4,
    similarityThreshold: 0.3,
  },
});
```

### 性能优化

```typescript
const agent = new SmartAgent({
  decisionEngine: {
    enableEmbeddings: true, // 启用嵌入（更准确）
    enableCaching: true, // 启用缓存（更快）
    maxSkills: 2, // 限制最大 Skills 数（更快）
  },
});
```

## 调试决策

```typescript
// 查看决策详情
const result = await agent.process('Calculate 2+2');

console.log('Decision:', result.decision);
console.log('Confidence:', result.decision.confidence);
console.log('Reasoning:', result.decision.reasoning);

// 查看执行历史
const history = agent.getExecutionHistory();
history.forEach(record => {
  console.log(`${record.timestamp}: ${record.input}`);
  console.log(`  Type: ${record.decision.type}`);
  console.log(`  Confidence: ${record.decision.confidence}`);
});
```

## 完整示例

```typescript
import { SmartAgent, Skill, DecisionEngine } from 'sdkwork-browser-agent';

async function main() {
  // 创建 Skills
  const skills: Skill[] = [
    {
      name: 'math',
      description: 'Perform mathematical calculations',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string' },
        },
        required: ['expression'],
      },
      handler: async params => ({
        success: true,
        data: eval(params.expression as string),
      }),
    },
    {
      name: 'greet',
      description: 'Greet a user',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      },
      handler: async params => ({
        success: true,
        data: `Hello, ${params.name}!`,
      }),
    },
  ];

  // 创建 Agent
  const agent = new SmartAgent({
    name: 'decision-demo',
    skills,
    decisionEngine: {
      enableEmbeddings: true,
      enableCaching: true,
      threshold: 0.6,
      maxSkills: 2,
    },
  });

  await agent.initialize();

  // 测试不同输入
  const testInputs = [
    'Calculate 10 * 5',
    'Say hello to John',
    'What is the weather today?',
    'Calculate 2 + 2',
    'Calculate 2 + 2', // 重复输入，测试缓存
  ];

  for (const input of testInputs) {
    const start = Date.now();
    const result = await agent.process(input);
    const duration = Date.now() - start;

    console.log(`\nInput: ${input}`);
    console.log(`Type: ${result.decision.type}`);
    console.log(`Confidence: ${result.decision.confidence}`);
    console.log(`Time: ${duration}ms`);
    console.log(`Result: ${result.result}`);
  }

  // 显示缓存统计
  const stats = agent.getDecisionStats();
  console.log('\nCache stats:', stats);

  await agent.destroy();
}

main();
```

## 下一步

- [Token 优化](./token-optimizer.md) - 了解 Token 优化
- [示例](../../examples/smart-decision.md) - 查看更多示例
