/**
 * ReAct (Reasoning + Acting) Decision Engine
 *
 * Implements the ReAct pattern for intelligent agent decision making.
 * ReAct enables the agent to reason about the task, take actions, and observe results
 * in a loop until the task is completed.
 *
 * Compatible with both browser and Node.js environments.
 */

import type { Skill, SkillContext, SkillResult } from '../types/unified';
import type { LLMProvider, LLMRequest } from '../llm/provider';
import { BoundedCache } from '../utils/bounded-cache';

// ============================================
// Types
// ============================================

export interface ReActStep {
  step: number;
  thought: string;
  action: ReActAction;
  observation: string;
  timestamp: number;
}

export interface ReActAction {
  type: 'skill' | 'tool' | 'llm' | 'finish';
  name?: string;
  params?: Record<string, unknown>;
  reasoning: string;
}

export interface ReActConfig {
  maxIterations: number;
  maxTokensPerStep: number;
  temperature: number;
  stopSequences: string[];
  cacheEnabled: boolean;
}

export interface ReActResult {
  success: boolean;
  finalAnswer: string;
  steps: ReActStep[];
  iterations: number;
  executionTime: number;
  tokenUsage: number;
}

export interface ReActContext {
  input: string;
  availableSkills: Skill[];
  availableTools: string[];
  history?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_REACT_CONFIG: ReActConfig = {
  maxIterations: 10,
  maxTokensPerStep: 2000,
  temperature: 0.7,
  stopSequences: ['\nObservation:'],
  cacheEnabled: true,
};

// ============================================
// ReAct Engine
// ============================================

export class ReActEngine {
  private llmProvider: LLMProvider;
  private config: ReActConfig;
  private cache: BoundedCache<string, ReActResult>;
  private stepHistory: ReActStep[] = [];
  private skillExecutor?: (skillName: string, params: Record<string, unknown>) => Promise<SkillResult>;
  private toolExecutor?: (toolName: string, params: Record<string, unknown>) => Promise<unknown>;

  constructor(
    llmProvider: LLMProvider,
    config: Partial<ReActConfig> = {}
  ) {
    this.llmProvider = llmProvider;
    this.config = { ...DEFAULT_REACT_CONFIG, ...config };
    this.cache = new BoundedCache<string, ReActResult>({
      maxSize: 100,
      ttl: 10 * 60 * 1000, // 10 minutes
      enableLRU: true,
    });
  }

  /**
   * Set skill executor for actual skill execution
   */
  setSkillExecutor(executor: (skillName: string, params: Record<string, unknown>) => Promise<SkillResult>): void {
    this.skillExecutor = executor;
  }

  /**
   * Set tool executor for actual tool execution
   */
  setToolExecutor(executor: (toolName: string, params: Record<string, unknown>) => Promise<unknown>): void {
    this.toolExecutor = executor;
  }

  /**
   * Execute ReAct loop to solve a task
   */
  async execute(context: ReActContext): Promise<ReActResult> {
    const startTime = Date.now();
    let tokenUsage = 0;

    // Check cache
    if (this.config.cacheEnabled) {
      const cacheKey = this.generateCacheKey(context);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    this.stepHistory = [];
    let finalAnswer = '';

    try {
      for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
        // 1. Generate thought and action
        const step = await this.generateStep(context, iteration);
        tokenUsage += step.tokensUsed || 0;

        this.stepHistory.push({
          step: iteration + 1,
          thought: step.thought,
          action: step.action,
          observation: '',
          timestamp: Date.now(),
        });

        // 2. Execute action
        if (step.action.type === 'finish') {
          finalAnswer = step.action.params?.answer as string || step.thought;
          break;
        }

        const observation = await this.executeAction(step.action, context);
        this.stepHistory[this.stepHistory.length - 1].observation = observation;

        // Check if we have a final answer
        if (observation.includes('FINAL_ANSWER:')) {
          finalAnswer = observation.replace('FINAL_ANSWER:', '').trim();
          break;
        }
      }

      const result: ReActResult = {
        success: true,
        finalAnswer: finalAnswer || this.generateAnswerFromSteps(),
        steps: this.stepHistory,
        iterations: this.stepHistory.length,
        executionTime: Date.now() - startTime,
        tokenUsage,
      };

      // Cache result
      if (this.config.cacheEnabled) {
        this.cache.set(this.generateCacheKey(context), result);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        finalAnswer: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        steps: this.stepHistory,
        iterations: this.stepHistory.length,
        executionTime: Date.now() - startTime,
        tokenUsage,
      };
    }
  }

