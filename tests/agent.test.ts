import { describe, it, expect, beforeEach } from 'vitest';
import {
  Agent,
  Skill,
  Tool,
  Plugin,
  SkillRegistry,
  ToolRegistry,
  builtInSkills,
  builtInTools,
} from '../src';

describe('Agent Architecture', () => {
  describe('Agent Core', () => {
    let agent: Agent;

    beforeEach(async () => {
      agent = new Agent({
        name: 'test-agent',
        description: 'Test agent',
        version: '1.0.0',
      });
      await agent.initialize();
    });

    it('should create an agent with config', () => {
      expect(agent.name).toBe('test-agent');
      expect(agent.description).toBe('Test agent');
      expect(agent.version).toBe('1.0.0');
    });

    it('should register and execute skills', async () => {
      const skill: Skill = {
        name: 'greet',
        description: 'Greet a user',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'User name' },
          },
          required: ['name'],
        },
        handler: async params => ({
          success: true,
          data: `Hello, ${params.name}!`,
        }),
      };

      agent.registerSkill(skill);
      const result = await agent.executeSkill('greet', { name: 'World' });

      expect(result.success).toBe(true);
      expect(result.data).toBe('Hello, World!');
    });

    it('should return error for unknown skill', async () => {
      const result = await agent.executeSkill('unknown', {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should register and execute tools', async () => {
      const tool: Tool = {
        name: 'echo',
        description: 'Echo input',
        execute: async input => ({
          content: [{ type: 'text', text: String(input) }],
        }),
      };

      agent.registerTool(tool);
      const result = await agent.executeTool('echo', 'hello');

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe('hello');
    });

    it('should list registered skills', () => {
      const skill: Skill = {
        name: 'test-skill',
        description: 'Test skill',
        parameters: { type: 'object', properties: {} },
        handler: async () => ({ success: true }),
      };

      agent.registerSkill(skill);
      expect(agent.getSkillNames()).toContain('test-skill');
    });

    it('should support middleware', async () => {
      let middlewareCalled = false;

      const skill: Skill = {
        name: 'test',
        description: 'Test',
        parameters: { type: 'object', properties: {} },
        handler: async () => ({ success: true }),
      };

      agent.registerSkill(skill);
      agent.use(async (_context, next) => {
        middlewareCalled = true;
        return next();
      });

      await agent.executeSkill('test', {});
      expect(middlewareCalled).toBe(true);
    });
  });

  describe('Skill Registry', () => {
    let registry: SkillRegistry;

    beforeEach(() => {
      registry = new SkillRegistry();
    });

    it('should register and retrieve skills', () => {
      const skill: Skill = {
        name: 'test',
        description: 'Test skill',
        parameters: { type: 'object', properties: {} },
        handler: async () => ({ success: true }),
        metadata: { category: 'test' },
      };

      registry.register(skill);
      expect(registry.get('test')).toBe(skill);
    });

    it('should find skills by category', () => {
      const skill: Skill = {
        name: 'test',
        description: 'Test skill',
        parameters: { type: 'object', properties: {} },
        handler: async () => ({ success: true }),
        metadata: { category: 'utility' },
      };

      registry.register(skill);
      const results = registry.findByCategory('utility');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('test');
    });

    it('should search skills', () => {
      const skill: Skill = {
        name: 'calculate',
        description: 'Calculate something',
        parameters: { type: 'object', properties: {} },
        handler: async () => ({ success: true }),
        metadata: { tags: ['math'] },
      };

      registry.register(skill);
      const results = registry.search('math');
      expect(results).toHaveLength(1);
    });
  });

  describe('Tool Registry', () => {
    let registry: ToolRegistry;

    beforeEach(() => {
      registry = new ToolRegistry();
    });

    it('should register and retrieve tools', () => {
      const tool: Tool = {
        name: 'test',
        description: 'Test tool',
        execute: async () => ({ content: [] }),
        metadata: { category: 'test' },
      };

      registry.register(tool);
      expect(registry.get('test')).toBe(tool);
    });

    it('should find tools requiring confirmation', () => {
      const tool: Tool = {
        name: 'dangerous',
        description: 'Dangerous tool',
        execute: async () => ({ content: [] }),
        metadata: { requiresConfirmation: true },
      };

      registry.register(tool);
      const results = registry.findByConfirmation(true);
      expect(results).toHaveLength(1);
    });
  });

  describe('Built-in Skills', () => {
    it('should include echo skill', () => {
      const echoSkill = builtInSkills.find(s => s.name === 'echo');
      expect(echoSkill).toBeDefined();
    });

    it('should include math skill', () => {
      const mathSkill = builtInSkills.find(s => s.name === 'math');
      expect(mathSkill).toBeDefined();
    });

    it('should execute echo skill', async () => {
      const echoSkill = builtInSkills.find(s => s.name === 'echo')!;
      const agent = new Agent({ name: 'test' });
      await agent.initialize();

      const result = await echoSkill.handler(
        { message: 'Hello' },
        { agent, skillName: 'echo', timestamp: new Date() }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('Hello');
    });
  });

  describe('Built-in Tools', () => {
    it('should include http_request tool', () => {
      const httpTool = builtInTools.find(t => t.name === 'http_request');
      expect(httpTool).toBeDefined();
    });
  });

  describe('Plugin System', () => {
    it('should load and initialize plugins', async () => {
      const testPlugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        initialize: async () => {
          // Plugin initialized
        },
      };

      const agent = new Agent({
        name: 'test',
        plugins: [testPlugin],
      });
      await agent.initialize();

      expect(agent.getPluginNames()).toContain('test-plugin');
    });
  });
});
