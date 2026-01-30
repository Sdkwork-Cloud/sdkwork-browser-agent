/**
 * Enhanced Skill Registry
 * Advanced caching, indexing, and skill management
 */

import { Skill } from '../core/agent';
import { StorageAdapter } from '../storage';

export interface RegistryConfig {
  storage?: StorageAdapter | null;
  enableCache?: boolean;
  enableIndexing?: boolean;
  maxCacheSize?: number;
  cacheTTL?: number;
  hotReload?: boolean;
}

interface CachedSkill {
  skill: Skill;
  loadedAt: Date;
  lastAccessed: Date;
  accessCount: number;
  size: number;
  tags: string[];
}

interface SkillIndex {
  byName: Map<string, string>;
  byCategory: Map<string, Set<string>>;
  byTag: Map<string, Set<string>>;
  byDescription: Map<string, Set<string>>;
}

export class SkillRegistry {
  private skills = new Map<string, CachedSkill>();
  private index: SkillIndex = {
    byName: new Map(),
    byCategory: new Map(),
    byTag: new Map(),
    byDescription: new Map(),
  };
  private config: Required<RegistryConfig>;
  private storage: StorageAdapter | null = null;
  private watchers = new Map<string, () => void>();

  constructor(config: RegistryConfig = {}) {
    this.config = {
      storage: config.storage ?? null,
      enableCache: config.enableCache ?? true,
      enableIndexing: config.enableIndexing ?? true,
      maxCacheSize: config.maxCacheSize ?? 100,
      cacheTTL: config.cacheTTL ?? 3600000, // 1 hour
      hotReload: config.hotReload ?? false,
    };

    if (this.config.storage) {
      this.storage = this.config.storage;
    }
  }

  /**
   * Register a skill in the registry
   */
  register(skill: Skill): void {
    const cached: CachedSkill = {
      skill,
      loadedAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
      size: this.calculateSkillSize(skill),
      tags: skill.metadata?.tags ?? [],
    };

    this.skills.set(skill.name, cached);

    if (this.config.enableIndexing) {
      this.indexSkill(skill);
    }

    if (this.config.hotReload && this.storage) {
      this.watchSkill(skill);
    }
  }

  /**
   * Unregister a skill
   */
  unregister(name: string): boolean {
    const skill = this.skills.get(name);
    if (!skill) return false;

    // Remove from index
    if (this.config.enableIndexing) {
      this.removeFromIndex(skill.skill);
    }

    // Remove watcher
    if (this.config.hotReload) {
      const watcher = this.watchers.get(name);
      if (watcher) {
        watcher();
        this.watchers.delete(name);
      }
    }

    return this.skills.delete(name);
  }

  /**
   * Get a skill by name
   */
  get(name: string): Skill | undefined {
    const cached = this.skills.get(name);
    if (!cached) return undefined;

    // Update access stats
    cached.lastAccessed = new Date();
    cached.accessCount++;

    return cached.skill;
  }

  /**
   * Check if skill exists
   */
  has(name: string): boolean {
    return this.skills.has(name);
  }

  /**
   * Find skills by category
   */
  findByCategory(category: string): Skill[] {
    if (!this.config.enableIndexing) {
      return this.getAll().filter(s => s.metadata?.category === category);
    }

    const names = this.index.byCategory.get(category);
    if (!names) return [];

    return Array.from(names)
      .map(name => this.get(name))
      .filter((s): s is Skill => s !== undefined);
  }

  /**
   * Find skills by tag
   */
  findByTag(tag: string): Skill[] {
    if (!this.config.enableIndexing) {
      return this.getAll().filter(s => s.metadata?.tags?.includes(tag));
    }

    const names = this.index.byTag.get(tag);
    if (!names) return [];

    return Array.from(names)
      .map(name => this.get(name))
      .filter((s): s is Skill => s !== undefined);
  }

  /**
   * Search skills by keyword
   */
  search(keyword: string): Skill[] {
    const lowerKeyword = keyword.toLowerCase();
    const results = new Set<Skill>();

    // Search by name
    for (const [name, cached] of this.skills) {
      if (name.toLowerCase().includes(lowerKeyword)) {
        results.add(cached.skill);
      }
    }

    // Search by tags
    if (this.config.enableIndexing) {
      const tagNames = this.index.byTag.get(lowerKeyword);
      if (tagNames) {
        for (const name of tagNames) {
          const skill = this.get(name);
          if (skill) results.add(skill);
        }
      }
    } else {
      for (const cached of this.skills.values()) {
        if (cached.skill.metadata?.tags?.some(tag => tag.toLowerCase() === lowerKeyword)) {
          results.add(cached.skill);
        }
      }
    }

    // Search by description
    if (this.config.enableIndexing) {
      for (const [desc, names] of this.index.byDescription) {
        if (desc.includes(lowerKeyword)) {
          for (const name of names) {
            const skill = this.get(name);
            if (skill) results.add(skill);
          }
        }
      }
    } else {
      for (const cached of this.skills.values()) {
        if (cached.skill.description.toLowerCase().includes(lowerKeyword)) {
          results.add(cached.skill);
        }
      }
    }

    return Array.from(results);
  }

