# 快速开始

本指南将帮助你在 5 分钟内开始使用 SDKWork Browser Agent。

## 安装

::: code-group

```bash [npm]
npm install sdkwork-browser-agent
```

```bash [yarn]
yarn add sdkwork-browser-agent
```

```bash [pnpm]
pnpm add sdkwork-browser-agent
```

:::

## 第一个 Agent

创建一个简单的 Agent，使用 OpenAI 作为 LLM Provider：

```typescript
import { SmartAgent, OpenAIProvider, builtInSkills } from 'sdkwork-browser-agent';

// 创建 Agent
const agent = new SmartAgent({
  name: 'my-first-agent',
  description: 'My first intelligent agent',
  llmProvider: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY, // 你的 OpenAI API Key
  }),
  skills: builtInSkills, // 使用内置 Skills
  autoDecide: true, // 启用自动决策
});

// 初始化
await agent.initialize();

// 处理输入
const result = await agent.process('Calculate 2 + 2');
console.log(result.result); // 4
console.log(result.decision); // { type: 'skill', skills: ['math'], ... }
```

## 理解结果

`process()` 方法返回一个包含以下信息的对象：

```typescript
{
  decision: {
    type: 'skill',           // 决策类型: skill | tool | llm | multi
    skills: ['math'],        // 选中的 Skills
    confidence: 0.85,        // 置信度
    reasoning: '...',        // 决策理由
  },
  result: '4',               // 执行结果
  tokensUsed: 150,           // Token 使用量
  executionTime: 1200,       // 执行时间(ms)
  skillsLoaded: [],          // 动态加载的 Skills
}
```

## 使用不同的 LLM

### Anthropic Claude

```typescript
import { AnthropicProvider } from 'sdkwork-browser-agent';

const agent = new SmartAgent({
  llmProvider: new AnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY,
  }),
});
```

### Google Gemini

```typescript
import { GeminiProvider } from 'sdkwork-browser-agent';

const agent = new SmartAgent({
  llmProvider: new GeminiProvider({
    apiKey: process.env.GEMINI_API_KEY,
  }),
});
```

## 自定义 Skill

创建你自己的 Skill：

```typescript
import { Skill } from 'sdkwork-browser-agent';

const greetSkill: Skill = {
  name: 'greet',
  description: 'Greet a user by name',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The name of the person to greet',
      },
    },
    required: ['name'],
  },
  handler: async params => ({
    success: true,
    data: `Hello, ${params.name}! 👋`,
  }),
};

// 注册 Skill
agent.registerSkill(greetSkill);

// 使用
const result = await agent.process('Greet Alice');
console.log(result.result); // Hello, Alice! 👋
```

## 流式处理

对于长时间运行的任务，使用流式处理：

```typescript
for await (const chunk of agent.streamProcess('Write a story about AI')) {
  if (chunk.type === 'llm') {
    process.stdout.write(chunk.data?.chunk || '');
  }
}
```

## 下一步

- [安装指南](./installation.md) - 详细安装说明
- [核心概念](./concepts/agent.md) - 深入了解架构
- [示例](../examples/index.md) - 更多使用案例
