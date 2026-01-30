/**
 * Core Agent Architecture
 * High cohesion, low coupling design
 * Compatible with https://agentskills.io/specification
 */

import {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMMessage,
  ToolDefinition,
} from '../llm/provider';

// ============================================
// Type Definitions
// ============================================

export interface Skill {
  name: string;
  description: string;
  parameters: ParameterSchema;
  handler: SkillHandler;
  metadata?: SkillMetadata;
}

export interface ParameterSchema {
  type: 'object';
  properties: Record<string, ParameterProperty>;
  required?: string[];
}

export interface ParameterProperty {
  type: string;
  description: string;
  enum?: string[];
  default?: unknown;
}

export interface SkillMetadata {
  category?: string;
  tags?: string[];
  version?: string;
  author?: string;
  deprecated?: boolean;
}

export type SkillHandler = (
  params: Record<string, unknown>,
  context: ExecutionContext
) => Promise<SkillResult>;

export interface ExecutionContext {
  agent: Agent;
  skillName: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface SkillResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface Tool {
  name: string;
  description: string;
  parameters?: ParameterSchema;
  execute: ToolExecutor;
  metadata?: ToolMetadata;
}

export interface ToolMetadata {
  category?: string;
  tags?: string[];
  version?: string;
  requiresConfirmation?: boolean;
}

export type ToolExecutor = (input: unknown, context: ExecutionContext) => Promise<ToolOutput>;

export interface ToolOutput {
  content: Array<{ type: string; text?: string; data?: unknown }>;
  isError?: boolean;
  metadata?: Record<string, unknown>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  read: () => Promise<MCPResourceContent>;
  metadata?: MCPResourceMetadata;
}

export interface MCPResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
  metadata?: Record<string, unknown>;
}

export interface MCPResourceMetadata {
  size?: number;
  lastModified?: Date;
  etag?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: unknown;
  execute: (args: unknown, context: ExecutionContext) => Promise<MCPToolResult>;
  metadata?: ToolMetadata;
}

export interface MCPToolResult {
  content: Array<{ type: string; text?: string; data?: unknown }>;
  isError?: boolean;
  metadata?: Record<string, unknown>;
}

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
  homepage?: string;
  repository?: string;
  license?: string;
  dependencies?: string[];
}

export interface PluginContext {
  agent: Agent;
  registerSkill: (skill: Skill) => void;
  registerTool: (tool: Tool) => void;
  registerMCPResource: (resource: MCPResource) => void;
  registerMCPTool: (tool: MCPTool) => void;
  getLLMProvider: () => LLMProvider | undefined;
  config: Record<string, unknown>;
}

// ============================================
// Agent Configuration
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

export interface AgentHooks {
  beforeSkillExecution?: (skillName: string, params: Record<string, unknown>) => Promise<void>;
  afterSkillExecution?: (skillName: string, result: SkillResult) => Promise<void>;
  onError?: (error: Error, context: ExecutionContext) => Promise<void>;
  onToolCall?: (toolName: string, args: unknown) => Promise<void>;
}

export type AgentMiddleware = (
  context: ExecutionContext,
  next: () => Promise<SkillResult>
) => Promise<SkillResult>;

// ============================================
// Agent Core
// ============================================

export class Agent {
  private _skills = new Map<string, Skill>();
  private _tools = new Map<string, Tool>();
  private _plugins = new Map<string, Plugin>();
  private _mcpResources = new Map<string, MCPResource>();
  private _mcpTools = new Map<string, MCPTool>();
  private _middlewares: AgentMiddleware[] = [];
  private _initialized = false;

  readonly name: string;
  readonly description?: string;
  readonly version?: string;
  llmProvider?: LLMProvider;
  systemPrompt?: string;
  maxIterations: number;
  hooks?: AgentHooks;

  constructor(private config: AgentConfig) {
    this.name = config.name;
    this.description = config.description;
    this.version = config.version;
    this.llmProvider = config.llmProvider;
    this.systemPrompt = config.systemPrompt;
    this.maxIterations = config.maxIterations || 10;
    this.hooks = config.hooks;
    this._middlewares = config.middlewares || [];
  }

  async initialize(): Promise<void> {
    if (this._initialized) return;

    // Register core components
    this.config.skills?.forEach(skill => this.registerSkill(skill));
    this.config.tools?.forEach(tool => this.registerTool(tool));
    this.config.mcpResources?.forEach(resource => this.registerMCPResource(resource));
    this.config.mcpTools?.forEach(tool => this.registerMCPTool(tool));

    // Initialize plugins
    const pluginContext: PluginContext = {
      agent: this,
      registerSkill: skill => this.registerSkill(skill),
      registerTool: tool => this.registerTool(tool),
      registerMCPResource: resource => this.registerMCPResource(resource),
      registerMCPTool: tool => this.registerMCPTool(tool),
      getLLMProvider: () => this.llmProvider,
      config: {},
    };

    for (const plugin of this.config.plugins || []) {
      await plugin.initialize(pluginContext);
      this._plugins.set(plugin.name, plugin);
    }

    this._initialized = true;
  }

  // ============================================
  // Registration Methods
  // ============================================

  registerSkill(skill: Skill): void {
    if (this._skills.has(skill.name)) {
      console.warn(`Skill '${skill.name}' is already registered. Overwriting.`);
    }
    this._skills.set(skill.name, skill);
  }

  registerTool(tool: Tool): void {
    if (this._tools.has(tool.name)) {
      console.warn(`Tool '${tool.name}' is already registered. Overwriting.`);
    }
    this._tools.set(tool.name, tool);
  }

