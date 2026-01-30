/**
 * Advanced Parameter Extractor
 *
 * Features:
 * - Multi-strategy parameter extraction (LLM, pattern, context)
 * - Type coercion and validation
 * - Required/optional parameter handling
 * - Context-aware extraction
 */

import { Skill } from './agent';

export interface ParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
  default?: unknown;
  enum?: unknown[];
  pattern?: string;
  min?: number;
  max?: number;
  items?: ParameterSchema;
  properties?: Record<string, ParameterSchema>;
}

export interface ExtractionResult {
  params: Record<string, unknown>;
  confidence: number;
  missing: string[];
  invalid: Array<{ param: string; reason: string }>;
  suggestions: Array<{ param: string; suggestion: string }>;
}

export interface ExtractionContext {
  previousParams?: Record<string, unknown>;
  userPreferences?: Record<string, unknown>;
  conversationHistory?: string[];
  extractedEntities?: Record<string, unknown>;
}

export interface ExtractorConfig {
  useLLM?: boolean;
  usePatternMatching?: boolean;
  useContextInference?: boolean;
  confidenceThreshold?: number;
  maxRetries?: number;
}

export class ParameterExtractor {
  private config: Required<ExtractorConfig>;

  constructor(config: ExtractorConfig = {}) {
    this.config = {
      useLLM: config.useLLM ?? true,
      usePatternMatching: config.usePatternMatching ?? true,
      useContextInference: config.useContextInference ?? true,
      confidenceThreshold: config.confidenceThreshold ?? 0.7,
      maxRetries: config.maxRetries ?? 3,
    };
  }

  /**
   * Extract parameters from input using multiple strategies
   */
  async extract(
    input: string,
    skill: Skill,
    context?: ExtractionContext,
    llmProvider?: {
      complete(prompt: string): Promise<{ content: string }>;
    }
  ): Promise<ExtractionResult> {
    const results: ExtractionResult[] = [];

    // Strategy 1: Pattern matching
    if (this.config.usePatternMatching) {
      const patternResult = this.extractWithPatterns(input, skill);
      results.push(patternResult);
    }

    // Strategy 2: Context inference
    if (this.config.useContextInference && context) {
      const contextResult = this.extractFromContext(skill, context);
      results.push(contextResult);
    }

    // Strategy 3: LLM extraction
    if (this.config.useLLM && llmProvider) {
      const llmResult = await this.extractWithLLM(input, skill, llmProvider);
      results.push(llmResult);
    }

    // Merge results with confidence weighting
    return this.mergeResults(results, skill);
  }

  /**
   * Extract parameters using pattern matching
   */
  private extractWithPatterns(input: string, skill: Skill): ExtractionResult {
    const params: Record<string, unknown> = {};
    const missing: string[] = [];
    const invalid: Array<{ param: string; reason: string }> = [];
    const suggestions: Array<{ param: string; suggestion: string }> = [];
    let confidence = 0;

    for (const [key, prop] of Object.entries(skill.parameters.properties)) {
      const schema = this.convertPropertyToSchema(prop);
      const value = this.extractValueWithPatterns(input, key, schema);

      if (value !== undefined) {
        const validation = this.validateValue(value, schema);
        if (validation.valid) {
          params[key] = value;
          confidence += 0.3; // Base confidence for pattern match
        } else {
          invalid.push({ param: key, reason: validation.reason || 'Invalid value' });
          suggestions.push({
            param: key,
            suggestion: this.generateSuggestion(schema, validation.reason),
          });
        }
      } else if (skill.parameters.required?.includes(key)) {
        missing.push(key);
        suggestions.push({
          param: key,
          suggestion: `Please provide ${prop.description}`,
        });
      } else if (prop.default !== undefined) {
        params[key] = prop.default;
        confidence += 0.1; // Lower confidence for defaults
      }
    }

    const totalParams = Object.keys(skill.parameters.properties).length;
    confidence = totalParams > 0 ? confidence / totalParams : 0;

    return {
      params,
      confidence,
      missing,
      invalid,
      suggestions,
    };
  }

  /**
   * Convert ParameterProperty to ParameterSchema
   */
  private convertPropertyToSchema(prop: { type: string; description: string; enum?: string[]; default?: unknown }): ParameterSchema {
    const type = prop.type as 'string' | 'number' | 'boolean' | 'array' | 'object';
    return {
      type,
      description: prop.description,
      enum: prop.enum,
      default: prop.default,
    };
  }

