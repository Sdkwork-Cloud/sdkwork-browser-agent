# Token 优化器

Token 优化器负责最小化 LLM 调用的 Token 消耗，降低成本并提高性能。

## 为什么需要 Token 优化？

- **降低成本** - LLM API 按 Token 计费
- **提高速度** - 更少的 Token = 更快的响应
- **避免截断** - 确保重要信息不被截断
- **更好的上下文** - 保留最相关的信息

## 优化策略

### 1. Skill 压缩

```typescript
import { TokenOptimizer } from 'sdkwork-browser-agent';

const optimizer = new TokenOptimizer({
  enableCompression: true,
  maxSkillDescriptionLength: 200,
});

// 压缩前
const originalSkills = [
  {
    name: 'calculate',
    description:
      'This skill performs mathematical calculations including addition, subtraction, multiplication, division, and more complex operations like exponentiation and logarithms...',
    parameters: {
      /* ... */
    },
  },
];

// 压缩后
const optimizedSkills = optimizer.optimizeSkills(originalSkills);
// 描述被截断到 200 字符
```

### 2. 参数压缩

```typescript
// 压缩前
parameters: {
  type: 'object',
  properties: {
    expression: {
      type: 'string',
      description: 'A mathematical expression that can include numbers, operators (+, -, *, /), parentheses, and functions like sin, cos, log, etc. The expression should be valid JavaScript math syntax.',
    },
  },
}

// 压缩后
parameters: {
  type: 'object',
  properties: {
    expression: {
      type: 'string',
      description: 'Math expression with numbers, operators, and functions...',
    },
  },
}
```

### 3. 元数据过滤

```typescript
// 根据查询过滤不相关的元数据
const optimized = optimizer.optimizeSkills(skills, 'math calculation');
// 与数学无关的 Skills 的元数据会被移除
```

### 4. 上下文管理

```typescript
// 保留最近的对话，移除旧的
const optimizedMessages = optimizer.optimizeMessages(messages, 4000);
// 确保总 Token 数不超过 4000
```

## 配置选项

```typescript
const optimizer = new TokenOptimizer({
  // 最大上下文 Token 数
  maxContextTokens: 4000,

  // Skill 描述最大长度
  maxSkillDescriptionLength: 200,

  // 启用压缩
  enableCompression: true,

  // 保留系统提示词
  preserveSystemPrompt: true,
});
```

## 使用方法

### 优化 Skills

```typescript
const skills = [skill1, skill2, skill3];
const optimized = optimizer.optimizeSkills(skills);

// 针对特定查询优化
const queryOptimized = optimizer.optimizeSkills(skills, 'user query here');
```

### 优化 Tools

```typescript
const tools = [tool1, tool2];
const optimized = optimizer.optimizeTools(tools);
```

### 优化消息

```typescript
const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello!' },
  { role: 'assistant', content: 'Hi there!' },
  // ... 更多消息
];

const optimized = optimizer.optimizeMessages(messages);
// 如果超过限制，会移除旧的消息
```

### 构建优化提示

```typescript
const prompt = optimizer.buildOptimizedPrompt(
  'Calculate 2 + 2', // 用户输入
  availableSkills, // 可用 Skills
  'You are a math expert.' // 上下文
);

console.log(prompt);
// Context: You are a math expert.
//
// User: Calculate 2 + 2
//
// Available skills:
// - calculate(expression): Perform mathematical calculations...
```

## Token 估算

### 估算文本

```typescript
const tokens = optimizer.estimateTokens('Hello, World!');
console.log(tokens); // ~3 tokens
```

### 估算消息

```typescript
const messages = [
  { role: 'system', content: 'You are helpful.' },
  { role: 'user', content: 'Hello!' },
];

const tokens = optimizer.estimateMessagesTokens(messages);
console.log(tokens); // ~10 tokens
```

### 估算 Skills

```typescript
const tokens = optimizer.estimateSkillsTokens(skills);
console.log(tokens); // 总 Token 数
```

## 优化统计

```typescript
const originalSkills = [
  /* ... */
];
const optimizedSkills = optimizer.optimizeSkills(originalSkills);

const stats = optimizer.getOptimizationStats(originalSkills, optimizedSkills);

console.log(stats);
// {
//   originalTokens: 1500,
//   optimizedTokens: 800,
//   savings: 700,
//   savingsPercent: 46.7
// }
```

## 在 SmartAgent 中使用

SmartAgent 自动使用 Token 优化器：

```typescript
const agent = new SmartAgent({
  tokenOptimizer: {
    enableCompression: true,
    maxSkillDescriptionLength: 200,
    maxContextTokens: 4000,
  },
});

// 自动优化
const result = await agent.process('Calculate 2 + 2');
```

