# SDKWork Browser Agent 文档

本文档站点使用 [VitePress](https://vitepress.dev/) 构建。

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run docs:dev

# 或
npm run dev
```

## 构建

```bash
# 构建文档
npm run docs:build

# 预览构建结果
npm run docs:preview
```

## 部署

文档会自动部署到 Vercel：

1. 推送代码到 `main` 分支
2. GitHub Actions 会自动构建并部署
3. 访问 https://sdkwork-browser-agent.vercel.app

## 文档结构

```
docs/
├── .vitepress/
│   └── config.ts          # VitePress 配置
├── guide/                 # 指南
│   ├── getting-started.md
│   ├── concepts/
│   └── advanced/
├── api/                   # API 参考
├── examples/              # 示例
└── public/               # 静态资源
```

## 编写文档

### 添加新页面

1. 在相应目录创建 `.md` 文件
2. 在 `config.ts` 的 sidebar 中添加链接
3. 运行 `npm run docs:dev` 预览

### 代码块

使用代码组展示多语言示例：

````markdown
::: code-group

```typescript [TypeScript]
const agent = new SmartAgent({});
```
````

```javascript [JavaScript]
const agent = new SmartAgent({});
```

:::

````

### 提示框

```markdown
::: tip
这是提示信息
:::

::: warning
这是警告信息
:::

::: danger
这是危险信息
:::
````

## 贡献

欢迎提交 PR 改进文档！
