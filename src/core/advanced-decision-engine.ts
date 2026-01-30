/**
 * Advanced Decision Engine
 * 
 * Features:
 * - Multi-stage decision making with confidence scoring
 * - Intent classification with hierarchical matching
 * - Context-aware skill selection
 * - Adaptive learning from execution history
 */

import { Skill } from './agent';
import { Decision, DecisionContext, DecisionEngineConfig, EmbeddingProvider, SimpleEmbeddingProvider } from './decision-engine';

export interface AdvancedDecision extends Decision {
  intent: string;
  intentConfidence: number;
  subDecisions?: AdvancedDecision[];
  estimatedTokens: number;
  estimatedTime: number;
  prerequisites?: string[];
  postProcessing?: string[];
}

export interface IntentPattern {
  name: string;
  patterns: RegExp[];
  keywords: string[];
  weight: number;
  relatedSkills: string[];
}

export interface ExecutionContext {
  previousDecisions: AdvancedDecision[];
  userPreferences: Record<string, unknown>;
  sessionContext: Record<string, unknown>;
  constraints: {
    maxTokens?: number;
    maxTime?: number;
    allowedSkills?: string[];
    blockedSkills?: string[];
  };
}

export class AdvancedDecisionEngine {
  private skillEmbeddings = new Map<string, number[]>();
  private intentPatterns: IntentPattern[] = [];
  private embeddingProvider: EmbeddingProvider;
  private decisionCache = new Map<string, AdvancedDecision>();
  private executionHistory: Array<{
    input: string;
    decision: AdvancedDecision;
    success: boolean;
    executionTime: number;
  }> = [];
  private config: Required<DecisionEngineConfig> & {
    enableIntentClassification: boolean;
    enableContextualMemory: boolean;
    learningRate: number;
  };

  constructor(
    config: DecisionEngineConfig & {
      enableIntentClassification?: boolean;
      enableContextualMemory?: boolean;
      learningRate?: number;
    } = {},
    embeddingProvider?: EmbeddingProvider
  ) {
    this.config = {
      threshold: config.threshold ?? 0.6,
      maxSkills: config.maxSkills ?? 3,
      enableEmbeddings: config.enableEmbeddings ?? true,
      enableCaching: config.enableCaching ?? true,
      similarityThreshold: config.similarityThreshold ?? 0.5,
      enableIntentClassification: config.enableIntentClassification ?? true,
      enableContextualMemory: config.enableContextualMemory ?? true,
      learningRate: config.learningRate ?? 0.1,
    };
    this.embeddingProvider = embeddingProvider ?? new SimpleEmbeddingProvider();
    this.initializeIntentPatterns();
  }

  /**
   * Initialize common intent patterns
   */
  private initializeIntentPatterns(): void {
    this.intentPatterns = [
      {
        name: 'calculation',
        patterns: [/calculate|compute|sum|add|subtract|multiply|divide/i],
        keywords: ['math', 'calculate', 'compute', 'number', 'sum', 'total'],
        weight: 1.0,
        relatedSkills: ['math', 'calculator', 'arithmetic'],
      },
      {
        name: 'data_processing',
        patterns: [/process|transform|convert|parse|extract/i],
        keywords: ['data', 'process', 'transform', 'convert', 'parse', 'extract'],
        weight: 1.0,
        relatedSkills: ['data-processor', 'transformer', 'parser'],
      },
      {
        name: 'document_analysis',
        patterns: [/analyze|read|extract|summarize.*document|pdf/i],
        keywords: ['document', 'pdf', 'analyze', 'read', 'extract', 'text'],
        weight: 1.0,
        relatedSkills: ['pdf-processor', 'document-reader', 'text-extractor'],
      },
      {
        name: 'search_query',
        patterns: [/search|find|lookup|query/i],
        keywords: ['search', 'find', 'lookup', 'query', 'retrieve'],
        weight: 0.9,
        relatedSkills: ['search', 'retrieval', 'lookup'],
      },
      {
        name: 'generation',
        patterns: [/generate|create|write|compose|draft/i],
        keywords: ['generate', 'create', 'write', 'compose', 'draft', 'produce'],
        weight: 0.9,
        relatedSkills: ['generator', 'writer', 'creator'],
      },
      {
        name: 'comparison',
        patterns: [/compare|difference|versus|vs|better|best/i],
        keywords: ['compare', 'difference', 'versus', 'contrast', 'evaluate'],
        weight: 0.8,
        relatedSkills: ['comparator', 'evaluator'],
      },
      {
        name: 'information_retrieval',
        patterns: [/what is|how to|explain|tell me about|describe/i],
        keywords: ['information', 'explain', 'describe', 'what', 'how', 'why'],
        weight: 0.7,
        relatedSkills: ['qa', 'information-retrieval', 'explainer'],
      },
    ];
  }

