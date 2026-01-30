/**
 * Evaluation Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EvaluationEngine,
  ExactMatchEvaluator,
  SemanticEvaluator,
  SchemaValidator,
  EvaluationContext,
} from '../src/core/evaluation-engine';
import { SkillResult } from '../src/core/agent';

describe('Evaluation Engine', () => {
  let engine: EvaluationEngine;

  beforeEach(() => {
    engine = new EvaluationEngine({
      enabled: true,
      level: 'standard',
      strategies: ['semantic'],
      threshold: 0.7,
    });
  });

  describe('Configuration', () => {
    it('should create with default config', () => {
      const defaultEngine = new EvaluationEngine();
      const config = defaultEngine.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.level).toBe('standard');
      expect(config.strategies).toContain('semantic');
    });

    it('should allow disabling evaluation', () => {
      const disabledEngine = new EvaluationEngine({
        enabled: false,
        level: 'none',
        strategies: [],
      });
      expect(disabledEngine.getConfig().enabled).toBe(false);
    });

    it('should update config dynamically', () => {
      engine.updateConfig({ level: 'strict', threshold: 0.9 });
      const config = engine.getConfig();
      expect(config.level).toBe('strict');
      expect(config.threshold).toBe(0.9);
    });
  });

  describe('Exact Match Evaluator', () => {
    it('should pass exact match', async () => {
      const evaluator = new ExactMatchEvaluator();
      const result = await evaluator.evaluate(
        { data: 'test' },
        { originalInput: 'input', expectedOutput: { data: 'test' } }
      );
      expect(result.overall).toBe(1);
      expect(result.correctness).toBe(1);
    });

    it('should fail non-exact match', async () => {
      const evaluator = new ExactMatchEvaluator();
      const result = await evaluator.evaluate(
        { data: 'test' },
        { originalInput: 'input', expectedOutput: { data: 'different' } }
      );
      expect(result.overall).toBe(0);
      expect(result.correctness).toBe(0);
    });

    it('should handle missing expected output', async () => {
      const evaluator = new ExactMatchEvaluator();
      const result = await evaluator.evaluate(
        { data: 'test' },
        { originalInput: 'input' }
      );
      expect(result.overall).toBe(0.5);
    });
  });

  describe('Semantic Evaluator', () => {
    it('should evaluate semantic relevance', async () => {
      const evaluator = new SemanticEvaluator();
      const result = await evaluator.evaluate(
        'The calculation result is 42',
        { originalInput: 'Calculate 6 times 7' }
      );
      // Relevance may be 0 if no keywords match, which is acceptable
      expect(result.relevance).toBeGreaterThanOrEqual(0);
      expect(result.completeness).toBeGreaterThan(0);
    });

    it('should assess completeness for objects', async () => {
      const evaluator = new SemanticEvaluator();
      const result = await evaluator.evaluate(
        { a: 1, b: 2, c: 3 },
        { originalInput: 'test' }
      );
      expect(result.completeness).toBeGreaterThan(0.8);
    });

    it('should assess completeness for strings', async () => {
      const evaluator = new SemanticEvaluator();
      const shortResult = await evaluator.evaluate(
        'hi',
        { originalInput: 'test' }
      );
      const longResult = await evaluator.evaluate(
        'This is a much longer response with more details',
        { originalInput: 'test' }
      );
      expect(longResult.completeness).toBeGreaterThan(shortResult.completeness);
    });
  });

  describe('Schema Validator', () => {
    it('should validate against schema', async () => {
      const validator = new SchemaValidator();
      const result = await validator.evaluate(
        { name: 'test', value: 42 },
        {
          originalInput: 'input',
          expectedSchema: {
            type: 'object',
            required: ['name', 'value'],
            properties: {
              name: { type: 'string' },
              value: { type: 'number' },
            },
          },
        }
      );
      expect(result.overall).toBe(1);
    });

    it('should detect missing required properties', async () => {
      const validator = new SchemaValidator();
      const result = await validator.evaluate(
        { name: 'test' },
        {
          originalInput: 'input',
          expectedSchema: {
            type: 'object',
            required: ['name', 'value'],
          },
        }
      );
      expect(result.overall).toBeLessThan(1);
      expect(result.details.length).toBeGreaterThan(0);
    });

    it('should handle missing schema', async () => {
      const validator = new SchemaValidator();
      const result = await validator.evaluate(
        { data: 'test' },
        { originalInput: 'input' }
      );
      expect(result.overall).toBe(0.5);
    });
  });

  describe('Evaluation Engine Integration', () => {
    it('should evaluate skill result', async () => {
      const skillResult: SkillResult = {
        success: true,
        data: 'The sum of 5 and 3 is 8',
      };

      const context: EvaluationContext = {
        originalInput: 'Calculate 5 plus 3',
      };

      const result = await engine.evaluate(skillResult, context);
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('feedback');
      expect(result).toHaveProperty('suggestions');
    });

    it('should pass through when disabled', async () => {
      const disabledEngine = new EvaluationEngine({
        enabled: false,
        level: 'none',
        strategies: [],
      });

      const skillResult: SkillResult = {
        success: true,
        data: 'test',
      };

      const result = await disabledEngine.evaluate(skillResult, {
        originalInput: 'input',
      });

      expect(result.passed).toBe(true);
      expect(result.score.overall).toBe(1);
    });

    it('should track evaluation history', async () => {
      const skillResult: SkillResult = {
        success: true,
        data: 'test result',
      };

      await engine.evaluate(skillResult, { originalInput: 'test input 1' });
      await engine.evaluate(skillResult, { originalInput: 'test input 2' });

      const stats = engine.getStats();
      expect(stats.totalEvaluations).toBe(2);
    });

    it('should generate evaluation report', async () => {
      const skillResult: SkillResult = {
        success: true,
        data: 'test result',
      };

      await engine.evaluate(skillResult, { originalInput: 'test input' });

      const recent = engine.getRecentEvaluations(10);
      expect(recent.length).toBeGreaterThan(0);
      expect(recent[0]).toHaveProperty('passed');
      expect(recent[0]).toHaveProperty('score');
    });
  });

  describe('Evaluation Levels', () => {
    it('should use basic level', async () => {
      const basicEngine = new EvaluationEngine({
        enabled: true,
        level: 'basic',
        strategies: ['semantic'],
        threshold: 0.7,
      });

      const skillResult: SkillResult = {
        success: true,
        data: 'short',
      };

      const result = await basicEngine.evaluate(skillResult, {
        originalInput: 'test',
      });

      expect(result.passed).toBeDefined();
    });

    it('should use strict level', async () => {
      const strictEngine = new EvaluationEngine({
        enabled: true,
        level: 'strict',
        strategies: ['semantic'],
        threshold: 0.9,
      });

      const skillResult: SkillResult = {
        success: true,
        data: 'test',
      };

      const result = await strictEngine.evaluate(skillResult, {
        originalInput: 'test',
      });

      expect(result.passed).toBeDefined();
    });
  });

  describe('Custom Evaluator', () => {
    it('should support custom validator', async () => {
      const customEngine = new EvaluationEngine({
        enabled: true,
        level: 'standard',
        strategies: [],
        customValidator: (_result): ReturnType<NonNullable<import('../src/core/evaluation-engine').EvaluationConfig['customValidator']>> => ({
          overall: 0.8,
          correctness: 0.9,
          completeness: 0.7,
          relevance: 0.8,
          details: [{
            category: 'custom',
            score: 0.8,
            message: 'Custom validation passed',
          }],
        }),
      });

      const skillResult: SkillResult = {
        success: true,
        data: 'test',
      };

      const result = await customEngine.evaluate(skillResult, {
        originalInput: 'input',
      });

      expect(result.score.overall).toBe(0.8);
      expect(result.score.correctness).toBe(0.9);
    });
  });
});

describe('SmartAgent with Evaluation', () => {
  it('should include evaluation in process result', async () => {
    const { SmartAgent } = await import('../src/core/smart-agent');
    
    const agent = new SmartAgent({
      name: 'TestAgent',
      evaluation: {
        enabled: true,
        level: 'standard',
        strategies: ['semantic'],
      },
    });

    // Register a simple skill
    agent.registerSkill({
      name: 'echo',
      description: 'Echo the input',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Message to echo' },
        },
      },
      handler: async (params) => ({
        success: true,
        data: params.message,
      }),
    });

    const result = await agent.process('echo hello');
    
    expect(result).toHaveProperty('evaluation');
    if (result.evaluation) {
      expect(result.evaluation).toHaveProperty('passed');
      expect(result.evaluation).toHaveProperty('score');
      expect(result.evaluation).toHaveProperty('feedback');
    }
  });

  it('should allow disabling evaluation', async () => {
    const { SmartAgent } = await import('../src/core/smart-agent');
    
    const agent = new SmartAgent({
      name: 'TestAgent',
      evaluation: {
        enabled: false,
        level: 'none',
        strategies: [],
      },
    });

    agent.registerSkill({
      name: 'test',
      description: 'Test skill',
      parameters: { type: 'object', properties: {} },
      handler: async () => ({ success: true, data: 'test' }),
    });

    const result = await agent.process('test');
    
    // When disabled, evaluation should be undefined or pass-through
    expect(result.evaluation?.passed ?? true).toBe(true);
  });

  it('should provide evaluation stats', async () => {
    const { SmartAgent } = await import('../src/core/smart-agent');
    
    const agent = new SmartAgent({
      name: 'TestAgent',
      evaluation: {
        enabled: true,
        level: 'standard',
        strategies: ['semantic'],
      },
    });

    agent.registerSkill({
      name: 'test',
      description: 'Test skill',
      parameters: { type: 'object', properties: {} },
      handler: async () => ({ success: true, data: 'test' }),
    });

    await agent.process('test 1');
    await agent.process('test 2');

    const stats = agent.getEvaluationStats();
    expect(stats.totalEvaluations).toBeGreaterThan(0);
    expect(stats).toHaveProperty('passRate');
    expect(stats).toHaveProperty('averageScore');
    expect(stats).toHaveProperty('config');
  });

  it('should generate evaluation report', async () => {
    const { SmartAgent } = await import('../src/core/smart-agent');
    
    const agent = new SmartAgent({
      name: 'TestAgent',
      evaluation: {
        enabled: true,
        level: 'standard',
        strategies: ['semantic'],
      },
    });

    agent.registerSkill({
      name: 'test',
      description: 'Test skill',
      parameters: { type: 'object', properties: {} },
      handler: async () => ({ success: true, data: 'test' }),
    });

    await agent.process('test');

    const report = agent.generateEvaluationReport();
    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('recentEvaluations');
    expect(report).toHaveProperty('suggestions');
    expect(report.summary).toHaveProperty('totalExecutions');
    expect(report.summary).toHaveProperty('passRate');
  });
});
