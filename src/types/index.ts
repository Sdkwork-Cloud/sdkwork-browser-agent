/**
 * Central Type Definitions
 *
 * Unified type system for the entire sdkwork-browser-agent.
 * All modules should import types from this central location.
 */

import type { JSONSchema7 } from 'json-schema';

// ============================================
// Core Agent Types
// ============================================

export interface AgentConfig {
  name: string;
  description?: string;
  version?: string;
  llmProvider?: LLMProvider;
  systemPrompt?: string;
  maxIterations?: number;
  skills?: Skill[];
  tools?: Tool[];
  plugins?: Plugin[];
  mcpResources?: MCPResource[];
  mcpTools?: MCPTool[];
  middlewares?: AgentMiddleware[];
  hooks?: AgentHooks;
}

export interface SmartAgentConfig extends AgentConfig {
  autoDecide?: boolean;
  maxAutoIterations?: number;
  enableStreaming?: boolean;
  evaluationEnabled?: boolean;
  evaluationLevel?: EvaluationLevel;
}

export type EvaluationLevel = 'none' | 'basic' | 'standard' | 'strict';

// ============================================
// Skill Types (Unified)
// ============================================

export interface Skill {
  metadata: SkillMetadata;
  parameters: JSONSchema7;
  implementation: SkillImplementation;
  lifecycle: SkillLifecycle;
  readme?: string;
  examples?: SkillExample[];
  references?: SkillReference[];
}

export interface SkillMetadata {
  name: string;
  description: string;
  author?: string;
  version: string;
  category: string;
  tags: string[];
  license?: string;
  compatibility?: string;
}

export interface SkillLifecycle {
  lazyLoad: boolean;
  cacheable: boolean;
  timeout: number;
  retries: number;
}

export interface SkillImplementation {
  type: 'code' | 'prompt' | 'composite' | 'mcp';
  handler?: SkillHandler;
  prompt?: string;
  subskills?: string[];
  mcpTool?: string;
}

export interface SkillExample {
  title: string;
  description?: string;
  parameters: Record<string, unknown>;
  expectedOutput?: string;
}

export interface SkillReference {
  type: 'documentation' | 'api' | 'example' | 'template';
  title: string;
  content: string;
}

export type SkillHandler = (params: Record<string, unknown>, context: ExecutionContext) => Promise<SkillResult>;

// ============================================
// Execution Types (Unified)
// ============================================

export interface ExecutionContext {
  executionId: string;
  sessionId: string;
  skillName: string;
  parentExecutionId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  // Capabilities
  executeSkill: (name: string, params: unknown) => Promise<SkillResult>;
  executeMCPTool: (name: string, args: unknown) => Promise<unknown>;
  readMCPResource: (uri: string) => Promise<unknown>;
  complete: (prompt: string, options?: unknown) => Promise<string>;
  stream: (prompt: string, options?: unknown) => AsyncIterable<string>;
  log: (level: LogLevel, message: string, meta?: unknown) => void;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface SkillResult {
  success: boolean;
  data?: unknown;
  error?: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    stack?: string;
  };
  metadata?: {
    executionTime: number;
    tokensUsed?: number;
    skillsInvoked?: string[];
  };
}

export type ErrorCode =
  | 'SKILL_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'EXECUTION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'COMPOSITE_ERROR'
  | 'SUBSKILL_ERROR'
  | 'MCP_ERROR'
  | 'MCP_CONNECTION_ERROR'
  | 'MCP_TIMEOUT_ERROR'
  | 'MCP_NOT_FOUND'
  | 'LLM_ERROR'
  | 'LLM_RATE_LIMIT'
  | 'LLM_CONTEXT_LENGTH'
  | 'CONFIG_ERROR'
  | 'CONFIG_VALIDATION'
  | 'CONFIG_MISSING'
  | 'NOT_IMPLEMENTED'
  | 'UNKNOWN_ERROR'
  | 'INTERNAL_ERROR';

export type ErrorCodeType = ErrorCode;

// ============================================
// Tool Types
// ============================================

export interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema7;
  execute: (args: Record<string, unknown>, context: ExecutionContext) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
  metadata?: {
    executionTime: number;
  };
}

// ============================================
// MCP Types (Unified)
// ============================================

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  read: () => Promise<MCPResourceContent>;
}

export interface MCPResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
  metadata?: Record<string, unknown>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema7;
  execute: (args: Record<string, unknown>) => Promise<MCPToolResult>;
}

export interface MCPToolResult {
  success: boolean;
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
    resource?: MCPResourceContent;
  }>;
  isError?: boolean;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    executionTime: number;
  };
}

