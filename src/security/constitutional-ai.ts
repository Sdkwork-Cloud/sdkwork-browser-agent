/**
 * Constitutional AI
 *
 * Implements safety and alignment checks based on constitutional principles.
 * Ensures AI behavior adheres to defined ethical and safety guidelines.
 * Compatible with both browser and Node.js environments.
 */

import type { LLMProvider, LLMRequest } from '../llm/provider';

// ============================================
// Types
// ============================================

export interface ConstitutionalPrinciple {
  id: string;
  name: string;
  description: string;
  category: 'safety' | 'ethics' | 'quality' | 'privacy';
  rules: string[];
  severity: 'block' | 'warn' | 'log';
  examples: {
    compliant: string[];
    nonCompliant: string[];
  };
}

export interface ConstitutionalViolation {
  principleId: string;
  severity: 'block' | 'warn' | 'log';
  reason: string;
  suggestion: string;
}

export interface ConstitutionalResult {
  approved: boolean;
  violations: ConstitutionalViolation[];
  revisedOutput?: string;
  riskScore: number;
}

export interface ConstitutionalConfig {
  principles: ConstitutionalPrinciple[];
  llmProvider?: LLMProvider;
  autoRevise: boolean;
  riskThreshold: number;
}

// ============================================
// Default Principles
// ============================================

export const DEFAULT_PRINCIPLES: ConstitutionalPrinciple[] = [
  {
    id: 'harm-prevention',
    name: 'Harm Prevention',
    description: 'Do not generate content that could cause physical, emotional, or financial harm',
    category: 'safety',
    severity: 'block',
    rules: [
      'No instructions for creating weapons or dangerous substances',
      'No encouragement of self-harm or violence',
      'No content that could be used to exploit vulnerable individuals',
    ],
    examples: {
      compliant: ['Here are resources for mental health support...'],
      nonCompliant: ['Here is how to make a weapon...'],
    },
  },
  {
    id: 'privacy-protection',
    name: 'Privacy Protection',
    description: 'Respect user privacy and data protection',
    category: 'privacy',
    severity: 'block',
    rules: [
      'Do not request or store sensitive personal information unnecessarily',
      'Do not share private information about individuals',
      'Respect data minimization principles',
    ],
    examples: {
      compliant: ['I can help you without needing that information.'],
      nonCompliant: ['Please provide your social security number.'],
    },
  },
  {
    id: 'truthfulness',
    name: 'Truthfulness',
    description: 'Provide accurate information and acknowledge uncertainty',
    category: 'quality',
    severity: 'warn',
    rules: [
      'Do not present speculation as fact',
      'Acknowledge when information may be outdated or uncertain',
      'Correct clear factual errors when identified',
    ],
    examples: {
      compliant: ['Based on my training data, which ends in 2024...'],
      nonCompliant: ['I am certain that [outdated fact] is true today.'],
    },
  },
  {
    id: 'fairness',
    name: 'Fairness',
    description: 'Treat all individuals fairly and avoid bias',
    category: 'ethics',
    severity: 'warn',
    rules: [
      'Avoid stereotypes and generalizations about groups',
      'Provide balanced perspectives on controversial topics',
      'Do not discriminate based on protected characteristics',
    ],
    examples: {
      compliant: ['People from all backgrounds can succeed in this field...'],
      nonCompliant: ['People from [group] are naturally better at...'],
    },
  },
];

// ============================================
// Constitutional AI
// ============================================

export class ConstitutionalAI {
  private principles: ConstitutionalPrinciple[];
  private llmProvider?: LLMProvider;
  private config: ConstitutionalConfig;

  constructor(config: Partial<ConstitutionalConfig> = {}) {
    this.principles = config.principles || DEFAULT_PRINCIPLES;
    this.llmProvider = config.llmProvider;
    this.config = {
      principles: this.principles,
      autoRevise: config.autoRevise ?? true,
      riskThreshold: config.riskThreshold ?? 0.7,
      ...config,
    };
  }

