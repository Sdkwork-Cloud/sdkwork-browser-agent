# SDKWork Browser Agent

[![npm version](https://img.shields.io/npm/v/sdkwork-browser-agent.svg)](https://www.npmjs.com/package/sdkwork-browser-agent)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个浏览器兼容的 Agent 架构，支持 Skills、MCP、Tools 和灵活的 LLM Provider 体系。

[English](./README.md) | [中文](./README.zh-CN.md)

## ✨ 特性

- 🤖 **智能决策引擎** - 基于嵌入相似度匹配和意图分类自动选择最佳 Skill
- 🧠 **高级决策引擎** - 多阶段决策，带置信度评分和自适应学习
- 🔍 **参数提取器** - 多策略参数提取，支持类型强制转换和验证
- 📊 **评估体系** - 多维度结果评估，支持正确性验证和反馈
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
const result = await agent.process('Calculate 2 + 2');
console.log(result.result); // 4
console.log(result.evaluation); // 评估结果
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

- [快速开始](https://sdkwork-browser-agent.vercel