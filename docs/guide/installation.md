# 安装

## 环境要求

- **Node.js**: >= 18.0.0
- **TypeScript**: >= 5.0 (如果使用 TypeScript)

## 使用 npm/yarn/pnpm 安装

::: code-group

```bash [npm]
npm install sdkwork-browser-agent
```

```bash [yarn]
yarn add sdkwork-browser-agent
```

```bash [pnpm]
pnpm add sdkwork-browser-agent
```

:::

## 浏览器使用

如果你需要在浏览器中使用，可以直接通过 CDN 引入：

```html
<script type="module">
  import {
    SmartAgent,
    OpenAIProvider,
  } from 'https://cdn.jsdelivr.net/npm/sdkwork-browser-agent@latest/dist/index.js';

  const agent = new SmartAgent({
    llmProvider: new OpenAIProvider({ apiKey: 'your-api-key' }),
  });
</script>
```

## 配置 TypeScript

确保你的 `tsconfig.json` 包含以下配置：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## 环境变量

为了安全起见，建议将 API Keys 存储在环境变量中：

```bash
# .env
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GEMINI_API_KEY=your-gemini-api-key
```

使用 `dotenv` 加载环境变量：

```bash
npm install dotenv
```

```typescript
import 'dotenv/config';

const agent = new SmartAgent({
  llmProvider: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
  }),
});
```

## 验证安装

创建一个测试文件验证安装：

```typescript
// test.ts
import { SmartAgent, OpenAIProvider, builtInSkills } from 'sdkwork-browser-agent';

async function test() {
  const agent = new SmartAgent({
    name: 'test-agent',
    llmProvider: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY || 'test-key',
    }),
    skills: builtInSkills,
  });

  await agent.initialize();
  console.log('✅ Agent initialized successfully!');
  console.log('Available skills:', agent.getSkillNames());
}

test().catch(console.error);
```

运行测试：

```bash
npx tsx test.ts
```

## 故障排除

### 模块找不到

如果遇到模块找不到的错误，请检查：

1. 确保已正确安装依赖：`npm list sdkwork-browser-agent`
2. 检查 `tsconfig.json` 的 `moduleResolution` 设置为 `"bundler"` 或 `"node"`
3. 如果使用 ESM，确保文件扩展名为 `.mjs` 或在 `package.json` 中设置 `"type": "module"`

### TypeScript 类型错误

如果遇到类型错误，尝试：

```bash
# 清除缓存并重新安装
rm -rf node_modules package-lock.json
npm install
```

### 浏览器兼容性问题

如果在浏览器中遇到问题，确保：

1. 使用现代浏览器（Chrome 90+, Firefox 90+, Safari 14+）
2. 启用 JavaScript 模块
3. 如果使用 bundler（如 Vite、Webpack），确保正确配置

## 下一步

- [快速开始](./getting-started.md) - 开始编写代码
- [核心概念](./concepts/agent.md) - 了解架构设计
