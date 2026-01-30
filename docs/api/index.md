# API 参考

SDKWork Browser Agent 提供完整的 TypeScript API。

## 核心模块

### Agent

基础 Agent 类，提供核心功能。

```typescript
import { Agent } from 'sdkwork-browser-agent';
```

### SmartAgent

智能 Agent，具备自动决策能力。

```typescript
import { SmartAgent } from 'sdkwork-browser-agent';
```

### DecisionEngine

决策引擎，负责自动选择 Skills。

```typescript
import { DecisionEngine } from 'sdkwork-browser-agent';
```

## LLM 模块

### LLMProvider

LLM Provider 接口。

```typescript
import { LLMProvider } from 'sdkwork-browser-agent';
```

### OpenAIProvider

OpenAI GPT 模型支持。

```typescript
import { OpenAIProvider } from 'sdkwork-browser-agent';
```

### AnthropicProvider

Anthropic Claude 模型支持。

```typescript
import { AnthropicProvider } from 'sdkwork-browser-agent';
```

### GeminiProvider

Google Gemini 模型支持。

```typescript
import { GeminiProvider } from 'sdkwork-browser-agent';
```

## 类型定义

### Skill

Skill 类型定义。

```typescript
import type { Skill } from 'sdkwork-browser-agent';
```

### Tool

Tool 类型定义。

```typescript
import type { Tool } from 'sdkwork-browser-agent';
```

### MCP

MCP 相关类型。

```typescript
import type { MCPResource, MCPTool } from 'sdkwork-browser-agent';
```

## 快速参考

### 创建 Agent

```typescript
const agent = new SmartAgent({
  name: 'my-agent',
  llmProvider: new OpenAIProvider({ apiKey: 'xxx' }),
});

await agent.initialize();
```

### 注册 Skill

```typescript
agent.registerSkill({
  name: 'my-skill',
  description: 'My skill',
  parameters: {
    /* ... */
  },
  handler: async params => ({
    success: true,
    data: result,
  }),
});
```

### 处理输入

```typescript
const result = await agent.process('User input');
console.log(result.result);
```

### 使用 LLM

```typescript
const response = await agent.chat([{ role: 'user', content: 'Hello!' }]);
```

## 类型索引

| 类型               | 描述            |
| ------------------ | --------------- |
| `AgentConfig`      | Agent 配置      |
| `SmartAgentConfig` | SmartAgent 配置 |
| `Skill`            | Skill 定义      |
| `Tool`             | Tool 定义       |
| `SkillResult`      | Skill 执行结果  |
| `ToolOutput`       | Tool 执行结果   |
| `Decision`         | 决策结果        |
| `LLMMessage`       | LLM 消息        |
| `LLMResponse`      | LLM 响应        |

## 模块导出

```typescript
// 核心
export { Agent, SmartAgent } from './core';

// LLM Providers
export { LLMProvider, OpenAIProvider, AnthropicProvider, GeminiProvider } from './llm';

// Skills
export { SkillRegistry, builtInSkills } from './skills';

// Tools
export { ToolRegistry, builtInTools } from './tools';

// MCP
export { MCPClient, MCPServer } from './mcp';

// Plugins
export { PluginManager } from './plugins';
```
