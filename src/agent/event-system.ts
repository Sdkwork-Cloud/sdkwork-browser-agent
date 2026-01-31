/**
 * Agent Event System
 * 
 * Unified event system for Agent, Skill, and MCP execution.
 * Supports real-time UI updates and execution tracing.
 */

// Simple UUID generator
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================
// Event Types
// ============================================

export type EventType = 
  // Agent Lifecycle
  | 'agent:initialized'
  | 'agent:destroyed'
  | 'agent:error'
  
  // Conversation
  | 'conversation:started'
  | 'conversation:message'
  | 'conversation:streaming'
  | 'conversation:completed'
  | 'conversation:error'
  
  // Skill Execution
  | 'skill:detected'
  | 'skill:start'
  | 'skill:progress'
  | 'skill:complete'
  | 'skill:error'
  | 'skill:retry'
  
  // MCP Execution
  | 'mcp:start'
  | 'mcp:progress'
  | 'mcp:complete'
  | 'mcp:error'
  | 'mcp:retry'
  
  // LLM
  | 'llm:start'
  | 'llm:streaming'
  | 'llm:complete'
  | 'llm:error'
  
  // Tool
  | 'tool:start'
  | 'tool:complete'
  | 'tool:error'
  
  // UI
  | 'ui:update'
  | 'ui:loading'
  | 'ui:notification';

// ============================================
// Base Event Interface
// ============================================

export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: number;
  traceId: string;
  parentId?: string;
  conversationId: string;
  messageId?: string;
}

// ============================================
// Skill Events
// ============================================

export interface SkillDetectedEvent extends BaseEvent {
  type: 'skill:detected';
  skillName: string;
  confidence: number;
  reasoning: string;
  input: string;
}

export interface SkillStartEvent extends BaseEvent {
  type: 'skill:start';
  skillName: string;
  params: Record<string, unknown>;
  executionId: string;
}

export interface SkillProgressEvent extends BaseEvent {
  type: 'skill:progress';
  skillName: string;
  executionId: string;
  step: number;
  totalSteps: number;
  description: string;
  data?: unknown;
}

export interface SkillCompleteEvent extends BaseEvent {
  type: 'skill:complete';
  skillName: string;
  executionId: string;
  result: {
    success: boolean;
    data?: unknown;
    error?: {
      code: string;
      message: string;
    };
  };
  duration: number;
  tokensUsed?: number;
}

export interface SkillErrorEvent extends BaseEvent {
  type: 'skill:error';
  skillName: string;
  executionId: string;
  error: {
    code: string;
    message: string;
    stack?: string;
  };
  retryable: boolean;
  retryCount?: number;
}

export interface SkillRetryEvent extends BaseEvent {
  type: 'skill:retry';
  skillName: string;
  executionId: string;
  attempt: number;
  maxAttempts: number;
  delay: number;
}

// ============================================
// MCP Events
// ============================================

export interface MCPStartEvent extends BaseEvent {
  type: 'mcp:start';
  toolName: string;
  serverName: string;
  args: Record<string, unknown>;
  executionId: string;
}

export interface MCPProgressEvent extends BaseEvent {
  type: 'mcp:progress';
  toolName: string;
  serverName: string;
  executionId: string;
  progress: number;
  description: string;
}

export interface MCPCompleteEvent extends BaseEvent {
  type: 'mcp:complete';
  toolName: string;
  serverName: string;
  executionId: string;
  result: {
    success: boolean;
    content?: unknown;
    error?: {
      code: string;
      message: string;
    };
  };
  duration: number;
}

export interface MCPErrorEvent extends BaseEvent {
  type: 'mcp:error';
  toolName: string;
  serverName: string;
  executionId: string;
  error: {
    code: string;
    message: string;
  };
  retryable: boolean;
}

// ============================================
// Conversation Events
// ============================================

export interface ConversationMessageEvent extends BaseEvent {
  type: 'conversation:message';
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    skills?: string[];
    metadata?: Record<string, unknown>;
  };
}

export interface ConversationStreamingEvent extends BaseEvent {
  type: 'conversation:streaming';
  messageId: string;
  chunk: string;
  isComplete: boolean;
}