  /**
   * Evaluate content against constitutional principles
   */
  async evaluate(input: string, output: string, context?: Record<string, unknown>): Promise<ConstitutionalResult> {
    const violations: ConstitutionalViolation[] = [];

    for (const principle of this.principles) {
      const evaluation = await this.evaluatePrinciple(principle, input, output, context);

      if (!evaluation.compliant) {
        violations.push({
          principleId: principle.id,
          severity: principle.severity,
          reason: evaluation.reason,
          suggestion: evaluation.suggestion,
        });
      }
    }

    const blocked = violations.some((v) => v.severity === 'block');
    const riskScore = this.calculateRiskScore(violations);

    return {
      approved: !blocked && riskScore < this.config.riskThreshold,
      violations,
      revisedOutput: !blocked && this.config.autoRevise ? await this.reviseIfNeeded(output, violations) : undefined,
      riskScore,
    };
  }

  /**
   * Evaluate a single principle
   */
  private async evaluatePrinciple(
    principle: ConstitutionalPrinciple,
    input: string,
    output: string,
    context?: Record<string, unknown>
  ): Promise<{ compliant: boolean; reason: string; suggestion: string }> {
    if (!this.llmProvider) {
      return this.ruleBasedEvaluation(principle, output);
    }

    const prompt = this.buildEvaluationPrompt(principle, input, output, context);

    try {
      const request: LLMRequest = {
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
      };

      const response = await this.llmProvider.complete(request);
      return this.parseEvaluationResponse(response.content);
    } catch (error) {
      // Fallback to rule-based evaluation
      return this.ruleBasedEvaluation(principle, output);
    }
  }

  /**
   * Build evaluation prompt
   */
  private buildEvaluationPrompt(
    principle: ConstitutionalPrinciple,
    input: string,
    output: string,
    context?: Record<string, unknown>
  ): string {
    return `You are a Constitutional AI evaluator. Assess if the following output complies with the given principle.

Principle: ${principle.name}
Description: ${principle.description}
Rules:
${principle.rules.map((r) => `- ${r}`).join('\n')}

User Input: ${input}
AI Output: ${output}
${context ? `Context: ${JSON.stringify(context)}` : ''}

Examples of non-compliant outputs:
${principle.examples.nonCompliant.map((e) => `- ${e}`).join('\n')}

Evaluate compliance and respond in JSON format:
{
  "compliant": boolean,
  "reason": "explanation if non-compliant",
  "suggestion": "how to fix if non-compliant"
}`;
  }

