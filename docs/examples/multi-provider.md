# 多 Provider 示例

本示例展示如何在应用中使用多个 LLM Provider。

## 基础设置

```typescript
import { SmartAgent, OpenAIProvider, AnthropicProvider } from 'sdkwork-browser-agent';

// 创建多个 Agent，使用不同 Provider
const openaiAgent = new SmartAgent({
  name: 'openai-agent',
  llmProvider: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
  }),
});

const claudeAgent = new SmartAgent({
  name: 'claude-agent',
  llmProvider: new AnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-opus-20240229',
  }),
});

await openaiAgent.initialize();
await claudeAgent.initialize();
```

## 比较不同 Provider

```typescript
const prompt = 'Explain quantum computing in simple terms';

// 使用 OpenAI
const openaiResult = await openaiAgent.chat([{ role: 'user', content: prompt }]);

// 使用 Claude
const claudeResult = await claudeAgent.chat([{ role: 'user', content: prompt }]);

console.log('OpenAI:', openaiResult.content);
console.log('Claude:', claudeResult.content);
```

## 切换 Provider

```typescript
class MultiProviderAgent {
  private providers: Map<string, LLMProvider>;
  private currentProvider: string;

  constructor() {
    this.providers = new Map([
      ['openai', new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY })],
      ['claude', new AnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY })],
      ['gemini', new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY })],
    ]);
    this.currentProvider = 'openai';
  }

  switchProvider(name: string) {
    if (this.providers.has(name)) {
      this.currentProvider = name;
    }
  }

  async chat(messages: LLMMessage[]) {
    const provider = this.providers.get(this.currentProvider)!;
    return provider.chat(messages);
  }
}
```

## 下一步

- [动态加载](./dynamic-loading.md)
- [流式处理](./streaming.md)
