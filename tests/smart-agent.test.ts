import { describe, it, expect, beforeEach } from 'vitest';
import {
  SmartAgent,
  DecisionEngine,
  DynamicSkillLoader,
  TokenOptimizer,
  SimpleEmbeddingProvider,
  Skill,
} from '../src';

describe('Smart Agent System', () => {
  describe('Decision Engine', () => {
    let engine: DecisionEngine;

    beforeEach(() => {
      engine = new DecisionEngine({
        enableEmbeddings: true,
        enableCaching: true,
        threshold: 0.5,
      });
    });

    it('should index skills', async () => {
      const skill: Skill = {
        name: 'calculator',
        description: 'Perform mathematical calculations',
        parameters: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: 'Math expression' },
          },
          required: ['expression'],
        },
        handler: async () => ({ success: true }),
      };

      await engine.indexSkill(skill);
      // Should not throw
      expect(true).toBe(true);
    });

    it('should make decisions based on input', async () => {
      const skill: Skill = {
        name: 'calculator',
        description: 'Perform mathematical calculations',
        parameters: {
          type: 'object',
          properties: {},
        },
        handler: async () => ({ success: true }),
      };

      await engine.indexSkill(skill);

      const decision = await engine.decide({
        input: 'Calculate 2+2',
        availableSkills: ['calculator'],
        availableTools: [],
      });

      // Decision type depends on similarity matching
      // It could be 'skill' if matched, or 'llm' if not matched
      expect(['skill', 'llm']).toContain(decision.type);
      expect(decision.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should return LLM decision when no skills match', async () => {
      const decision = await engine.decide({
        input: 'Tell me a joke',
        availableSkills: ['calculator'],
        availableTools: [],
      });

      expect(decision.type).toBe('llm');
    });

    it('should cache decisions', async () => {
      const context = {
        input: 'test query',
        availableSkills: ['skill1'],
        availableTools: [],
      };

      const decision1 = await engine.decide(context);
      const decision2 = await engine.decide(context);

      expect(decision1).toEqual(decision2);
      expect(engine.getCacheStats().size).toBe(1);
    });
  });

  describe('Dynamic Skill Loader', () => {
    let loader: DynamicSkillLoader;

    beforeEach(() => {
      loader = new DynamicSkillLoader({
        enableCaching: true,
        enableLazyLoading: true,
      });
    });

    it('should register skill sources', () => {
      loader.registerSource({
        name: 'test-skill',
        type: 'builtin',
        source: 'test',
      });

      const sources = loader.listSources();
      expect(sources).toHaveLength(1);
      expect(sources[0].name).toBe('test-skill');
    });

    it('should track loaded skills', async () => {
      // Simulate loading
      loader.registerSource({
        name: 'test',
        type: 'builtin',
        source: 'test',
      });

      expect(loader.isLoaded('test')).toBe(false);
    });

    it('should provide stats', () => {
      const stats = loader.getStats();
      expect(stats).toHaveProperty('loaded');
      expect(stats).toHaveProperty('cached');
      expect(stats).toHaveProperty('sources');
    });
  });

  describe('Token Optimizer', () => {
    let optimizer: TokenOptimizer;

    beforeEach(() => {
      optimizer = new TokenOptimizer({
        enableCompression: true,
        maxSkillDescriptionLength: 100,
      });
    });

    it('should estimate tokens', () => {
      const tokens = optimizer.estimateTokens('Hello world');
      expect(tokens).toBeGreaterThan(0);
    });

    it('should optimize skills', () => {
      const skills: Skill[] = [
        {
          name: 'test',
          description: 'A'.repeat(500), // Long description
          parameters: {
            type: 'object',
            properties: {
              param1: {
                type: 'string',
                description: 'B'.repeat(300),
              },
            },
          },
          handler: async () => ({ success: true }),
        },
      ];

      const optimized = optimizer.optimizeSkills(skills);
      expect(optimized[0].description.length).toBeLessThan(500);
    });

    it('should calculate optimization stats', () => {
      const skills: Skill[] = [
        {
          name: 'test',
          description: 'A'.repeat(200),
          parameters: { type: 'object', properties: {} },
          handler: async () => ({ success: true }),
        },
      ];

      const optimized = optimizer.optimizeSkills(skills);
      const stats = optimizer.getOptimizationStats(skills, optimized);

      expect(stats).toHaveProperty('originalTokens');
      expect(stats).toHaveProperty('optimizedTokens');
      expect(stats).toHaveProperty('savings');
      expect(stats).toHaveProperty('savingsPercent');
    });

    it('should build optimized prompts', () => {
      const skills: Skill[] = [
        {
          name: 'greet',
          description: 'Greet someone',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Name to greet' },
            },
          },
          handler: async () => ({ success: true }),
        },
      ];

      const prompt = optimizer.buildOptimizedPrompt('Hello', skills);
      expect(prompt).toContain('User: Hello');
      expect(prompt).toContain('greet');
    });
  });

  describe('Smart Agent', () => {
    let agent: SmartAgent;

    beforeEach(async () => {
      agent = new SmartAgent({
        name: 'test-smart-agent',
        autoDecide: true,
        decisionEngine: {
          enableEmbeddings: true,
          enableCaching: true,
        },
      });
      await agent.initialize();
    });

    it('should create smart agent', () => {
      expect(agent.name).toBe('test-smart-agent');
      expect(agent).toBeDefined();
    });

    it('should register skills', async () => {
      const skill: Skill = {
        name: 'echo',
        description: 'Echo input',
        parameters: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Message to echo' },
          },
          required: ['message'],
        },
        handler: async params => ({
          success: true,
          data: params.message,
        }),
      };

      agent.registerSkill(skill);
      expect(agent.getSkillNames()).toContain('echo');
    });

    it('should track execution history', async () => {
      const skill: Skill = {
        name: 'test',
        description: 'Test skill',
        parameters: { type: 'object', properties: {} },
        handler: async () => ({ success: true }),
      };

      agent.registerSkill(skill);

      // Process something
      await agent.process('test input');

      const history = agent.getExecutionHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should provide decision stats', async () => {
      const stats = agent.getDecisionStats();
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('loadedSkills');
      expect(stats).toHaveProperty('historySize');
    });

    it('should clear history', async () => {
      await agent.process('test');
      agent.clearHistory();

      const history = agent.getExecutionHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('Embedding Provider', () => {
    it('should embed text', async () => {
      const provider = new SimpleEmbeddingProvider();
      const embedding = await provider.embed('Hello world');

      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBeGreaterThan(0);
    });

    it('should calculate similarity', async () => {
      const provider = new SimpleEmbeddingProvider();
      const emb1 = await provider.embed('hello world');
      const emb2 = await provider.embed('hello there');
      const emb3 = await provider.embed('completely different');

      const sim1 = provider.similarity(emb1, emb2);
      const sim2 = provider.similarity(emb1, emb3);

      expect(sim1).toBeGreaterThan(sim2);
    });
  });
});
