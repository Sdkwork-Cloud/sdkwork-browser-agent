/**
 * Agent with Event System
 *
 * Enhanced Agent that emits events for all operations,
 * enabling real-time UI updates and execution tracing.
 */

import type {
  AgentConfig,
  Skill,
  SkillResult,
  Tool,
  MCPResource,
  MCPTool,
  MCPToolResult,
  ExecutionContext,
  LLMProvider,
  Plugin,
  AgentMiddleware,
  AgentHooks,
} from '../types';
import {
  agentEventEmitter,
  executionTracer,
  type AgentEvent,
} from './event-system';
import { AgentError, ErrorCodes, withRetry } from '../utils/errors';

// Simple UUID generator
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class AgentWithEvents {
  protected config: AgentConfig;
  protected skills = new Map<string, Skill>();
  protected tools = new Map<string, Tool>();
  protected mcpResources = new Map<string, MCPResource>();
  protected mcpTools = new Map<string, MCPTool>();
  protected plugins = new Map<string, Plugin>();
  protected middlewares: AgentMiddleware[] = [];
  protected hooks: AgentHooks;
  protected llmProvider?: LLMProvider;
  protected initialized = false;

  constructor(config: AgentConfig) {
    this.config = config;
    this.hooks = config.hooks || {};
    this.llmProvider = config.llmProvider;

    // Register initial components
    config.skills?.forEach(skill => this.registerSkill(skill));
    config.tools?.forEach(tool => this.registerTool(tool));
    config.mcpResources?.forEach(resource => this.registerMCPResource(resource));
    config.mcpTools?.forEach(tool => this.registerMCPTool(tool));
    config.plugins?.forEach(plugin => this.registerPlugin(plugin));
    config.middlewares?.forEach(mw => this.useMiddleware(mw));
  }

  // ============================================
  // Initialization
  // ============================================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize plugins
    for (const plugin of Array.from(this.plugins.values())) {
      await plugin.initialize({
        registerSkill: (skill) => this.registerSkill(skill),
        registerTool: (tool) => this.registerTool(tool),
        registerMCPResource: (resource) => this.registerMCPResource(resource),
        registerMCPTool: (tool) => this.registerMCPTool(tool),
        useMiddleware: (mw) => this.useMiddleware(mw),
        on: (_event, handler) => agentEventEmitter.on(_event as any, handler),
        emit: (_event, ..._args) => {
          /* Plugin event emit */
        },
      });
    }

    this.initialized = true;

    // Emit initialization event using proper type
    agentEventEmitter.createAndEmit({
      type: 'agent:initialized',
      traceId: uuidv4(),
      conversationId: 'system',
    } as any);
  }

  // ============================================
  // Registration Methods
  // ============================================

  registerSkill(skill: Skill): void {
    if (this.skills.has(skill.metadata.name)) {
      console.warn(`[Agent] Skill '${skill.metadata.name}' already registered. Overwriting.`);
    }
    this.skills.set(skill.metadata.name, skill);
  }

  registerTool(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`[Agent] Tool '${tool.name}' already registered. Overwriting.`);
    }
    this.tools.set(tool.name, tool);
  }

  registerMCPResource(resource: MCPResource): void {
    if (this.mcpResources.has(resource.uri)) {
      console.warn(`[Agent] MCP Resource '${resource.uri}' already registered. Overwriting.`);
    }
    this.mcpResources.set(resource.uri, resource);
  }

  registerMCPTool(tool: MCPTool): void {
    if (this.mcpTools.has(tool.name)) {
      console.warn(`[Agent] MCP Tool '${tool.name}' already registered. Overwriting.`);
    }
    this.mcpTools.set(tool.name, tool);
  }

  registerPlugin(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`[Agent] Plugin '${plugin.name}' already registered. Overwriting.`);
    }
    this.plugins.set(plugin.name, plugin);
  }

  useMiddleware(middleware: AgentMiddleware): void {
    this.middlewares.push(middleware);
  }

  // ============================================
  // Skill Execution with Events
  // ============================================

  async executeSkill(
    name: string,
    params: Record<string, unknown> = {},
    context: { conversationId: string; messageId?: string; traceId?: string }
  ): Promise<SkillResult> {
    const executionId = uuidv4();
    const traceId = context.traceId || uuidv4();
    const conversationId = context.conversationId;
    const messageId = context.messageId;

    // Start trace
    executionTracer.startTrace(traceId, conversationId, messageId || executionId);

    // Emit skill start event
    agentEventEmitter.emit({
      id: uuidv4(),
      type: 'skill:start',
      timestamp: Date.now(),
      traceId,
      conversationId,
      messageId,
      skillName: name,
      params,
      executionId,
    } as AgentEvent);

    const skill = this.skills.get(name);
    if (!skill) {
      const error = new AgentError(
        ErrorCodes.SKILL_NOT_FOUND,
        `Skill '${name}' not found`,
        { isRetryable: false }
      );

      agentEventEmitter.emit({
        id: uuidv4(),
        type: 'skill:error',
        timestamp: Date.now(),
        traceId,
        conversationId,
        messageId,
        skillName: name,
        executionId,
        error: {
          code: error.code,
          message: error.message,
        },
        retryable: false,
      } as AgentEvent);

      return {
        success: false,
        error: {
          code: error.code as any,
          message: error.message,
        },
        metadata: { executionTime: 0 },
      };
    }

    const startTime = Date.now();

    try {
      // Call before hook
      await this.hooks.onBeforeSkill?.({
        executionId,
        sessionId: conversationId,
        skillName: name,
        timestamp: new Date(),
        executeSkill: (n, p) => this.executeSkill(n, p as Record<string, unknown>, context),
        executeMCPTool: (n, a) => this.executeMCPTool(n, a as Record<string, unknown>, context),
        readMCPResource: (uri) => this.readMCPResource(uri, context),
        complete: (prompt) => this.complete(prompt),
        stream: (prompt) => this.stream(prompt),
        log: (level, message, meta) => console.log(`[${level}] ${message}`, meta),
      });

      // Build execution context
      const executionContext: ExecutionContext = {
        executionId,
        sessionId: conversationId,
        skillName: name,
        timestamp: new Date(),
        executeSkill: (n, p) => this.executeSkill(n, p as Record<string, unknown>, context),
        executeMCPTool: (n, a) => this.executeMCPTool(n, a as Record<string, unknown>, context),
        readMCPResource: (uri) => this.readMCPResource(uri, context),
        complete: (prompt) => this.complete(prompt),
        stream: (prompt) => this.stream(prompt),
        log: (level, message, meta) => console.log(`[${level}] ${message}`, meta),
      };

      // Execute with middleware
      const result = await this.runMiddleware(executionContext, async () => {
        return await skill.implementation.handler!(params, executionContext);
      });

      const duration = Date.now() - startTime;

      // Emit skill complete event
      agentEventEmitter.emit({
        id: uuidv4(),
        type: 'skill:complete',
        timestamp: Date.now(),
        traceId,
        conversationId,
        messageId,
        skillName: name,
        executionId,
        result: {
          success: result.success,
          data: result.data,
          error: result.error,
        },
        duration,
        tokensUsed: result.metadata?.tokensUsed,
      } as AgentEvent);

      // Call after hook
      await this.hooks.onAfterSkill?.(executionContext, result);

      // Complete trace
      executionTracer.completeTrace(traceId, result.success ? 'completed' : 'error');

      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime: duration,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const agentError = error instanceof AgentError
        ? error
        : new AgentError(
            ErrorCodes.EXECUTION_ERROR,
            error instanceof Error ? error.message : 'Unknown error',
            { cause: error instanceof Error ? error : undefined }
          );

      // Emit skill error event
      agentEventEmitter.emit({
        id: uuidv4(),
        type: 'skill:error',
        timestamp: Date.now(),
        traceId,
        conversationId,
        messageId,
        skillName: name,
        executionId,
        error: {
          code: agentError.code,
          message: agentError.message,
          stack: agentError instanceof Error ? agentError.stack : undefined,
        },
        retryable: agentError.isRetryable,
      } as AgentEvent);

      // Call error hook
      await this.hooks.onError?.(
        agentError,
        {
          executionId,
          sessionId: conversationId,
          skillName: name,
          timestamp: new Date(),
          executeSkill: (n, p) => this.executeSkill(n, p as Record<string, unknown>, context),
          executeMCPTool: (n, a) => this.executeMCPTool(n, a as Record<string, unknown>, context),
          readMCPResource: (uri) => this.readMCPResource(uri, context),
          complete: (prompt) => this.complete(prompt),
          stream: (prompt) => this.stream(prompt),
          log: (level, message, meta) => console.log(`[${level}] ${message}`, meta),
        }
      );

      // Complete trace with error
      executionTracer.completeTrace(traceId, 'error');

      return {
        success: false,
        error: {
          code: agentError.code as any,
          message: agentError.message,
        },
        metadata: { executionTime: duration },
      };
    }
  }

  // ============================================
  // MCP Tool Execution with Events
  // ============================================

  async executeMCPTool(
    name: string,
    args: Record<string, unknown> = {},
    context: { conversationId: string; messageId?: string; traceId?: string; serverName?: string }
  ): Promise<MCPToolResult> {
    const executionId = uuidv4();
    const traceId = context.traceId || uuidv4();
    const conversationId = context.conversationId;
    const messageId = context.messageId;
    const serverName = context.serverName || 'default';

    // Emit MCP start event
    agentEventEmitter.emit({
      id: uuidv4(),
      type: 'mcp:start',
      timestamp: Date.now(),
      traceId,
      conversationId,
      messageId,
      toolName: name,
      serverName,
      args,
      executionId,
    } as AgentEvent);

    const tool = this.mcpTools.get(name);
    if (!tool) {
      const error = new AgentError(
        ErrorCodes.MCP_NOT_FOUND,
        `MCP Tool '${name}' not found`,
        { isRetryable: false }
      );

      agentEventEmitter.emit({
        id: uuidv4(),
        type: 'mcp:error',
        timestamp: Date.now(),
        traceId,
        conversationId,
        messageId,
        toolName: name,
        serverName,
        executionId,
        error: {
          code: error.code,
          message: error.message,
        },
        retryable: false,
      } as AgentEvent);

      return {
        success: false,
        content: [],
        isError: true,
        error: {
          code: error.code,
          message: error.message,
        },
        metadata: { executionTime: 0 },
      };
    }

    const startTime = Date.now();

    try {
      // Call MCP with retry
      const result = await withRetry(
        () => tool.execute(args),
        { maxRetries: 3, baseDelay: 1000 },
        `MCP Tool: ${name}`
      );

      const duration = Date.now() - startTime;

      // Emit MCP complete event
      agentEventEmitter.emit({
        id: uuidv4(),
        type: 'mcp:complete',
        timestamp: Date.now(),
        traceId,
        conversationId,
        messageId,
        toolName: name,
        serverName,
        executionId,
        result: {
          success: result.success,
          content: result.content,
          error: result.error,
        },
        duration,
      } as AgentEvent);

      // Call tool hook
      await this.hooks.onMCPCall?.(name, args);

      return {
        ...result,
        metadata: { executionTime: duration },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const agentError = error instanceof AgentError
        ? error
        : new AgentError(
            ErrorCodes.MCP_ERROR,
            error instanceof Error ? error.message : 'MCP execution failed',
            { cause: error instanceof Error ? error : undefined, isRetryable: true }
          );

      // Emit MCP error event
      agentEventEmitter.emit({
        id: uuidv4(),
        type: 'mcp:error',
        timestamp: Date.now(),
        traceId,
        conversationId,
        messageId,
        toolName: name,
        serverName,
        executionId,
        error: {
          code: agentError.code,
          message: agentError.message,
        },
        retryable: agentError.isRetryable,
      } as AgentEvent);

      return {
        success: false,
        content: [],
        isError: true,
        error: {
          code: agentError.code,
          message: agentError.message,
        },
        metadata: { executionTime: duration },
      };
    }
  }

  // ============================================
  // MCP Resource Reading
  // ============================================

  async readMCPResource(
    uri: string,
    _context: { conversationId: string; messageId?: string; traceId?: string }
  ): Promise<any> {
    const resource = this.mcpResources.get(uri);
    if (!resource) {
      throw new AgentError(
        ErrorCodes.MCP_NOT_FOUND,
        `MCP Resource '${uri}' not found`,
        { isRetryable: false }
      );
    }

    return await resource.read();
  }

  // ============================================
  // LLM Integration
  // ============================================

  async complete(prompt: string): Promise<string> {
    if (!this.llmProvider) {
      throw new AgentError(
        ErrorCodes.CONFIG_ERROR,
        'No LLM provider configured',
        { isRetryable: false }
      );
    }

    const response = await this.llmProvider.complete({
      model: this.llmProvider.supportedModels[0],
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content;
  }

  async *stream(prompt: string): AsyncIterable<string> {
    if (!this.llmProvider) {
      throw new AgentError(
        ErrorCodes.CONFIG_ERROR,
        'No LLM provider configured',
        { isRetryable: false }
      );
    }

    const stream = this.llmProvider.stream({
      model: this.llmProvider.supportedModels[0],
      messages: [{ role: 'user', content: prompt }],
    });

    for await (const chunk of stream) {
      yield chunk.delta.content || '';
    }
  }

  // ============================================
  // Middleware Runner
  // ============================================

  private async runMiddleware(
    context: ExecutionContext,
    handler: () => Promise<SkillResult>
  ): Promise<SkillResult> {
    let index = 0;

    const next = async (): Promise<SkillResult> => {
      if (index >= this.middlewares.length) {
        return await handler();
      }
      const middleware = this.middlewares[index++];
      return await middleware(context, next);
    };

    return await next();
  }

  // ============================================
  // Getters
  // ============================================

  getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getMCPTool(name: string): MCPTool | undefined {
    return this.mcpTools.get(name);
  }

  getAllMCPTools(): MCPTool[] {
    return Array.from(this.mcpTools.values());
  }

  // ============================================
  // Cleanup
  // ============================================

  async destroy(): Promise<void> {
    for (const plugin of Array.from(this.plugins.values())) {
      await plugin.destroy?.();
    }
    this.skills.clear();
    this.tools.clear();
    this.mcpResources.clear();
    this.mcpTools.clear();
    this.plugins.clear();
    this.middlewares = [];
    this.initialized = false;

    agentEventEmitter.createAndEmit({
      type: 'agent:destroyed',
      traceId: uuidv4(),
      conversationId: 'system',
    } as any);
  }
}
