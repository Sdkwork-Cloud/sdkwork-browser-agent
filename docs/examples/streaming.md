# 流式处理示例

本示例展示如何使用流式处理获取实时响应。

## 基础流式处理

```typescript
import { SmartAgent, OpenAIProvider } from 'sdkwork-browser-agent';

const agent = new SmartAgent({
  name: 'streaming-agent',
  llmProvider: new OpenAIProvider({ apiKey: 'your-key' }),
});

await agent.initialize();

// 流式处理
for await (const chunk of agent.streamChat([
  { role: 'user', content: 'Write a long story about AI' },
])) {
  if (chunk.delta.content) {
    process.stdout.write(chunk.delta.content);
  }
}
```

## 流式 Skill 执行

```typescript
for await (const chunk of agent.streamProcess('Generate a poem')) {
  switch (chunk.type) {
    case 'decision':
      console.log('Decision:', chunk.data);
      break;
    case 'skill':
      console.log('Executing skill:', chunk.data);
      break;
    case 'llm':
      process.stdout.write(chunk.data.chunk || '');
      break;
    case 'complete':
      console.log('\nDone!');
      break;
  }
}
```

## 带回调的流式处理

```typescript
let fullResponse = '';

for await (const chunk of agent.streamChat(messages)) {
  const content = chunk.delta.content || '';
  fullResponse += content;

  // 实时更新 UI
  updateUI(content);

  // 显示进度
  showProgress(fullResponse.length);
}

console.log('Full response:', fullResponse);
```

## 下一步

- [多 Provider](./multi-provider.md)
- [基础示例](./basic.md)
