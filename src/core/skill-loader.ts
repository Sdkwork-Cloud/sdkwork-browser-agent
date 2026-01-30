/**
 * Dynamic Skill Loader
 * Lazy loading and caching of skills
 */

import { Skill } from './agent';

export interface SkillLoaderConfig {
  skillDirectory?: string;
  enableLazyLoading?: boolean;
  enableCaching?: boolean;
  cacheSize?: number;
  hotReload?: boolean;
}

export interface SkillSource {
  name: string;
  type: 'builtin' | 'file' | 'url' | 'module';
  source: string;
  metadata?: Record<string, unknown>;
}

export interface LoadedSkill extends Skill {
  loadedAt: Date;
  source: SkillSource;
  size?: number;
}

export class DynamicSkillLoader {
  private loadedSkills = new Map<string, LoadedSkill>();
  private skillCache = new Map<string, Skill>();
  private skillSources = new Map<string, SkillSource>();
  private config: Required<SkillLoaderConfig>;

  constructor(config: SkillLoaderConfig = {}) {
    this.config = {
      skillDirectory: config.skillDirectory ?? './skills',
      enableLazyLoading: config.enableLazyLoading ?? true,
      enableCaching: config.enableCaching ?? true,
      cacheSize: config.cacheSize ?? 100,
      hotReload: config.hotReload ?? false,
    };
  }

  /**
   * Register a skill source for lazy loading
   */
  registerSource(source: SkillSource): void {
    this.skillSources.set(source.name, source);
  }

  /**
   * Load a skill dynamically
   */
  async load(name: string): Promise<Skill | null> {
    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.skillCache.get(name);
      if (cached) return cached;
    }

    // Check if already loaded
    const loaded = this.loadedSkills.get(name);
    if (loaded) {
      return loaded;
    }

    // Get skill source
    const source = this.skillSources.get(name);
    if (!source) {
      return null;
    }

    // Load based on source type
    let skill: Skill | null = null;

    switch (source.type) {
      case 'builtin':
        skill = await this.loadBuiltin(source);
        break;
      case 'file':
        skill = await this.loadFromFile(source);
        break;
      case 'url':
        skill = await this.loadFromUrl(source);
        break;
      case 'module':
        skill = await this.loadFromModule(source);
        break;
    }

    if (skill) {
      // Cache skill
      if (this.config.enableCaching) {
        this.skillCache.set(name, skill);
        this.enforceCacheLimit();
      }

      // Track loaded skill
      const loadedSkill: LoadedSkill = {
        ...skill,
        loadedAt: new Date(),
        source,
        size: JSON.stringify(skill).length,
      };
      this.loadedSkills.set(name, loadedSkill);
    }

    return skill;
  }

  /**
   * Load multiple skills
   */
  async loadMultiple(names: string[]): Promise<Map<string, Skill>> {
    const results = new Map<string, Skill>();

    await Promise.all(
      names.map(async name => {
        const skill = await this.load(name);
        if (skill) {
          results.set(name, skill);
        }
      })
    );

    return results;
  }

  /**
   * Unload a skill
   */
  unload(name: string): boolean {
    this.skillCache.delete(name);
    return this.loadedSkills.delete(name);
  }

  /**
   * Check if skill is loaded
   */
  isLoaded(name: string): boolean {
    return this.loadedSkills.has(name) || this.skillCache.has(name);
  }

  /**
   * Get loaded skill info
   */
  getLoadedSkill(name: string): LoadedSkill | undefined {
    return this.loadedSkills.get(name);
  }

  /**
   * List all loaded skills
   */
  listLoaded(): LoadedSkill[] {
    return Array.from(this.loadedSkills.values());
  }

  /**
   * List available skill sources
   */
  listSources(): SkillSource[] {
    return Array.from(this.skillSources.values());
  }

  /**
   * Preload skills (eager loading)
   */
  async preload(names: string[]): Promise<void> {
    await this.loadMultiple(names);
  }

  /**
   * Get memory usage stats
   */
  getStats(): {
    loaded: number;
    cached: number;
    sources: number;
    totalSize: number;
  } {
    const loaded = this.listLoaded();
    return {
      loaded: loaded.length,
      cached: this.skillCache.size,
      sources: this.skillSources.size,
      totalSize: loaded.reduce((sum, s) => sum + (s.size ?? 0), 0),
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.skillCache.clear();
  }

  /**
   * Clear all loaded skills
   */
  clear(): void {
    this.loadedSkills.clear();
    this.skillCache.clear();
  }

  // Private loading methods

  private async loadBuiltin(_source: SkillSource): Promise<Skill | null> {
    // Built-in skills are already available
    // This would typically import from a known location
    return null;
  }

  private async loadFromFile(source: SkillSource): Promise<Skill | null> {
    if (typeof window !== 'undefined') {
      console.warn('File loading not supported in browser');
      return null;
    }

    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(source.source, 'utf-8');
      const module = JSON.parse(content);
      return this.validateSkill(module);
    } catch (error) {
      console.error(`Failed to load skill from file: ${source.source}`, error);
      return null;
    }
  }

  private async loadFromUrl(source: SkillSource): Promise<Skill | null> {
    try {
      const response = await fetch(source.source);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const module = await response.json();
      return this.validateSkill(module);
    } catch (error) {
      console.error(`Failed to load skill from URL: ${source.source}`, error);
      return null;
    }
  }

  private async loadFromModule(source: SkillSource): Promise<Skill | null> {
    try {
      // Dynamic import
      const module = await import(source.source);
      const skill = module.default || module.skill || module;
      return this.validateSkill(skill);
    } catch (error) {
      console.error(`Failed to load skill from module: ${source.source}`, error);
      return null;
    }
  }

  private validateSkill(obj: unknown): Skill | null {
    if (typeof obj !== 'object' || obj === null) return null;

    const skill = obj as Record<string, unknown>;

    if (
      typeof skill.name === 'string' &&
      typeof skill.description === 'string' &&
      typeof skill.parameters === 'object' &&
      typeof skill.handler === 'function'
    ) {
      return skill as unknown as Skill;
    }

    return null;
  }

  private enforceCacheLimit(): void {
    while (this.skillCache.size > this.config.cacheSize) {
      const firstKey = this.skillCache.keys().next().value;
      if (firstKey !== undefined) {
        this.skillCache.delete(firstKey);
      }
    }
  }
}