export interface ConversationCompletedEvent extends BaseEvent {
  type: 'conversation:completed';
  messageId: string;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================
// LLM Events
// ============================================

export interface LLMStartEvent extends BaseEvent {
  type: 'llm:start';
  model: string;
  messages: Array<{ role: string; content: string }>;
  executionId: string;
}

export interface LLMStreamingEvent extends BaseEvent {
  type: 'llm:streaming';
  executionId: string;
  chunk: string;
  isComplete: boolean;
}

export interface LLMCompleteEvent extends BaseEvent {
  type: 'llm:complete';
  executionId: string;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================
// Tool Events
// ============================================

export interface ToolStartEvent extends BaseEvent {
  type: 'tool:start';
  toolName: string;
  args: Record<string, unknown>;
  executionId: string;
}

export interface ToolCompleteEvent extends BaseEvent {
  type: 'tool:complete';
  toolName: string;
  executionId: string;
  result: unknown;
  duration: number;
}

// ============================================
// Union Event Type
// ============================================

export type AgentEvent =
  | SkillDetectedEvent
  | SkillStartEvent
  | SkillProgressEvent
  | SkillCompleteEvent
  | SkillErrorEvent
  | SkillRetryEvent
  | MCPStartEvent
  | MCPProgressEvent
  | MCPCompleteEvent
  | MCPErrorEvent
  | ConversationMessageEvent
  | ConversationStreamingEvent
  | ConversationCompletedEvent
  | LLMStartEvent
  | LLMStreamingEvent
  | LLMCompleteEvent
  | ToolStartEvent
  | ToolCompleteEvent;

// ============================================
// Event Listener Types
// ============================================

export type EventListener<T extends AgentEvent = AgentEvent> = (event: T) => void | Promise<void>;

export interface EventFilter {
  types?: EventType[];
  conversationId?: string;
  messageId?: string;
  skillName?: string;
  toolName?: string;
}

// ============================================
// Event Emitter
// ============================================

export class AgentEventEmitter {
  private listeners = new Map<EventType, Set<EventListener>>();
  private globalListeners = new Set<EventListener>();
  private filteredListeners = new Map<string, { filter: EventFilter; listener: EventListener }>();

  // Subscribe to specific event type
  on<T extends AgentEvent>(type: T['type'], listener: EventListener<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener as EventListener);

    return () => {
      this.listeners.get(type)?.delete(listener as EventListener);
    };
  }

  // Subscribe to all events
  onAll(listener: EventListener): () => void {
    this.globalListeners.add(listener);
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  // Subscribe with filter
  onFilter(filter: EventFilter, listener: EventListener): () => void {
    const id = uuidv4();
    this.filteredListeners.set(id, { filter, listener });
    return () => {
      this.filteredListeners.delete(id);
    };
  }

  // Subscribe once
  once<T extends AgentEvent>(type: T['type'], listener: EventListener<T>): () => void {
    const wrappedListener = (event: T) => {
      listener(event);
      unsubscribe();
    };
    const unsubscribe = this.on(type, wrappedListener as EventListener<T>);
    return unsubscribe;
  }

  // Emit event
  emit<T extends AgentEvent>(event: T): void {
    // Add timestamp if not present
    if (!event.timestamp) {
      (event as BaseEvent).timestamp = Date.now();
    }

    // Call type-specific listeners
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('[EventEmitter] Listener error:', error);
        }
      });
    }

    // Call filtered listeners
    this.filteredListeners.forEach(({ filter, listener }) => {
      if (this.matchesFilter(event, filter)) {
        try {
          listener(event);
        } catch (error) {
          console.error('[EventEmitter] Filtered listener error:', error);
        }
      }
    });

    // Call global listeners
    this.globalListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[EventEmitter] Global listener error:', error);
      }
    });
  }

  // Create and emit event
  createAndEmit<T extends BaseEvent>(
    eventData: Omit<T, 'id' | 'timestamp'>
  ): T {
    const event = {
      ...eventData,
      id: uuidv4(),
      timestamp: Date.now(),
    } as T;
    this.emit(event as unknown as AgentEvent);
    return event;
  }

  // Check if event matches filter
  private matchesFilter(event: AgentEvent, filter: EventFilter): boolean {
    if (filter.types && !filter.types.includes(event.type)) {
      return false;
    }
    if (filter.conversationId && event.conversationId !== filter.conversationId) {
      return false;
    }
    if (filter.messageId && event.messageId !== filter.messageId) {
      return false;
    }
    if (filter.skillName && 'skillName' in event && event.skillName !== filter.skillName) {
      return false;
    }
    if (filter.toolName && 'toolName' in event && event.toolName !== filter.toolName) {
      return false;
    }
    return true;
  }

  // Remove all listeners
  removeAllListeners(): void {
    this.listeners.clear();
    this.globalListeners.clear();
    this.filteredListeners.clear();
  }

  // Get listener count
  listenerCount(type?: EventType): number {
    if (type) {
      return this.listeners.get(type)?.size || 0;
    }
    let count = this.globalListeners.size;
    this.listeners.forEach(set => {
      count += set.size;
    });
    count += this.filteredListeners.size;
    return count;
  }
}

