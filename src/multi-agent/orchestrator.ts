/**
 * Multi-Agent Orchestrator
 *
 * Provides collaborative multi-agent task execution with intelligent task distribution,
 * inter-agent communication, and result synthesis.
 * Compatible with both browser and Node.js environments.
 */

import type { LLMProvider, LLMRequest } from '../llm/provider';
import { PerformanceMonitor } from '../utils/performance-monitor';

// ============================================
// Types
// ============================================

export interface AgentRole {
  name: string;
  description: string;
  capabilities: string[];
  responsibilities: string[];
  priority: number;
}

export interface AgentProfile {
  id: string;
  role: AgentRole;
  name: string;
  systemPrompt: string;
  skills: string[];
  maxConcurrentTasks: number;
  timeout: number;
}

export interface Task {
  id: string;
  type: 'analysis' | 'execution' | 'review' | 'coordination';
  priority: number;
  input: string;
  context?: Record<string, unknown>;
  dependencies?: string[];
  assignedTo?: string;
  deadline?: number;
}

export interface TaskResult {
  taskId: string;
  agentId: string;
  status: 'completed' | 'failed' | 'partial';
  output: unknown;
  metadata: {
    executionTime: number;
    confidence: number;
  };
}

export interface AgentMessage {
  id: string;
  from: string;
  to: string | 'broadcast';
  type: 'request' | 'response' | 'notification' | 'delegation';
  content: unknown;
  timestamp: number;
  correlationId?: string;
  priority: number;
}

export interface OrchestratorConfig {
  minCapabilityThreshold: number;
  maxConcurrentTasks: number;
  defaultTimeout: number;
  enableReplanning: boolean;
}

export interface CollaborativeResult {
  success: boolean;
  output: unknown;
  taskResults: TaskResult[];
  executionTime: number;
  agentContributions: Map<string, number>;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  minCapabilityThreshold: 0.6,
  maxConcurrentTasks: 10,
  defaultTimeout: 30000,
  enableReplanning: true,
};

// ============================================
// Message Bus
// ============================================

export class AgentMessageBus {
  private subscribers = new Map<string, Set<(message: AgentMessage) => void>>();
  private pendingRequests = new Map<string, { resolve: (value: AgentMessage) => void; reject: (error: Error) => void }>();

  /**
   * Subscribe to messages for an agent
   */
  subscribe(agentId: string, handler: (message: AgentMessage) => void): () => void {
    if (!this.subscribers.has(agentId)) {
      this.subscribers.set(agentId, new Set());
    }
    this.subscribers.get(agentId)!.add(handler);

    return () => {
      this.subscribers.get(agentId)?.delete(handler);
    };
  }

