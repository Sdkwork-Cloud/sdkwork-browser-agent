/**
 * Smart Agent with automatic skill selection
 * Token-optimized decision making
 * Integrated evaluation system
 */

import { Agent, AgentConfig, Skill, SkillResult } from './agent';
import type { LLMMessage } from '../llm/provider';
import { DecisionEngine, Decision, DecisionContext, DecisionEngineConfig } from './decision-engine';
import { DynamicSkillLoader, SkillLoaderConfig } from './skill-loader';
import { TokenOptimizer, TokenOptimizerConfig } from './token-optimizer';
import { 
  EvaluationEngine, 
  EvaluationConfig, 
  EvaluationResult, 
  EvaluationContext,
  EvaluationLevel 
} from './evaluation-engine';

export interface SmartAgentConfig extends AgentConfig {
  decisionEngine?: DecisionEngineConfig;
  skillLoader?: SkillLoaderConfig;
  tokenOptimizer?: TokenOptimizerConfig;
  evaluation?: EvaluationConfig;
  autoDecide?: boolean;
  maxAutoIterations?: number;
  enableStreaming?: boolean;
}

export interface AutoExecutionResult {
  decision: Decision;
  result: SkillResult | string;
  tokensUsed: number;
  executionTime: number;
  skillsLoaded?: string[];
  evaluation?: EvaluationResult;
}

export class SmartAgent extends Agent {
  private decisionEngine: DecisionEngine;
  private skillLoader: DynamicSkillLoader;
  private tokenOptimizer: TokenOptimizer;
  private evaluationEngine: EvaluationEngine;
  private executionHistory: Array<{
    input: string;
    decision: Decision;
    timestamp: Date;
    evaluation?: EvaluationResult;
  }> = [];

  constructor(config: SmartAgentConfig) {
    super(config);
    this.decisionEngine = new DecisionEngine(config.decisionEngine);
    this.skillLoader = new DynamicSkillLoader(config.skillLoader);
    this.tokenOptimizer = new TokenOptimizer(config.tokenOptimizer);
    this.evaluationEngine = new EvaluationEngine(config.evaluation ?? { enabled: true, level: 'standard', strategies: ['semantic'] });
    // Store config values that might be used in future implementations
    void config.autoDecide;
    void config.maxAutoIterations;
    void config.enableStreaming;
  }

  /**
   * Initialize the smart agent
   */
  async initialize(): Promise<void> {
    await super.initialize();

    // Index all registered skills for decision making
    for (const skill of this.getAllSkills()) {
      await this.decisionEngine.indexSkill(skill);
    }
  }

  /**
   * Auto-process user input with smart decision making and evaluation
   */
  async process(input: string, context?: string): Promise<AutoExecutionResult> {
    const startTime = Date.now();
    const tokensUsed = 0;

    // Step 1: Make decision
    const decision = await this.makeDecision(input, context);

    // Step 2: Load required skills dynamically
    const loadedSkills: string[] = [];
    if (decision.skills) {
      for (const skillName of decision.skills) {
        if (!this.getSkill(skillName)) {
          const skill = await this.skillLoader.load(skillName);
          if (skill) {
            this.registerSkill(skill);
            await this.decisionEngine.indexSkill(skill);
            loadedSkills.push(skillName);
          }
        }
      }
    }

    // Step 3: Execute based on decision type
    let result: SkillResult | string;
    let skillUsed: Skill | undefined;

    switch (decision.type) {
      case 'skill':
        if (decision.skills?.length === 1) {
          // Single skill - extract parameters and execute
          const skillName = decision.skills[0];
          skillUsed = this.getSkill(skillName);
          const params = await this.extractParameters(input, skillName);
          const skillResult = await this.executeSkill(skillName, params);
          result = skillResult.success
            ? String(skillResult.data ?? 'Success')
            : String(skillResult.error ?? 'Error');
        } else {
          // Multiple skills - use LLM to coordinate
          result = await this.coordinateSkills(input, decision.skills || []);
        }
        break;

      case 'tool':
        if (decision.tools?.length === 1) {
          const toolName = decision.tools[0];
          const toolResult = await this.executeTool(toolName, input);
          result = toolResult.isError
            ? String(toolResult.content[0]?.text ?? 'Error')
            : String(toolResult.content[0]?.text ?? 'Success');
        } else {
          result = await this.coordinateTools(input, decision.tools || []);
        }
        break;

      case 'multi':
        // Mixed skill/tool execution
        result = await this.executeMixed(input, decision);
        break;

      case 'llm':
      default:
        // Direct LLM response
        result = await this.directLLMResponse(input, context);
        break;
    }

    // Step 4: Evaluate result if enabled
    let evaluation: EvaluationResult | undefined;
    const config = this.evaluationEngine.getConfig();
    
    if (config.enabled && config.level !== 'none') {
      const skillResult: SkillResult = typeof result === 'string' 
        ? { success: true, data: result }
        : result;

      const evalContext: EvaluationContext = {
        originalInput: input,
        skill: skillUsed,
      };

      evaluation = await this.evaluationEngine.evaluate(skillResult, evalContext);
      
      // If evaluation failed and auto-retry is enabled, attempt retry
      if (!evaluation.passed && config.autoRetry && config.maxRetries && config.maxRetries > 0) {
        const retryResult = await this.attemptRetry(input, context, decision, config.maxRetries);
        if (retryResult) {
          result = retryResult.result;
          evaluation = retryResult.evaluation;
        }
      }
    }

    // Track execution
    this.executionHistory.push({
      input,
      decision,
      timestamp: new Date(),
      evaluation,
    });

    const executionTime = Date.now() - startTime;

    return {
      decision,
      result,
      tokensUsed,
      executionTime,
      skillsLoaded: loadedSkills.length > 0 ? loadedSkills : undefined,
      evaluation,
    };
  }

