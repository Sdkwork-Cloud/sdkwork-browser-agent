# 贡献指南

感谢您对 SDKWork Browser Agent 的兴趣！我们欢迎所有形式的贡献。

## 如何贡献

### 报告问题

如果您发现了 bug 或有功能建议，请通过 [GitHub Issues](https://github.com/your-org/sdkwork-browser-agent/issues) 提交。

提交问题时请包含：

- 问题的清晰描述
- 复现步骤
- 期望行为与实际行为
- 环境信息（Node.js 版本、操作系统等）
- 相关代码片段

### 提交代码

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/your-org/sdkwork-browser-agent.git
cd sdkwork-browser-agent

# 安装依赖
npm install

# 运行测试
npm test

# 构建项目
npm run build

# 运行类型检查
npm run typecheck

# 运行代码检查
npm run lint
```

### 代码规范

- 使用 TypeScript 编写代码
- 遵循现有的代码风格
- 添加适当的类型定义
- 编写单元测试
- 确保所有测试通过
- 保持代码覆盖率

### 提交信息规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式（不影响功能）
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具的变动

示例：

```
feat: add support for new LLM provider

Add Moonshot provider with full API support
```

### 文档贡献

文档位于 `docs/` 目录，使用 VitePress 构建。

```bash
cd docs
npm install
npm run docs:dev
```

## 行为准则

- 尊重所有参与者
- 接受建设性的批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

## 许可证

通过提交代码，您同意您的贡献将在 MIT 许可证下发布。
