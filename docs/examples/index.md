# 示例

这里提供了 SDKWork Browser Agent 的各种使用示例。

## 基础示例

### Hello World

```typescript
import { SmartAgent, OpenAIProvider } from 'sdkwork-browser-agent';

const agent = new SmartAgent({
  name: 'hello-agent',
  llmProvider: new OpenAIProvider({ apiKey: 'xxx' }),
});

await agent.initialize();

const result = await agent.chat([{ role: 'user', content: 'Hello!' }]);

console.log(result.content);
```

### 使用内置 Skills

```typescript
import { SmartAgent, OpenAIProvider, builtInSkills } from 'sdkwork-browser-agent';

const agent = new SmartAgent({
  name: 'math-agent',
  llmProvider: new OpenAIProvider({ apiKey: 'xxx' }),
  skills: builtInSkills,
  autoDecide: true,
});

await agent.initialize();

const result = await agent.process('Calculate 2 + 2');
console.log(result.result); // 4
```

## 进阶示例

### 自定义 Skill

```typescript
import { Skill } from 'sdkwork-browser-agent';

const translateSkill: Skill = {
  name: 'translate',
  description: 'Translate text',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string' },
      targetLang: { type: 'string' },
    },
    required: ['text', 'targetLang'],
  },
  handler: async params => {
    // 实现翻译逻辑
    return { success: true, data: translatedText };
  },
};

agent.registerSkill(translateSkill);
```

### 多 Provider 切换

```typescript
import { OpenAIProvider, AnthropicProvider } from 'sdkwork-browser-agent';

const openaiAgent = new SmartAgent({
  name: 'openai-agent',
  llmProvider: new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
});

const claudeAgent = new SmartAgent({
  name: 'claude-agent',
  llmProvider: new AnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY }),
});
```

## 完整应用示例

### 智能客服

```typescript
import { SmartAgent, Skill } from 'sdkwork-browser-agent';

const customerServiceAgent = new SmartAgent({
  name: 'customer-service',
  skills: [
    {
      name: 'check-order',
      description: 'Check order status',
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string' },
        },
        required: ['orderId'],
      },
      handler: async params => {
        const order = await db.orders.findById(params.orderId);
        return {
          success: true,
          data: {
            status: order.status,
            estimatedDelivery: order.estimatedDelivery,
          },
        };
      },
    },
    {
      name: 'refund-order',
      description: 'Process refund',
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['orderId', 'reason'],
      },
      handler: async params => {
        await processRefund(params.orderId, params.reason);
        return { success: true, data: 'Refund processed' };
      },
    },
  ],
});

// 处理客户查询
const result = await customerServiceAgent.process('Check status of order #12345');
```

### 代码助手

```typescript
import { SmartAgent, Skill } from 'sdkwork-browser-agent';

const codeAssistant = new SmartAgent({
  name: 'code-assistant',
  skills: [
    {
      name: 'generate-code',
      description: 'Generate code from description',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          language: { type: 'string' },
        },
        required: ['description', 'language'],
      },
      handler: async (params, context) => {
        const response = await context.agent.chat([
          {
            role: 'user',
            content: `Generate ${params.language} code: ${params.description}`,
          },
        ]);
        return { success: true, data: response.content };
      },
    },
    {
      name: 'review-code',
      description: 'Review code and suggest improvements',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string' },
        },
        required: ['code'],
      },
      handler: async (params, context) => {
        const response = await context.agent.chat([
          {
            role: 'user',
            content: `Review this code:\n\n${params.code}`,
          },
        ]);
        return { success: true, data: response.content };
      },
    },
  ],
});
```

## 更多示例

查看详细示例：

- [基础示例](./basic.md) - 基础用法
- [智能决策](./smart-decision.md) - 自动决策功能
- [动态加载](./dynamic-loading.md) - 动态 Skill 加载
- [多 Provider](./multi-provider.md) - 使用多个 LLM Provider
- [自定义 Skill](./custom-skill.md) - 创建自定义 Skills
- [流式处理](./streaming.md) - 流式对话