  /**
   * Parse evaluation response
   */
  private parseEvaluationResponse(content: string): { compliant: boolean; reason: string; suggestion: string } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          compliant: parsed.compliant ?? true,
          reason: parsed.reason || '',
          suggestion: parsed.suggestion || '',
        };
      }
    } catch {
      // JSON parsing failed
    }

    // Default to compliant if parsing fails
    return { compliant: true, reason: '', suggestion: '' };
  }

  /**
   * Rule-based evaluation as fallback
   */
  private ruleBasedEvaluation(principle: ConstitutionalPrinciple, output: string): { compliant: boolean; reason: string; suggestion: string } {
    const outputLower = output.toLowerCase();

    // Check for obvious violations based on keywords
    const violationKeywords: Record<string, string[]> = {
      'harm-prevention': ['weapon', 'bomb', 'kill', 'hurt', 'harm yourself', 'suicide'],
      'privacy-protection': ['ssn', 'password', 'credit card', 'bank account'],
    };

    const keywords = violationKeywords[principle.id];
    if (keywords) {
      for (const keyword of keywords) {
        if (outputLower.includes(keyword)) {
          return {
            compliant: false,
            reason: `Potential violation detected: contains "${keyword}"`,
            suggestion: 'Remove or rephrase the problematic content',
          };
        }
      }
    }

    return { compliant: true, reason: '', suggestion: '' };
  }

  /**
   * Revise output if needed
   */
  private async reviseIfNeeded(originalOutput: string, violations: ConstitutionalViolation[]): Promise<string> {
    if (!this.llmProvider || violations.length === 0) {
      return originalOutput;
    }

    const revisionPrompt = `Revise the following output to address these constitutional violations:

Original Output: ${originalOutput}

Violations:
${violations.map((v) => `- ${v.reason}`).join('\n')}

Please provide a revised version that addresses all violations while maintaining the original intent.`;

    try {
      const request: LLMRequest = {
        messages: [{ role: 'user', content: revisionPrompt }],
        temperature: 0.7,
        max_tokens: 1000,
      };

      const response = await this.llmProvider.complete(request);
      return response.content;
    } catch {
      return originalOutput;
    }
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(violations: ConstitutionalViolation[]): number {
    if (violations.length === 0) return 0;

    let score = 0;
    for (const violation of violations) {
      switch (violation.severity) {
        case 'block':
          score += 0.5;
          break;
        case 'warn':
          score += 0.3;
          break;
        case 'log':
          score += 0.1;
          break;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Add a custom principle
   */
  addPrinciple(principle: ConstitutionalPrinciple): void {
    this.principles.push(principle);
  }

  /**
   * Remove a principle
   */
  removePrinciple(principleId: string): boolean {
    const index = this.principles.findIndex((p) => p.id === principleId);
    if (index >= 0) {
      this.principles.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all principles
   */
  getPrinciples(): ConstitutionalPrinciple[] {
    return [...this.principles];
  }
}

// ============================================
// Prompt Injection Guard
// ============================================

export interface PromptGuardConfig {
  enabled: boolean;
  detectionLevel: 'basic' | 'advanced' | 'paranoid';
  customPatterns?: RegExp[];
  maxNestingDepth: number;
}

export interface ScanResult {
  safe: boolean;
  riskScore: number;
  findings: InjectionFinding[];
  sanitizedInput?: string;
}

export interface InjectionFinding {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  location?: { start: number; end: number };
}

export interface ScanContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

export class PromptInjectionGuard {
  private config: PromptGuardConfig;

  // Known injection patterns
  private static readonly INJECTION_PATTERNS: Array<{ pattern: RegExp; type: string; severity: 'critical' | 'high' | 'medium' | 'low' }> = [
    { pattern: /ignore\s+(?:previous|above|prior)\s+instructions?/i, type: 'instruction_override', severity: 'high' },
    { pattern: /you\s+are\s+now\s+(?:a|an)\s+/i, type: 'role_playing', severity: 'high' },
    { pattern: /pretend\s+(?:to\s+be|you\s+are)/i, type: 'role_playing', severity: 'medium' },
    { pattern: /act\s+as\s+(?:if\s+you\s+are|though)/i, type: 'role_playing', severity: 'medium' },
    { pattern: /```\s*system/i, type: 'delimiter_attack', severity: 'critical' },
    { pattern: /<\s*system\s*>/i, type: 'delimiter_attack', severity: 'critical' },
    { pattern: /\[system\]/i, type: 'delimiter_attack', severity: 'high' },
    { pattern: /DAN\s*\(/i, type: 'jailbreak', severity: 'high' },
    { pattern: /jailbreak/i, type: 'jailbreak', severity: 'high' },
    { pattern: /developer\s+mode/i, type: 'jailbreak', severity: 'medium' },
    { pattern: /ignore\s+ethical/i, type: 'ethics_override', severity: 'critical' },
  ];

  constructor(config: Partial<PromptGuardConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      detectionLevel: config.detectionLevel ?? 'advanced',
      customPatterns: config.customPatterns || [],
      maxNestingDepth: config.maxNestingDepth ?? 3,
    };
  }

  /**
   * Scan input for injection attacks
   */
  scan(input: string, context?: ScanContext): ScanResult {
    if (!this.config.enabled) {
      return { safe: true, riskScore: 0, findings: [] };
    }

    const findings: InjectionFinding[] = [];

    // 1. Pattern matching detection
    const patternFindings = this.detectPatternMatches(input);
    findings.push(...patternFindings);

    // 2. Nesting depth detection
    const nestingFinding = this.checkNestingDepth(input);
    if (nestingFinding) findings.push(nestingFinding);

    // 3. Semantic analysis (advanced mode)
    if (this.config.detectionLevel !== 'basic') {
      const semanticFindings = this.semanticAnalysis(input);
      findings.push(...semanticFindings);
    }

    const riskScore = this.calculateRiskScore(findings);
    const blocked = riskScore > 0.8 || findings.some((f) => f.severity === 'critical');

    return {
      safe: !blocked,
      riskScore,
      findings,
      sanitizedInput: blocked ? undefined : this.sanitize(input, findings),
    };
  }

  /**
   * Detect pattern matches
   */
  private detectPatternMatches(input: string): InjectionFinding[] {
    const findings: InjectionFinding[] = [];

    for (const { pattern, type, severity } of PromptInjectionGuard.INJECTION_PATTERNS) {
      const matches = input.match(pattern);
      if (matches) {
        findings.push({
          type,
          severity,
          description: `Detected ${type} pattern: "${matches[0]}"`,
          location: matches.index !== undefined ? { start: matches.index, end: matches.index + matches[0].length } : undefined,
        });
      }
    }

    // Check custom patterns
    for (const pattern of this.config.customPatterns || []) {
      const matches = input.match(pattern);
      if (matches) {
        findings.push({
          type: 'custom',
          severity: 'high',
          description: `Matched custom pattern: "${matches[0]}"`,
          location: matches.index !== undefined ? { start: matches.index, end: matches.index + matches[0].length } : undefined,
        });
      }
    }

    return findings;
  }

  /**
   * Check nesting depth
   */
  private checkNestingDepth(input: string): InjectionFinding | null {
    let maxDepth = 0;
    let currentDepth = 0;

    for (const char of input) {
      if (char === '(' || char === '[' || char === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === ')' || char === ']' || char === '}') {
        currentDepth--;
      }
    }

    if (maxDepth > this.config.maxNestingDepth) {
      return {
        type: 'deep_nesting',
        severity: 'medium',
        description: `Excessive nesting depth detected: ${maxDepth}`,
      };
    }

    return null;
  }

  /**
   * Semantic analysis
   */
  private semanticAnalysis(input: string): InjectionFinding[] {
    const findings: InjectionFinding[] = [];

    // Detect instruction conflicts
    const instructions = this.extractInstructions(input);
    if (instructions.length > 3) {
      findings.push({
        type: 'multiple_instructions',
        severity: 'medium',
        description: `Multiple conflicting instructions detected: ${instructions.length}`,
      });
    }

    // Detect context switches
    const contextSwitches = this.detectContextSwitches(input);
    if (contextSwitches > 2) {
      findings.push({
        type: 'context_switching',
        severity: 'medium',
        description: `Frequent context switching detected: ${contextSwitches}`,
      });
    }

    return findings;
  }

  /**
   * Extract instructions from input
   */
  private extractInstructions(input: string): string[] {
    const instructions: string[] = [];
    const patterns = [/\b(do|don't|never|always|ignore|forget)\b/gi, /\b(you must|you should|you need to)\b/gi];

    for (const pattern of patterns) {
      const matches = input.match(pattern);
      if (matches) {
        instructions.push(...matches);
      }
    }

    return instructions;
  }

  /**
   * Detect context switches
   */
  private detectContextSwitches(input: string): number {
    const switchPatterns = [/\b(but|however|instead|rather)\b/gi, /\b(on the other hand|in contrast)\b/gi];
    let count = 0;

    for (const pattern of switchPatterns) {
      const matches = input.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }

    return count;
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(findings: InjectionFinding[]): number {
    if (findings.length === 0) return 0;

    let score = 0;
    for (const finding of findings) {
      switch (finding.severity) {
        case 'critical':
          score += 0.5;
          break;
        case 'high':
          score += 0.3;
          break;
        case 'medium':
          score += 0.15;
          break;
        case 'low':
          score += 0.05;
          break;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Sanitize input
   */
  private sanitize(input: string, findings: InjectionFinding[]): string {
    let sanitized = input;

    // Sort by location (end first to avoid offset issues)
    const sortedFindings = findings
      .filter((f) => f.location)
      .sort((a, b) => (b.location!.end || 0) - (a.location!.end || 0));

    for (const finding of sortedFindings) {
      if (finding.location) {
        const before = sanitized.slice(0, finding.location.start);
        const after = sanitized.slice(finding.location.end);
        sanitized = before + '[REDACTED]' + after;
      }
    }

    return sanitized;
  }
}

// ============================================
// Export
// ============================================

export { ConstitutionalAI as default };