  /**
   * Attempt retry with improved parameters
   */
  private async attemptRetry(
    input: string, 
    context: string | undefined, 
    originalDecision: Decision,
    maxRetries: number
  ): Promise<{ result: SkillResult | string; evaluation: EvaluationResult } | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Try with different approach
      const retryDecision: Decision = {
        ...originalDecision,
        reasoning: `${originalDecision.reasoning} (retry attempt ${attempt})`,
      };

      let retryResult: SkillResult | string;
      
      switch (retryDecision.type) {
        case 'skill':
          if (retryDecision.skills?.length === 1) {
            const skillName = retryDecision.skills[0];
            const params = await this.extractParameters(input, skillName);
            const skillResult = await this.executeSkill(skillName, params);
            retryResult = skillResult.success
              ? String(skillResult.data ?? 'Success')
              : String(skillResult.error ?? 'Error');
          } else {
            retryResult = await this.coordinateSkills(input, retryDecision.skills || []);
          }
          break;
        case 'llm':
        default:
          retryResult = await this.directLLMResponse(input, context);
          break;
      }

      const skillResult: SkillResult = typeof retryResult === 'string' 
        ? { success: true, data: retryResult }
        : retryResult;

      const evalContext: EvaluationContext = {
        originalInput: input,
      };

      const evaluation = await this.evaluationEngine.evaluate(skillResult, evalContext);
      
