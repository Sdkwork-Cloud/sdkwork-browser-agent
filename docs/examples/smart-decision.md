# 智能决策示例

本示例展示如何使用 SmartAgent 的自动决策功能。

## 基础决策

```typescript
import { SmartAgent, OpenAIProvider, builtInSkills } from 'sdkwork-browser-agent';

const agent = new SmartAgent({
  name: 'decision-agent',
  llmProvider: new OpenAIProvider({ apiKey: 'your-key' }),
  skills: builtInSkills,
  autoDecide: true, // 启用自动决策
});

await agent.initialize();

// 自动决策并执行
const result = await agent.process('Calculate 15 * 23');
console.log(result.decision);
// { type: 'skill', skills: ['math'], confidence: 0.95, ... }
```

## 查看决策详情

```typescript
const result = await agent.process('Translate "Hello" to Chinese');

console.log('决策类型:', result.decision.type);
console.log('选中技能:', result.decision.skills);
console.log('置信度:', result.decision.confidence);
console.log('决策理由:', result.decision.reasoning);
```

## 手动决策

```typescript
import { DecisionEngine } from 'sdkwork-browser-agent';

const engine = new DecisionEngine();

// 索引技能
for (const skill of builtInSkills) {
  await engine.indexSkill(skill);
}

// 手动决策
const decision = await engine.decide({
  input: 'What is 2 + 2?',
  availableSkills: ['math', 'echo', 'translate'],
  availableTools: [],
});

console.log(decision);
```

## 下一步

- [基础示例](./basic.md)
- [自定义 Skill](./custom-skill.md)
