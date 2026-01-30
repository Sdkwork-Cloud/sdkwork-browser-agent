# 基础示例

本示例展示 SDKWork Browser Agent 的基础用法。

## 安装

```bash
npm install sdkwork-browser-agent
```

## 示例 1: 基础 Agent

```typescript
import { Agent, OpenAIProvider } from 'sdkwork-browser-agent';

async function basicExample() {
  // 创建 Agent
  const agent = new Agent({
    name: 'basic-agent',
    description: 'A simple agent',
    llmProvider: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY,
    }),
  });

  // 初始化
  await agent.initialize();

  // 对话
  const response = await agent.chat([{ role: 'user', content: 'Hello! What can you do?' }]);

  console.log(response.content);

  // 清理
  await agent.destroy();
}

basicExample();
```

## 示例 2: 使用 Skills

```typescript
import { Agent, Skill } from 'sdkwork-browser-agent';

async function skillExample() {
  const agent = new Agent({
    name: 'skill-agent',
    llmProvider: new OpenAIProvider({ apiKey: 'xxx' }),
  });

  // 创建 Skill
  const greetSkill: Skill = {
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
      data: `Hello, ${params.name}! 👋`,
    }),
  };

  // 注册
  agent.registerSkill(greetSkill);
  await agent.initialize();

  // 执行
  const result = await agent.executeSkill('greet', { name: 'Alice' });
  console.log(result.data); // Hello, Alice! 👋

  await agent.destroy();
}
```

## 示例 3: 使用 Tools

```typescript
import { Agent, Tool } from 'sdkwork-browser-agent';

async function toolExample() {
  const agent = new Agent({
    name: 'tool-agent',
    llmProvider: new OpenAIProvider({ apiKey: 'xxx' }),
  });

  // 创建 Tool
  const timeTool: Tool = {
    name: 'get_time',
    description: 'Get current time',
    execute: async () => ({
      content: [
        {
          type: 'text',
          text: new Date().toISOString(),
        },
      ],
    }),
  };

  // 注册
  agent.registerTool(timeTool);
  await agent.initialize();

  // 执行
  const result = await agent.executeTool('get_time', {});
  console.log(result.content[0].text);

  await agent.destroy();
}
```

## 示例 4: 流式对话

```typescript
import { Agent } from 'sdkwork-browser-agent';

async function streamingExample() {
  const agent = new Agent({
    name: 'streaming-agent',
    llmProvider: new OpenAIProvider({ apiKey: 'xxx' }),
  });

  await agent.initialize();

  // 流式输出
  for await (const chunk of agent.streamChat([
    { role: 'user', content: 'Tell me a short story' },
  ])) {
    process.stdout.write(chunk.delta.content || '');
  }

  await agent.destroy();
}
```

## 运行示例

```bash
# 设置环境变量
export OPENAI_API_KEY=your-api-key

# 运行示例
npx tsx examples/basic.ts
```

## 下一步

- [智能决策](./smart-decision.md) - 了解自动决策
- [自定义 Skill](./custom-skill.md) - 创建自己的 Skills