  /**
   * Extract a single value using patterns
   */
  private extractValueWithPatterns(
    input: string,
    key: string,
    schema: ParameterSchema
  ): unknown {
    const patterns = [
      // "key: value" or "key = value"
      new RegExp(`${key}[:=]\\s*([^,;\\n]+)`, 'i'),
      // "key is value"
      new RegExp(`${key}\\s+is\\s+([^,;\\n]+)`, 'i'),
      // "with key value" or "using key value"
      new RegExp(`(?:with|using)\\s+${key}\\s+([^,;\\n]+)`, 'i'),
      // "key value" (positional)
      new RegExp(`${key}\\s+([^,;\\n]+)`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        const rawValue = match[1].trim();
        return this.coerceValue(rawValue, schema);
      }
    }

    // Special handling for arrays
    if (schema.type === 'array' && schema.items) {
      return this.extractArrayValue(input, key, schema.items);
    }

    // Special handling for booleans
    if (schema.type === 'boolean') {
      const boolPattern = new RegExp(`\\b${key}\\b`, 'i');
      if (boolPattern.test(input)) {
        // Check for negative indicators
        const negativePattern = new RegExp(`(no\\s+${key}|without\\s+${key}|disable\\s+${key})`, 'i');
        return !negativePattern.test(input);
      }
    }

    return undefined;
  }

  /**
   * Extract array values
   */
  private extractArrayValue(
    input: string,
    key: string,
    itemSchema: ParameterSchema
  ): unknown[] | undefined {
    const patterns = [
      new RegExp(`${key}[:=]\\s*\\[([^\\]]+)\\]`, 'i'),
      new RegExp(`${key}[:=]\\s*([^,;\\n]+)`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        const items = match[1].split(/[,;]/).map(s => s.trim());
        return items.map(item => this.coerceValue(item, itemSchema));
      }
    }

    return undefined;
  }

  /**
   * Coerce value to correct type
   */
  private coerceValue(rawValue: string, schema: ParameterSchema): unknown {
    switch (schema.type) {
      case 'number': {
        const num = parseFloat(rawValue);
        return isNaN(num) ? rawValue : num;
      }
      case 'boolean':
        return ['true', 'yes', '1', 'on'].includes(rawValue.toLowerCase());
      case 'array': {
        try {
          const parsed = JSON.parse(rawValue);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          return rawValue.split(/[,;]/).map(s => s.trim());
        }
        return [rawValue];
      }
      case 'object':
        try {
          return JSON.parse(rawValue);
        } catch {
          return rawValue;
        }
      case 'string':
      default:
        // Check enum
        if (schema.enum) {
          const match = schema.enum.find(
            e => String(e).toLowerCase() === rawValue.toLowerCase()
          );
          if (match !== undefined) return match;
        }
        return rawValue;
    }
  }

  /**
   * Validate extracted value
   */
  private validateValue(
    value: unknown,
    schema: ParameterSchema
  ): { valid: boolean; reason?: string } {
    // Check enum
    if (schema.enum && !schema.enum.includes(value)) {
      return {
        valid: false,
        reason: `Value must be one of: ${schema.enum.join(', ')}`,
      };
    }

    // Check pattern
    if (schema.pattern && typeof value === 'string') {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        return {
          valid: false,
          reason: `Value does not match required pattern`,
        };
      }
    }

