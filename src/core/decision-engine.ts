/**
 * Decision Engine for automatic skill selection
 * Optimized for minimal token consumption
 */

import { Skill } from '../core/agent';

export interface Decision {
  type: 'skill' | 'tool' | 'llm' | 'multi';
  skills?: string[];
  tools?: string[];
  reasoning?: string;
  confidence: number;
  fallback?: string;
}

export interface DecisionContext {
  input: string;
  history?: string[];
  availableSkills: string[];
  availableTools: string[];
  metadata?: Record<string, unknown>;
}

export interface DecisionEngineConfig {
  threshold?: number;
  maxSkills?: number;
  enableEmbeddings?: boolean;
  enableCaching?: boolean;
  similarityThreshold?: number;
}

// Simple embedding interface (can be replaced with actual embeddings)
export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  similarity(a: number[], b: number[]): number;
}

// Simple TF-IDF-like embedding for browser compatibility
export class SimpleEmbeddingProvider implements EmbeddingProvider {
  private vocabulary = new Map<string, number>();
  private vocabSize = 0;
  private readonly maxVocabSize = 1000;

  async embed(text: string): Promise<number[]> {
    const tokens = this.tokenize(text);
    const embedding = new Array(this.maxVocabSize).fill(0);

    for (const token of tokens) {
      if (!this.vocabulary.has(token)) {
        if (this.vocabSize < this.maxVocabSize) {
          this.vocabulary.set(token, this.vocabSize++);
        }
      }
      const idx = this.vocabulary.get(token);
      if (idx !== undefined) {
        embedding[idx] += 1;
      }
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      return embedding.map(val => val / magnitude);
    }
    return embedding;
  }

  similarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dotProduct += a[i] * b[i];
    }
    return dotProduct;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }
}

import { BoundedCache } from '../utils/bounded-cache';

export class DecisionEngine {
  private skillEmbeddings = new Map<string, number[]>();
  private embeddingProvider: EmbeddingProvider;
  private decisionCache: BoundedCache<string, Decision>;
  private config: Required<DecisionEngineConfig>;

  constructor(config: DecisionEngineConfig = {}, embeddingProvider?: EmbeddingProvider) {
    this.config = {
      threshold: config.threshold ?? 0.6,
      maxSkills: config.maxSkills ?? 3,
      enableEmbeddings: config.enableEmbeddings ?? true,
      enableCaching: config.enableCaching ?? true,
      similarityThreshold: config.similarityThreshold ?? 0.5,
    };
    this.embeddingProvider = embeddingProvider ?? new SimpleEmbeddingProvider();
    
    // Initialize bounded cache with TTL to prevent memory leaks
    this.decisionCache = new BoundedCache<string, Decision>({
      maxSize: 1000,
      ttl: 5 * 60 * 1000, // 5 minutes
      cleanupInterval: 60 * 1000, // 1 minute
      enableLRU: true,
    });
  }

  /**
   * Index skills for fast retrieval
   */
  async indexSkill(skill: Skill): Promise<void> {
    if (!this.config.enableEmbeddings) return;

    const text = `${skill.name} ${skill.description} ${this.extractKeywords(skill)}`;
    const embedding = await this.embeddingProvider.embed(text);
    this.skillEmbeddings.set(skill.name, embedding);
  }