  /**
   * Generate a single ReAct step (thought + action)
   */
  private async generateStep(
    context: ReActContext,
    iteration: number
  ): Promise<{ thought: string; action: ReActAction; tokensUsed: number }> {
    const prompt = this.buildPrompt(context, iteration);

    const request: LLMRequest = {
      messages: [
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: prompt },
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokensPerStep,
    };

    const response = await this.llmProvider.complete(request);
    const content = response.content;

    // Parse thought and action from response
    const thought = this.extractThought(content);
    const action = this.extractAction(content);

    return {
      thought,
      action,
      tokensUsed: response.usage?.total_tokens || 0,
    };
  }

  /**
   * Build the prompt for the current step
   */
  private buildPrompt(context: ReActContext, iteration: number): string {
    let prompt = `Task: ${context.input}\n\n`;

    // Add available skills
    if (context.availableSkills.length > 0) {
      prompt += 'Available Skills:\n';
      context.availableSkills.forEach(skill => {
        prompt += `- ${skill.metadata.name}: ${skill.metadata.description}\n`;
      });
      prompt += '\n';
    }

    // Add available tools
    if (context.availableTools.length > 0) {
      prompt += 'Available Tools:\n';
      context.availableTools.forEach(tool => {
        prompt += `- ${tool}\n`;
      });
      prompt += '\n';
    }

    // Add step history
    if (this.stepHistory.length > 0) {
      prompt += 'Previous Steps:\n';
      this.stepHistory.forEach(step => {
        prompt += `Step ${step.step}:\n`;
        prompt += `Thought: ${step.thought}\n`;
        prompt += `Action: ${JSON.stringify(step.action)}\n`;
        prompt += `Observation: ${step.observation}\n\n`;
      });
    }

    prompt += `Step ${iteration + 1}:\n`;
    prompt += 'Thought:';

    return prompt;
  }

  /**
   * Get system prompt for ReAct
   */
  private getSystemPrompt(): string {
    return `You are an intelligent assistant that solves tasks using the ReAct (Reasoning + Acting) pattern.

For each step, you must:
1. Think about what you need to do
2. Choose an action from the available options
3. Wait for the observation

Available action types:
- skill: Execute a skill with parameters
- tool: Execute a tool with parameters
- llm: Ask for more information or clarification
- finish: Provide the final answer

Format your response as:
Thought: <your reasoning>
Action: {"type": "<action_type>", "name": "<name>", "params": {<parameters>}, "reasoning": "<why this action>"}

Be concise and focused. If you have enough information, use the finish action.`;
  }

  /**
   * Extract thought from LLM response
   */
  private extractThought(content: string): string {
    const thoughtMatch = content.match(/Thought:\s*(.+?)(?=\nAction:|$)/);
    return thoughtMatch ? thoughtMatch[1].trim() : content;
  }

  /**
   * Extract action from LLM response
   */
  private extractAction(content: string): ReActAction {
    const actionMatch = content.match(/Action:\s*(\{.+\})/);
    if (actionMatch) {
      try {
        return JSON.parse(actionMatch[1]) as ReActAction;
      } catch {
        // Fall through to default
      }
    }

    // Default to finish if parsing fails
    return {
      type: 'finish',
      reasoning: 'Failed to parse action, finishing with current thought',
      params: { answer: this.extractThought(content) },
    };
  }

