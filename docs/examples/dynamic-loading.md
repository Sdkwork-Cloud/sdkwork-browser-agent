# 动态加载示例

本示例展示如何动态加载 Skills。

## 懒加载

```typescript
import { DynamicSkillLoader } from 'sdkwork-browser-agent';

const loader = new DynamicSkillLoader({
  enableLazyLoading: true,
  enableCaching: true,
});

// 注册 Skill 源
loader.registerSource({
  name: 'advanced-math',
  type: 'url',
  source: 'https://example.com/skills/advanced-math.json',
});

// 懒加载
const skill = await loader.load('advanced-math');
if (skill) {
  agent.registerSkill(skill);
}
```

## 批量加载

```typescript
// 预加载多个 Skills
await loader.preload(['skill-1', 'skill-2', 'skill-3']);

// 批量加载
const skills = await loader.loadMultiple(['skill-1', 'skill-2']);
for (const [name, skill] of skills) {
  agent.registerSkill(skill);
}
```

## 缓存管理

```typescript
// 查看统计
const stats = loader.getStats();
console.log(stats);

// 清理缓存
loader.clearCache();

// 卸载 Skill
loader.unload('skill-name');
```

## 下一步

- [自定义 Skill](./custom-skill.md)
- [多 Provider](./multi-provider.md)