  /**
   * Get all registered skills
   */
  getAll(): Skill[] {
    return Array.from(this.skills.values()).map(c => c.skill);
  }

  /**
   * Get all skill names
   */
  getNames(): string[] {
    return Array.from(this.skills.keys());
  }

  /**
   * Get skills by names
   */
  getMany(names: string[]): Skill[] {
    return names
      .map(name => this.get(name))
      .filter((s): s is Skill => s !== undefined);
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalSkills: number;
    totalSize: number;
    averageAccessCount: number;
    cacheHitRate: number;
    categories: string[];
    tags: string[];
  } {
    let totalAccessCount = 0;
    let totalSize = 0;
    const categories = new Set<string>();
    const tags = new Set<string>();

    for (const cached of this.skills.values()) {
      totalAccessCount += cached.accessCount;
      totalSize += cached.size;
      
      if (cached.skill.metadata?.category) {
        categories.add(cached.skill.metadata.category);
      }
      
      cached.tags.forEach(tag => tags.add(tag));
    }

    return {
      totalSkills: this.skills.size,
      totalSize,
      averageAccessCount: this.skills.size > 0 ? totalAccessCount / this.skills.size : 0,
      cacheHitRate: this.calculateCacheHitRate(),
      categories: Array.from(categories),
      tags: Array.from(tags),
    };
  }

  /**
   * Clear all skills
   */
  clear(): void {
    // Stop all watchers
    for (const [, stop] of this.watchers) {
      stop();
    }
    this.watchers.clear();

    this.skills.clear();
    this.clearIndex();
  }

  /**
   * Clear expired cache entries
   */
  clearExpired(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [name, cached] of this.skills) {
      if (now - cached.lastAccessed.getTime() > this.config.cacheTTL) {
        this.unregister(name);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Optimize cache by removing least recently used entries
   */
  optimizeCache(): void {
    if (this.skills.size <= this.config.maxCacheSize) return;

    // Sort by last accessed time
    const sorted = Array.from(this.skills.entries()).sort(
      (a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime()
    );

    // Remove oldest entries
    const toRemove = sorted.slice(0, sorted.length - this.config.maxCacheSize);
    for (const [name] of toRemove) {
      this.unregister(name);
    }
  }

  // Private methods

  private indexSkill(skill: Skill): void {
    // Index by name
    this.index.byName.set(skill.name, skill.name);

    // Index by category
    if (skill.metadata?.category) {
      const category = skill.metadata.category;
      if (!this.index.byCategory.has(category)) {
        this.index.byCategory.set(category, new Set());
      }
      this.index.byCategory.get(category)!.add(skill.name);
    }

    // Index by tags
    skill.metadata?.tags?.forEach(tag => {
      if (!this.index.byTag.has(tag)) {
        this.index.byTag.set(tag, new Set());
      }
      this.index.byTag.get(tag)!.add(skill.name);
    });

    // Index by description words
    const words = skill.description.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (word.length > 3) { // Only index words longer than 3 chars
        if (!this.index.byDescription.has(word)) {
          this.index.byDescription.set(word, new Set());
        }
        this.index.byDescription.get(word)!.add(skill.name);
      }
    });
  }

  private removeFromIndex(skill: Skill): void {
    this.index.byName.delete(skill.name);

    if (skill.metadata?.category) {
      const categorySet = this.index.byCategory.get(skill.metadata.category);
      if (categorySet) {
        categorySet.delete(skill.name);
        if (categorySet.size === 0) {
          this.index.byCategory.delete(skill.metadata.category);
        }
      }
    }

    skill.metadata?.tags?.forEach(tag => {
      const tagSet = this.index.byTag.get(tag);
      if (tagSet) {
        tagSet.delete(skill.name);
        if (tagSet.size === 0) {
          this.index.byTag.delete(tag);
        }
      }
    });

    const words = skill.description.toLowerCase().split(/\s+/);
    words.forEach(word => {
      const descSet = this.index.byDescription.get(word);
      if (descSet) {
        descSet.delete(skill.name);
        if (descSet.size === 0) {
          this.index.byDescription.delete(word);
        }
      }
    });
  }

  private clearIndex(): void {
    this.index.byName.clear();
    this.index.byCategory.clear();
    this.index.byTag.clear();
    this.index.byDescription.clear();
  }

  private calculateSkillSize(skill: Skill): number {
    return JSON.stringify(skill).length;
  }

  private calculateCacheHitRate(): number {
    // Simplified calculation - in real implementation would track hits/misses
    return this.skills.size > 0 ? 1 : 0;
  }

  private watchSkill(skill: Skill): void {
    // Placeholder for hot reload implementation
    // Would use fs.watch in Node.js or polling in browser
    this.watchers.set(skill.name, () => {
      // Cleanup function
    });
  }
}

export default SkillRegistry;