  registerMCPResource(resource: MCPResource): void {
    if (this._mcpResources.has(resource.uri)) {
      console.warn(`MCP Resource '${resource.uri}' is already registered. Overwriting.`);
    }
    this._mcpResources.set(resource.uri, resource);
  }

  registerMCPTool(tool: MCPTool): void {
    if (this._mcpTools.has(tool.name)) {
      console.warn(`MCP Tool '${tool.name}' is already registered. Overwriting.`);
    }
    this._mcpTools.set(tool.name, tool);
  }

  use(middleware: AgentMiddleware): void {
    this._middlewares.push(middleware);
  }

  // ============================================
  // Execution Methods
  // ============================================

  async executeSkill(name: string, params: Record<string, unknown> = {}): Promise<SkillResult> {
    const skill = this._skills.get(name);
    if (!skill) {
      return { success: false, error: `Skill '${name}' not found` };
    }

    const context: ExecutionContext = {
      agent: this,
      skillName: name,
      timestamp: new Date(),
    };

    await this.hooks?.beforeSkillExecution?.(name, params);

    const execute = async (): Promise<SkillResult> => {
      try {
        const result = await skill.handler(params, context);
        await this.hooks?.afterSkillExecution?.(name, result);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        await this.hooks?.onError?.(err, context);
        return { success: false, error: err.message };
      }
    };

    // Apply middlewares
    const chain = this._middlewares.reduceRight<() => Promise<SkillResult>>(
      (next, middleware) => () => middleware(context, next),
      execute
    );

    return chain();
  }

  async executeTool(name: string, input: unknown): Promise<ToolOutput> {
    const tool = this._tools.get(name);
    if (!tool) {
      return {
        content: [{ type: 'error', text: `Tool '${name}' not found` }],
        isError: true,
      };
    }

    const context: ExecutionContext = {
      agent: this,
      skillName: name,
      timestamp: new Date(),
    };

    try {
      await this.hooks?.onToolCall?.(name, input);
      return await tool.execute(input, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'error', text: message }],
        isError: true,
      };
    }
  }

  async readMCPResource(uri: string): Promise<MCPResourceContent | null> {
    const resource = this._mcpResources.get(uri);
    if (!resource) return null;
    return resource.read();
  }

  async executeMCPTool(name: string, args: unknown): Promise<MCPToolResult> {
    const tool = this._mcpTools.get(name);
    if (!tool) {
      return {
        content: [{ type: 'error', text: `MCP Tool '${name}' not found` }],
        isError: true,
      };
    }

    const context: ExecutionContext = {
      agent: this,
      skillName: name,
      timestamp: new Date(),
    };

    try {
      return await tool.execute(args, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'error', text: message }],
        isError: true,
      };
    }
  }

  // ============================================
  // LLM Integration
  // ============================================

  async chat(messages: LLMMessage[], options?: Partial<LLMRequest>): Promise<LLMResponse> {
    if (!this.llmProvider) {
      throw new Error('No LLM provider configured');
    }

    const request: LLMRequest = {
      messages: this.systemPrompt
        ? [{ role: 'system', content: this.systemPrompt }, ...messages]
        : messages,
      ...options,
    };

    return this.llmProvider.complete(request);
  }

  async *streamChat(
    messages: LLMMessage[],
    options?: Partial<LLMRequest>
  ): AsyncIterableIterator<LLMStreamChunk> {
    if (!this.llmProvider) {
      throw new Error('No LLM provider configured');
    }

    const request: LLMRequest = {
      messages: this.systemPrompt
        ? [{ role: 'system', content: this.systemPrompt }, ...messages]
        : messages,
      stream: true,
      ...options,
    };

    yield* this.llmProvider.stream(request);
  }

  async executeWithTools(messages: LLMMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    if (!this.llmProvider) {
      throw new Error('No LLM provider configured');
    }

    const request: LLMRequest = {
      messages: this.systemPrompt
        ? [{ role: 'system', content: this.systemPrompt }, ...messages]
        : messages,
      tools,
      tool_choice: 'auto',
    };

    return this.llmProvider.complete(request);
  }

  // ============================================
  // Query Methods
  // ============================================

  getSkill(name: string): Skill | undefined {
    return this._skills.get(name);
  }

  getTool(name: string): Tool | undefined {
    return this._tools.get(name);
  }

  getMCPResource(uri: string): MCPResource | undefined {
    return this._mcpResources.get(uri);
  }

  getMCPTool(name: string): MCPTool | undefined {
    return this._mcpTools.get(name);
  }

  getPlugin(name: string): Plugin | undefined {
    return this._plugins.get(name);
  }

  getSkillNames(): string[] {
    return Array.from(this._skills.keys());
  }

  getToolNames(): string[] {
    return Array.from(this._tools.keys());
  }

  getMCPResourceURIs(): string[] {
    return Array.from(this._mcpResources.keys());
  }

  getMCPToolNames(): string[] {
    return Array.from(this._mcpTools.keys());
  }

  getPluginNames(): string[] {
    return Array.from(this._plugins.keys());
  }

  getAllSkills(): Skill[] {
    return Array.from(this._skills.values());
  }

  getAllTools(): Tool[] {
    return Array.from(this._tools.values());
  }

  // ============================================
  // Lifecycle Methods
  // ============================================

  async destroy(): Promise<void> {
    for (const plugin of this._plugins.values()) {
      await plugin.destroy?.();
    }
    this._skills.clear();
    this._tools.clear();
    this._plugins.clear();
    this._mcpResources.clear();
    this._mcpTools.clear();
    this._middlewares = [];
    this._initialized = false;
  }
}