  /**
   * Make advanced decision with full context analysis
   */
  async decide(
    context: DecisionContext,
    executionContext?: ExecutionContext
  ): Promise<AdvancedDecision> {
    const cacheKey = this.generateCacheKey(context, executionContext);

    // Check cache
    if (this.config.enableCaching) {
      const cached = this.decisionCache.get(cacheKey);
      if (cached) {
        return this.enrichDecisionWithContext(cached, executionContext);
      }
    }

    // Stage 1: Intent Classification
    const intentResult = this.config.enableIntentClassification
      ? this.classifyIntent(context.input)
      : { intent: 'general', confidence: 0.5 };

    // Stage 2: Find relevant skills with intent boost
    const relevantSkills = await this.findRelevantSkills(context, intentResult);

    // Stage 3: Find relevant tools
    const relevantTools = this.findRelevantTools(context, intentResult);

    // Stage 4: Build decision tree
    const decision = await this.buildDecision(
      context,
      intentResult,
      relevantSkills,
      relevantTools,
      executionContext
    );

    // Cache decision
    if (this.config.enableCaching) {
      this.decisionCache.set(cacheKey, decision);
      this.limitCacheSize();
    }

    return decision;
  }

  /**
   * Classify user intent from input
   */
  private classifyIntent(input: string): { intent: string; confidence: number } {
    const scores: Array<{ intent: string; score: number }> = [];

    for (const pattern of this.intentPatterns) {
      let score = 0;

      // Check regex patterns
      for (const regex of pattern.patterns) {
        if (regex.test(input)) {
          score += pattern.weight * 0.6;
        }
      }

      // Check keyword matches
      const inputLower = input.toLowerCase();
      const keywordMatches = pattern.keywords.filter(kw => inputLower.includes(kw));
      score += (keywordMatches.length / pattern.keywords.length) * pattern.weight * 0.4;

      if (score > 0) {
        scores.push({ intent: pattern.name, score });
      }
    }

    // Sort by score
    scores.sort((a, b) => b.score - a.score);

    if (scores.length === 0) {
      return { intent: 'general', confidence: 0.3 };
    }

    // Normalize confidence
    const topScore = scores[0].score;
    const normalizedConfidence = Math.min(topScore / 0.8, 1.0);

    return {
      intent: scores[0].intent,
      confidence: normalizedConfidence,
    };
  }