export interface MCPServerConfig {
  name: string;
  url: string;
  auth?: {
    type: 'bearer' | 'apiKey';
    token: string;
  };
  timeout?: number;
  retries?: number;
}

// ============================================
// Plugin Types
// ============================================

export interface Plugin {
  name: string;
  version: string;
  description?: string;
  initialize: (context: PluginContext) => Promise<void>;
  destroy?: () => Promise<void>;
  metadata?: PluginMetadata;
}

export interface PluginMetadata {
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
}

export interface PluginContext {
  registerSkill: (skill: Skill) => void;
  registerTool: (tool: Tool) => void;
  registerMCPResource: (resource: MCPResource) => void;
  registerMCPTool: (tool: MCPTool) => void;
  useMiddleware: (middleware: AgentMiddleware) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  emit: (event: string, ...args: unknown[]) => void;
}

// ============================================
// Middleware Types
// ============================================

export type AgentMiddleware = (
  context: ExecutionContext,
  next: () => Promise<SkillResult>
) => Promise<SkillResult>;

// ============================================
// Hook Types
// ============================================

export interface AgentHooks {
  onBeforeSkill?: (context: ExecutionContext) => Promise<void> | void;
  onAfterSkill?: (context: ExecutionContext, result: SkillResult) => Promise<void> | void;
  onError?: (error: Error, context: ExecutionContext) => Promise<void> | void;
  onToolCall?: (toolName: string, args: unknown) => Promise<void> | void;
  onMCPCall?: (toolName: string, args: unknown) => Promise<void> | void;
}

// ============================================
// LLM Types
// ============================================

export interface LLMProvider {
  name: string;
  supportedModels: string[];
  validateConfig: () => boolean;
  complete: (request: LLMRequest) => Promise<LLMResponse>;
  stream: (request: LLMRequest) => AsyncIterable<LLMStreamChunk>;
}

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
}

export interface LLMResponse {
  id: string;
  model: string;
  content: string;
  role: 'assistant';
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason?: 'stop' | 'length' | 'tool_calls' | null;
}

export interface LLMStreamChunk {
  id: string;
  model: string;
  delta: {
    content?: string;
    role?: 'assistant';
  };
  finish_reason?: 'stop' | 'length' | 'tool_calls' | null;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: JSONSchema7;
  };
}

// ============================================
// Event Types (Unified)
// ============================================

export type ExecutionEventType =
  | 'execution:start'
  | 'execution:step'
  | 'execution:skill'
  | 'execution:mcp'
  | 'execution:llm'
  | 'execution:complete'
  | 'execution:error'
  | 'execution:progress';

export interface ExecutionEvent {
  type: ExecutionEventType;
  executionId: string;
  sessionId: string;
  timestamp: number;
  messageId?: string;
  conversationId?: string;
  data?: unknown;
}

export interface SkillExecutionEvent extends ExecutionEvent {
  type: 'execution:skill';
  skillName: string;
  phase: 'start' | 'complete';
  params?: Record<string, unknown>;
  result?: SkillResult;
  duration?: number;
}

export interface MCPExecutionEvent extends ExecutionEvent {
  type: 'execution:mcp';
  toolName: string;
  phase: 'start' | 'complete';
  args?: Record<string, unknown>;
  result?: MCPToolResult;
  duration?: number;
}

// ============================================
// Decision Engine Types
// ============================================

export interface Decision {
  type: 'skill' | 'tool' | 'llm' | 'multi';
  skill?: string;
  tool?: string;
  skills?: string[];
  tools?: string[];
  confidence: number;
  reasoning: string;
  context?: Record<string, unknown>;
}

export interface DecisionContext {
  input: string;
  availableSkills: SkillMetadata[];
  availableTools: string[];
  history?: Decision[];
}

// ============================================
// Evaluation Types
// ============================================

export interface EvaluationResult {
  passed: boolean;
  score: number;
  feedback: string;
  suggestions?: string[];
  metadata?: {
    evaluator: string;
    duration: number;
    timestamp: Date;
  };
}

export interface EvaluationContext {
  input: string;
  output: unknown;
  expected?: unknown;
  skillName?: string;
  executionContext?: ExecutionContext;
}

// ============================================
// Conversation Types
// ============================================

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  skills?: string[];
  evaluation?: EvaluationResult;
  metadata?: Record<string, unknown>;
}

// ============================================
// Utility Types
// ============================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

// Re-export JSONSchema7 for convenience
export type { JSONSchema7 };
