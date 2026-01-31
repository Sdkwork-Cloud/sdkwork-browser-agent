/**
 * Knowledge-First Skill Registry
 *
 * Implements lazy loading and caching for skills based on SKILL.md files.
 * Follows Claude Code's design philosophy: SKILL.md is the source of truth.
 */

import type { JSONSchema7 } from 'json-schema';

// ============================================
// Skill Types (Knowledge-First Architecture)
// ============================================

export interface SkillMetadata {
  name: string;
  description: string;
  author?: string;
  version: string;
  category: string;
  tags: string[];
  license?: string;
  compatibility?: string;
}

export interface SkillLifecycle {
  lazyLoad: boolean;
  cacheable: boolean;
  timeout: number;
  retries: number;
}

export interface SkillImplementation {
  type: 'code' | 'prompt' | 'composite' | 'mcp';
  // For 'code' type
  handler?: SkillHandler;
  // For 'prompt' type
  prompt?: string;
  // For 'composite' type
  subskills?: string[];
  // For 'mcp' type
  mcpTool?: string;
}

export interface Skill {
  metadata: SkillMetadata;
  parameters: JSONSchema7;
  implementation: SkillImplementation;
  lifecycle: SkillLifecycle;
  // Loaded content
  readme?: string;
  examples?: SkillExample[];
  references?: SkillReference[];
}

export interface SkillExample {
  title: string;
  description?: string;
  parameters: Record<string, unknown>;
  expectedOutput?: string;
}

export interface SkillReference {
  type: 'documentation' | 'api' | 'example' | 'template';
  title: string;
  content: string;
}

export interface SkillResult {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    executionTime: number;
    tokensUsed?: number;
    skillsInvoked?: string[];
  };
}

export interface SkillContext {
  skillName: string;
  executionId: string;
  sessionId: string;
  timestamp: Date;
  // Execution capabilities
  executeSkill: (name: string, params: unknown) => Promise<SkillResult>;
  executeMCPTool: (name: string, args: unknown) => Promise<unknown>;
  readMCPResource: (uri: string) => Promise<unknown>;
  // LLM capabilities
  complete: (prompt: string, options?: unknown) => Promise<string>;
  stream: (prompt: string, options?: unknown) => AsyncIterable<string>;
  // Utilities
  log: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: unknown) => void;
}

export type SkillHandler = (params: Record<string, unknown>, context: SkillContext) => Promise<SkillResult>;

// ============================================
// Skill Loader Interface
// ============================================

export interface SkillLoader {
  name: string;
  canLoad(path: string): boolean;
  load(path: string): Promise<Skill>;
}

// ============================================
// Knowledge-First Skill Registry
// ============================================

export class SkillRegistry {
  private skills = new Map<string, Skill>();
  private loaders = new Map<string, SkillLoader>();
  private cache = new Map<string, Skill>();
  private skillPaths = new Map<string, string>();
  private discoveryPaths: string[] = [];

  // Register a skill loader
  registerLoader(loader: SkillLoader): void {
    this.loaders.set(loader.name, loader);
  }

  // Add discovery path
  addDiscoveryPath(path: string): void {
    if (!this.discoveryPaths.includes(path)) {
      this.discoveryPaths.push(path);
    }
  }

  // Scan and index skills (without loading)
  async scan(): Promise<string[]> {
    const discovered: string[] = [];

    for (const path of this.discoveryPaths) {
      try {
        const skillNames = await this.scanPath(path);
        for (const name of skillNames) {
          this.skillPaths.set(name, `${path}/${name}`);
          discovered.push(name);
        }
      } catch (error) {
        console.warn(`[SkillRegistry] Failed to scan path: ${path}`, error);
      }
    }

    return discovered;
  }

