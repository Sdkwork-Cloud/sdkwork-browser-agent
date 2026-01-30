# Agent

Agent 是 SDKWork Browser Agent 的核心类，负责管理 Skills、Tools、MCP 资源和 Plugins。

## 基础概念

Agent 是一个中央协调器，它将所有组件整合在一起：

- **Skills** - 用户可调用的高级功能
- **Tools** - 底层执行单元
- **MCP Resources** - 外部资源访问
- **Plugins** - 扩展模块

## 创建 Agent

```typescript
import { Agent, OpenAIProvider } from 'sdkwork-browser-agent';

const agent = new Agent({
  name: 'my-agent',
  description: 'A helpful agent',
  version: '1.0.0',
  llmProvider: new OpenAIProvider({ apiKey: 'xxx' }),
  systemPrompt: 'You are a helpful assistant.',
});

await agent.initialize();
```

## 配置选项

```typescript
interface AgentConfig {
  name: string; // Agent 名称
  description?: string; // 描述
  version?: string; // 版本
  llmProvider?: LLMProvider; // LLM Provider
  systemPrompt?: string; // 系统提示词
  maxIterations?: number; // 最大迭代次数
  skills?: Skill[]; // 初始 Skills
  tools?: Tool[]; // 初始 Tools
  plugins?: Plugin[]; // 初始 Plugins
  mcpResources?: MCPResource[]; // MCP 资源
  mcpTools?: MCPTool[]; // MCP Tools
  middlewares?: AgentMiddleware[]; // 中间件
  hooks?: AgentHooks; // 生命周期钩子
}
```

## 管理 Skills

### 注册 Skill

```typescript
import { Skill } from 'sdkwork-browser-agent';

const mySkill: Skill = {
  name: 'calculate',
  description: 'Perform calculations',
  parameters: {
    type: 'object',
    properties: {
      expression: { type: 'string' },
    },
    required: ['expression'],
  },
  handler: async params => {
    const result = eval(params.expression);
    return { success: true, data: result };
  },
};

agent.registerSkill(mySkill);
```

### 执行 Skill

```typescript
const result = await agent.executeSkill('calculate', {
  expression: '2 + 2',
});

console.log(result.success); // true
console.log(result.data); // 4
```

### 查询 Skills

```typescript
// 获取所有 Skill 名称
const skillNames = agent.getSkillNames();

// 获取所有 Skills
const skills = agent.getAllSkills();

// 获取特定 Skill
const skill = agent.getSkill('calculate');
```

## 管理 Tools

### 注册 Tool

```typescript
import { Tool } from 'sdkwork-browser-agent';

const httpTool: Tool = {
  name: 'http_request',
  description: 'Make HTTP requests',
  execute: async input => {
    const { url } = input as { url: string };
    const response = await fetch(url);
    const text = await response.text();
    return {
      content: [{ type: 'text', text }],
    };
  },
};

agent.registerTool(httpTool);
```

### 执行 Tool

```typescript
const result = await agent.executeTool('http_request', {
  url: 'https://api.example.com/data',
});

console.log(result.content[0].text);
```

## LLM 集成

### 基础对话

```typescript
const response = await agent.chat([{ role: 'user', content: 'Hello!' }]);

console.log(response.content);
```

### 流式对话

```typescript
for await (const chunk of agent.streamChat([{ role: 'user', content: 'Tell me a story' }])) {
  process.stdout.write(chunk.delta.content || '');
}
```

### 使用 Tools

```typescript
const response = await agent.executeWithTools(
  [{ role: 'user', content: 'What is the weather?' }],
  [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get weather information',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string' },
          },
        },
      },
    },
  ]
);
```

## 中间件

中间件可以在 Skill 执行前后添加逻辑：

```typescript
agent.use(async (context, next) => {
  console.log(`Executing skill: ${context.skillName}`);

  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;

  console.log(`Skill executed in ${duration}ms`);

  return result;
});
```

## 生命周期钩子

```typescript
const agent = new Agent({
  hooks: {
    beforeSkillExecution: async (skillName, params) => {
      console.log(`About to execute ${skillName}`);
    },
    afterSkillExecution: async (skillName, result) => {
      console.log(`Executed ${skillName}: ${result.success}`);
    },
    onError: async (error, context) => {
      console.error(`Error in ${context.skillName}:`, error);
    },
    onToolCall: async (toolName, args) => {
      console.log(`Tool called: ${toolName}`);
    },
  },
});
```

## 清理资源

```typescript
await agent.destroy();
```

## 完整示例

```typescript
import { Agent, OpenAIProvider, Skill, Tool } from 'sdkwork-browser-agent';

async function main() {
  // 创建 Agent
  const agent = new Agent({
    name: 'math-agent',
    llmProvider: new OpenAIProvider({ apiKey: 'xxx' }),
    systemPrompt: 'You are a math expert.',
  });

  // 注册 Skills
  const calculateSkill: Skill = {
    name: 'calculate',
    description: 'Calculate mathematical expressions',
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
  };

  agent.registerSkill(calculateSkill);

  // 初始化
  await agent.initialize();

  // 使用
  const result = await agent.executeSkill('calculate', {
    expression: '2 + 2',
  });

  console.log('Result:', result.data);

  // 清理
  await agent.destroy();
}

main();
```

## 下一步

- [SmartAgent](./smart-agent.md) - 了解自动决策功能
- [Skills](./skills.md) - 深入了解 Skill 系统
- [Tools](./tools.md) - 了解 Tool 系统
