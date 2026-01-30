/**
 * Token Optimizer
 * Minimize token consumption for LLM calls
 */

import type { Skill, Tool, ParameterSchema } from './agent';
import type { LLMMessage } from '../llm/provider';

export interface TokenOptimizerConfig {
  maxContextTokens?: number;
  maxSkillDescriptionLength?: number;
  enableCompression?: boolean;
  preserveSystemPrompt?: boolean;
}

export interface TokenEstimate {
  prompt: number;
  completion: number;
  total: number;
}

export class TokenOptimizer {
  private config: Required<TokenOptimizerConfig>;

  constructor(config: TokenOptimizerConfig = {}) {
    this.config = {
      maxContextTokens: config.maxContextTokens ?? 4000,
      maxSkillDescriptionLength: config.maxSkillDescriptionLength ?? 200,
      enableCompression: config.enableCompression ?? true,
      preserveSystemPrompt: config.preserveSystemPrompt ?? true,
    };
  }

  /**
   * Optimize skills for minimal token usage
   */
  optimizeSkills(skills: Skill[], forQuery?: string): Skill[] {
    if (!this.config.enableCompression) return skills;

    return skills.map(skill => this.compressSkill(skill, forQuery));
  }

  /**
   * Compress a single skill
   */
  private compressSkill(skill: Skill, forQuery?: string): Skill {
    const compressed: Skill = {
      ...skill,
      description: this.truncateDescription(skill.description),
      parameters: this.compressParameters(skill.parameters),
    };

    // Remove metadata if not relevant to query
    if (forQuery && skill.metadata) {
      const relevant = this.isMetadataRelevant(skill.metadata as Record<string, unknown>, forQuery);
      if (!relevant) {
        delete (compressed as { metadata?: unknown }).metadata;
      }
    }

    return compressed;
  }

  /**
   * Optimize tools for minimal token usage
   */
  optimizeTools(tools: Tool[]): Tool[] {
    if (!this.config.enableCompression) return tools;

    return tools.map(tool => ({
      ...tool,
      description: this.truncateDescription(tool.description),
      parameters: tool.parameters ? this.compressParameters(tool.parameters) : undefined,
    }));
  }

  /**
   * Optimize messages for context window
   */
  optimizeMessages(messages: LLMMessage[], maxTokens?: number): LLMMessage[] {
    const limit = maxTokens ?? this.config.maxContextTokens;
    let totalTokens = this.estimateMessagesTokens(messages);

    if (totalTokens <= limit) return messages;

    // Start removing from oldest non-system messages
    const optimized: LLMMessage[] = [];
    let systemMessage: LLMMessage | null = null;

    // Preserve system message if configured
    if (this.config.preserveSystemPrompt) {
      systemMessage = messages.find(m => m.role === 'system') || null;
      if (systemMessage) {
        optimized.push(systemMessage);
        totalTokens -= this.estimateTokens(systemMessage.content);
      }
    }

    // Add recent messages until limit
    const recentMessages = messages.filter(m => m.role !== 'system').reverse();

    for (const message of recentMessages) {
      const messageTokens = this.estimateTokens(message.content);
      if (totalTokens + messageTokens <= limit) {
        optimized.unshift(message);
        totalTokens += messageTokens;
      } else {
        break;
      }
    }

    return optimized;
  }

  /**
   * Build optimized prompt with skills
   */
  buildOptimizedPrompt(userInput: string, availableSkills: Skill[], context?: string): string {
    const parts: string[] = [];

    // Add context if provided
    if (context) {
      parts.push(`Context: ${this.truncateDescription(context, 500)}`);
    }

    // Add user input
    parts.push(`User: ${userInput}`);

    // Add available skills (compressed)
    if (availableSkills.length > 0) {
      const skillDescriptions = availableSkills.map(skill => this.formatSkillForPrompt(skill));
      parts.push(`\nAvailable skills:\n${skillDescriptions.join('\n')}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Estimate tokens for text
   */
  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for English
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate tokens for messages
   */
  estimateMessagesTokens(messages: LLMMessage[]): number {
    return messages.reduce((total, msg) => {
      // Base tokens per message (role, formatting)
      const baseTokens = 4;
      return total + baseTokens + this.estimateTokens(msg.content);
    }, 0);
  }

  /**
   * Estimate tokens for skills
   */
  estimateSkillsTokens(skills: Skill[]): number {
    return skills.reduce((total, skill) => {
      return (
        total +
        this.estimateTokens(skill.name) +
        this.estimateTokens(skill.description) +
        this.estimateTokens(JSON.stringify(skill.parameters))
      );
    }, 0);
  }

  /**
   * Get optimization stats
   */
  getOptimizationStats(
    original: Skill[],
    optimized: Skill[]
  ): {
    originalTokens: number;
    optimizedTokens: number;
    savings: number;
    savingsPercent: number;
  } {
    const originalTokens = this.estimateSkillsTokens(original);
    const optimizedTokens = this.estimateSkillsTokens(optimized);
    const savings = originalTokens - optimizedTokens;

    return {
      originalTokens,
      optimizedTokens,
      savings,
      savingsPercent: originalTokens > 0 ? (savings / originalTokens) * 100 : 0,
    };
  }

  // Private helper methods

  private truncateDescription(description: string, maxLength?: number): string {
    const limit = maxLength ?? this.config.maxSkillDescriptionLength;
    if (description.length <= limit) return description;
    return description.substring(0, limit - 3) + '...';
  }

  private compressParameters(parameters: ParameterSchema): ParameterSchema {
    // Remove unnecessary fields from parameters
    const compressed: ParameterSchema = {
      type: parameters.type,
      properties: {},
    };

    if (parameters.required) {
      compressed.required = parameters.required;
    }

    // Compress property descriptions
    for (const [key, prop] of Object.entries(parameters.properties)) {
      compressed.properties[key] = {
        type: prop.type,
        description: this.truncateDescription(prop.description, 100),
        ...(prop.enum && { enum: prop.enum }),
        ...(prop.default !== undefined && { default: prop.default }),
      };
    }

    return compressed;
  }

  private isMetadataRelevant(
    metadata: Record<string, unknown> | undefined,
    query: string
  ): boolean {
    if (!metadata) return false;
    const queryLower = query.toLowerCase();
    const metadataStr = JSON.stringify(metadata).toLowerCase();
    return metadataStr.includes(queryLower);
  }

  private formatSkillForPrompt(skill: Skill): string {
    const params = Object.keys(skill.parameters.properties).join(', ');
    return `- ${skill.name}(${params}): ${skill.description}`;
  }
}