  private async scanPath(path: string): Promise<string[]> {
    // In browser environment, use fetch to list directory
    // In Node.js, use fs
    if (typeof window !== 'undefined') {
      // Browser: fetch registry.json or use predefined list
      try {
        const response = await fetch(`${path}/registry.json`);
        if (response.ok) {
          const registry = await response.json() as { skills: string[] };
          return registry.skills;
        }
      } catch {
        // Fallback: return empty
        return [];
      }
    } else {
      // Node.js: scan directory
      const fs = await import('fs/promises');
      const entries = await fs.readdir(path, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    }
    return [];
  }

  // Load a skill (with caching)
  async load(name: string): Promise<Skill> {
    // Check cache
    if (this.cache.has(name)) {
      return this.cache.get(name)!;
    }

    // Check if already loaded
    if (this.skills.has(name)) {
      return this.skills.get(name)!;
    }

    // Get skill path
    const path = this.skillPaths.get(name);
    if (!path) {
      throw new Error(`Skill not found: ${name}`);
    }

    // Find appropriate loader
    const loader = Array.from(this.loaders.values()).find(l => l.canLoad(path));
    if (!loader) {
      throw new Error(`No loader found for skill: ${name}`);
    }

    // Load skill
    const skill = await loader.load(path);

    // Cache if cacheable
    if (skill.lifecycle.cacheable) {
      this.cache.set(name, skill);
    }

    this.skills.set(name, skill);
    return skill;
  }

  // Get skill metadata (without loading full implementation)
  async getMetadata(name: string): Promise<SkillMetadata | null> {
    try {
      const skill = await this.load(name);
      return skill.metadata;
    } catch {
      return null;
    }
  }

  // List all available skills
  list(): string[] {
    return Array.from(this.skillPaths.keys());
  }

  // Search skills by tags/category
  async search(query: string): Promise<SkillMetadata[]> {
    const results: SkillMetadata[] = [];
    const lowerQuery = query.toLowerCase();

    for (const name of Array.from(this.skillPaths.keys())) {
      try {
        const metadata = await this.getMetadata(name);
        if (metadata) {
          const match =
            metadata.name.toLowerCase().includes(lowerQuery) ||
            metadata.description.toLowerCase().includes(lowerQuery) ||
            metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
            metadata.category.toLowerCase().includes(lowerQuery);

          if (match) {
            results.push(metadata);
          }
        }
      } catch {
        // Skip failed skills
      }
    }

    return results;
  }

  // Get skills by category
  async getByCategory(category: string): Promise<SkillMetadata[]> {
    const results: SkillMetadata[] = [];

    for (const name of Array.from(this.skillPaths.keys())) {
      try {
        const metadata = await this.getMetadata(name);
        if (metadata && metadata.category === category) {
          results.push(metadata);
        }
      } catch {
        // Skip failed skills
      }
    }

    return results;
  }

  // Invalidate cache
  invalidate(name?: string): void {
    if (name) {
      this.cache.delete(name);
    } else {
      this.cache.clear();
    }
  }

  // Clear all
  clear(): void {
    this.skills.clear();
    this.cache.clear();
    this.skillPaths.clear();
  }
}

// ============================================
// SKILL.md Loader
// ============================================

export class SKILLMDLoader implements SkillLoader {
  name = 'skill-md';

  canLoad(path: string): boolean {
    return path.endsWith('.md') || !path.includes('.');
  }

  async load(path: string): Promise<Skill> {
    // Load SKILL.md content
    const content = await this.readFile(`${path}/SKILL.md`);
    if (!content) {
      throw new Error(`SKILL.md not found at: ${path}`);
    }

    // Parse frontmatter and content
    const { frontmatter, body } = this.parseFrontmatter(content);

    // Build skill object
    const skill: Skill = {
      metadata: {
        name: String(frontmatter.name || this.extractName(path)),
        description: String(frontmatter.description || ''),
        author: frontmatter.author ? String(frontmatter.author) : undefined,
        version: String(frontmatter.version || '1.0.0'),
        category: String(frontmatter.category || 'general'),
        tags: this.parseTags(frontmatter.tags),
        license: frontmatter.license ? String(frontmatter.license) : undefined,
        compatibility: frontmatter.compatibility ? String(frontmatter.compatibility) : undefined,
      },
      parameters: (frontmatter.parameters as JSONSchema7) || { type: 'object', properties: {} },
      implementation: this.detectImplementation(path, frontmatter),
      lifecycle: {
        lazyLoad: frontmatter.lazyLoad !== false,
        cacheable: frontmatter.cacheable !== false,
        timeout: Number(frontmatter.timeout || 30000),
        retries: Number(frontmatter.retries || 0),
      },
      readme: body,
    };

    // Load examples if available
    skill.examples = await this.loadExamples(path);

    // Load references if available
    skill.references = await this.loadReferences(path);

    return skill;
  }