  /**
   * Find relevant skills with intent boosting
   */
  private async findRelevantSkills(
    decisionContext: DecisionContext,
    intentResult: { intent: string; confidence: number }
  ): Promise<Array<{ name: string; confidence: number; reasons: string[] }>> {
    const results: Array<{ name: string; confidence: number; reasons: string[] }> = [];

    // Get intent pattern for boosting
    const intentPattern = this.intentPatterns.find(p => p.name === intentResult.intent);

    if (this.config.enableEmbeddings && this.skillEmbeddings.size > 0) {
      const inputEmbedding = await this.embeddingProvider.embed(decisionContext.input);

      for (const [skillName, skillEmbedding] of this.skillEmbeddings) {
        const similarity = this.embeddingProvider.similarity(inputEmbedding, skillEmbedding);
        let confidence = similarity;
        const reasons: string[] = [];

        // Boost confidence for intent-related skills
        if (intentPattern?.relatedSkills.includes(skillName)) {
          confidence = Math.min(confidence * 1.3, 1.0);
          reasons.push(`Matches ${intentResult.intent} intent`);
        }

        if (confidence >= this.config.similarityThreshold) {
          results.push({ name: skillName, confidence, reasons });
        }
      }
    } else {
      // Fallback to keyword matching with intent boost
      const inputKeywords = this.extractKeywordsFromText(decisionContext.input);

      for (const skillName of decisionContext.availableSkills) {
        const skillKeywords = skillName.toLowerCase().split(/[_-]/);
        const matches = inputKeywords.filter(kw =>
          skillKeywords.some(sk => sk.includes(kw) || kw.includes(sk))
        );

        if (matches.length > 0) {
          let confidence = matches.length / Math.max(inputKeywords.length, skillKeywords.length);
          const reasons: string[] = [`Keyword match: ${matches.join(', ')}`];

          // Boost for intent-related skills
          if (intentPattern?.relatedSkills.includes(skillName)) {
            confidence = Math.min(confidence * 1.3, 1.0);
            reasons.push(`Matches ${intentResult.intent} intent`);
          }

          if (confidence >= this.config.threshold) {
            results.push({ name: skillName, confidence, reasons });
          }
        }
      }
    }

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);

