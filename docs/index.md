# SDKWork Browser Agent

浏览器兼容的 Agent 架构，支持 Skills、MCP、Tools 和灵活的 LLM Provider 体系。

## 特性

- 🤖 **智能决策引擎** - 自动选择最合适的 Skill
- 🔄 **动态 Skill 加载** - 懒加载机制
- 💰 **Token 优化** - 最小化 Token 消耗
- 🔌 **多 LLM 支持** - OpenAI、Anthropic、Google Gemini 等 9+ Provider
- 📦 **MCP 协议** - 完整的 Model Context Protocol 支持
- 🔧 **插件系统** - 可扩展的插件架构
- 🌐 **浏览器兼容** - 支持浏览器和 Node.js

## 快速开始

```bash
npm install sdkwork-browser-agent
```

```typescript
import { SmartAgent, OpenAIProvider, builtInSkills } from 'sdkwork-browser-agent';

const agent = new SmartAgent({
  name: 'my-agent',
  llmProvider: new OpenAIProvider({ apiKey: 'your-api-key' }),
  skills: builtInSkills,
  autoDecide: true,
});

await agent.initialize();
const result = await agent.process('Calculate 2 + 2');
console.log(result.result); // 4
```

## 下一步

- [快速开始](./guide/getting-started.md) - 了解如何安装和配置
- [核心概念](./guide/concepts/agent.md) - 深入了解架构设计
- [API 参考](./api/index.md) - 查看完整的 API 文档
- [示例](./examples/index.md) - 学习实际使用案例

## 支持的 LLM Provider

- **OpenAI** - GPT-4, GPT-3.5
- **Anthropic** - Claude 系列
- **Google** - Gemini 系列
- **Moonshot** - Kimi 系列
- **MiniMax** - MiniMax 系列
- **智谱 AI** - GLM 系列
- **通义千问** - Qwen 系列
- **DeepSeek** - DeepSeek 系列
- **豆包** - Doubao 系列
