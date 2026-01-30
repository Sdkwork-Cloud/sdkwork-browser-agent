# SmartAgent

SmartAgent 是 Agent 的智能版本，具备自动决策、动态加载和 Token 优化能力。

## 什么是 SmartAgent？

SmartAgent 在基础 Agent 之上添加了：

- **决策引擎** - 自动选择最合适的 Skill
- **动态加载器** - 按需加载 Skills
- **Token 优化器** - 最小化 Token 消耗

## 创建 SmartAgent

```typescript
import { SmartAgent, OpenAIProvider, builtInSkills } from 'sdkwork-browser-agent';

const agent = new SmartAgent({
  name: 'smart-agent',
  llmProvider: new OpenAIProvider({ apiKey: 'xxx' }),
  skills: builtInSkills,
  autoDecide: true, // 启用自动决策
});

await agent.initialize();
```

## 自动处理

`process()` 方法是 SmartAgent 的核心：

```typescript
const result = await agent.process('Calculate 2 + 2');

console.log(result.decision);
// {
//   type: 'skill',
//   skills: ['math'],
//   confidence: 0.92,
//   reasoning: 'Single skill match: math'
// }

console.log(result.result); // 4
console.log(result.executionTime); // 1200 (ms)
```

## 决策类型

SmartAgent 会做出以下类型的决策：

### 1. Skill 决策

当输入匹配某个 Skill 时：

```typescript
{
  type: 'skill',
  skills: ['calculate'],
  confidence: 0.85,
}
```

### 2. Tool 决策

当需要执行 Tool 时：

```typescript
{
  type: 'tool',
  tools: ['http_request'],
  confidence: 0.78,
}
```

### 3. LLM 决策

当没有匹配的 Skill/Tool 时：

```typescript
{
  type: 'llm',
  confidence: 1.0,
  reasoning: 'No relevant skills found'
}
```

### 4. 混合决策

当需要多个 Skills/Tools 时：

```typescript
{
  type: 'multi',
  skills: ['search', 'summarize'],
  tools: ['http_request'],
  confidence: 0.82,
}
```

## 配置决策引擎

```typescript
const agent = new SmartAgent({
  decisionEngine: {
    enableEmbeddings: true, // 启用嵌入相似度
    enableCaching: true, // 启用决策缓存
    threshold: 0.6, // 相似度阈值
    maxSkills: 3, // 最大选择 Skill 数
    similarityThreshold: 0.5, // 嵌入相似度阈值
  },
});
```

## 动态 Skill 加载

SmartAgent 支持按需加载 Skills：

### 注册 Skill 源

```typescript
// 从 URL 加载
agent.registerSkillSource('advanced-math', 'https://example.com/skills/advanced-math.json', 'url');

// 从文件加载（Node.js 环境）
agent.registerSkillSource('local-skill', './skills/local-skill.json', 'file');

// 从模块加载
agent.registerSkillSource('npm-skill', 'my-skill-package', 'module');
```

### 配置加载器

```typescript
const agent = new SmartAgent({
  skillLoader: {
    enableLazyLoading: true, // 启用懒加载
    enableCaching: true, // 启用缓存
    cacheSize: 100, // 缓存大小
    hotReload: false, // 热重载
  },
});
```

## Token 优化

SmartAgent 自动优化 Token 使用：

```typescript
const agent = new SmartAgent({
  tokenOptimizer: {
    enableCompression: true, // 启用压缩
    maxSkillDescriptionLength: 200, // 最大描述长度
    maxContextTokens: 4000, // 最大上下文 Tokens
    preserveSystemPrompt: true, // 保留系统提示词
  },
});
```

## 流式处理

对于长时间运行的任务：

```typescript
for await (const chunk of agent.streamProcess('Write a long story')) {
  switch (chunk.type) {
    case 'decision':
      console.log('Decision:', chunk.data);
      break;
    case 'skill':
      console.log('Skill executing:', chunk.data);
      break;
    case 'llm':
      process.stdout.write(chunk.data?.chunk || '');
      break;
    case 'complete':
      console.log('\nDone!');
      break;
  }
}
```

## 执行历史

SmartAgent 会记录所有执行：

```typescript
// 获取执行历史
const history = agent.getExecutionHistory();

history.forEach(record => {
  console.log(`${record.timestamp}: ${record.input}`);
  console.log(`  Decision: ${record.decision.type}`);
});

// 获取统计信息
const stats = agent.getDecisionStats();
console.log(stats);
// {
//   cacheSize: 10,
//   loadedSkills: 3,
//   historySize: 25
// }

// 清空历史
agent.clearHistory();
```

## 参数提取

SmartAgent 自动从输入中提取参数：

```typescript
// Skill 定义
const translateSkill: Skill = {
  name: 'translate',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string' },
      targetLang: { type: 'string' },
    },
    required: ['text', 'targetLang'],
  },
  // ...
};

// 自动提取参数
const result = await agent.process('Translate "Hello" to Spanish');
// params = { text: 'Hello', targetLang: 'Spanish' }
```

## 完整示例

```typescript
import { SmartAgent, OpenAIProvider, Skill } from 'sdkwork-browser-agent';

async function main() {
  const agent = new SmartAgent({
    name: 'assistant',
    llmProvider: new OpenAIProvider({ apiKey: 'xxx' }),
    autoDecide: true,
    decisionEngine: {
      enableEmbeddings: true,
      threshold: 0.6,
    },
    tokenOptimizer: {
      enableCompression: true,
    },
  });

  // 注册 Skills
  const skills: Skill[] = [
    {
      name: 'calculate',
      description: 'Perform calculations',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string' },
        },
        required: ['expression'],
      },
      handler: async params => ({
        success: true,
        data: eval(params.expression),
      }),
    },
    {
      name: 'greet',
      description: 'Greet someone',
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

  skills.forEach(skill => agent.registerSkill(skill));
  await agent.initialize();

  // 测试不同的输入
  const inputs = ['Calculate 10 * 5', 'Greet Alice', 'What is the weather today?'];

  for (const input of inputs) {
    const result = await agent.process(input);
    console.log(`\nInput: ${input}`);
    console.log(`Decision: ${result.decision.type}`);
    console.log(`Result: ${result.result}`);
  }

  // 显示统计
  const stats = agent.getDecisionStats();
  console.log('\nStats:', stats);

  await agent.destroy();
}

main();
```

## 下一步

- [决策引擎](./decision-engine.md) - 了解决策机制
- [Token 优化](./token-optimizer.md) - 深入了解 Token 优化
