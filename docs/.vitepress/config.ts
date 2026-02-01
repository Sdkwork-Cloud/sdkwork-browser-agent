import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'SDKWork Browser Agent',
  description: '浏览器兼容的 Agent 架构，支持 Skills、MCP、Tools 和灵活的 LLM Provider 体系',

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#3c3c3c' }],
  ],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.svg',

    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: 'API 参考', link: '/api/' },
      { text: '示例', link: '/examples/' },
      {
        text: 'v1.0.0',
        items: [
          { text: '更新日志', link: '/changelog' },
          { text: '贡献指南', link: '/contributing' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '介绍', link: '/guide/' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '安装', link: '/guide/installation' },
          ],
        },
        {
          text: '核心概念',
          items: [
            { text: 'Agent', link: '/guide/concepts/agent' },
            { text: 'SmartAgent', link: '/guide/concepts/smart-agent' },
            { text: 'Skills', link: '/guide/concepts/skills' },
            { text: 'Tools', link: '/guide/concepts/tools' },
            { text: '决策引擎', link: '/guide/concepts/decision-engine' },
            { text: 'Token 优化', link: '/guide/concepts/token-optimizer' },
            { text: '安全系统', link: '/guide/concepts/security' },
            { text: '向量记忆', link: '/guide/concepts/vector-memory' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [{ text: '概述', link: '/api/' }],
        },
      ],
      '/examples/': [
        {
          text: '示例',
          items: [
            { text: '概述', link: '/examples/' },
            { text: '基础示例', link: '/examples/basic' },
            { text: '智能决策', link: '/examples/smart-decision' },
            { text: '动态加载', link: '/examples/dynamic-loading' },
            { text: '多 Provider', link: '/examples/multi-provider' },
            { text: '自定义 Skill', link: '/examples/custom-skill' },
            { text: '流式处理', link: '/examples/streaming' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/your-org/sdkwork-browser-agent' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 SDKWork Team',
    },

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/your-org/sdkwork-browser-agent/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short',
      },
    },

    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    outline: {
      label: '页面导航',
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    lineNumbers: true,
  },

  sitemap: {
    hostname: 'https://sdkwork-browser-agent.vercel.app',
  },
});
