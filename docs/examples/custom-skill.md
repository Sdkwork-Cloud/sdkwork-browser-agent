# 自定义 Skill 示例

本示例展示如何创建和使用自定义 Skill。

## 创建自定义 Skill

```typescript
import { Skill } from 'sdkwork-browser-agent';

// 定义 Skill
const weatherSkill: Skill = {
  name: 'get-weather',
  description: 'Get weather information for a city',
  parameters: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: 'City name',
      },
      country: {
        type: 'string',
        description: 'Country code (optional)',
      },
    },
    required: ['city'],
  },
  handler: async params => {
    // 实现天气查询逻辑
    const weather = await fetchWeather(params.city);
    return {
      success: true,
      data: weather,
    };
  },
  metadata: {
    category: 'utility',
    tags: ['weather', 'api'],
  },
};
```

## 注册和使用

```typescript
import { SmartAgent, OpenAIProvider } from 'sdkwork-browser-agent';

const agent = new SmartAgent({
  name: 'weather-agent',
  llmProvider: new OpenAIProvider({ apiKey: 'your-key' }),
  skills: [weatherSkill],
  autoDecide: true,
});

await agent.initialize();

// 使用
const result = await agent.process('What is the weather in Beijing?');
console.log(result.result);
```

## 带验证的 Skill

```typescript
const validatedSkill: Skill = {
  name: 'calculate',
  description: 'Perform calculation',
  parameters: {
    type: 'object',
    properties: {
      expression: { type: 'string' },
    },
    required: ['expression'],
  },
  handler: async params => {
    try {
      const result = eval(params.expression);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: 'Invalid expression',
      };
    }
  },
  inputValidator: params => {
    const errors = [];
    if (!params.expression) {
      errors.push({ path: 'expression', message: 'Required' });
    }
    return { valid: errors.length === 0, errors };
  },
};
```

## 下一步

- [智能决策](./smart-decision.md)
- [动态加载](./dynamic-loading.md)
