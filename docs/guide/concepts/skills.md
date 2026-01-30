# Skills

Skills 是 SDKWork Browser Agent 的核心概念，代表用户可调用的功能单元。

## 什么是 Skill？

Skill 是一个具有明确输入和输出的功能单元：

- **声明式** - 清晰的参数定义
- **类型安全** - TypeScript 类型支持
- **可组合** - 可以组合多个 Skills
- **可发现** - 支持搜索和分类

## Skill 结构

```typescript
interface Skill {
  name: string; // Skill 名称
  description: string; // 描述（用于决策）
  parameters: ParameterSchema; // 参数定义
  handler: SkillHandler; // 处理函数
  metadata?: SkillMetadata; // 元数据
}
```

## 创建 Skill

### 基础 Skill

```typescript
import { Skill } from 'sdkwork-browser-agent';

const echoSkill: Skill = {
  name: 'echo',
  description: 'Echo back the input message',
  parameters: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'The message to echo',
      },
    },
    required: ['message'],
  },
  handler: async params => ({
    success: true,
    data: params.message,
  }),
};
```

### 带可选参数的 Skill

```typescript
const greetSkill: Skill = {
  name: 'greet',
  description: 'Greet a user',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'User name',
      },
      language: {
        type: 'string',
        description: 'Greeting language',
        enum: ['en', 'zh', 'es'],
        default: 'en',
      },
    },
    required: ['name'],
  },
  handler: async params => {
    const greetings: Record<string, string> = {
      en: 'Hello',
      zh: '你好',
      es: 'Hola',
    };

    const greeting = greetings[params.language as string] || greetings.en;

    return {
      success: true,
      data: `${greeting}, ${params.name}!`,
    };
  },
};
```

### 带元数据的 Skill

```typescript
const mathSkill: Skill = {
  name: 'calculate',
  description: 'Perform mathematical calculations',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Math expression to evaluate',
      },
    },
    required: ['expression'],
  },
  handler: async params => {
    try {
      // Safe evaluation
      const result = Function('"use strict"; return (' + params.expression + ')')();
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: 'Invalid expression',
      };
    }
  },
  metadata: {
    category: 'utility', // 分类
    tags: ['math', 'calculate'], // 标签
    version: '1.0.0', // 版本
    author: 'SDKWork', // 作者
  },
};
```

## 参数定义

### 基础类型

```typescript
parameters: {
  type: 'object',
  properties: {
    // 字符串
    name: {
      type: 'string',
      description: 'User name',
    },
    // 数字
    age: {
      type: 'number',
      description: 'User age',
    },
    // 布尔值
    active: {
      type: 'boolean',
      description: 'Is active',
    },
    // 枚举
    role: {
      type: 'string',
      enum: ['admin', 'user', 'guest'],
      description: 'User role',
    },
  },
  required: ['name'],
}
```

### 复杂类型

```typescript
parameters: {
  type: 'object',
  properties: {
    // 数组
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Item tags',
    },
    // 嵌套对象
    address: {
      type: 'object',
      properties: {
        street: { type: 'string' },
        city: { type: 'string' },
        country: { type: 'string' },
      },
      required: ['city', 'country'],
    },
    // 联合类型（通过 anyOf）
    value: {
      anyOf: [
        { type: 'string' },
        { type: 'number' },
      ],
      description: 'A value that can be string or number',
    },
  },
}
```

## 处理函数

### 基础处理

```typescript
handler: async (params, context) => {
  // params - 输入参数
  // context - 执行上下文

  return {
    success: true,
    data: result,
  };
};
```

### 访问 Agent

```typescript
handler: async (params, context) => {
  // 访问 Agent 实例
  const agent = context.agent;

  // 调用其他 Skills
  const otherResult = await agent.executeSkill('other-skill', {});

  // 读取 MCP 资源
  const resource = await agent.readMCPResource('file:///data.txt');

  return {
    success: true,
    data: result,
    metadata: {
      timestamp: context.timestamp,
      skillName: context.skillName,
    },
  };
};
```

### 错误处理

```typescript
handler: async params => {
  try {
    const result = await someAsyncOperation();
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        errorCode: 'OPERATION_FAILED',
      },
    };
  }
};
```

## Skill 注册表

使用 SkillRegistry 管理大量 Skills：

```typescript
import { SkillRegistry } from 'sdkwork-browser-agent';

const registry = new SkillRegistry();

// 注册 Skills
registry.register(mathSkill);
registry.register(greetSkill);

// 按分类查找
const utilitySkills = registry.findByCategory('utility');

// 按标签查找
const mathSkills = registry.findByTag('math');

// 搜索
const searchResults = registry.search('calculate');

// 执行
const result = await registry.execute('calculate', { expression: '2+2' }, context);
```

## 内置 Skills

SDKWork Browser Agent 提供了一些内置 Skills：

```typescript
import { builtInSkills } from 'sdkwork-browser-agent';

// echo - 回显输入
// math - 数学计算
// list_skills - 列出所有 Skills

const agent = new SmartAgent({
  skills: builtInSkills,
});
```

## Skill 最佳实践

### 1. 清晰的描述

描述应该清晰说明 Skill 的功能：

```typescript
// ✅ 好的描述
description: 'Calculate the sum of two numbers';

// ❌ 差的描述
description: 'Math function';
```

### 2. 参数验证

在处理函数中验证参数：

```typescript
handler: async params => {
  if (typeof params.value !== 'number' || params.value < 0) {
    return {
      success: false,
      error: 'Value must be a positive number',
    };
  }
  // ...
};
```

### 3. 使用元数据

添加适当的元数据以便组织和发现：

```typescript
metadata: {
  category: 'data-processing',
  tags: ['csv', 'json', 'convert'],
  version: '1.0.0',
}
```

### 4. 错误处理

始终返回结构化的错误信息：

```typescript
return {
  success: false,
  error: 'Descriptive error message',
  metadata: {
    errorCode: 'SPECIFIC_ERROR_CODE',
    suggestion: 'How to fix this error',
  },
};
```

## 完整示例

```typescript
import { SmartAgent, Skill } from 'sdkwork-browser-agent';

// 创建 Skills
const skills: Skill[] = [
  {
    name: 'format-date',
    description: 'Format a date to a specific format',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date string or timestamp',
        },
        format: {
          type: 'string',
          description: 'Output format',
          enum: ['short', 'long', 'iso'],
          default: 'short',
        },
      },
      required: ['date'],
    },
    handler: async params => {
      try {
        const date = new Date(params.date as string);

        if (isNaN(date.getTime())) {
          return {
            success: false,
            error: 'Invalid date format',
          };
        }

        const format = params.format as string;
        let formatted: string;

        switch (format) {
          case 'long':
            formatted = date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            break;
          case 'iso':
            formatted = date.toISOString();
            break;
          default:
            formatted = date.toLocaleDateString();
        }

        return {
          success: true,
          data: formatted,
        };
      } catch (error) {
        return {
          success: false,
          error: 'Failed to format date',
        };
      }
    },
    metadata: {
      category: 'utility',
      tags: ['date', 'format', 'time'],
      version: '1.0.0',
    },
  },
];

// 使用
const agent = new SmartAgent({
  name: 'date-agent',
  skills,
});

await agent.initialize();

const result = await agent.process('Format 2024-01-15 to long format');
console.log(result.result);
// Monday, January 15, 2024
```

## 下一步

- [Tools](./tools.md) - 了解 Tool 系统
- [决策引擎](./decision-engine.md) - 了解 Skill 选择机制
- [示例](../../examples/custom-skill.md) - 查看更多 Skill 示例