  private async readFile(filePath: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined') {
        const response = await fetch(filePath);
        if (!response.ok) return null;
        return await response.text();
      } else {
        const fs = await import('fs/promises');
        return await fs.readFile(filePath, 'utf-8');
      }
    } catch {
      return null;
    }
  }

  private parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!match) {
      return { frontmatter: {}, body: content };
    }

    const frontmatterText = match[1];
    const body = match[2].trim();

    // Simple YAML-like parsing
    const frontmatter: Record<string, unknown> = {};
    const lines = frontmatterText.split('\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();

        // Try to parse as JSON, fallback to string
        try {
          frontmatter[key] = JSON.parse(value);
        } catch {
          // Handle arrays (e.g., tags: ["a", "b"])
          if (value.startsWith('[') && value.endsWith(']')) {
            frontmatter[key] = value
              .slice(1, -1)
              .split(',')
              .map(v => v.trim().replace(/^["']|["']$/g, ''));
          } else {
            frontmatter[key] = value.replace(/^["']|["']$/g, '');
          }
        }
      }
    }

    return { frontmatter, body };
  }

  private extractName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] || 'unknown';
  }

  private parseTags(tags: unknown): string[] {
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') return tags.split(/\s+/).filter(Boolean);
    return [];
  }

  private detectImplementation(path: string, frontmatter: Record<string, unknown>): SkillImplementation {
    // Check for index.ts (code implementation)
    const hasCode = this.fileExists(`${path}/index.ts`) || this.fileExists(`${path}/index.js`);

    if (hasCode) {
      return { type: 'code' };
    }

    // Check for prompt-based
    if (frontmatter.prompt || frontmatter.template) {
      return {
        type: 'prompt',
        prompt: (frontmatter.prompt || frontmatter.template) as string
      };
    }

    // Check for composite
    if (frontmatter.subskills || frontmatter.composite) {
      return {
        type: 'composite',
        subskills: Array.isArray(frontmatter.subskills)
          ? frontmatter.subskills as string[]
          : []
      };
    }

    // Check for MCP
    if (frontmatter.mcpTool) {
      return {
        type: 'mcp',
        mcpTool: frontmatter.mcpTool as string
      };
    }

    // Default to prompt with readme as prompt
    return {
      type: 'prompt',
      prompt: frontmatter.description as string || ''
    };
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      if (typeof window !== 'undefined') {
        const response = await fetch(path, { method: 'HEAD' });
        return response.ok;
      } else {
        const fs = await import('fs/promises');
        await fs.access(path);
        return true;
      }
    } catch {
      return false;
    }
  }

  private async loadExamples(path: string): Promise<SkillExample[]> {
    const examplesPath = `${path}/references/EXAMPLES.md`;
    const content = await this.readFile(examplesPath);
    if (!content) return [];

    // Parse examples from markdown
    const examples: SkillExample[] = [];
    const sections = content.split(/##\s+/);

    for (const section of sections.slice(1)) {
      const lines = section.split('\n');
      const title = lines[0].trim();

      // Extract YAML parameters
      const yamlMatch = section.match(/```yaml\n([\s\S]*?)```/);
      if (yamlMatch) {
        try {
          const params = this.parseSimpleYaml(yamlMatch[1]);
          examples.push({
            title,
            parameters: params
          });
        } catch {
          // Skip invalid examples
        }
      }
    }

    return examples;
  }

  private async loadReferences(path: string): Promise<SkillReference[]> {
    const refsPath = `${path}/references`;
    const refs: SkillReference[] = [];

    // Load PARAMETERS.md
    const paramsContent = await this.readFile(`${refsPath}/PARAMETERS.md`);
    if (paramsContent) {
      refs.push({
        type: 'documentation',
        title: 'Parameters',
        content: paramsContent
      });
    }

    return refs;
  }

  private parseSimpleYaml(yaml: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = yaml.split('\n');
    let currentKey = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0 && !trimmed.startsWith('-')) {
        currentKey = trimmed.slice(0, colonIndex).trim();
        const value = trimmed.slice(colonIndex + 1).trim();

        try {
          result[currentKey] = JSON.parse(value);
        } catch {
          result[currentKey] = value;
        }
      }
    }

    return result;
  }
}

// ============================================
// Skill Executor
// ============================================

export class SkillExecutor {
  constructor(
    private registry: SkillRegistry,
    private context: Partial<SkillContext>
  ) {}