## 最佳实践

### 1. 合理设置限制

```typescript
// 对于简单任务
const simpleOptimizer = new TokenOptimizer({
  maxSkillDescriptionLength: 100,
  maxContextTokens: 2000,
});

// 对于复杂任务
const complexOptimizer = new TokenOptimizer({
  maxSkillDescriptionLength: 300,
  maxContextTokens: 8000,
});
```

### 2. 保留关键信息

```typescript
const optimizer = new TokenOptimizer({
  enableCompression: true,
  preserveSystemPrompt: true, // 始终保留系统提示词
});
```

### 3. 监控 Token 使用

```typescript
// 记录优化前后的对比
const before = optimizer.estimateSkillsTokens(skills);
const optimized = optimizer.optimizeSkills(skills);
const after = optimizer.estimateSkillsTokens(optimized);

console.log(`Saved ${before - after} tokens (${(((before - after) / before) * 100).toFixed(1)}%)`);
```

## 完整示例

```typescript
import { TokenOptimizer, Skill } from 'sdkwork-browser-agent';

async function main() {
  // 创建优化器
  const optimizer = new TokenOptimizer({
    enableCompression: true,
    maxSkillDescriptionLength: 150,
    maxContextTokens: 3000,
  });

  // 创建一些 Skills
  const skills: Skill[] = [
    {
      name: 'calculate',
      description:
        'Perform mathematical calculations including addition, subtraction, multiplication, division, and more complex operations. Supports basic arithmetic, algebraic expressions, and common mathematical functions.',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description:
              'A mathematical expression that can include numbers, operators (+, -, *, /), parentheses, and mathematical functions like sin, cos, tan, log, sqrt, etc.',
          },
        },
        required: ['expression'],
      },
      handler: async () => ({ success: true }),
    },
    {
      name: 'translate',
      description:
        'Translate text from one language to another. Supports over 100 languages including English, Spanish, French, German, Chinese, Japanese, Korean, and many more.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description:
              'The text to be translated from the source language to the target language',
          },
          targetLang: {
            type: 'string',
            description: 'The target language code (e.g., "en", "es", "fr", "de", "zh", "ja")',
          },
        },
        required: ['text', 'targetLang'],
      },
      handler: async () => ({ success: true }),
    },
  ];

  // 估算原始 Token
  const originalTokens = optimizer.estimateSkillsTokens(skills);
  console.log(`Original tokens: ${originalTokens}`);

  // 优化
  const optimized = optimizer.optimizeSkills(skills, 'math');

  // 估算优化后 Token
  const optimizedTokens = optimizer.estimateSkillsTokens(optimized);
  console.log(`Optimized tokens: ${optimizedTokens}`);

  // 统计
  const stats = optimizer.getOptimizationStats(skills, optimized);
  console.log(`Saved: ${stats.savings} tokens (${stats.savingsPercent.toFixed(1)}%)`);

  // 查看优化后的 Skills
  optimized.forEach(skill => {
    console.log(`\n${skill.name}:`);
    console.log(`  Description: ${skill.description}`);
    console.log(`  Parameters: ${Object.keys(skill.parameters.properties).join(', ')}`);
  });

  // 优化消息
  const messages = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' },
    { role: 'assistant', content: 'Hi there! How can I help you today?' },
    { role: 'user', content: 'Calculate 2 + 2' },
    { role: 'assistant', content: '2 + 2 = 4' },
    { role: 'user', content: 'What about 10 * 5?' },
    { role: 'assistant', content: '10 * 5 = 50' },
  ];

  const optimizedMessages = optimizer.optimizeMessages(messages);
  console.log(`\nOriginal messages: ${messages.length}`);
  console.log(`Optimized messages: ${optimizedMessages.length}`);
}

main();
```

## 高级技巧

### 自定义压缩策略

```typescript
class MyOptimizer extends TokenOptimizer {
  protected compressParameters(parameters: ParameterSchema): ParameterSchema {
    // 自定义参数压缩逻辑
    const compressed = super.compressParameters(parameters);

    // 移除可选参数的默认值
    for (const [key, prop] of Object.entries(compressed.properties)) {
      delete (prop as { default?: unknown }).default;
    }

    return compressed;
  }
}
```

### 动态调整

```typescript
// 根据上下文动态调整
function createOptimizer(context: string) {
  if (context === 'simple') {
    return new TokenOptimizer({
      maxSkillDescriptionLength: 100,
    });
  }

  return new TokenOptimizer({
    maxSkillDescriptionLength: 300,
  });
}
```

## 下一步

- [示例](../../examples/index.md) - 查看更多示例
