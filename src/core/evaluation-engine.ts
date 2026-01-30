/**
 * Agent Evaluation Engine
 *
 * Features:
 * - Multi-dimensional result evaluation
 * - Correctness verification with multiple strategies
 * - Configurable evaluation levels
 * - Feedback loop for continuous improvement
 * - Performance scoring and benchmarking
 */

import { Skill, SkillResult } from './agent';
import { ExecutionResult, StepResult } from './types';

export type EvaluationLevel = 'none' | 'basic' | 'standard' | 'strict';
export type EvaluationStrategy = 'exact' | 'semantic' | 'schema' | 'custom';

export interface EvaluationConfig {
  enabled: boolean;
  level: EvaluationLevel;
  strategies: EvaluationStrategy[];
  threshold?: number;
  autoRetry?: boolean;
  maxRetries?: number;
  customValidator?: (result: unknown, expected?: unknown) => EvaluationScore;
}

export interface EvaluationScore {
  overall: number; // 0-1
  correctness: number;
  completeness: number;
  relevance: number;
  details: EvaluationDetail[];
}

export interface EvaluationDetail {
  category: string;
  score: number;
  message: string;
  suggestion?: string;
}

export interface EvaluationResult {
  passed: boolean;
  score: EvaluationScore;
  feedback: string;
  suggestions: string[];
  metadata: {
    executionTime: number;
    tokensUsed: number;
    strategyUsed: EvaluationStrategy;
  };
}

export interface EvaluationContext {
  originalInput: string;
  expectedOutput?: unknown;
  expectedSchema?: unknown;
  skill?: Skill;
  executionHistory?: StepResult[];
}

export interface Evaluator {
  name: string;
  evaluate(result: unknown, context: EvaluationContext): Promise<EvaluationScore>;
}

// ============================================
// Built-in Evaluators
// ============================================

export class ExactMatchEvaluator implements Evaluator {
  name = 'exact';

  async evaluate(result: unknown, context: EvaluationContext): Promise<EvaluationScore> {
    if (context.expectedOutput === undefined) {
      return {
        overall: 0.5,
        correctness: 0.5,
        completeness: 0.5,
        relevance: 0.5,
        details: [{
          category: 'exact_match',
          score: 0.5,
          message: 'No expected output provided for comparison',
        }],
      };
    }

    const isMatch = JSON.stringify(result) === JSON.stringify(context.expectedOutput);
    const score = isMatch ? 1.0 : 0.0;

    return {
      overall: score,
      correctness: score,
      completeness: score,
      relevance: score,
      details: [{
        category: 'exact_match',
        score,
        message: isMatch ? 'Result matches expected output exactly' : 'Result does not match expected output',
        suggestion: isMatch ? undefined : 'Check output format and values',
      }],
    };
  }
}

export class SemanticEvaluator implements Evaluator {
  name = 'semantic';

  async evaluate(result: unknown, context: EvaluationContext): Promise<EvaluationScore> {
    const resultStr = JSON.stringify(result).toLowerCase();
    const inputStr = context.originalInput.toLowerCase();

    // Check if result addresses the input query
    const inputKeywords = this.extractKeywords(inputStr);
    const resultKeywords = this.extractKeywords(resultStr);

    const matchingKeywords = inputKeywords.filter(kw => 
      resultKeywords.some(rkw => rkw.includes(kw) || kw.includes(rkw))
    );

    const relevanceScore = inputKeywords.length > 0 
      ? matchingKeywords.length / inputKeywords.length 
      : 0.5;

    // Check result completeness
    const completenessScore = this.assessCompleteness(result);

    return {
      overall: (relevanceScore + completenessScore) / 2,
      correctness: relevanceScore,
      completeness: completenessScore,
      relevance: relevanceScore,
      details: [
        {
          category: 'semantic_relevance',
          score: relevanceScore,
          message: `Matched ${matchingKeywords.length}/${inputKeywords.length} keywords`,
        },
        {
          category: 'completeness',
          score: completenessScore,
          message: completenessScore > 0.8 ? 'Result appears complete' : 'Result may be incomplete',
        },
      ],
    };
  }