  async execute(name: string, params: Record<string, unknown>): Promise<SkillResult> {
    const startTime = Date.now();

    try {
      // Load skill
      const skill = await this.registry.load(name);

      // Validate parameters
      const validation = this.validateParams(params, skill.parameters);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error || 'Parameter validation failed',
            details: validation.errors
          },
          metadata: { executionTime: Date.now() - startTime }
        };
      }

      // Build full context
      const fullContext: SkillContext = {
        skillName: name,
        executionId: this.generateId(),
        sessionId: this.context.sessionId || 'default',
        timestamp: new Date(),
        executeSkill: (n, p) => this.execute(n, p as Record<string, unknown>),
        executeMCPTool: this.context.executeMCPTool || (async () => { throw new Error('MCP not available'); }),
        readMCPResource: this.context.readMCPResource || (async () => { throw new Error('MCP not available'); }),
        complete: this.context.complete || (async () => { throw new Error('LLM not available'); }),
        stream: this.context.stream || (async function* () { throw new Error('LLM not available'); }),
        log: this.context.log || console.log
      };

      // Execute based on implementation type
      let result: SkillResult;

      switch (skill.implementation.type) {
        case 'code':
          result = await this.executeCode(skill, params, fullContext);
          break;
        case 'prompt':
          result = await this.executePrompt(skill, params, fullContext);
          break;
        case 'composite':
          result = await this.executeComposite(skill, params, fullContext);
          break;
        case 'mcp':
          result = await this.executeMCP(skill, params, fullContext);
          break;
        default:
          throw new Error(`Unknown implementation type: ${skill.implementation.type}`);
      }

      // Add metadata
      result.metadata = {
        ...result.metadata,
        executionTime: Date.now() - startTime
      };

      return result;

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error
        },
        metadata: { executionTime: Date.now() - startTime }
      };
    }
  }

  private validateParams(params: Record<string, unknown>, schema: JSONSchema7): { valid: boolean; error?: string; errors?: unknown[] } {
    // Simple validation - in production, use ajv or similar
    const required = schema.required || [];
    const properties = schema.properties || {};

    for (const key of required) {
      if (!(key in params)) {
        return { valid: false, error: `Missing required parameter: ${key}` };
      }
    }

    for (const [key, value] of Object.entries(params)) {
      const propSchema = properties[key];
      if (propSchema) {
        const type = (propSchema as { type?: string }).type;
        if (type && typeof value !== type && !(type === 'array' && Array.isArray(value))) {
          return { valid: false, error: `Invalid type for parameter ${key}: expected ${type}, got ${typeof value}` };
        }
      }
    }

    return { valid: true };
  }

  private async executeCode(skill: Skill, params: Record<string, unknown>, context: SkillContext): Promise<SkillResult> {
    // Code execution would be handled by a code loader
    // For now, return error
    return {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Code execution not implemented in this loader'
      }
    };
  }

  private async executePrompt(skill: Skill, params: Record<string, unknown>, context: SkillContext): Promise<SkillResult> {
    const prompt = skill.implementation.prompt || skill.readme || '';

    // Replace parameters in prompt
    let filledPrompt = prompt;
    for (const [key, value] of Object.entries(params)) {
      filledPrompt = filledPrompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }

    // Call LLM
    const response = await context.complete(filledPrompt);

    return {
      success: true,
      data: response,
      metadata: { executionTime: 0 }
    };
  }

  private async executeComposite(skill: Skill, params: Record<string, unknown>, context: SkillContext): Promise<SkillResult> {
    const subskills = skill.implementation.subskills || [];
    const results: SkillResult[] = [];

    for (const subskillName of subskills) {
      const result = await context.executeSkill(subskillName, params);
      results.push(result);

      if (!result.success) {
        return {
          success: false,
          error: {
            code: 'SUBSKILL_ERROR',
            message: `Subskill ${subskillName} failed`,
            details: result.error
          },
          metadata: { executionTime: 0, skillsInvoked: subskills }
        };
      }
    }

    return {
      success: true,
      data: results.map(r => r.data),
      metadata: { executionTime: 0, skillsInvoked: subskills }
    };
  }

  private async executeMCP(skill: Skill, params: Record<string, unknown>, context: SkillContext): Promise<SkillResult> {
    const toolName = skill.implementation.mcpTool;
    if (!toolName) {
      return {
        success: false,
        error: {
          code: 'CONFIG_ERROR',
          message: 'MCP tool name not configured'
        }
      };
    }

    const result = await context.executeMCPTool(toolName, params);

    return {
      success: true,
      data: result,
      metadata: { executionTime: 0 }
    };
  }

  private generateId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================
// Export singleton instance
// ============================================

export const skillRegistry = new SkillRegistry();
skillRegistry.registerLoader(new SKILLMDLoader());
