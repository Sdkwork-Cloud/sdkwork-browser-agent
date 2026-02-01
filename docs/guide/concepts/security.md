# 安全系统

SDKWork Browser Agent 提供企业级安全防护，包括 JavaScript 安全沙箱和 Prompt Injection 检测。

## 概述

安全系统包含两个核心组件：

1. **Secure Sandbox** - 隔离的 JavaScript 执行环境
2. **Prompt Injection Detector** - AI 攻击检测系统

## Secure Sandbox

提供多后端隔离执行环境，防止恶意代码执行。

### 基本使用

```typescript
import { SandboxFactory } from 'sdkwork-browser-agent/security';

const sandbox = SandboxFactory.create({
  backend: 'worker',
  timeout: 5000,
  memoryLimit: 128 * 1024 * 1024,
  allowedGlobals: ['console', 'Math'],
  blockedGlobals: ['fetch', 'WebSocket'],
});

const result = await sandbox.execute('return 1 + 1');
console.log(result); // 2
```

### 后端类型

| 后端 | 环境 | 隔离级别 | 适用场景 |
|------|------|----------|----------|
| `iframe` | 浏览器 | 中 | 简单脚本 |
| `worker` | 浏览器 | 高 | 复杂计算 |
| `isolated-vm` | Node.js | 最高 | 服务器端 |

### 安全策略

```typescript
const sandbox = SandboxFactory.create({
  backend: 'worker',
  // 资源限制
  timeout: 10000,
  memoryLimit: 256 * 1024 * 1024,
  cpuLimit: 1000, // ms
  
  // 全局对象控制
  allowedGlobals: ['Math', 'JSON', 'console'],
  blockedGlobals: ['fetch', 'WebSocket', 'XMLHttpRequest'],
  
  // 自定义全局变量
  customGlobals: {
    myHelper: (x: number) => x * 2,
  },
  
  // 违规处理
  onViolation: (violation) => {
    console.error('Security violation:', violation);
  },
});
```

### 沙箱池

高并发场景使用沙箱池：

```typescript
const pool = SandboxFactory.createPool({
  backend: 'worker',
  poolSize: 10,
  timeout: 5000,
});

// 自动分配沙箱
const result = await pool.execute('return Math.random()');
```

## Prompt Injection 检测

多维度 AI 攻击检测系统，识别 8 种攻击类型。

### 基本使用

```typescript
import { InjectionDetectorFactory } from 'sdkwork-browser-agent/security';

const detector = InjectionDetectorFactory.createBalanced();

const result = await detector.detect('用户输入', {
  systemPrompt: '你是一个助手...',
  conversationHistory: [],
  timestamp: Date.now(),
});

if (result.isInjection) {
  console.log('攻击类型:', result.attackTypes);
  console.log('风险评分:', result.riskScore);
  console.log('建议操作:', result.recommendation);
}
```

### 检测模式

| 模式 | 描述 | 适用场景 |
|------|------|----------|
| `fast` | 仅启发式规则 | 高性能要求 |
| `balanced` | 规则 + 语义 | 一般场景 |
| `thorough` | 完整检测 | 高安全要求 |

### 攻击类型

1. **指令覆盖** - 忽略先前指令
2. **上下文操控** - 角色扮演攻击
3. **分隔符攻击** - 使用特殊分隔符
4. **编码混淆** - 编码绕过检测
5. **角色扮演** -  pretend to be someone else
6. **越狱尝试** - DAN mode 等
7. **系统提示泄露** - 试图获取系统提示
8. **间接注入** - 通过文档注入

### 自定义配置

```typescript
const detector = new PromptInjectionDetector({
  mode: 'balanced',
  similarityThreshold: 0.75,
  riskThreshold: 0.6,
  enableSemanticDetection: true,
  enableContextAnalysis: true,
  enableBehaviorDetection: true,
  customBlacklist: ['pattern1', 'pattern2'],
  customWhitelist: ['safe-pattern'],
  onDetection: (result) => {
    // 自定义处理逻辑
    alertSecurityTeam(result);
  },
});
```

## 与 Agent 集成

```typescript
import { SmartAgent } from 'sdkwork-browser-agent';
import { InjectionDetectorFactory } from 'sdkwork-browser-agent/security';

const agent = new SmartAgent({
  name: 'secure-agent',
  llmProvider: new OpenAIProvider({ apiKey: 'xxx' }),
  injectionDetector: InjectionDetectorFactory.createBalanced(),
  securityConfig: {
    riskThreshold: 0.6,
    onDetection: (result) => {
      console.warn('检测到可疑输入:', result.attackTypes);
    },
  },
});

// 自动检测所有输入
const result = await agent.process('用户输入');
```

## 最佳实践

1. **始终启用安全检查** - 生产环境必须启用
2. **合理设置阈值** - 根据业务调整风险阈值
3. **监控检测结果** - 记录和分析检测日志
4. **定期更新规则** - 跟进新的攻击手段
5. **多层防护** - 结合沙箱和检测双重保护
