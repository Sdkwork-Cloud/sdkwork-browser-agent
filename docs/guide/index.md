# 介绍

SDKWork Browser Agent 是一个浏览器兼容的 Agent 架构，旨在提供灵活、可扩展的 AI Agent 开发体验。

## 什么是 SDKWork Browser Agent？

这是一个完整的 Agent 框架，支持：

- **智能决策** - 根据输入自动选择最合适的 Skill
- **动态加载** - 按需加载 Skills、Tools 和 Plugins
- **Token 优化** - 智能压缩和截断，减少 LLM 调用成本
- **多模型支持** - 支持 OpenAI、Anthropic、Google Gemini 等主流 LLM
- **MCP 协议** - 完整的 Model Context Protocol 实现
- **浏览器兼容** - 同时支持浏览器和 Node.js 环境

## 设计理念

### 高内聚低耦合

每个模块都有清晰的职责边界：

- `core/` - Agent 核心逻辑
- `llm/` - LLM Provider 实现
- `skills/` - Skill 定义和管理
- `tools/` - Tool 实现
- `mcp/` - MCP 协议支持
- `plugins/` - 插件系统

### 可扩展性

通过插件系统和 Provider 模式，可以轻松扩展：

```typescript
// 自定义 LLM Provider
class MyProvider implements LLMProvider {
  // 实现 Provider 接口
}

// 自定义 Skill
const mySkill: Skill = {
  name: 'my-skill',
  description: 'My custom skill',
  parameters: {
    /* ... */
  },
  handler: async params => {
    /* ... */
  },
};
```

### 类型安全

完整的 TypeScript 类型支持，提供良好的开发体验：

```typescript
import type { Skill, Tool, AgentConfig } from 'sdkwork-browser-agent';
```

## 架构概览

```
┌─────────────────────────────────────────┐
│           SmartAgent                    │
│  ┌─────────────────────────────────┐    │
│  │      DecisionEngine             │    │
│  │  - Skill selection              │    │
│  │  - Similarity matching          │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │      SkillLoader                │    │
│  │  - Dynamic loading              │    │
│  │  - Multi-source support         │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │      TokenOptimizer             │    │
│  │  - Compression                  │    │
│  │  - Context management           │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌─────────┐   ┌──────────┐   ┌──────────┐
│  Skills │   │  Tools   │   │   MCP    │
└─────────┘   └──────────┘   └──────────┘
    │               │               │
    └───────────────┼───────────────┘
                    ▼
            ┌──────────────┐
            │ LLM Provider │
            │ - OpenAI     │
            │ - Anthropic  │
            │ - Gemini     │
            └──────────────┘
```

## 使用场景

### 1. 智能助手

构建能够理解用户意图并自动选择工具的 AI 助手：

```typescript
const assistant = new SmartAgent({
  skills: [searchSkill, calculateSkill, translateSkill],
  autoDecide: true,
});

await assistant.process('搜索最新的 TypeScript 版本');
```

### 2. 代码生成

根据自然语言描述生成代码：

```typescript
const coder = new SmartAgent({
  skills: [codeGenSkill, codeReviewSkill, testGenSkill],
});

await coder.process('生成一个 React 按钮组件');
```

### 3. 数据处理

自动化数据处理工作流：

```typescript
const processor = new SmartAgent({
  skills: [parseSkill, transformSkill, exportSkill],
});

await processor.process('解析这个 CSV 文件并导出为 JSON');
```

## 下一步

- [快速开始](./getting-started.md) - 5 分钟上手
- [核心概念](./concepts/agent.md) - 深入了解架构
- [API 参考](../api/index.md) - 查看完整 API
