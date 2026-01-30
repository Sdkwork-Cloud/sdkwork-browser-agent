# Tools

Tools 是 SDKWork Browser Agent 中的底层执行单元，用于执行具体操作。

## Skill vs Tool

| 特性     | Skill       | Tool       |
| -------- | ----------- | ---------- |
| 抽象层级 | 高          | 低         |
| 用户可见 | 是          | 否（通常） |
| 参数定义 | 完整 Schema | 可选       |
| 使用场景 | 用户意图    | 系统操作   |

## Tool 结构

```typescript
interface Tool {
  name: string; // Tool 名称
  description: string; // 描述
  parameters?: ParameterSchema; // 参数定义（可选）
  execute: ToolExecutor; // 执行函数
  metadata?: ToolMetadata; // 元数据
}
```

## 创建 Tool

### 基础 Tool

```typescript
import { Tool } from 'sdkwork-browser-agent';

const echoTool: Tool = {
  name: 'echo',
  description: 'Echo the input',
  execute: async input => ({
    content: [{ type: 'text', text: String(input) }],
  }),
};
```

### 带参数的 Tool

```typescript
const httpTool: Tool = {
  name: 'http_request',
  description: 'Make HTTP request',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string' },
      method: {
        type: 'string',
        enum: ['GET', 'POST', 'PUT', 'DELETE'],
        default: 'GET',
      },
      headers: {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
      body: { type: 'string' },
    },
    required: ['url'],
  },
  execute: async input => {
    const {
      url,
      method = 'GET',
      headers,
      body,
    } = input as {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
      });

      const text = await response.text();

      return {
        content: [{ type: 'text', text }],
        metadata: {
          status: response.status,
          statusText: response.statusText,
        },
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'error',
            text: error instanceof Error ? error.message : 'Request failed',
          },
        ],
        isError: true,
      };
    }
  },
};
```

### 需要确认的 Tool

```typescript
const deleteFileTool: Tool = {
  name: 'delete_file',
  description: 'Delete a file',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string' },
    },
    required: ['path'],
  },
  execute: async input => {
    // 执行删除操作
    return {
      content: [{ type: 'text', text: 'File deleted' }],
    };
  },
  metadata: {
    requiresConfirmation: true, // 标记需要确认
    category: 'filesystem',
  },
};
```

## Tool 输出格式

Tool 的输出遵循统一格式：

```typescript
interface ToolOutput {
  content: Array<{
    type: 'text' | 'error' | 'image' | 'data';
    text?: string;
    data?: unknown;
  }>;
  isError?: boolean;
  metadata?: Record<string, unknown>;
}
```

### 文本输出

```typescript
return {
  content: [{ type: 'text', text: 'Operation completed' }],
};
```

### 错误输出

```typescript
return {
  content: [{ type: 'error', text: 'File not found' }],
  isError: true,
};
```

### 数据输出

```typescript
return {
  content: [{
    type: 'data',
    data: { count: 42, items: [...] },
  }],
};
```

### 多内容输出

```typescript
return {
  content: [
    { type: 'text', text: 'Here is the result:' },
    { type: 'data', data: result },
    { type: 'text', text: 'Operation completed' },
  ],
};
```

## 内置 Tools

SDKWork Browser Agent 提供了一些内置 Tools：

```typescript
import { builtInTools } from 'sdkwork-browser-agent';

// file_read - 读取文件（Node.js）
// file_write - 写入文件（Node.js）
// http_request - HTTP 请求

const agent = new SmartAgent({
  tools: builtInTools,
});
```

### 文件操作 Tool

```typescript
// 读取文件
const result = await agent.executeTool('file_read', {
  path: './data.json',
  encoding: 'utf-8',
});

// 写入文件
const result = await agent.executeTool('file_write', {
  path: './output.txt',
  content: 'Hello, World!',
});
```

### HTTP Tool

