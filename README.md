# SDKWork Browser Agent

[![npm version](https://img.shields.io/npm/v/sdkwork-browser-agent.svg)](https://www.npmjs.com/package/sdkwork-browser-agent)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A browser-compatible agent architecture with Skills, MCP, Tools, and flexible LLM Provider support.

[English](./README.md) | [中文](./README.zh-CN.md)

## ✨ Features

- 🤖 **Smart Decision Engine** - Automatically selects the best Skill based on embedding similarity matching and intent classification
- 🧠 **Advanced Decision Engine** - Multi-stage decision making with confidence scoring and adaptive learning
- 🔍 **Parameter Extraction** - Multi-strategy parameter extraction with type coercion and validation
- 📊 **Evaluation System** - Multi-dimensional result evaluation with correctness verification and feedback
- 🔄 **Dynamic Skill Loading** - Lazy loading mechanism supporting file, URL, and module sources
- 💰 **Token Optimization** - Smart compression and truncation to minimize token consumption
- 🔌 **Multi-LLM Support** - OpenAI, Anthropic, Google Gemini, and other mainstream models
- 📦 **MCP Protocol** - Full Model Context Protocol support
- 🔧 **Plugin System** - Extensible plugin architecture
- 🌐 **Browser Compatible** - Supports both browser and Node.js environments
- 📘 **TypeScript** - Complete type support

## 🚀 Quick Start

### Installation

```bash
npm install sdkwork-browser-agent
# or
yarn add sdkwork-browser-agent
# or
pnpm add sdkwork-browser-agent
```

### Basic Usage

```typescript
import { SmartAgent, OpenAIProvider, builtInSkills } from 'sdkwork-browser-agent';

// Create a smart agent
const agent = new SmartAgent({
  name: 'my-agent',
  llmProvider: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
  }),
  skills: builtInSkills,
  autoDecide: true,
});

// Initialize
await agent.initialize();

// Auto-process input
const result = await agent.process('Calculate 2 + 2');
console.log(result.result); // 4
console.log(result.evaluation); // Evaluation result
```

### Using Different LLM Providers

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

## 📚 Documentation

Full documentation: [https://sdkwork-browser-agent.vercel.app](https://sdkwork-browser-agent.vercel.app)

- [Quick Start](https://sdkwork-browser-agent.vercel.app/guide/getting-started)
- [Core Concepts](https://sdkwork-browser-agent.vercel.app/guide/concepts)
- [API Reference](https://sdkwork-browser-agent.vercel.app/api/)
- [Examples](https://sdkwork-browser-agent.vercel.app/examples/)

## 🏗️ Architecture

```
sdkwork-browser-agent/
├── src/
│   ├── core/                    # Agent Core
│   │   ├── agent.ts             # Base Agent
│   │   ├── smart-agent.ts       # Smart Agent (auto decision)
│   │   ├── decision-engine.ts   # Decision Engine
│   │   ├── advanced-decision-engine.ts  # Advanced Decision Engine
│   │   ├── parameter-extractor.ts       # Parameter Extraction
│   │   ├── evaluation-engine.ts         # Evaluation System
│   │   ├── skill-loader.ts      # Dynamic Loading
│   │   ├── token-optimizer.ts   # Token Optimization
│   │   └── execution-engine.ts  # Execution Engine
│   ├── llm/                     # LLM Provider
│   ├── skills/                  # Skill System
│   ├── tools/                   # Tool System
│   ├── mcp/                     # MCP Protocol
│   └── plugins/                 # Plugin System
```

## 🎯 Core Features

### 1. Smart Decision Engine

Automatically selects the most suitable Skill based on input:

```typescript
const agent = new SmartAgent({
  decisionEngine: {
    enableEmbeddings: true,  // Enable embedding similarity
    enableCaching: true,     // Enable decision caching
    threshold: 0.6,          // Similarity threshold
    maxSkills: 3,            // Max skills to select
  },
});
```

### 2. Advanced Decision Engine

Multi-stage decision making with intent classification:

```typescript
import { AdvancedDecisionEngine } from 'sdkwork-browser-agent';

const engine = new AdvancedDecisionEngine({
  enableIntentClassification: true,
  enableContextualMemory: true,
  learningRate: 0.1,
});

const decision = await engine.decide({
  input: 'Calculate sum of 5 and 3',
  availableSkills: ['math', 'calculator'],
  availableTools: [],
});
// Result: { intent: 'calculation', confidence: 0.95, skills: ['math'] }
```

### 3. Parameter Extraction

Multi-strategy parameter extraction with validation:

```typescript
import { ParameterExtractor } from 'sdkwork-browser-agent';

const extractor = new ParameterExtractor({
  useLLM: true,
  usePatternMatching: true,
  useContextInference: true,
});

const result = await extractor.extract(
  'Calculate sum: a=5, b=3',
  mathSkill,
  context,
  llmProvider
);
// { params: { a: 5, b: 3 }, confidence: 0.95, missing: [], invalid: [] }
```

### 4. Evaluation System

Multi-dimensional result evaluation with feedback:

```typescript
const agent = new SmartAgent({
  evaluation: {
    enabled: true,
    level: 'standard',      // 'none' | 'basic' | 'standard' | 'strict'
    strategies: ['semantic'],
    threshold: 0.7,
    autoRetry: true,
    maxRetries: 3,
  },
});

const result = await agent.process('Calculate 5 + 3');
console.log(result.evaluation);
// {
//   passed: true,
//   score: { overall: 0.92, correctness: 0.95, completeness: 0.90, relevance: 0.91 },
//   feedback: 'Good result. Output meets expectations with minor room for improvement.',
//   suggestions: []
// }
```

### 5. Dynamic Skill Loading

Lazy load Skills from multiple sources:

```typescript
// Register skill source
agent.registerSkillSource('my-skill', 'https://example.com/skills/my-skill.json', 'url');

// Dynamic loading
const skill = await agent.skillLoader.load('my-skill');
```

### 6. Token Optimization

Automatically optimize token consumption:

```typescript
const optimizer = new TokenOptimizer({
  enableCompression: true,
  maxSkillDescriptionLength: 200,
  maxContextTokens: 4000,
});

const optimized = optimizer.optimizeSkills(skills);
const stats = optimizer.getOptimizationStats(skills, optimized);
console.log(`Saved ${stats.savingsPercent}% tokens`);
```

### 7. Custom Skill

```typescript
import { Skill } from 'sdkwork-browser-agent';

const mySkill: Skill = {
  name: 'translate',
  description: 'Translate text to another language',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Text to translate' },
      targetLang: { type: 'string', description: 'Target language' },
    },
    required: ['text', 'targetLang'],
  },
  handler: async params => {
    // Implement translation logic
    return { success: true, data: translatedText };
  },
  metadata: {
    category: 'language',
    tags: ['translate', 'nlp'],
  },
};

agent.registerSkill(mySkill);
```

### 8. Execution Engine with Retry

Robust execution with retry and error handling:

```typescript
import { ExecutionEngine } from 'sdkwork-browser-agent';

const engine = new ExecutionEngine({
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 60000,
  },
});

const result = await engine.execute(steps, context);
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Type check
npm run typecheck

# Code formatting
npm run format

# Full verification
npm run verify
```

## 🤝 Contributing

Welcome to submit Issues and PRs! Please read the [Contributing Guide](./CONTRIBUTING.md).

## 📄 License

[MIT](./LICENSE)

## 🙏 Acknowledgments

- [Agent Skills Specification](https://agentskills.io/specification)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [OpenCode](https://opencode.ai) - Architecture inspiration

---

<p align="center">
  Made with ❤️ by SDKWork Team
</p>
