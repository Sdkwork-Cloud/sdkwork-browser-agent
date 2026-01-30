# 模型更新日志

本文档记录了 LLM Provider 支持的模型列表更新历史。

## 2025-01-28 更新

### OpenAI

**新增模型：**

#### GPT-4o 系列

- `gpt-4o` - 最新旗舰模型（默认）
- `gpt-4o-2024-11-20` - 2024年11月版本
- `gpt-4o-2024-08-06` - 2024年8月版本
- `gpt-4o-mini` - 轻量版
- `gpt-4o-mini-2024-07-18` - Mini 2024年7月版本

#### GPT-4o Realtime (实时语音)

- `gpt-4o-realtime-preview` - 实时语音预览版
- `gpt-4o-realtime-preview-2024-10-01` - 2024年10月版本
- `gpt-4o-mini-realtime-preview` - Mini 实时语音预览版

#### GPT-4o Audio (音频)

- `gpt-4o-audio-preview` - 音频预览版
- `gpt-4o-audio-preview-2024-10-01` - 2024年10月版本

#### GPT-4 Turbo

- `gpt-4-turbo` - Turbo 版本
- `gpt-4-turbo-2024-04-09` - 2024年4月版本
- `gpt-4-turbo-preview` - Turbo 预览版

#### GPT-4

- `gpt-4` - 基础版本
- `gpt-4-0613` - 2023年6月版本
- `gpt-4-0314` - 2023年3月版本

#### GPT-4 Vision (视觉)

- `gpt-4-vision-preview` - 视觉预览版
- `gpt-4-1106-vision-preview` - 2023年11月版本

#### GPT-3.5 Turbo

- `gpt-3.5-turbo` - 最新版本
- `gpt-3.5-turbo-0125` - 2024年1月版本
- `gpt-3.5-turbo-1106` - 2023年11月版本

#### o1 系列 (推理模型)

- `o1` - 完整 o1 模型（新）
- `o1-2024-12-17` - 2024年12月版本
- `o1-preview` - o1 预览版
- `o1-preview-2024-09-12` - 2024年9月版本
- `o1-mini` - o1 轻量版
- `o1-mini-2024-09-12` - Mini 2024年9月版本

**默认模型：** `gpt-4o`

---

### Anthropic Claude

**新增模型：**

#### Claude 3.5 Sonnet

- `claude-3-5-sonnet-20241022` - 2024年10月版本
- `claude-3-5-sonnet-20240620` - 2024年6月版本
- `claude-3-5-sonnet-latest` - 最新版本（默认）

#### Claude 3.5 Haiku

- `claude-3-5-haiku-20241022` - 2024年10月版本
- `claude-3-5-haiku-latest` - 最新版本

#### Claude 3 Opus

- `claude-3-opus-20240229` - 2024年2月版本
- `claude-3-opus-latest` - 最新版本

#### Claude 3 Sonnet

- `claude-3-sonnet-20240229` - 2024年2月版本
- `claude-3-sonnet-latest` - 最新版本

#### Claude 3 Haiku

- `claude-3-haiku-20240307` - 2024年3月版本
- `claude-3-haiku-latest` - 最新版本

**默认模型：** `claude-3-5-sonnet-latest`

---

### Google Gemini

**新增模型：**

#### Gemini 2.0 Flash (最新快速模型)

- `gemini-2.0-flash-exp` - 实验版
- `gemini-2.0-flash` - 标准版（默认）
- `gemini-2.0-flash-lite` - 轻量版
- `gemini-2.0-flash-thinking-exp` - 思考实验版
- `gemini-2.0-flash-thinking-exp-01-21` - 2025年1月21日版本

#### Gemini 2.0 Pro (最新专业模型)

- `gemini-2.0-pro-exp` - 实验版
- `gemini-2.0-pro-exp-02-05` - 2025年2月5日版本

#### Gemini 1.5 Flash

- `gemini-1.5-flash` - 标准版
- `gemini-1.5-flash-002` - 002版本
- `gemini-1.5-flash-8b` - 8B参数版
- `gemini-1.5-flash-8b-latest` - 8B最新版
- `gemini-1.5-flash-8b-001` - 8B 001版本
- `gemini-1.5-flash-latest` - 最新版

#### Gemini 1.5 Pro

- `gemini-1.5-pro` - 标准版
- `gemini-1.5-pro-002` - 002版本
- `gemini-1.5-pro-latest` - 最新版

#### Gemini 1.0 Pro (旧版)

- `gemini-1.0-pro` - 标准版
- `gemini-1.0-pro-002` - 002版本
- `gemini-1.0-pro-vision-latest` - 视觉最新版
- `gemini-1.0-pro-vision` - 视觉版

**默认模型：** `gemini-2.0-flash`

---

## 使用建议

### OpenAI

- **通用任务**：`gpt-4o` 或 `gpt-4o-mini`
- **代码生成**：`gpt-4o` 或 `o1-preview`
- **快速响应**：`gpt-4o-mini`
- **复杂推理**：`o1` 或 `o1-preview`
- **实时语音**：`gpt-4o-realtime-preview`

### Anthropic

- **通用任务**：`claude-3-5-sonnet-latest`
- **最强推理**：`claude-3-opus-latest`
- **快速响应**：`claude-3-5-haiku-latest`
- **平衡选择**：`claude-3-5-sonnet-latest`

### Google

- **通用任务**：`gemini-2.0-flash`
- **最强性能**：`gemini-2.0-pro-exp`
- **快速响应**：`gemini-2.0-flash-lite`
- **长上下文**：`gemini-1.5-pro-latest`

## 模型选择示例

```typescript
// OpenAI - 使用最新 GPT-4o
const openaiAgent = new SmartAgent({
  llmProvider: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    defaultParams: {
      model: 'gpt-4o', // 或 'gpt-4o-mini' 以节省成本
    },
  }),
});

// Anthropic - 使用最新 Claude 3.5 Sonnet
const claudeAgent = new SmartAgent({
  llmProvider: new AnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY,
    defaultParams: {
      model: 'claude-3-5-sonnet-latest',
    },
  }),
});

// Google - 使用最新 Gemini 2.0 Flash
const geminiAgent = new SmartAgent({
  llmProvider: new GeminiProvider({
    apiKey: process.env.GEMINI_API_KEY,
    defaultParams: {
      model: 'gemini-2.0-flash',
    },
  }),
});
```

## 查看支持的模型

```typescript
import { OpenAIProvider, AnthropicProvider, GeminiProvider } from 'sdkwork-browser-agent';

console.log('OpenAI models:', new OpenAIProvider({}).supportedModels);
console.log('Anthropic models:', new AnthropicProvider({}).supportedModels);
console.log('Gemini models:', new GeminiProvider({}).supportedModels);
```