  private extractKeywords(text: string): string[] {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)
      .filter(w => !this.isStopWord(w));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'shall', 'can',
      'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for',
      'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
      'during', 'before', 'after', 'above', 'below', 'between',
      'and', 'but', 'or', 'yet', 'so', 'if', 'because', 'although',
      'though', 'while', 'where', 'when', 'that', 'which', 'who',
      'whom', 'whose', 'what', 'this', 'these', 'those', 'i',
      'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
      'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
    ]);
    return stopWords.has(word.toLowerCase());
  }

  private assessCompleteness(result: unknown): number {
    if (result === null || result === undefined) return 0;
    if (typeof result === 'string') {
      return result.length > 10 ? 0.8 : 0.5;
    }
    if (typeof result === 'object' && result !== null) {
      const keys = Object.keys(result);
      if (keys.length === 0) return 0.3;
      if (keys.length >= 3) return 0.9;
      return 0.6;
    }
    return 0.7;
  }
}

export class SchemaValidator implements Evaluator {
  name = 'schema';

  async evaluate(result: unknown, context: EvaluationContext): Promise<EvaluationScore> {
    if (!context.expectedSchema) {
      return {
        overall: 0.5,
        correctness: 0.5,
        completeness: 0.5,
        relevance: 0.5,
        details: [{
          category: 'schema_validation',
          score: 0.5,
          message: 'No schema provided for validation',
        }],
      };
    }

    const validation = this.validateAgainstSchema(result, context.expectedSchema);
    
    return {
      overall: validation.score,
      correctness: validation.score,
      completeness: validation.score,
      relevance: validation.score,
      details: validation.errors.map(err => ({
        category: 'schema_validation',
        score: 0,
        message: err,
      })),
    };
  }

  private validateAgainstSchema(result: unknown, schema: unknown): { score: number; errors: string[] } {
    const errors: string[] = [];
    
    if (typeof schema !== 'object' || schema === null) {
      return { score: 1, errors: [] };
    }

    const schemaObj = schema as Record<string, unknown>;
    
    // Check type
    if (schemaObj.type && typeof schemaObj.type === 'string' && typeof result !== schemaObj.type) {
      errors.push(`Expected type ${schemaObj.type}, got ${typeof result}`);
    }

    // Check required properties
    if (schemaObj.required && Array.isArray(schemaObj.required)) {
      if (typeof result === 'object' && result !== null) {
        const resultObj = result as Record<string, unknown>;
        for (const prop of schemaObj.required) {
          if (!(prop in resultObj)) {
            errors.push(`Missing required property: ${prop}`);
          }
        }
      }
    }

    // Check properties
    if (schemaObj.properties && typeof result === 'object' && result !== null) {
      const resultObj = result as Record<string, unknown>;
      const properties = schemaObj.properties as Record<string, unknown>;
      
      for (const [key, propSchema] of Object.entries(properties)) {
        if (key in resultObj) {
          const propValidation = this.validateAgainstSchema(resultObj[key], propSchema);
          errors.push(...propValidation.errors);
        }
      }
    }

    const score = errors.length === 0 ? 1 : Math.max(0, 1 - errors.length * 0.2);
    return { score, errors };
  }
}

// ============================================
// Evaluation Engine
// ============================================

export class EvaluationEngine {
  private config: EvaluationConfig;
  private evaluators: Map<EvaluationStrategy, Evaluator> = new Map();
  private evaluationHistory: Array<{
    timestamp: Date;
    result: EvaluationResult;
    context: EvaluationContext;
  }> = [];

  constructor(config: Partial<EvaluationConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      level: config.level ?? 'standard',
      strategies: config.strategies ?? ['semantic'],
      threshold: config.threshold ?? 0.7,
      autoRetry: config.autoRetry ?? false,
      maxRetries: config.maxRetries ?? 3,
      customValidator: config.customValidator,
    };

