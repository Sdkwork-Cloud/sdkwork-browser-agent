/**
 * Main exports for sdkwork-browser-agent
 * Browser and Node.js compatible agent architecture
 */

// Core Agent
export * from './core';

// LLM Providers
export * from './llm';

// Skills
export * from './skills';

// Tools
export * from './tools';

// MCP
export * from './mcp';

// Plugins
export * from './plugins';

// Storage - NEW: Unified storage abstraction
export * from './storage';

// Re-export commonly used types
export type {
  AgentConfig,
  Skill,
  SkillResult,
  Tool,
  ToolOutput,
  MCPResource,
  MCPResourceContent,
  MCPTool,
  MCPToolResult,
  Plugin,
  PluginContext,
  ExecutionContext,
} from './core/agent';

export type { SmartAgentConfig, AutoExecutionResult } from './core/smart-agent';

export type {
  Decision,
  DecisionContext,
  DecisionEngineConfig,
  EmbeddingProvider,
} from './core/decision-engine';

export type { SkillSource, LoadedSkill, SkillLoaderConfig } from './core/skill-loader';

export type { TokenOptimizerConfig, TokenEstimate } from './core/token-optimizer';

export type {
  LLMProvider,
  LLMProviderConfig,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMMessage,
  ToolDefinition,
} from './llm/provider';

// Storage types - NEW
export type {
  StorageAdapter,
  FileMetadata,
  StorageConfig,
} from './storage';

// Version info
export const VERSION = '1.0.0';

// Environment detection
export const isBrowser = typeof window !== 'undefined';
export const isNode = typeof window === 'undefined';