  /**
   * Make decision based on input
   */
  async decide(context: DecisionContext): Promise<Decision> {
    const cacheKey = this.generateCacheKey(context);

    // Check cache
    if (this.config.enableCaching) {
      const cached = this.decisionCache.get(cacheKey);
      if (cached) return cached;
    }

    // Find relevant skills using embeddings
    const relevantSkills = await this.findRelevantSkills(context);

    // Find relevant tools
    const relevantTools = this.findRelevantTools(context);

    let decision: Decision;

    if (relevantSkills.length === 0 && relevantTools.length === 0) {
      // No relevant skills/tools, use LLM directly
      decision = {
        type: 'llm',
        confidence: 1.0,
        reasoning: 'No relevant skills found, using LLM directly',
      };
    } else if (relevantSkills.length === 1 && relevantTools.length === 0) {
      // Single skill match
      decision = {
        type: 'skill',
        skills: [relevantSkills[0].name],
        confidence: relevantSkills[0].confidence,
        reasoning: `Single skill match: ${relevantSkills[0].name}`,
      };
    } else if (relevantTools.length === 1 && relevantSkills.length === 0) {
      // Single tool match
      decision = {
        type: 'tool',
        tools: [relevantTools[0].name],
        confidence: relevantTools[0].confidence,
        reasoning: `Single tool match: ${relevantTools[0].name}`,
      };
    } else {
      // Multiple matches or mixed
      const topSkills = relevantSkills.slice(0, this.config.maxSkills);
      const topTools = relevantTools.slice(0, 2);

      decision = {
        type: 'multi',
        skills: topSkills.map(s => s.name),
        tools: topTools.map(t => t.name),
        confidence: Math.max(topSkills[0]?.confidence ?? 0, topTools[0]?.confidence ?? 0),
        reasoning: `Multiple matches: ${topSkills.map(s => s.name).join(', ')}`,
        fallback: 'llm',
      };
    }

    // Cache decision (BoundedCache handles size limits and TTL automatically)
    if (this.config.enableCaching) {
      this.decisionCache.set(cacheKey, decision);
    }

    return decision;
  }

  /**
   * Find relevant skills using similarity matching
   */
  private async findRelevantSkills(
    context: DecisionContext
  ): Promise<Array<{ name: string; confidence: number }>> {
    if (!this.config.enableEmbeddings || this.skillEmbeddings.size === 0) {
      return this.fallbackSkillMatching(context);
    }

    const inputEmbedding = await this.embeddingProvider.embed(context.input);
    const results: Array<{ name: string; confidence: number }> = [];

    for (const entry of Array.from(this.skillEmbeddings.entries())) {
      const [skillName, skillEmbedding] = entry;
      const similarity = this.embeddingProvider.similarity(inputEmbedding, skillEmbedding);
      if (similarity >= this.config.similarityThreshold) {
        results.push({ name: skillName, confidence: similarity });
      }
    }

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);

    return results;
  }

  /**
   * Fallback matching using keyword extraction
   */
  private fallbackSkillMatching(
    context: DecisionContext
  ): Array<{ name: string; confidence: number }> {
    const inputKeywords = this.extractKeywordsFromText(context.input);
    const results: Array<{ name: string; confidence: number }> = [];

    for (const skillName of context.availableSkills) {
      // Simple keyword matching
      const skillKeywords = skillName.toLowerCase().split(/[_-]/);
      const matches = inputKeywords.filter(kw =>
        skillKeywords.some(sk => sk.includes(kw) || kw.includes(sk))
      );

      if (matches.length > 0) {
        const confidence = matches.length / Math.max(inputKeywords.length, skillKeywords.length);
        if (confidence >= this.config.threshold) {
          results.push({ name: skillName, confidence });
        }
      }
    }

    results.sort((a, b) => b.confidence - a.confidence);
    return results;
  }

  /**
   * Find relevant tools
   */
  private findRelevantTools(context: DecisionContext): Array<{ name: string; confidence: number }> {
    const inputKeywords = this.extractKeywordsFromText(context.input);
    const results: Array<{ name: string; confidence: number }> = [];

    for (const toolName of context.availableTools) {
      const toolKeywords = toolName.toLowerCase().split(/[_-]/);
      const matches = inputKeywords.filter(kw =>
        toolKeywords.some(tk => tk.includes(kw) || kw.includes(tk))
      );

      if (matches.length > 0) {
        const confidence = matches.length / Math.max(inputKeywords.length, toolKeywords.length);
        if (confidence >= this.config.threshold) {
          results.push({ name: toolName, confidence });
        }
      }
    }

    results.sort((a, b) => b.confidence - a.confidence);
    return results;
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

    // Add parameter names and descriptions
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
  private generateCacheKey(context: DecisionContext): string {
    return `${context.input}:${context.availableSkills.join(',')}:${context.availableTools.join(',')}`;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.decisionCache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; hitRate: number } {
    const stats = this.decisionCache.getStats();
    return { size: stats.size, hitRate: stats.hitRate };
  }
}
