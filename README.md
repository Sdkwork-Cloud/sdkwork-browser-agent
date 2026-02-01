# SDKWork Browser Agent

<p align="center">
  <strong>企业级智能体框架 - 安全、高效、可扩展</strong>
</p>

<p align="center">
  <a href="#核心特性">核心特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#架构设计">架构设计</a> •
  <a href="#API文档">API文档</a> •
  <a href="#示例">示例</a>
</p>

---

## 📋 目录

- [简介](#简介)
- [核心特性](#核心特性)
- [快速开始](#快速开始)
- [架构设计](#架构设计)
- [模块说明](#模块说明)
- [配置指南](#配置指南)
- [API文档](#api文档)
- [高级算法](#高级算法)
- [示例代码](#示例代码)
- [性能优化](#性能优化)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 简介

SDKWork Browser Agent 是一个**企业级智能体框架**，采用业界顶尖技术栈构建，提供完整的智能体开发解决方案。框架集成了蒙特卡洛树搜索(MCTS)、层次任务网络(HTN)、向量数据库、安全沙箱等先进算法，支持复杂决策、多步规划、安全执行等高级功能。

### 设计理念

- **安全性优先**: 内置多层安全防护机制
- **高性能**: 并行计算、智能缓存、异步处理
- **可扩展**: 模块化设计，易于扩展和定制
- **易用性**: 简洁的API设计，丰富的文档和示例

---

## 核心特性

### 🔒 安全系统

| 组件 | 描述 | 状态 |
|------|------|------|
| **JavaScript安全沙箱** | 多后端隔离执行环境 | ✅ 已完成 |
| **Prompt Injection检测** | 多维度AI攻击检测 | ✅ 已完成 |
| **代码注入防护** | 语法验证与模式检测 | ✅ 已完成 |

### 🧠 智能决策

| 算法 | 应用场景 | 状态 |
|------|---------|------|
| **MCTS决策引擎** | 复杂多步决策 | ✅ 已完成 |
| **层次规划系统(HTN)** | 任务分解与规划 | ✅ 已完成 |
| **向量相似度搜索** | 语义检索与匹配 | ✅ 已完成 |

### 💾 记忆系统

| 组件 | 描述 | 状态 |
|------|------|------|
| **向量嵌入系统** | 多Provider嵌入生成 | ✅ 已完成 |
| **向量数据库** | 多后端向量存储 | ✅ 已完成 |
| **混合搜索** | 向量+文本融合检索 | ✅ 已完成 |

### 🚀 高级功能

- **并行模拟**: MCTS支持多线程并行搜索
- **渐进式拓宽**: 动态扩展搜索空间
- **RAVE优化**: 快速动作价值估计
- **偏序规划**: 任务并行执行优化
- **计划修复**: 运行时动态重新规划

---

## 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/your-org/sdkwork-browser-agent.git
cd sdkwork-browser-agent

# 安装依赖
npm install

# 构建项目
npm run build
```

### 基础使用

```typescript
import { Agent } from './src/agent/agent.js';
import { MCTSFactory } from './src/algorithms/mcts-decision-engine.js';
import { VectorDatabaseFactory } from './src/memory/vector-database.js';

// 创建智能体
const agent = new Agent({
  name: 'MyAgent',
  model: 'gpt-4',
  decisionEngine: MCTSFactory.createBalanced()
});

// 执行决策
const result = await agent.decide({
  state: initialState,
  actions: availableActions
});

console.log('决策结果:', result.selectedAction);
```

### 向量数据库使用

```typescript
import { VectorDatabaseFactory } from './src/memory/vector-database.js';
import { EmbeddingProviderFactory } from './src/embeddings/embedding-provider.js';

// 创建嵌入提供器
const embedder = EmbeddingProviderFactory.create({
  provider: 'openai',
  model: 'text-embedding-3-small'
});

// 创建向量数据库
const db = VectorDatabaseFactory.createMemory({
  dimension: 1536,
  metric: 'cosine'
});

await db.initialize();

// 插入文档
await db.insert({
  id: 'doc-1',
  vector: await embedder.embed('要存储的文本'),
  content: '要存储的文本',
  metadata: { category: 'example' }
});

// 搜索
const results = await db.search(
  await embedder.embed('查询文本'),
  { limit: 5, threshold: 0.7 }
);
```

### 层次规划使用

```typescript
import { HierarchicalPlannerFactory, createInitialWorldState } from './src/algorithms/hierarchical-planning.js';

// 创建规划器
const planner = HierarchicalPlannerFactory.createThorough();

// 定义任务
const rootTask: CompoundTask = {
  id: 'root',
  name: '完成项目',
  type: 'compound',
  methods: [{
    id: 'method-1',
    name: '标准流程',
    applicability: [],
    subtasks: [
      { id: 'task-1', name: '需求分析', type: 'primitive', execute: async () => ({ success: true }) },
      { id: 'task-2', name: '开发实现', type: 'primitive', execute: async () => ({ success: true }) },
      { id: 'task-3', name: '测试部署', type: 'primitive', execute: async () => ({ success: true }) }
    ]
  }]
};

// 生成计划
const planResult = await planner.plan(
  rootTask,
  createInitialWorldState({ status: 'ready' })
);

if (planResult.success) {
  // 执行计划
  const execResult = await planner.executePlan(planResult.plan!, {
    worldState: createInitialWorldState({}),
    executionHistory: [],
    availableResources: new Map(),
    parameters: {}
  });
  
  console.log('执行结果:', execResult.success ? '成功' : '失败');
}
```

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      SDKWork Browser Agent                   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Agent核心   │  │   决策引擎    │  │   记忆系统    │      │
│  │              │  │              │  │              │      │
│  │ • 状态管理    │  │ • MCTS       │  │ • 向量数据库  │      │
│  │ • 工具调用    │  │ • HTN规划    │  │ • 嵌入生成    │      │
│  │ • 流式处理    │  │ • 策略评估    │  │ • 混合搜索    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   安全系统    │  │   监控系统    │  │   实验系统    │      │
│  │              │  │              │  │              │      │
│  │ • 沙箱执行    │  │ • 性能监控    │  │ • A/B测试    │      │
│  │ • 注入检测    │  │ • 错误追踪    │  │ • 参数调优    │      │
│  │ • 代码审查    │  │ • 日志记录    │  │ • 效果评估    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│                      基础设施层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   LLM接口    │  │   工具系统    │  │   配置管理    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

```
用户输入 → Prompt Injection检测 → 决策引擎 → 任务规划 → 安全执行 → 结果输出
                ↓                      ↓           ↓           ↓
           风险评分                MCTS搜索    HTN分解    沙箱隔离
```

---

## 模块说明

### 1. 安全模块 (`src/security/`)

#### 安全沙箱 (`secure-sandbox.ts`)

提供隔离的JavaScript执行环境，支持多种后端：

- **IFrame沙箱**: 浏览器环境隔离
- **Web Worker**: 后台线程执行
- **Node.js isolated-vm**: 服务器端强隔离

```typescript
import { SandboxFactory } from './src/security/secure-sandbox.js';

const sandbox = SandboxFactory.create({
  backend: 'worker',
  timeout: 5000,
  memoryLimit: 128 * 1024 * 1024,
  allowedGlobals: ['console', 'Math'],
  blockedGlobals: ['fetch', 'WebSocket']
});

const result = await sandbox.execute('return 1 + 1');
```

#### Prompt Injection检测 (`prompt-injection-detector.ts`)

多维度检测系统，识别8种攻击类型：

1. 指令覆盖 (Instruction Override)
2. 上下文操控 (Context Manipulation)
3. 分隔符攻击 (Delimiter Attack)
4. 编码混淆 (Encoding Obfuscation)
5. 角色扮演攻击 (Role Play Attack)
6. 越狱尝试 (Jailbreak Attempt)
7. 系统提示词泄露 (System Prompt Leak)
8. 间接注入 (Indirect Injection)

```typescript
import { InjectionDetectorFactory } from './src/security/prompt-injection-detector.js';

const detector = InjectionDetectorFactory.createBalanced();

const result = await detector.detect(userInput, {
  systemPrompt: '你是一个助手...',
  conversationHistory: [],
  timestamp: Date.now()
});

if (result.isInjection) {
  console.log('检测到攻击:', result.attackTypes);
  console.log('风险评分:', result.riskScore);
}
```

### 2. 决策模块 (`src/algorithms/`)

#### MCTS决策引擎 (`mcts-decision-engine.ts`)

实现AlphaGo/AlphaZero核心算法：

```typescript
import { MCTSFactory } from './src/algorithms/mcts-decision-engine.js';

// 快速模式
const fastMCTS = MCTSFactory.createFast();

// 平衡模式
const balancedMCTS = MCTSFactory.createBalanced();

// 深度模式
const thoroughMCTS = MCTSFactory.createThorough();

// 自定义配置
const customMCTS = new MCTSDecisionEngine(simulationPolicy, {
  explorationConstant: Math.sqrt(2),
  maxIterations: 1000,
  parallelSimulations: 4,
  useRAVE: true,
  usePriorKnowledge: true
});
```

#### 层次规划系统 (`hierarchical-planning.ts`)

HTN规划实现，支持复杂任务分解：

```typescript
import { HierarchicalPlannerFactory } from './src/algorithms/hierarchical-planning.js';

// 实时模式
const realTimePlanner = HierarchicalPlannerFactory.createForRealTime();

// 快速模式
const fastPlanner = HierarchicalPlannerFactory.createFast();

// 深度模式
const thoroughPlanner = HierarchicalPlannerFactory.createThorough();
```

### 3. 记忆模块 (`src/memory/`)

#### 向量数据库 (`vector-database.ts`)

统一接口支持多种向量数据库：

```typescript
import { VectorDatabaseFactory, VectorDatabaseManager } from './src/memory/vector-database.js';

// 内存数据库
const memoryDB = VectorDatabaseFactory.createMemory({
  dimension: 1536,
  metric: 'cosine',
  cacheEnabled: true
});

// 使用管理器
const manager = new VectorDatabaseManager(embeddingProvider);
manager.createMemoryDB('documents', { dimension: 1536 });

// 自动嵌入并插入
await manager.insertWithEmbedding('documents', 'doc-1', '文本内容', { category: 'tech' });

// 文本搜索
const results = await manager.searchByText('documents', '查询文本', { limit: 10 });
```

### 4. 嵌入模块 (`src/embeddings/`)

#### 嵌入提供器 (`embedding-provider.ts`)

多Provider支持：

```typescript
import { EmbeddingProviderFactory } from './src/embeddings/embedding-provider.js';

// OpenAI
const openai = EmbeddingProviderFactory.create({
  provider: 'openai',
  model: 'text-embedding-3-small',
  dimensions: 1536
});

// 本地模型
const local = EmbeddingProviderFactory.create({
  provider: 'local',
  model: 'all-MiniLM-L6-v2',
  dimensions: 384
});

// TF-IDF (Fallback)
const tfidf = EmbeddingProviderFactory.create({
  provider: 'tfidf',
  dimensions: 384
});

// 批量嵌入
const vectors = await openai.embedBatch(['文本1', '文本2', '文本3']);
```

---

## 配置指南

### 全局配置

```typescript
// config/agent.config.ts
export const agentConfig = {
  // LLM配置
  llm: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000
  },
  
  // 决策引擎配置
  decision: {
    engine: 'mcts',
    explorationConstant: 1.414,
    maxIterations: 1000,
    timeout: 5000
  },
  
  // 记忆系统配置
  memory: {
    vectorDB: 'memory',
    embeddingProvider: 'openai',
    embeddingDimensions: 1536,
    cacheSize: 1000
  },
  
  // 安全配置
  security: {
    enableSandbox: true,
    enableInjectionDetection: true,
    riskThreshold: 0.6,
    maxInputLength: 10000
  }
};
```

### 环境变量

```bash
# LLM API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...

# 向量数据库
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
WEAVIATE_URL=...
QDRANT_URL=...

# 安全配置
SANDBOX_BACKEND=worker
MAX_EXECUTION_TIME=5000
```

---

## API文档

### Agent类

```typescript
class Agent {
  constructor(config: AgentConfig);
  
  // 执行决策
  decide(options: DecisionOptions): Promise<DecisionResult>;
  
  // 执行任务
  execute(task: Task): Promise<ExecutionResult>;
  
  // 流式响应
  stream(input: string): AsyncIterable<StreamChunk>;
  
  // 记忆检索
  recall(query: string, options?: RecallOptions): Promise<RecallResult>;
  
  // 工具调用
  callTool(name: string, params: Record<string, unknown>): Promise<ToolResult>;
}
```

### MCTSDecisionEngine类

```typescript
class MCTSDecisionEngine {
  constructor(
    simulationPolicy: SimulationPolicy,
    config?: Partial<MCTSConfig>,
    stateEvaluator?: StateEvaluator
  );
  
  // 执行决策
  decide(initialState: DecisionState, availableActions: Action[]): Promise<DecisionResult>;
  
  // 更新配置
  updateConfig(newConfig: Partial<MCTSConfig>): void;
  
  // 重置引擎
  reset(): void;
}
```

### HierarchicalPlanner类

```typescript
class HierarchicalPlanner {
  constructor(config?: Partial<PlanningConfig>);
  
  // 注册任务
  registerTask(task: Task): void;
  
  // 生成计划
  plan(rootTask: Task, initialState: WorldState): Promise<PlanningResult>;
  
  // 执行计划
  executePlan(plan: Plan, context: ExecutionContext): Promise<ExecutionResult>;
  
  // 更新配置
  updateConfig(newConfig: Partial<PlanningConfig>): void;
}
```

### VectorDatabase类

```typescript
abstract class VectorDatabase {
  // 初始化
  abstract initialize(): Promise<void>;
  
  // 关闭连接
  abstract close(): Promise<void>;
  
  // 插入文档
  abstract insert(document: VectorDocument): Promise<void>;
  
  // 批量插入
  abstract insertBatch(documents: VectorDocument[]): Promise<void>;
  
  // 向量搜索
  abstract search(vector: number[], options?: SearchOptions): Promise<SearchResult[]>;
  
  // 混合搜索
  abstract hybridSearch(query: string, vector: number[], options?: HybridSearchOptions): Promise<SearchResult[]>;
  
  // 文本搜索
  abstract textSearch(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  
  // 过滤搜索
  abstract filterSearch(filter: Record<string, unknown>, options?: SearchOptions): Promise<SearchResult[]>;
}
```

---

## 高级算法

### MCTS算法详解

蒙特卡洛树搜索包含四个阶段：

1. **选择 (Selection)**: 使用UCB1算法选择最有潜力的节点
2. **扩展 (Expansion)**: 添加新的子节点到树中
3. **模拟 (Simulation)**: 随机模拟到终止状态
4. **反向传播 (Backpropagation)**: 更新路径上所有节点的统计信息

```
        [Root]
       /  |  \
    [A]  [B]  [C]    ← 选择阶段
     |
    [A1] [A2]         ← 扩展阶段
     |
    (模拟...)         ← 模拟阶段
     |
    更新统计           ← 反向传播
```

### HTN规划详解

层次任务网络规划流程：

1. **任务分解**: 将复合任务递归分解为原子任务
2. **方法选择**: 根据适用条件选择最佳分解方法
3. **偏序约束**: 建立任务间的执行顺序约束
4. **线性化**: 将偏序计划转换为可执行序列

```
[完成项目]
    |
    ├── [需求分析]
    │       └── (原子任务)
    ├── [开发实现]
    │       └── (原子任务)
    └── [测试部署]
            └── (原子任务)
```

---

## 示例代码

### 完整智能体示例

```typescript
import { Agent } from './src/agent/agent.js';
import { MCTSFactory } from './src/algorithms/mcts-decision-engine.js';
import { InjectionDetectorFactory } from './src/security/prompt-injection-detector.js';
import { VectorDatabaseManager } from './src/memory/vector-database.js';
import { EmbeddingProviderFactory } from './src/embeddings/embedding-provider.js';

async function main() {
  // 1. 初始化组件
  const embedder = EmbeddingProviderFactory.create({
    provider: 'openai',
    model: 'text-embedding-3-small'
  });
  
  const dbManager = new VectorDatabaseManager(embedder);
  const memoryDB = dbManager.createMemoryDB('agent-memory', {
    dimension: 1536
  });
  
  const detector = InjectionDetectorFactory.createBalanced();
  const decisionEngine = MCTSFactory.createBalanced();
  
  // 2. 创建智能体
  const agent = new Agent({
    name: 'Assistant',
    decisionEngine,
    injectionDetector: detector,
    memoryManager: dbManager
  });
  
  // 3. 处理用户输入
  const userInput = '帮我分析这份数据并生成报告';
  
  // 安全检查
  const securityCheck = await detector.detect(userInput);
  if (securityCheck.isInjection) {
    console.error('检测到恶意输入:', securityCheck.attackTypes);
    return;
  }
  
  // 4. 检索相关记忆
  const memories = await dbManager.searchByText('agent-memory', userInput, {
    limit: 5
  });
  
  // 5. 执行决策
  const decision = await agent.decide({
    input: userInput,
    context: memories.map(m => m.document.content).join('\n'),
    availableActions: [
      { id: 'analyze', name: '数据分析' },
      { id: 'generate', name: '生成报告' },
      { id: 'search', name: '搜索信息' }
    ]
  });
  
  // 6. 执行动作
  const result = await agent.execute(decision.selectedAction);
  
  // 7. 存储结果到记忆
  await dbManager.insertWithEmbedding(
    'agent-memory',
    `interaction-${Date.now()}`,
    `用户: ${userInput}\n助手: ${result.output}`,
    { type: 'conversation' }
  );
  
  console.log('结果:', result.output);
}

main().catch(console.error);
```

---

## 性能优化

### 1. 缓存策略

- **嵌入缓存**: 避免重复计算文本嵌入
- **搜索结果缓存**: 缓存频繁查询的结果
- **MCTS树缓存**: 复用搜索树进行增量决策

### 2. 并行处理

- **并行模拟**: MCTS多线程搜索
- **批量嵌入**: 一次性处理多个文本
- **并发数据库操作**: 异步批量插入/查询

### 3. 资源管理

- **连接池**: 数据库连接复用
- **沙箱池**: 预创建沙箱实例
- **内存限制**: 防止内存泄漏

---

## 贡献指南

### 开发流程

1. Fork 仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 配置
- 编写单元测试
- 更新文档

### 提交规范

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

---

## 许可证

[MIT](LICENSE) © SDKWork Team

---

<p align="center">
  <strong>Made with ❤️ by SDKWork Team</strong>
</p>