      if (evaluation.passed) {
        return { result: retryResult, evaluation };
      }
    }

    return null;
  }

  /**
   * Stream process user input with evaluation
   */
  async *streamProcess(
    input: string,
    context?: string
  ): AsyncIterableIterator<{
    type: 'decision' | 'skill' | 'tool' | 'llm' | 'evaluation' | 'complete';
    data?: unknown;
  }> {
    // Step 1: Make decision
    const decision = await this.makeDecision(input, context);
    yield { type: 'decision', data: decision };

    // Step 2: Execute based on decision
    let result: SkillResult | string = '';
    let skillUsed: Skill | undefined;

    switch (decision.type) {
      case 'skill':
        for (const skillName of decision.skills || []) {
          yield { type: 'skill', data: { name: skillName, status: 'executing' } };
          skillUsed = this.getSkill(skillName);
          const params = await this.extractParameters(input, skillName);
          const skillResult = await this.executeSkill(skillName, params);
          result = skillResult.success
            ? String(skillResult.data ?? 'Success')
            : String(skillResult.error ?? 'Error');
          yield { type: 'skill', data: { name: skillName, result } };
        }
        break;

      case 'tool':
        for (const toolName of decision.tools || []) {
          yield { type: 'tool', data: { name: toolName, status: 'executing' } };
          const toolResult = await this.executeTool(toolName, input);
          result = toolResult.isError
            ? String(toolResult.content[0]?.text ?? 'Error')
            : String(toolResult.content[0]?.text ?? 'Success');
          yield { type: 'tool', data: { name: toolName, result } };
        }
        break;

      case 'llm':
        yield { type: 'llm', data: { status: 'generating' } };
        const messages: LLMMessage[] = [{ role: 'user', content: input }];

        let fullResponse = '';
        for await (const chunk of this.streamChat(messages)) {
          if (chunk.delta.content) {
            fullResponse += chunk.delta.content;
            yield { type: 'llm', data: { chunk: chunk.delta.content } };
          }
        }
        result = fullResponse;
        break;
    }

    // Step 3: Evaluate if enabled
    const config = this.evaluationEngine.getConfig();
    if (config.enabled && config.level !== 'none') {
      const skillResult: SkillResult = typeof result === 'string' 
        ? { success: true, data: result }
        : result as SkillResult;

      const evalContext: EvaluationContext = {
        originalInput: input,
        skill: skillUsed,
      };

      const evaluation = await this.evaluationEngine.evaluate(skillResult, evalContext);
      yield { type: 'evaluation', data: evaluation };
    }

    yield { type: 'complete' };
  }

  /**
   * Make decision based on input
   */
  private async makeDecision(input: string, context?: string): Promise<Decision> {
    const decisionContext: DecisionContext = {
      input,
      history: this.executionHistory.slice(-5).map(h => h.input),
      availableSkills: this.getSkillNames(),
      availableTools: this.getToolNames(),
      metadata: context ? { context } : undefined,
    };

    return this.decisionEngine.decide(decisionContext);
  }

  /**
   * Extract parameters from input for a skill
   */
  private async extractParameters(
    input: string,
    skillName: string
  ): Promise<Record<string, unknown>> {
    const skill = this.getSkill(skillName);
    if (!skill) return {};

    // Use LLM to extract parameters if provider available
    if (this.llmProvider) {
      const prompt = this.buildParameterExtractionPrompt(input, skill);
      const response = await this.chat([{ role: 'user', content: prompt }]);

      try {
        const params = JSON.parse(response.content);
        return params;
      } catch {
        // Fallback to empty params
        return {};
      }
    }

    // Fallback: simple keyword matching
    return this.simpleParameterExtraction(input, skill);
  }

  /**
   * Coordinate multiple skills
   */
  private async coordinateSkills(input: string, skillNames: string[]): Promise<string> {
    const skills = skillNames
      .map(name => this.getSkill(name))
      .filter((s): s is Skill => s !== undefined);

    const optimizedSkills = this.tokenOptimizer.optimizeSkills(skills, input);

    if (!this.llmProvider) {
      // Execute skills sequentially without LLM
      const results: string[] = [];
      for (const skill of optimizedSkills) {
        const params = await this.extractParameters(input, skill.name);
        const result = await this.executeSkill(skill.name, params);
        results.push(`${skill.name}: ${result.success ? result.data : result.error}`);
      }
      return results.join('\n');
    }

    // Use LLM to coordinate
    const prompt = this.tokenOptimizer.buildOptimizedPrompt(
      input,
      optimizedSkills,
      'Coordinate the following skills to answer the user query.'
    );

    const response = await this.chat([{ role: 'user', content: prompt }]);
    return response.content;
  }

  /**
   * Coordinate multiple tools
   */
  private async coordinateTools(input: string, toolNames: string[]): Promise<string> {
    const tools = toolNames
      .map(name => this.getTool(name))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);

    const results: string[] = [];
    for (const tool of tools) {
      const result = await this.executeTool(tool.name, input);
      results.push(`${tool.name}: ${result.content[0]?.text ?? 'No output'}`);
    }

    return results.join('\n');
  }

  /**
   * Execute mixed skills and tools
   */
  private async executeMixed(input: string, decision: Decision): Promise<string> {
    const results: string[] = [];

    // Execute skills
    if (decision.skills) {
      for (const skillName of decision.skills) {
        const params = await this.extractParameters(input, skillName);
        const result = await this.executeSkill(skillName, params);
        results.push(`Skill ${skillName}: ${result.success ? result.data : result.error}`);
      }
    }

    // Execute tools
    if (decision.tools) {
      for (const toolName of decision.tools) {
        const result = await this.executeTool(toolName, input);
        results.push(`Tool ${toolName}: ${result.content[0]?.text ?? 'No output'}`);
      }
    }

    return results.join('\n');
  }

  /**
   * Direct LLM response
   */
  private async directLLMResponse(input: string, context?: string): Promise<string> {
    if (!this.llmProvider) {
      return 'No LLM provider configured';
    }

    const messages: LLMMessage[] = [];

    if (context) {
      messages.push({
        role: 'system',
        content: `Context: ${context}`,
      });
    }

    messages.push({ role: 'user', content: input });

    const response = await this.chat(messages);
    return response.content;
  }

  /**
   * Build parameter extraction prompt
   */
  private buildParameterExtractionPrompt(input: string, skill: Skill): string {
    const params = Object.entries(skill.parameters.properties)
      .map(([key, prop]) => {
        const required = skill.parameters.required?.includes(key) ? ' (required)' : '';
        return `- ${key}: ${prop.description}${required}`;
      })
      .join('\n');

    return `Extract parameters for skill "${skill.name}" from the following input.

Skill description: ${skill.description}

Parameters:
${params}

Input: "${input}"

Return only a JSON object with the parameter names and values. If a parameter cannot be determined, use null or omit it.`;
  }

  /**
   * Simple parameter extraction without LLM
   */
  private simpleParameterExtraction(input: string, skill: Skill): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    for (const [key, prop] of Object.entries(skill.parameters.properties)) {
      // Look for "key: value" or "key is value" patterns
      const patterns = [
        new RegExp(`${key}[:=]\\s*([^,\\s]+)`, 'i'),
        new RegExp(`${key}\\s+is\\s+([^,\\s]+)`, 'i'),
        new RegExp(`${key}\\s+([^,\\s]+)`, 'i'),
      ];

      for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) {
          let value: unknown = match[1];

          // Type conversion
          if (prop.type === 'number') {
            value = parseFloat(value as string);
          } else if (prop.type === 'boolean') {
            value = ['true', 'yes', '1'].includes((value as string).toLowerCase());
          }

          params[key] = value;
          break;
        }
      }

      // Use default if available and not set
      if (!(key in params) && prop.default !== undefined) {
        params[key] = prop.default;
      }
    }

    return params;
  }

  /**
   * Register a skill source for dynamic loading
   */
  registerSkillSource(name: string, source: string, type: 'file' | 'url' | 'module'): void {
    this.skillLoader.registerSource({
      name,
      type,
      source,
    });
  }

  /**
   * Get execution history
   */
  getExecutionHistory(): Array<{ input: string; decision: Decision; timestamp: Date; evaluation?: EvaluationResult }> {
    return [...this.executionHistory];
  }

  /**
   * Get decision engine stats
   */
  getDecisionStats(): {
    cacheSize: number;
    loadedSkills: number;
    historySize: number;
  } {
    return {
      cacheSize: this.decisionEngine.getCacheStats().size,
      loadedSkills: this.skillLoader.getStats().loaded,
      historySize: this.executionHistory.length,
    };
  }

  /**
   * Get evaluation stats
   */
  getEvaluationStats(): {
    totalEvaluations: number;
    passRate: number;
    averageScore: number;
    config: { enabled: boolean; level: EvaluationLevel };
  } {
    const stats = this.evaluationEngine.getStats();
    const config = this.evaluationEngine.getConfig();
    
    return {
      ...stats,
      config: {
        enabled: config.enabled,
        level: config.level,
      },
    };
  }

  /**
   * Update evaluation configuration
   */
  updateEvaluationConfig(config: Partial<EvaluationConfig>): void {
    this.evaluationEngine.updateConfig(config);
  }

  /**
   * Get evaluation configuration
   */
  getEvaluationConfig(): EvaluationConfig {
    return this.evaluationEngine.getConfig();
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory = [];
    this.decisionEngine.clearCache();
    this.evaluationEngine.clearHistory();
  }

  /**
   * Get recent evaluations
   */
  getRecentEvaluations(limit: number = 10): Array<{
    timestamp: Date;
    passed: boolean;
    score: number;
    input: string;
    feedback: string;
  }> {
    return this.executionHistory
      .filter(h => h.evaluation)
      .slice(-limit)
      .map(h => ({
        timestamp: h.timestamp,
        passed: h.evaluation!.passed,
        score: h.evaluation!.score.overall,
        input: h.input.substring(0, 100),
        feedback: h.evaluation!.feedback,
      }));
  }

  /**
   * Generate evaluation report
   */
  generateEvaluationReport(): {
    summary: {
      totalExecutions: number;
      evaluatedExecutions: number;
      passRate: number;
      averageScore: number;
    };
    recentEvaluations: Array<{
      timestamp: Date;
      passed: boolean;
      score: number;
      input: string;
      feedback: string;
    }>;
    suggestions: string[];
  } {
    const stats = this.evaluationEngine.getStats();
    const recent = this.getRecentEvaluations(10);
    
    // Collect all suggestions
    const allSuggestions = this.executionHistory
      .filter(h => h.evaluation)
      .flatMap(h => h.evaluation!.suggestions);
    
    const uniqueSuggestions = [...new Set(allSuggestions)].slice(0, 10);

    return {
      summary: {
        totalExecutions: this.executionHistory.length,
        evaluatedExecutions: stats.totalEvaluations,
        passRate: stats.passRate,
        averageScore: stats.averageScore,
      },
      recentEvaluations: recent,
      suggestions: uniqueSuggestions,
    };
  }
}