// ============================================
// Event Store (for persistence and replay)
// ============================================

export class EventStore {
  private events: AgentEvent[] = [];
  private maxSize: number;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  add(event: AgentEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxSize) {
      this.events = this.events.slice(-this.maxSize);
    }
  }

  getAll(): AgentEvent[] {
    return [...this.events];
  }

  getByConversation(conversationId: string): AgentEvent[] {
    return this.events.filter(e => e.conversationId === conversationId);
  }

  getByTrace(traceId: string): AgentEvent[] {
    return this.events.filter(e => e.traceId === traceId);
  }

  getByType(type: EventType): AgentEvent[] {
    return this.events.filter(e => e.type === type);
  }

  clear(): void {
    this.events = [];
  }
}

// ============================================
// Execution Tracer
// ============================================

export interface ExecutionTrace {
  traceId: string;
  conversationId: string;
  messageId: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'error';
  steps: ExecutionStep[];
}

export interface ExecutionStep {
  id: string;
  type: 'skill' | 'mcp' | 'llm' | 'tool';
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  startTime: number;
  endTime?: number;
  duration?: number;
  progress?: number;
  result?: unknown;
  error?: {
    code: string;
    message: string;
  };
  children: ExecutionStep[];
}

export class ExecutionTracer {
  private traces = new Map<string, ExecutionTrace>();
  private currentSteps = new Map<string, ExecutionStep>();

  startTrace(traceId: string, conversationId: string, messageId: string): ExecutionTrace {
    const trace: ExecutionTrace = {
      traceId,
      conversationId,
      messageId,
      startTime: Date.now(),
      status: 'running',
      steps: [],
    };
    this.traces.set(traceId, trace);
    return trace;
  }

  addStep(
    traceId: string,
    step: Omit<ExecutionStep, 'id' | 'startTime' | 'children'>,
    parentId?: string
  ): ExecutionStep {
    const fullStep: ExecutionStep = {
      ...step,
      id: uuidv4(),
      startTime: Date.now(),
      children: [],
    };

    const trace = this.traces.get(traceId);
    if (!trace) {
      throw new Error(`Trace not found: ${traceId}`);
    }

    if (parentId) {
      const parent = this.findStep(trace.steps, parentId);
      if (parent) {
        parent.children.push(fullStep);
      }
    } else {
      trace.steps.push(fullStep);
    }

    this.currentSteps.set(fullStep.id, fullStep);
    return fullStep;
  }

  updateStep(
    stepId: string,
    updates: Partial<ExecutionStep>
  ): ExecutionStep | undefined {
    const step = this.currentSteps.get(stepId);
    if (!step) return undefined;

    Object.assign(step, updates);
    if (updates.status === 'completed' || updates.status === 'error') {
      step.endTime = Date.now();
      step.duration = step.endTime - step.startTime;
    }

    return step;
  }

  completeTrace(traceId: string, status: 'completed' | 'error'): ExecutionTrace | undefined {
    const trace = this.traces.get(traceId);
    if (!trace) return undefined;

    trace.endTime = Date.now();
    trace.status = status;
    return trace;
  }

  getTrace(traceId: string): ExecutionTrace | undefined {
    return this.traces.get(traceId);
  }

  getTracesByConversation(conversationId: string): ExecutionTrace[] {
    return Array.from(this.traces.values()).filter(
      t => t.conversationId === conversationId
    );
  }

  private findStep(steps: ExecutionStep[], id: string): ExecutionStep | undefined {
    for (const step of steps) {
      if (step.id === id) return step;
      const found = this.findStep(step.children, id);
      if (found) return found;
    }
    return undefined;
  }
}

// ============================================
// Singleton Instance
// ============================================

export const agentEventEmitter = new AgentEventEmitter();
export const agentEventStore = new EventStore();
export const executionTracer = new ExecutionTracer();