    // Check number range
    if (schema.type === 'number' && typeof value === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        return {
          valid: false,
          reason: `Value must be at least ${schema.min}`,
        };
      }
      if (schema.max !== undefined && value > schema.max) {
        return {
          valid: false,
          reason: `Value must be at most ${schema.max}`,
        };
      }
    }

    // Check array length
    if (schema.type === 'array' && Array.isArray(value)) {
      if (schema.min !== undefined && value.length < schema.min) {
        return {
          valid: false,
          reason: `Array must have at least ${schema.min} items`,
        };
      }
      if (schema.max !== undefined && value.length > schema.max) {
        return {
          valid: false,
          reason: `Array must have at most ${schema.max} items`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Extract parameters from context
   */
  private extractFromContext(
    skill: Skill,
    context: ExtractionContext
  ): ExtractionResult {
    const params: Record<string, unknown> = {};
    const missing: string[] = [];
    const invalid: Array<{ param: string; reason: string }> = [];
    const suggestions: Array<{ param: string; suggestion: string }> = [];
    let confidence = 0;

    for (const key of Object.keys(skill.parameters.properties)) {
      const prop = skill.parameters.properties[key];
      // Check previous params
      if (context.previousParams?.[key] !== undefined) {
        params[key] = context.previousParams[key];
        confidence += 0.2;
        continue;
      }

      // Check user preferences
      if (context.userPreferences?.[key] !== undefined) {
        params[key] = context.userPreferences[key];
        confidence += 0.15;
        continue;
      }

      // Check extracted entities
      if (context.extractedEntities?.[key] !== undefined) {
        params[key] = context.extractedEntities[key];
        confidence += 0.25;
        continue;
      }

      // Use default if available
      if (prop.default !== undefined) {
        params[key] = prop.default;
        confidence += 0.1;
      } else if (skill.parameters.required?.includes(key)) {
        missing.push(key);
        suggestions.push({
          param: key,
          suggestion: `Please provide ${prop.description}`,
        });
      }
    }

    const totalParams = Object.keys(skill.parameters.properties).length;
    confidence = totalParams > 0 ? confidence / totalParams : 0;

    return {
      params,
      confidence,
      missing,
      invalid,
      suggestions,
    };
  }

  /**
   * Extract parameters using LLM
   */
  private async extractWithLLM(
    input: string,
    skill: Skill,
    llmProvider: { complete(prompt: string): Promise<{ content: string }> }
  ): Promise<ExtractionResult> {
    const prompt = this.buildExtractionPrompt(input, skill);

    try {
      const response = await llmProvider.complete(prompt);
      const parsed = JSON.parse(response.content);

      return {
        params: parsed.params || {},
        confidence: parsed.confidence || 0.8,
        missing: parsed.missing || [],
        invalid: parsed.invalid || [],
        suggestions: parsed.suggestions || [],
      };
    } catch {
      // Fallback to empty result
      return {
        params: {},
        confidence: 0,
        missing: skill.parameters.required || [],
        invalid: [],
        suggestions: [],
      };
    }
  }

  /**
   * Build LLM extraction prompt
   */
  private buildExtractionPrompt(input: string, skill: Skill): string {
    const params = Object.entries(skill.parameters.properties)
      .map(([key, prop]) => {
        const required = skill.parameters.required?.includes(key) ? ' (required)' : '';
        const type = prop.type ? ` [${prop.type}]` : '';
        const enum_ = prop.enum ? ` enum: [${prop.enum.join(', ')}]` : '';
        return `- ${key}${type}${required}: ${prop.description}${enum_}`;
      })
      .join('\n');

    return `Extract parameters from the user input for the skill "${skill.name}".

Skill description: ${skill.description}

Parameters:
${params}

User input: "${input}"

Return a JSON object with this structure:
{
  "params": { "paramName": "extractedValue", ... },
  "confidence": 0.0-1.0,
  "missing": ["paramName", ...],
  "invalid": [{"param": "name", "reason": "why invalid"}],
  "suggestions": [{"param": "name", "suggestion": "helpful suggestion"}]
}`;
  }

  /**
   * Merge extraction results from multiple strategies
   */
  private mergeResults(results: ExtractionResult[], skill: Skill): ExtractionResult {
    const merged: Record<string, unknown> = {};
    const missing = new Set<string>();
    const invalid: Array<{ param: string; reason: string }> = [];
    const suggestions: Array<{ param: string; suggestion: string }> = [];
    let totalConfidence = 0;

    // Weight results by confidence
    const weights = results.map(r => r.confidence);

    for (const key of Object.keys(skill.parameters.properties)) {
      const prop = skill.parameters.properties[key];
      const values: Array<{ value: unknown; weight: number }> = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (key in result.params) {
          values.push({ value: result.params[key], weight: weights[i] });
        }
      }

      if (values.length > 0) {
        // Use highest confidence value
        values.sort((a, b) => b.weight - a.weight);
        merged[key] = values[0].value;
        totalConfidence += values[0].weight;
      } else if (skill.parameters.required?.includes(key)) {
        missing.add(key);
      } else if (prop.default !== undefined) {
        merged[key] = prop.default;
        totalConfidence += 0.1;
      }
    }

    // Collect all missing, invalid, and suggestions
    for (const result of results) {
      result.missing.forEach(m => missing.add(m));
      invalid.push(...result.invalid);
      suggestions.push(...result.suggestions);
    }

    const totalParams = Object.keys(skill.parameters.properties).length;
    const avgConfidence = totalParams > 0 ? totalConfidence / totalParams : 0;

    return {
      params: merged,
      confidence: avgConfidence,
      missing: Array.from(missing),
      invalid,
      suggestions,
    };
  }

  /**
   * Generate helpful suggestion for invalid parameter
   */
  private generateSuggestion(schema: ParameterSchema, reason?: string): string {
    if (schema.enum) {
      return `Please use one of: ${schema.enum.join(', ')}`;
    }
    if (schema.pattern) {
      return `Value must match pattern: ${schema.pattern}`;
    }
    if (schema.min !== undefined || schema.max !== undefined) {
      const range = `${schema.min ?? 'min'} to ${schema.max ?? 'max'}`;
      return `Value must be within range ${range}`;
    }
    return reason || `Please provide valid ${schema.type}`;
  }

  /**
   * Validate all parameters against schema
   */
  validate(params: Record<string, unknown>, skill: Skill): ExtractionResult {
    const missing: string[] = [];
    const invalid: Array<{ param: string; reason: string }> = [];

    for (const key of Object.keys(skill.parameters.properties)) {
      const prop = skill.parameters.properties[key];
      if (!(key in params)) {
        if (skill.parameters.required?.includes(key)) {
          missing.push(key);
        }
        continue;
      }

      const schema = this.convertPropertyToSchema(prop);
      const validation = this.validateValue(params[key], schema);
      if (!validation.valid) {
        invalid.push({ param: key, reason: validation.reason || 'Invalid value' });
      }
    }

    return {
      params,
      confidence: 1.0,
      missing,
      invalid,
      suggestions: invalid.map(inv => ({
        param: inv.param,
        suggestion: this.generateSuggestion(
          this.convertPropertyToSchema(skill.parameters.properties[inv.param]),
          inv.reason
        ),
      })),
    };
  }
}

export default ParameterExtractor;
