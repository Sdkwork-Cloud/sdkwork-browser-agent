# SDKWork Browser Agent

浏览器兼容的 Agent 架构，支持 Skills、MCP、Tools、安全沙箱、智能决策引擎和灵活的 LLM Provider 体系。

## 特性

- 🤖 **智能决策引擎** - MCTS + HTN 双引擎决策
- 🛡️ **企业级安全** - JavaScript沙箱 + Prompt Injection检测
- 🧠 **向量记忆系统** - 多Provider嵌入 + 向量数据库
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
import { MCTSFactory } from 'sdkwork-browser-agent/algorithms';
import { InjectionDetectorFactory } from 'sdkwork-browser-agent/security';

const agent = new SmartAgent({
  name: 'my-agent',
  llmProvider: new OpenAIProvider({ apiKey: 'your-api-key' }),
  skills: builtInSkills,
  autoDecide: true,
  // 使用MCTS决策引擎
  decisionEngine: MCTSFactory.createBalanced(),
  // 启用安全检查
  injectionDetector: InjectionDetectorFactory.createBalanced(),
});

await agent.initialize();
const result = await agent.process('Calculate 2 + 2');
console.log(result.result); // 4
```

## 核心功能

### 🔒 安全系统

- **JavaScript安全沙箱** - 多后端隔离执行环境 (iframe/Worker/isolated-vm)
- **Prompt Injection检测** - 8种攻击类型识别，多维度评分融合
- **代码注入防护** - 语法验证与模式检测

### 🧠 智能决策

- **MCTS决策引擎** - AlphaGo/AlphaZero核心算法，UCB1+RAVE优化
- **层次规划系统(HTN)** - 任务分解与偏序规划
- **向量相似度搜索** - 语义检索与混合搜索

### 💾 记忆系统

- **向量嵌入系统** - OpenAI/Anthropic/Local/Transformers/TF-IDF多Provider
- **向量数据库** - Pinecone/Weaviate/Qdrant/Milvus/Chroma支持
- **混合搜索** - 向量+文本融合检索 (RRF/Linear)

## 下一步

- [快速开始](./guide/getting-started.md) - 了解如何安装和配置
- [核心概念](./guide/concepts/agent.md) - 深入了解架构设计
- [API 参考](./api/index.md) - 查看完整的 API 文档
- [示例](./examples/index.md) - 学习实际使用案例
- [架构蓝图](./architecture-blueprint.md) - 完美智能体架构设计

## 支持的 LLM Provider

- **OpenAI** - GPT-4, GPT-3.5, Embedding
- **Anthropic** - Claude 系列
- **Google** - Gemini 系列
- **Moonshot** - Kimi 系列
- **MiniMax** - MiniMax 系列
- **智谱 AI** - GLM 系列
- **通义千问** - Qwen 系列
- **DeepSeek** - DeepSeek 系列
- **豆包** - Doubao 系列