    return results;
  }

  /**
   * Find relevant tools with intent consideration
   */
  private findRelevantTools(
    context: DecisionContext,
    intentResult: { intent: string; confidence: number }
  ): Array<{ name: string; confidence: number; reasons: string[] }> {
    const inputKeywords = this.extractKeywordsFromText(context.input);
    const results: Array<{ name: string; confidence: number; reasons: string[] }> = [];

    for (const toolName of context.availableTools) {
      const toolKeywords = toolName.toLowerCase().split(/[_-]/);
      const matches = inputKeywords.filter(kw =>
        toolKeywords.some(tk => tk.includes(kw) || kw.includes(tk))
      );

      if (matches.length > 0) {
        let confidence = matches.length / Math.max(inputKeywords.length, toolKeywords.length);
        const reasons: string[] = [`Keyword match: ${matches.join(', ')}`];

        // Boost for tools matching intent
        if (intentResult.intent !== 'general' && matches.some(m => m.includes(intentResult.intent))) {
          confidence = Math.min(confidence * 1.2, 1.0);
          reasons.push(`Matches ${intentResult.intent} intent`);
        }

        if (confidence >= this.config.threshold) {
          results.push({ name: toolName, confidence, reasons });
        }
      }
    }

    results.sort((a, b) => b.confidence - a.confidence);
    return results;
  }

  /**
   * Build comprehensive decision
   */
  private async buildDecision(
    _decisionContext: DecisionContext,
    intentResult: { intent: string; confidence: number },
    relevantSkills: Array<{ name: string; confidence: number; reasons: string[] }>,
    relevantTools: Array<{ name: string; confidence: number; reasons: string[] }>,
    executionContext?: ExecutionContext
  ): Promise<AdvancedDecision> {
    // Determine decision type and components
    let type: Decision['type'] = 'llm';
    let skills: string[] | undefined;
    let tools: string[] | undefined;
    let reasoning: string;
    let confidence: number;
    let subDecisions: AdvancedDecision[] | undefined;

    const topSkills = relevantSkills.slice(0, this.config.maxSkills);
    const topTools = relevantTools.slice(0, 2);

    if (topSkills.length === 0 && topTools.length === 0) {
      type = 'llm';
      confidence = 1.0;
      reasoning = `No relevant skills/tools found for intent "${intentResult.intent}". Using LLM directly.`;
    } else if (topSkills.length === 1 && topTools.length === 0) {
      type = 'skill';
      skills = [topSkills[0].name];
      confidence = topSkills[0].confidence * intentResult.confidence;
      reasoning = `Single skill match: ${topSkills[0].name}. ${topSkills[0].reasons.join('; ')}`;
    } else if (topTools.length === 1 && topSkills.length === 0) {
      type = 'tool';
      tools = [topTools[0].name];
      confidence = topTools[0].confidence * intentResult.confidence;
      reasoning = `Single tool match: ${topTools[0].name}. ${topTools[0].reasons.join('; ')}`;
    } else {
      type = 'multi';
      skills = topSkills.map(s => s.name);
      tools = topTools.map(t => t.name);
      confidence = Math.max(
        topSkills[0]?.confidence ?? 0,
        topTools[0]?.confidence ?? 0
      ) * intentResult.confidence;
      reasoning = `Multiple matches for intent "${intentResult.intent}": Skills [${skills.join(', ')}], Tools [${tools.join(', ')}]`;

      // Build sub-decisions for complex scenarios
      subDecisions = this.buildSubDecisions(topSkills, topTools);
    }

    // Calculate estimates
    const estimatedTokens = this.estimateTokenUsage(type, skills, tools);
    const estimatedTime = this.estimateExecutionTime(type, skills, tools);

    // Apply constraints from execution context
    if (executionContext?.constraints) {
      const { maxTokens, maxTime, allowedSkills, blockedSkills } = executionContext.constraints;

      if (maxTokens && estimatedTokens > maxTokens) {
        reasoning += ` (Token limit exceeded: ${estimatedTokens} > ${maxTokens})`;
        confidence *= 0.8;
      }

      if (maxTime && estimatedTime > maxTime) {
        reasoning += ` (Time limit exceeded: ${estimatedTime}ms > ${maxTime}ms)`;
        confidence *= 0.8;
      }

      // Filter blocked skills
      if (blockedSkills && skills) {
        skills = skills.filter(s => !blockedSkills.includes(s));
      }

      // Check allowed skills
      if (allowedSkills && skills) {
        skills = skills.filter(s => allowedSkills.includes(s));
      }
    }

    return {
      type,
      skills,
      tools,
      confidence,
      reasoning,
      fallback: confidence < 0.5 ? 'llm' : undefined,
      intent: intentResult.intent,
      intentConfidence: intentResult.confidence,
      subDecisions,
      estimatedTokens,
      estimatedTime,
    };
  }

  /**
   * Build sub-decisions for complex scenarios
   */
  private buildSubDecisions(
    skills: Array<{ name: string; confidence: number }>,
    tools: Array<{ name: string; confidence: number }>
  ): AdvancedDecision[] {
    const subDecisions: AdvancedDecision[] = [];

    for (const skill of skills) {
      subDecisions.push({
        type: 'skill',
        skills: [skill.name],
        confidence: skill.confidence,
        reasoning: `Execute skill: ${skill.name}`,
        intent: 'sub-task',
        intentConfidence: skill.confidence,
        estimatedTokens: 500,
        estimatedTime: 1000,
      });
    }

    for (const tool of tools) {
      subDecisions.push({
        type: 'tool',
        tools: [tool.name],
        confidence: tool.confidence,
        reasoning: `Execute tool: ${tool.name}`,
        intent: 'sub-task',
        intentConfidence: tool.confidence,
        estimatedTokens: 200,
        estimatedTime: 500,
      });
    }

    return subDecisions;
  }

  /**
   * Enrich decision with execution context
   */
  private enrichDecisionWithContext(
    decision: AdvancedDecision,
    executionContext?: ExecutionContext
  ): AdvancedDecision {
    if (!executionContext || !this.config.enableContextualMemory) {
      return decision;
    }

    // Adjust based on previous decisions
    const similarDecisions = executionContext.previousDecisions.filter(
      d => d.intent === decision.intent
    );

    if (similarDecisions.length > 0) {
      const avgSuccess = similarDecisions.filter(d => d.confidence > 0.7).length / similarDecisions.length;
      decision.confidence = decision.confidence * (0.8 + avgSuccess * 0.2);
    }

    return decision;
  }

  /**
   * Estimate token usage
   */
  private estimateTokenUsage(
    type: Decision['type'],
    skills?: string[],
    tools?: string[]
  ): number {
    let tokens = 500; // Base overhead

    if (type === 'skill' || type === 'multi') {
      tokens += (skills?.length ?? 0) * 800;
    }

    if (type === 'tool' || type === 'multi') {
      tokens += (tools?.length ?? 0) * 300;
    }

    if (type === 'llm') {
      tokens += 2000;
    }

    return tokens;
  }

  /**
   * Estimate execution time
   */
  private estimateExecutionTime(
    type: Decision['type'],
    skills?: string[],
    tools?: string[]
  ): number {
    let time = 500; // Base overhead

    if (type === 'skill' || type === 'multi') {
      time += (skills?.length ?? 0) * 2000;
    }

    if (type === 'tool' || type === 'multi') {
      time += (tools?.length ?? 0) * 1000;
    }

    if (type === 'llm') {
      time += 3000;
    }

    return time;
  }

  /**
   * Learn from execution result
   */
  learn(input: string, decision: AdvancedDecision, success: boolean, executionTime: number): void {
    this.executionHistory.push({
      input,
      decision,
      success,
      executionTime,
    });

    // Limit history size
    if (this.executionHistory.length > 1000) {
      this.executionHistory = this.executionHistory.slice(-500);
    }

    // Update intent pattern weights based on success
    if (this.config.enableContextualMemory) {
      const pattern = this.intentPatterns.find(p => p.name === decision.intent);
      if (pattern) {
        const adjustment = success ? this.config.learningRate : -this.config.learningRate;
        pattern.weight = Math.max(0.1, Math.min(2.0, pattern.weight + adjustment));
      }
    }
  }

  /**
   * Index skill for retrieval
   */
  async indexSkill(skill: Skill): Promise<void> {
    if (!this.config.enableEmbeddings) return;

    const text = `${skill.name} ${skill.description} ${this.extractKeywords(skill)}`;
    const embedding = await this.embeddingProvider.embed(text);
    this.skillEmbeddings.set(skill.name, embedding);
  }

  /**
   * Extract keywords from skill
   */
  private extractKeywords(skill: Skill): string {
    const keywords: string[] = [
      skill.name,
      skill.description,
      ...(skill.metadata?.tags ?? []),
      skill.metadata?.category ?? '',
    ];

    for (const [key, prop] of Object.entries(skill.parameters.properties)) {
      keywords.push(key, prop.description);
    }

    return keywords.join(' ');
  }

  /**
   * Extract keywords from text
   */
  private extractKeywordsFromText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(
    context: DecisionContext,
    executionContext?: ExecutionContext
  ): string {
    const base = `${context.input}:${context.availableSkills.join(',')}:${context.availableTools.join(',')}`;
    if (executionContext?.constraints.allowedSkills) {
      return `${base}:${executionContext.constraints.allowedSkills.join(',')}`;
    }
    return base;
  }

  /**
   * Limit cache size
   */
  private limitCacheSize(): void {
    if (this.decisionCache.size > 1000) {
      const firstKey = this.decisionCache.keys().next().value;
      if (firstKey !== undefined) {
        this.decisionCache.delete(firstKey);
      }
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    cacheSize: number;
    historySize: number;
    intentPatterns: Array<{ name: string; weight: number }>;
    averageSuccessRate: number;
  } {
    const successCount = this.executionHistory.filter(h => h.success).length;
    const averageSuccessRate = this.executionHistory.length > 0
      ? successCount / this.executionHistory.length
      : 0;

    return {
      cacheSize: this.decisionCache.size,
      historySize: this.executionHistory.length,
      intentPatterns: this.intentPatterns.map(p => ({ name: p.name, weight: p.weight })),
      averageSuccessRate,
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.decisionCache.clear();
    this.executionHistory = [];
    this.skillEmbeddings.clear();
  }
}

export default AdvancedDecisionEngine;