  /**
   * Execute an action
   */
  private async executeAction(
    action: ReActAction,
    context: ReActContext
  ): Promise<string> {
    switch (action.type) {
      case 'skill':
        return this.executeSkillAction(action, context);
      case 'tool':
        return this.executeToolAction(action);
      case 'llm':
        return this.executeLLMAction(action);
      case 'finish':
        return `FINAL_ANSWER: ${action.params?.answer || 'Task completed'}`;
      default:
        return `Unknown action type: ${action.type}`;
    }
  }

  /**
   * Execute a skill action
   */
  private async executeSkillAction(
    action: ReActAction,
    context: ReActContext
  ): Promise<string> {
    const skill = context.availableSkills.find(s => s.metadata.name === action.name);
    if (!skill) {
      return `Error: Skill '${action.name}' not found`;
    }

    // If skill executor is set, use it for actual execution
    if (this.skillExecutor) {
      try {
        const result = await this.skillExecutor(action.name!, action.params || {});
        if (result.success) {
          return `Skill '${action.name}' executed successfully. Result: ${JSON.stringify(result.data)}`;
        } else {
          return `Error executing skill '${action.name}': ${result.error}`;
        }
      } catch (error) {
        return `Error executing skill '${action.name}': ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    // Fallback to simulation if no executor is set
    return `Executed skill '${action.name}' with params: ${JSON.stringify(action.params)}`;
  }

  /**
   * Execute a tool action
   */
  private async executeToolAction(action: ReActAction): Promise<string> {
    // If tool executor is set, use it for actual execution
    if (this.toolExecutor && action.name) {
      try {
        const result = await this.toolExecutor(action.name, action.params || {});
        return `Tool '${action.name}' executed successfully. Result: ${JSON.stringify(result)}`;
      } catch (error) {
        return `Error executing tool '${action.name}': ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    // Fallback to simulation if no executor is set
    return `Executed tool '${action.name}' with params: ${JSON.stringify(action.params)}`;
  }

  /**
   * Execute an LLM action
   */
  private async executeLLMAction(action: ReActAction): Promise<string> {
    const request: LLMRequest = {
      messages: [
        { role: 'user', content: action.params?.question as string || '' },
      ],
      temperature: 0.7,
    };

    const response = await this.llmProvider.complete(request);
    return response.content;
  }

  /**
   * Generate answer from steps if no explicit finish
   */
  private generateAnswerFromSteps(): string {
    if (this.stepHistory.length === 0) {
      return 'No steps executed';
    }

    const lastStep = this.stepHistory[this.stepHistory.length - 1];
    return lastStep.thought;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(context: ReActContext): string {
    return `${context.input}:${context.availableSkills.map(s => s.metadata.name).join(',')}`;
  }

  /**
   * Get step history
   */
  getStepHistory(): ReActStep[] {
    return [...this.stepHistory];
  }

  /**
   * Clear step history
   */
  clearHistory(): void {
    this.stepHistory = [];
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}

// ============================================
// Tree of Thoughts Engine
// ============================================

export interface ThoughtNode {
  id: string;
  content: string;
  score: number;
  children: ThoughtNode[];
  parent?: ThoughtNode;
  depth: number;
  visited: boolean;
}

export interface TreeOfThoughtsConfig extends ReActConfig {
  branchingFactor: number;
  maxDepth: number;
  beamWidth: number;
  evaluationThreshold: number;
}

export const DEFAULT_TOT_CONFIG: TreeOfThoughtsConfig = {
  ...DEFAULT_REACT_CONFIG,
  branchingFactor: 3,
  maxDepth: 5,
  beamWidth: 2,
  evaluationThreshold: 0.7,
};

export class TreeOfThoughtsEngine {
  private llmProvider: LLMProvider;
  private config: TreeOfThoughtsConfig;

  constructor(
    llmProvider: LLMProvider,
    config: Partial<TreeOfThoughtsConfig> = {}
  ) {
    this.llmProvider = llmProvider;
    this.config = { ...DEFAULT_TOT_CONFIG, ...config };
  }

  /**
   * Solve a problem using Tree of Thoughts
   */
  async solve(problem: string, context: ReActContext): Promise<ReActResult> {
    const startTime = Date.now();

    // Initialize root node
    const root: ThoughtNode = {
      id: 'root',
      content: problem,
      score: 1.0,
      children: [],
      depth: 0,
      visited: false,
    };

    // Beam search
    let currentLevel: ThoughtNode[] = [root];

    for (let depth = 0; depth < this.config.maxDepth; depth++) {
      const nextLevel: ThoughtNode[] = [];

      for (const node of currentLevel) {
        if (node.visited) continue;

        // Generate children thoughts
        const children = await this.generateThoughts(node, context);
        node.children = children;
        node.visited = true;

        nextLevel.push(...children);
      }

      // Evaluate and select best
      const evaluated = await this.evaluateThoughts(nextLevel);
      currentLevel = this.selectBest(evaluated, this.config.beamWidth);

      // Check for solution
      const solution = currentLevel.find(t => this.isSolution(t));
      if (solution) {
        return this.buildResult(solution, Date.now() - startTime);
      }
    }

    // Return best found
    const best = currentLevel.sort((a, b) => b.score - a.score)[0];
    return this.buildResult(best, Date.now() - startTime);
  }

  /**
   * Generate thought children
   */
  private async generateThoughts(
    parent: ThoughtNode,
    context: ReActContext
  ): Promise<ThoughtNode[]> {
    const prompt = `Given the problem: ${parent.content}

Generate ${this.config.branchingFactor} different approaches or next steps.
Each should be a distinct way to solve or make progress on the problem.

Format: One approach per line, numbered.`;

    const request: LLMRequest = {
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 1000,
    };

    const response = await this.llmProvider.complete(request);
    const lines = response.content.split('\n').filter(l => l.trim());

    return lines.slice(0, this.config.branchingFactor).map((line, i) => ({
      id: `${parent.id}-${i}`,
      content: line.replace(/^\d+\.\s*/, '').trim(),
      score: 0,
      children: [],
      parent,
      depth: parent.depth + 1,
      visited: false,
    }));
  }

  /**
   * Evaluate thoughts
   */
  private async evaluateThoughts(thoughts: ThoughtNode[]): Promise<ThoughtNode[]> {
    const evaluated = await Promise.all(
      thoughts.map(async thought => {
        const prompt = `Rate the quality of this approach (0-1):
${thought.content}

Respond with only a number between 0 and 1.`;

        const request: LLMRequest = {
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          max_tokens: 10,
        };

        const response = await this.llmProvider.complete(request);
        const score = parseFloat(response.content) || 0.5;

        return { ...thought, score };
      })
    );

    return evaluated;
  }

  /**
   * Select best thoughts
   */
  private selectBest(thoughts: ThoughtNode[], count: number): ThoughtNode[] {
    return thoughts
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
  }

  /**
   * Check if thought is a solution
   */
  private isSolution(thought: ThoughtNode): boolean {
    return thought.score >= this.config.evaluationThreshold;
  }

  /**
   * Build result from thought path
   */
  private buildResult(thought: ThoughtNode, executionTime: number): ReActResult {
    const path: ThoughtNode[] = [];
    let current: ThoughtNode | undefined = thought;

    while (current) {
      path.unshift(current);
      current = current.parent;
    }

    return {
      success: thought.score >= this.config.evaluationThreshold,
      finalAnswer: thought.content,
      steps: path.map((t, i) => ({
        step: i + 1,
        thought: t.content,
        action: { type: 'llm', reasoning: 'Tree exploration' },
        observation: `Score: ${t.score}`,
        timestamp: Date.now(),
      })),
      iterations: path.length,
      executionTime,
      tokenUsage: 0,
    };
  }
}

// ============================================
// Export
// ============================================

export { ReActEngine as default };