    this.registerBuiltInEvaluators();
  }

  private registerBuiltInEvaluators(): void {
    this.evaluators.set('exact', new ExactMatchEvaluator());
    this.evaluators.set('semantic', new SemanticEvaluator());
    this.evaluators.set('schema', new SchemaValidator());
  }

  /**
   * Evaluate execution result
   */
  async evaluate(
    result: SkillResult,
    context: EvaluationContext
  ): Promise<EvaluationResult> {
    if (!this.config.enabled || this.config.level === 'none') {
      return this.createPassThroughResult(result);
    }

    const startTime = Date.now();
    let tokensUsed = 0;

    // Run all configured evaluators
    const scores: EvaluationScore[] = [];
    
    for (const strategy of this.config.strategies) {
      const evaluator = this.evaluators.get(strategy);
      if (evaluator) {
        const score = await evaluator.evaluate(result.data, context);
        scores.push(score);
        tokensUsed += 50; // Approximate token cost
      }
    }

    // Run custom validator if provided
    if (this.config.customValidator) {
      const customScore = this.config.customValidator(result.data, context.expectedOutput);
      scores.push(customScore);
    }

    // Aggregate scores
    const finalScore = this.aggregateScores(scores);
    
    // Determine pass/fail based on level
    const passed = this.determinePassFail(finalScore);

    const evaluationResult: EvaluationResult = {
      passed,
      score: finalScore,
      feedback: this.generateFeedback(finalScore, passed),
      suggestions: this.generateSuggestions(finalScore),
      metadata: {
        executionTime: Date.now() - startTime,
        tokensUsed,
        strategyUsed: this.config.strategies[0],
      },
    };

    // Store in history
    this.evaluationHistory.push({
      timestamp: new Date(),
      result: evaluationResult,
      context,
    });

    // Limit history size
    if (this.evaluationHistory.length > 1000) {
      this.evaluationHistory = this.evaluationHistory.slice(-500);
    }

    return evaluationResult;
  }

  /**
   * Evaluate full execution result
   */
  async evaluateExecution(
    executionResult: ExecutionResult,
    context: EvaluationContext
  ): Promise<EvaluationResult> {
    if (!this.config.enabled || this.config.level === 'none') {
      return this.createPassThroughResult(executionResult.finalOutput);
    }

    // Evaluate each step
    const stepEvaluations: EvaluationScore[] = [];
    
    for (const stepResult of executionResult.stepResults) {
      if (stepResult.output !== undefined) {
        const stepContext: EvaluationContext = {
          ...context,
          executionHistory: executionResult.stepResults.slice(0, -1),
        };
        
        const score = await this.evaluateStep(stepResult, stepContext);
        stepEvaluations.push(score);
      }
    }

    // Evaluate final output
    const finalScore = await this.evaluateFinalOutput(
      executionResult.finalOutput,
      context
    );

    // Aggregate all scores
    const allScores = [...stepEvaluations, finalScore];
    const aggregatedScore = this.aggregateScores(allScores);
    const passed = this.determinePassFail(aggregatedScore);

    return {
      passed,
      score: aggregatedScore,
      feedback: this.generateFeedback(aggregatedScore, passed),
      suggestions: this.generateSuggestions(aggregatedScore),
      metadata: {
        executionTime: executionResult.metrics.totalTime,
        tokensUsed: executionResult.metrics.totalTokens,
        strategyUsed: this.config.strategies[0],
      },
    };
  }

  private async evaluateStep(
    stepResult: StepResult,
    context: EvaluationContext
  ): Promise<EvaluationScore> {
    const evaluator = this.evaluators.get(this.config.strategies[0]);
    if (!evaluator) {
      return this.createDefaultScore();
    }

    return evaluator.evaluate(stepResult.output, context);
  }

  private async evaluateFinalOutput(
    output: unknown,
    context: EvaluationContext
  ): Promise<EvaluationScore> {
    const evaluator = this.evaluators.get(this.config.strategies[0]);
    if (!evaluator) {
      return this.createDefaultScore();
    }

    return evaluator.evaluate(output, context);
  }

  private aggregateScores(scores: EvaluationScore[]): EvaluationScore {
    if (scores.length === 0) {
      return this.createDefaultScore();
    }

    if (scores.length === 1) {
      return scores[0];
    }

    // Weight by level
    const weights = this.getLevelWeights();
    
    const overall = this.weightedAverage(scores.map(s => s.overall), weights);
    const correctness = this.weightedAverage(scores.map(s => s.correctness), weights);
    const completeness = this.weightedAverage(scores.map(s => s.completeness), weights);
    const relevance = this.weightedAverage(scores.map(s => s.relevance), weights);

    const allDetails = scores.flatMap(s => s.details);

    return {
      overall,
      correctness,
      completeness,
      relevance,
      details: allDetails,
    };
  }

  private getLevelWeights(): number[] {
    switch (this.config.level) {
      case 'basic':
        return [0.6, 0.4];
      case 'strict':
        return [0.5, 0.3, 0.2];
      case 'standard':
      default:
        return [0.5, 0.5];
    }
  }

  private weightedAverage(values: number[], weights: number[]): number {
    const sum = values.reduce((acc, val, i) => acc + val * (weights[i] ?? 0.5), 0);
    const weightSum = weights.slice(0, values.length).reduce((a, b) => a + b, 0);
    return weightSum > 0 ? sum / weightSum : sum;
  }

  private determinePassFail(score: EvaluationScore): boolean {
    const threshold = this.config.threshold ?? 0.7;
    
    switch (this.config.level) {
      case 'basic':
        return score.overall >= threshold * 0.8;
      case 'strict':
        return score.overall >= threshold && 
               score.correctness >= threshold && 
               score.completeness >= threshold;
      case 'standard':
      default:
        return score.overall >= threshold;
    }
  }

  private generateFeedback(score: EvaluationScore, passed: boolean): string {
    if (passed) {
      if (score.overall >= 0.9) {
        return 'Excellent result! High quality output with strong correctness and completeness.';
      } else if (score.overall >= 0.8) {
        return 'Good result. Output meets expectations with minor room for improvement.';
      } else {
        return 'Acceptable result. Output is usable but could be improved.';
      }
    } else {
      if (score.correctness < this.config.threshold!) {
        return 'Result failed correctness check. Please review the output for accuracy.';
      } else if (score.completeness < this.config.threshold!) {
        return 'Result appears incomplete. Consider providing more comprehensive output.';
      } else {
        return 'Result does not meet quality standards. Please review and retry.';
      }
    }
  }

  private generateSuggestions(score: EvaluationScore): string[] {
    const suggestions: string[] = [];

    if (score.correctness < 0.7) {
      suggestions.push('Verify output accuracy against expected results');
    }

    if (score.completeness < 0.7) {
      suggestions.push('Include more details or missing information in the output');
    }

    if (score.relevance < 0.7) {
      suggestions.push('Ensure output directly addresses the input query');
    }

    // Add specific suggestions from details
    for (const detail of score.details) {
      if (detail.suggestion && detail.score < 0.7) {
        suggestions.push(detail.suggestion);
      }
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  private createPassThroughResult(_result: unknown): EvaluationResult {
    return {
      passed: true,
      score: {
        overall: 1,
        correctness: 1,
        completeness: 1,
        relevance: 1,
        details: [{
          category: 'evaluation_disabled',
          score: 1,
          message: 'Evaluation is disabled, passing through',
        }],
      },
      feedback: 'Evaluation disabled. Result passed through without validation.',
      suggestions: [],
      metadata: {
        executionTime: 0,
        tokensUsed: 0,
        strategyUsed: this.config.strategies[0],
      },
    };
  }

  private createDefaultScore(): EvaluationScore {
    return {
      overall: 0.5,
      correctness: 0.5,
      completeness: 0.5,
      relevance: 0.5,
      details: [],
    };
  }

  /**
   * Register custom evaluator
   */
  registerEvaluator(strategy: EvaluationStrategy, evaluator: Evaluator): void {
    this.evaluators.set(strategy, evaluator);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<EvaluationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): EvaluationConfig {
    return { ...this.config };
  }

  /**
   * Get evaluation statistics
   */
  getStats(): {
    totalEvaluations: number;
    passRate: number;
    averageScore: number;
    historySize: number;
  } {
    const total = this.evaluationHistory.length;
    if (total === 0) {
      return {
        totalEvaluations: 0,
        passRate: 0,
        averageScore: 0,
        historySize: 0,
      };
    }

    const passed = this.evaluationHistory.filter(h => h.result.passed).length;
    const avgScore = this.evaluationHistory.reduce((sum, h) => sum + h.result.score.overall, 0) / total;

    return {
      totalEvaluations: total,
      passRate: passed / total,
      averageScore: avgScore,
      historySize: this.evaluationHistory.length,
    };
  }

  /**
   * Clear evaluation history
   */
  clearHistory(): void {
    this.evaluationHistory = [];
  }

  /**
   * Get recent evaluations
   */
  getRecentEvaluations(limit: number = 10): Array<{
    timestamp: Date;
    passed: boolean;
    score: number;
    input: string;
  }> {
    return this.evaluationHistory
      .slice(-limit)
      .map(h => ({
        timestamp: h.timestamp,
        passed: h.result.passed,
        score: h.result.score.overall,
        input: h.context.originalInput.substring(0, 100),
      }));
  }
}

export default EvaluationEngine;