```typescript
const result = await agent.executeTool('http_request', {
  url: 'https://api.example.com/data',
  method: 'GET',
  headers: {
    Authorization: 'Bearer token',
  },
});

console.log(result.content[0].text);
```

## Tool 注册表

使用 ToolRegistry 管理 Tools：

```typescript
import { ToolRegistry } from 'sdkwork-browser-agent';

const registry = new ToolRegistry();

// 注册 Tools
registry.register(httpTool);
registry.register(fileTool);

// 按分类查找
const fsTools = registry.findByCategory('filesystem');

// 查找需要确认的 Tools
const dangerousTools = registry.findByConfirmation(true);

// 搜索
const results = registry.search('http');

// 执行
const result = await registry.execute(
  'http_request',
  {
    url: 'https://example.com',
  },
  context
);
```

## 在 Skills 中使用 Tools

Skills 可以调用 Tools 来完成任务：

```typescript
const searchAndSummarizeSkill: Skill = {
  name: 'search-and-summarize',
  description: 'Search for information and summarize',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string' },
    },
    required: ['query'],
  },
  handler: async (params, context) => {
    // 使用 Tool 搜索
    const searchResult = await context.agent.executeTool('http_request', {
      url: `https://api.search.com?q=${encodeURIComponent(params.query as string)}`,
    });

    if (searchResult.isError) {
      return {
        success: false,
        error: 'Search failed',
      };
    }

    const data = JSON.parse(searchResult.content[0].text || '{}');

    // 使用 LLM 总结
    const summary = await context.agent.chat([
      {
        role: 'user',
        content: `Summarize: ${JSON.stringify(data)}`,
      },
    ]);

    return {
      success: true,
      data: summary.content,
    };
  },
};
```

## Tool 最佳实践

### 1. 清晰的错误处理

```typescript
execute: async input => {
  try {
    // 执行操作
    return { content: [{ type: 'text', text: result }] };
  } catch (error) {
    return {
      content: [
        {
          type: 'error',
          text: `Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
};
```

### 2. 环境检查

```typescript
execute: async input => {
  // 检查是否在浏览器环境
  if (typeof window !== 'undefined') {
    return {
      content: [{ type: 'error', text: 'Not supported in browser' }],
      isError: true,
    };
  }

  // Node.js 特定操作
  // ...
};
```

### 3. 使用元数据

```typescript
metadata: {
  category: 'network',
  tags: ['http', 'api'],
  version: '1.0.0',
  requiresConfirmation: false,
}
```

## 完整示例

```typescript
import { SmartAgent, Tool } from 'sdkwork-browser-agent';

// 创建自定义 Tools
const tools: Tool[] = [
  {
    name: 'fetch-weather',
    description: 'Fetch weather data for a location',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string' },
        units: {
          type: 'string',
          enum: ['metric', 'imperial'],
          default: 'metric',
        },
      },
      required: ['city'],
    },
    execute: async input => {
      const { city, units = 'metric' } = input as { city: string; units?: string };

      try {
        const response = await fetch(
          `https://api.weather.com/v1/current?city=${encodeURIComponent(city)}&units=${units}`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        return {
          content: [
            {
              type: 'data',
              data: {
                city: data.city,
                temperature: data.temp,
                description: data.description,
                humidity: data.humidity,
              },
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'error',
              text: `Failed to fetch weather: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
    metadata: {
      category: 'weather',
      tags: ['weather', 'api'],
    },
  },
];

// 使用
const agent = new SmartAgent({
  name: 'weather-agent',
  tools,
});

await agent.initialize();

const result = await agent.executeTool('fetch-weather', {
  city: 'Beijing',
  units: 'metric',
});

console.log(result.content[0].data);
```

## 下一步

- [MCP 协议](../advanced/mcp) - 了解 Model Context Protocol
- [插件系统](../advanced/plugins) - 了解插件开发
- [示例](../../examples/) - 查看更多示例
