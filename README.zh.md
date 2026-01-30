# SDKWork Browser Agent

[![npm version](https://img.shields.io/npm/v/sdkwork-browser-agent.svg)](https://www.npmjs.com/package/sdkwork-browser-agent)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个浏览器兼容的 Agent 架构，支持 Skills、MCP、Tools 和灵活的 LLM Provider 体系。

[英文](./README.md) | [中文](./README.zh.md)

## ✨ 特性

- 🤖 **智能决策引擎** - 自动选择最合适的 Skill，基于嵌入相似度匹配
- 🔄 **动态 Skill 加载** - 懒加载机制，支持文件、URL、模块多种来源
- 💰 **Token 优化** - 智能压缩和截断，最小化 Token 消耗
- 🔌 **多 LLM 支持** - OpenAI、Anthropic、Google Gemini 等主流模型
- 📦 **MCP 协议** - 完整的 Model Context Protocol 支持
- 🔧 **插件系统** - 可扩展的插件架构
- 🌐 **浏览器兼容** - 同时支持浏览器和 Node.js 环境
- 📘 **TypeScript** - 完整的类型支持

## 🚀 快速开始

### 安装

```bash
npm install sdkwork-browser-agent
# 或
yarn add sdkwork-browser-agent
# 或
pnpm add sdkwork-browser-agent
```

### 基础使用

```typescript
import { SmartAgent, OpenAIProvider, builtInSkills } from 'sdkwork-browser-agent';

// 创建智能 Agent
const agent = new SmartAgent({
  name: 'my-agent',
  llmProvider: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
  }),
  skills: builtInSkills,
  autoDecide: true,
});

// 初始化
await agent.initialize();

// 自动处理输入
const result = await agent.process('计算 2 + 2');
console.log(result.result); // 4
```

### 使用不同的 LLM Provider

```typescript
import { AnthropicProvider, GeminiProvider } from 'sdkwork-browser-agent';

// Anthropic Claude
const claudeAgent = new SmartAgent({
  llmProvider: new AnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY,
  }),
});

// Google Gemini
const geminiAgent = new SmartAgent({
  llmProvider: new GeminiProvider({
    apiKey: process.env.GEMINI_API_KEY,
  }),
});
```

## 📚 文档

完整文档请访问：[https://sdkwork-browser-agent.vercel.app](https://sdkwork-browser-agent.vercel.app)

- [快速开始](https://sdkwork-browser-agent.vercel.app/guide/getting-started)
- [核心概念](https://sdkwork-browser-agent.vercel.app/guide/concepts)
- [API 参考](https://sdkwork-browser-agent.vercel.app/api/)
- [示例](https://sdkwork-browser-agent.vercel.app/examples/)

## 🏗️ 架构

```
sdkwork-browser-agent/
├── src/
│   ├── core/              # Agent 核心
│   │   ├── agent.ts       # 基础 Agent
│   │   ├── smart-agent.ts # 智能 Agent（自动决策）
│   │   ├── decision-engine.ts  # 决策引擎
│   │   ├── skill-loader.ts     # 动态加载
│   │   └── token-optimizer.ts  # Token 优化
│   ├── llm/               # LLM Provider
│   ├── skills/            # Skill 系统
│   ├── tools/             # Tool 系统
│   ├── mcp/               # MCP 协议
│   └── plugins/           # 插件系统
```

## 🎯 核心功能

### 1. 智能决策引擎

自动根据输入选择最合适的 Skill：

```typescript
const agent = new SmartAgent({
  decisionEngine: {
    enableEmbeddings: true, // 启用嵌入相似度
    enableCaching: true, // 启用决策缓存
    threshold: 0.6, // 相似度阈值
    maxSkills: 3, // 最大选择 Skill 数
  },
});
```

### 2. 动态 Skill 加载

支持从多种来源懒加载 Skill：

```typescript
// 注册 Skill 源
agent.registerSkillSource('my-skill', 'https://example.com/skills/my-skill.json', 'url');

// 动态加载
const skill = await agent.skillLoader.load('my-skill');
```

### 3. Token 优化

自动优化 Token 消耗：

```typescript
const optimizer = new TokenOptimizer({
  enableCompression: true,
  maxSkillDescriptionLength: 200,
  maxContextTokens: 4000,
});

const optimized = optimizer.optimizeSkills(skills);
const stats = optimizer.getOptimizationStats(skills, optimized);
console.log(`节省了 ${stats.savingsPercent}% tokens`);
```

### 4. 自定义 Skill

```typescript
import { Skill } from 'sdkwork-browser-agent';

const mySkill: Skill = {
  name: 'translate',
  description: '将文本翻译为另一种语言',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: '要翻译的文本' },
      targetLang: { type: 'string', description: '目标语言' },
    },
    required: ['text', 'targetLang'],
  },
  handler: async params => {
    // 实现翻译逻辑
    return { success: true, data: translatedText };
  },
  metadata: {
    category: 'language',
    tags: ['translate', 'nlp'],
  },
};

agent.registerSkill(mySkill);
```

## 🧪 测试

```bash
# 运行所有测试
npm test

# 监视模式
npm run test:watch

# 覆盖率报告
npm run test:coverage
```

## 🛠️ 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 类型检查
npm run typecheck

# 代码格式化
npm run format
```

## 🤝 贡献

欢迎提交 Issue 和 PR！请阅读 [贡献指南](./CONTRIBUTING.md)。

## 📄 许可证

[MIT](./LICENSE)

## 🙏 致谢

- [Agent Skills Specification](https://agentskills.io/specification)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [OpenCode](https://opencode.ai) - 架构灵感来源

---

<p align="center">
  Made with ❤️ by SDKWork Team
</p>