  /**
   * Publish a message
   */
  publish(message: AgentMessage): void {
    if (message.to === 'broadcast') {
      // Broadcast to all subscribers
      this.subscribers.forEach((handlers) => {
        handlers.forEach((handler) => {
          try {
            handler(message);
          } catch (error) {
            console.error('Message handler error:', error);
          }
        });
      });
    } else {
      // Send to specific agent
      const handlers = this.subscribers.get(message.to);
      handlers?.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error('Message handler error:', error);
        }
      });
    }

    // Resolve pending requests
    if (message.correlationId && this.pendingRequests.has(message.correlationId)) {
      const { resolve } = this.pendingRequests.get(message.correlationId)!;
      resolve(message);
      this.pendingRequests.delete(message.correlationId);
    }
  }

  /**
   * Send a request and wait for response
   */
  async request(to: string, message: Omit<AgentMessage, 'id' | 'timestamp'>, timeout = 30000): Promise<AgentMessage> {
    const id = this.generateId();
    const fullMessage: AgentMessage = {
      ...message,
      id,
      to,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      this.pendingRequests.set(id, {
        resolve: (msg) => {
          clearTimeout(timeoutId);
          resolve(msg);
        },
        reject: (err) => {
          clearTimeout(timeoutId);
          reject(err);
        },
      });

      this.publish(fullMessage);
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================
// Collaborative Agent
// ============================================

export class CollaborativeAgent {
  private currentTasks = new Map<string, AbortController>();
  private messageBus: AgentMessageBus;
  private profile: AgentProfile;
  private llmProvider?: LLMProvider;

  constructor(profile: AgentProfile, messageBus: AgentMessageBus, llmProvider?: LLMProvider) {
    this.profile = profile;
    this.messageBus = messageBus;
    this.llmProvider = llmProvider;

    // Subscribe to messages
    this.messageBus.subscribe(profile.id, (message) => {
      this.handleMessage(message);
    });
  }

  get id(): string {
    return this.profile.id;
  }

  get role(): AgentRole {
    return this.profile.role;
  }

  /**
   * Execute a task
   */
  async executeTask(task: Task, context?: Record<string, unknown>): Promise<TaskResult> {
    const abortController = new AbortController();
    this.currentTasks.set(task.id, abortController);

    const startTime = Date.now();

    try {
      // Select execution strategy
      const strategy = this.selectStrategy(task);
      let output: unknown;

      switch (strategy) {
        case 'independent':
          output = await this.executeIndependently(task, context);
          break;
        case 'collaborative':
          output = await this.executeCollaboratively(task, context);
          break;
        default:
          output = await this.executeIndependently(task, context);
      }

      return {
        taskId: task.id,
        agentId: this.profile.id,
        status: 'completed',
        output,
        metadata: {
          executionTime: Date.now() - startTime,
          confidence: await this.assessConfidence(output, task),
        },
      };
    } catch (error) {
      return {
        taskId: task.id,
        agentId: this.profile.id,
        status: 'failed',
        output: null,
        metadata: {
          executionTime: Date.now() - startTime,
          confidence: 0,
        },
      };
    } finally {
      this.currentTasks.delete(task.id);
    }
  }

  /**
   * Get current load
   */
  getCurrentLoad(): number {
    return this.currentTasks.size;
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(message: AgentMessage): Promise<void> {
    if (message.to !== this.profile.id && message.to !== 'broadcast') return;

    switch (message.type) {
      case 'request':
        await this.handleRequest(message);
        break;
      case 'delegation':
        await this.handleDelegation(message);
        break;
    }
  }

  /**
   * Handle request from other agents
   */
  private async handleRequest(message: AgentMessage): Promise<void> {
    try {
      // Process the request
      const result = await this.processRequest(message.content);

      // Send response
      this.messageBus.publish({
        id: this.generateId(),
        from: this.profile.id,
        to: message.from,
        type: 'response',
        content: result,
        timestamp: Date.now(),
        correlationId: message.id,
        priority: message.priority,
      });
    } catch (error) {
      // Send error response
      this.messageBus.publish({
        id: this.generateId(),
        from: this.profile.id,
        to: message.from,
        type: 'response',
        content: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: Date.now(),
        correlationId: message.id,
        priority: message.priority,
      });
    }
  }

  /**
   * Handle task delegation
   */
  private async handleDelegation(message: AgentMessage): Promise<void> {
    const task = message.content as Task;
    const result = await this.executeTask(task);

    this.messageBus.publish({
      id: this.generateId(),
      from: this.profile.id,
      to: message.from,
      type: 'response',
      content: result,
      timestamp: Date.now(),
      correlationId: message.id,
      priority: message.priority,
    });
  }

  /**
   * Select execution strategy
   */
  private selectStrategy(task: Task): 'independent' | 'collaborative' | 'delegated' {
    // Simple heuristic based on task type
    if (task.type === 'coordination') return 'collaborative';
    if (this.getCurrentLoad() > this.profile.maxConcurrentTasks * 0.8) return 'delegated';
    return 'independent';
  }

  /**
   * Execute independently
   */
  private async executeIndependently(task: Task, context?: Record<string, unknown>): Promise<unknown> {
    if (!this.llmProvider) {
      return `Agent ${this.profile.name} executed: ${task.input}`;
    }

    const request: LLMRequest = {
      messages: [
        { role: 'system', content: this.profile.systemPrompt },
        { role: 'user', content: `Task: ${task.input}\nContext: ${JSON.stringify(context || {})}` },
      ],
      temperature: 0.7,
    };

    const response = await this.llmProvider.complete(request);
    return response.content;
  }

  /**
   * Execute collaboratively with other agents
   */
  private async executeCollaboratively(task: Task, context?: Record<string, unknown>): Promise<unknown> {
    // Identify required inputs from other agents
    const requiredInputs = await this.identifyRequiredInputs(task);

    // Collect responses from peers
    const responses = await Promise.all(
      requiredInputs.map(async (input) => {
        try {
          const response = await this.messageBus.request(
            input.agentId,
            {
              from: this.profile.id,
              to: input.agentId,
              type: 'request',
              content: input.query,
              priority: task.priority,
            },
            this.profile.timeout
          );
          return { agentId: input.agentId, data: response.content };
        } catch (error) {
          return { agentId: input.agentId, data: null, error: error instanceof Error ? error.message : 'Request failed' };
        }
      })
    );

    // Execute with enriched context
    const enrichedContext = { ...context, peerInputs: responses };
    return this.executeIndependently(task, enrichedContext);
  }

  /**
   * Identify required inputs from other agents
   */
  private async identifyRequiredInputs(task: Task): Promise<Array<{ agentId: string; query: string }>> {
    // Simplified implementation
    return [];
  }

  /**
   * Process request content
   */
  private async processRequest(content: unknown): Promise<unknown> {
    return `Processed by ${this.profile.name}: ${JSON.stringify(content)}`;
  }

  /**
   * Assess confidence in output
   */
  private async assessConfidence(output: unknown, task: Task): Promise<number> {
    return 0.8;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================
// Multi-Agent Orchestrator
// ============================================

export class MultiAgentOrchestrator {
  private agents = new Map<string, CollaborativeAgent>();
  private messageBus = new AgentMessageBus();
  private config: OrchestratorConfig;
  private performanceMonitor: PerformanceMonitor;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config };
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Register an agent
   */
  registerAgent(profile: AgentProfile, llmProvider?: LLMProvider): void {
    const agent = new CollaborativeAgent(profile, this.messageBus, llmProvider);
    this.agents.set(profile.id, agent);
  }

  /**
   * Execute a complex task with multiple agents
   */
  async executeComplexTask(input: string, options?: { priority?: number; timeout?: number }): Promise<CollaborativeResult> {
    const startTime = Date.now();
    const endTimer = this.performanceMonitor.createTimer('complex-task-execution');

    try {
      // 1. Analyze task complexity
      const analysis = await this.analyzeTask(input);

      // 2. Build execution plan
      const tasks = this.buildExecutionPlan(analysis, input);

      // 3. Assign tasks to agents
      const assignments = this.assignTasks(tasks);

      // 4. Execute tasks
      const results = await this.executeTasks(assignments);

      // 5. Synthesize results
      const output = await this.synthesizeResults(results);

      endTimer();

      return {
        success: results.every((r) => r.status === 'completed'),
        output,
        taskResults: results,
        executionTime: Date.now() - startTime,
        agentContributions: this.calculateAgentContributions(results),
      };
    } catch (error) {
      endTimer();
      return {
        success: false,
        output: null,
        taskResults: [],
        executionTime: Date.now() - startTime,
        agentContributions: new Map(),
      };
    }
  }

  /**
   * Analyze task complexity
   */
  private async analyzeTask(input: string): Promise<{ complexity: 'simple' | 'medium' | 'complex'; requiresCollaboration: boolean }> {
    // Simplified analysis
    const wordCount = input.split(' ').length;
    const complexity = wordCount > 50 ? 'complex' : wordCount > 20 ? 'medium' : 'simple';
    const requiresCollaboration = complexity === 'complex';

    return { complexity, requiresCollaboration };
  }

  /**
   * Build execution plan
   */
  private buildExecutionPlan(analysis: { complexity: string; requiresCollaboration: boolean }, input: string): Task[] {
    const tasks: Task[] = [];

    if (analysis.requiresCollaboration) {
      // Decompose into subtasks
      tasks.push({
        id: this.generateId(),
        type: 'analysis',
        priority: 1,
        input: `Analyze: ${input}`,
      });
      tasks.push({
        id: this.generateId(),
        type: 'execution',
        priority: 2,
        input: `Execute based on analysis: ${input}`,
        dependencies: [tasks[0].id],
      });
      tasks.push({
        id: this.generateId(),
        type: 'review',
        priority: 3,
        input: `Review execution results: ${input}`,
        dependencies: [tasks[1].id],
      });
    } else {
      tasks.push({
        id: this.generateId(),
        type: 'execution',
        priority: 1,
        input,
      });
    }

    return tasks;
  }

  /**
   * Assign tasks to agents based on capabilities
   */
  private assignTasks(tasks: Task[]): Array<{ task: Task; agentId: string }> {
    const assignments: Array<{ task: Task; agentId: string }> = [];

    for (const task of tasks) {
      // Find best matching agent
      let bestAgent: CollaborativeAgent | undefined;
      let bestScore = -1;

      this.agents.forEach((agent) => {
        const score = this.calculateCapabilityMatch(agent, task);
        const load = agent.getCurrentLoad();
        const adjustedScore = score / (load + 1);

        if (adjustedScore > bestScore && score >= this.config.minCapabilityThreshold) {
          bestScore = adjustedScore;
          bestAgent = agent;
        }
      });

      if (bestAgent) {
        assignments.push({ task, agentId: bestAgent.id });
      }
    }

    return assignments;
  }

  /**
   * Calculate capability match score
   */
  private calculateCapabilityMatch(agent: CollaborativeAgent, task: Task): number {
    const role = agent.role;

    // Check if agent capabilities match task requirements
    const capabilityMatch = role.capabilities.some((cap) => task.type.includes(cap)) ? 1 : 0;

    // Check if agent responsibilities align with task
    const responsibilityMatch = role.responsibilities.some((resp) => task.input.toLowerCase().includes(resp.toLowerCase())) ? 0.5 : 0;

    // Consider agent priority
    const priorityBonus = role.priority / 10;

    return capabilityMatch + responsibilityMatch + priorityBonus;
  }

  /**
   * Execute assigned tasks
   */
  private async executeTasks(assignments: Array<{ task: Task; agentId: string }>): Promise<TaskResult[]> {
    const results: TaskResult[] = [];
    const completedTasks = new Set<string>();

    // Group by execution order (respect dependencies)
    const executionOrder = this.topologicalSort(assignments);

    for (const batch of executionOrder) {
      // Execute batch in parallel
      const batchResults = await Promise.all(
        batch.map(async ({ task, agentId }) => {
          // Wait for dependencies
          await this.waitForDependencies(task, completedTasks);

          const agent = this.agents.get(agentId);
          if (!agent) {
            return {
              taskId: task.id,
              agentId,
              status: 'failed' as const,
              output: null,
              metadata: { executionTime: 0, confidence: 0 },
            };
          }

          const result = await agent.executeTask(task);
          completedTasks.add(task.id);
          return result;
        })
      );

      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Wait for task dependencies
   */
  private async waitForDependencies(task: Task, completedTasks: Set<string>): Promise<void> {
    if (!task.dependencies || task.dependencies.length === 0) return;

    const checkInterval = 100;
    const maxWait = 60000; // 60 seconds
    let waited = 0;

    while (waited < maxWait) {
      const allDepsCompleted = task.dependencies.every((depId) => completedTasks.has(depId));
      if (allDepsCompleted) return;

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    throw new Error(`Timeout waiting for dependencies of task ${task.id}`);
  }

  /**
   * Topological sort of tasks
   */
  private topologicalSort(assignments: Array<{ task: Task; agentId: string }>): Array<Array<{ task: Task; agentId: string }>> {
    const result: Array<Array<{ task: Task; agentId: string }>> = [];
    const completed = new Set<string>();
    const remaining = new Map(assignments.map((a) => [a.task.id, a]));

    while (remaining.size > 0) {
      const batch: Array<{ task: Task; agentId: string }> = [];

      remaining.forEach((assignment, id) => {
        const deps = assignment.task.dependencies || [];
        const depsCompleted = deps.every((depId) => completed.has(depId));

        if (depsCompleted) {
          batch.push(assignment);
        }
      });

      if (batch.length === 0) {
        // Circular dependency detected
        throw new Error('Circular dependency detected in task graph');
      }

      result.push(batch);
      batch.forEach((a) => {
        completed.add(a.task.id);
        remaining.delete(a.task.id);
      });
    }

    return result;
  }

  /**
   * Synthesize results from multiple tasks
   */
  private async synthesizeResults(results: TaskResult[]): Promise<unknown> {
    const successfulResults = results.filter((r) => r.status === 'completed');

    if (successfulResults.length === 0) {
      return 'All tasks failed';
    }

    if (successfulResults.length === 1) {
      return successfulResults[0].output;
    }

    // Combine multiple results
    return {
      synthesized: true,
      contributions: successfulResults.map((r) => ({
        agentId: r.agentId,
        output: r.output,
        confidence: r.metadata.confidence,
      })),
      summary: `Combined results from ${successfulResults.length} agents`,
    };
  }

  /**
   * Calculate agent contributions
   */
  private calculateAgentContributions(results: TaskResult[]): Map<string, number> {
    const contributions = new Map<string, number>();

    for (const result of results) {
      const current = contributions.get(result.agentId) || 0;
      contributions.set(result.agentId, current + 1);
    }

    return contributions;
  }

  /**
   * Get orchestrator stats
   */
  getStats(): { agentCount: number; activeTasks: number } {
    let activeTasks = 0;
    this.agents.forEach((agent) => {
      activeTasks += agent.getCurrentLoad();
    });

    return {
      agentCount: this.agents.size,
      activeTasks,
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================
// Export
// ============================================

export { MultiAgentOrchestrator as default };
