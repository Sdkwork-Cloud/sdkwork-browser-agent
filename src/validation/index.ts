/**
 * Input Validation Layer
 *
 * Provides runtime type validation using Zod schemas.
 * Ensures all inputs are properly validated before processing.
 */

import { z, type ZodSchema, type ZodError } from 'zod';

// ============================================
// Re-export Zod for convenience
// ============================================

export { z, ZodSchema, ZodError };

// ============================================
// Common Validation Schemas
// ============================================

/**
 * UUID schema
 */
export const uuidSchema = z.string().uuid();

/**
 * Non-empty string schema
 */
export const nonEmptyStringSchema = z.string().min(1);

/**
 * Positive integer schema
 */
export const positiveIntegerSchema = z.number().int().positive();

/**
 * Percentage schema (0-100)
 */
export const percentageSchema = z.number().min(0).max(100);

/**
 * JSON object schema
 */
export const jsonObjectSchema = z.record(z.unknown());

/**
 * JSON array schema
 */
export const jsonArraySchema = z.array(z.unknown());

// ============================================
// Skill Validation Schemas
// ============================================

/**
 * Skill metadata schema
 */
export const skillMetadataSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  author: z.string().optional(),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
  license: z.string().optional(),
  compatibility: z.string().optional(),
});

/**
 * Skill lifecycle schema
 */
export const skillLifecycleSchema = z.object({
  lazyLoad: z.boolean().default(true),
  cacheable: z.boolean().default(true),
  timeout: z.number().int().positive().default(30000),
  retries: z.number().int().min(0).default(0),
});

/**
 * Skill parameters schema (JSON Schema 7)
 */
export const skillParametersSchema = z.object({
  type: z.literal('object'),
  properties: z.record(z.object({
    type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
    description: z.string().optional(),
    default: z.unknown().optional(),
    enum: z.array(z.unknown()).optional(),
  })).optional(),
  required: z.array(z.string()).default([]),
  additionalProperties: z.boolean().default(false),
});

/**
 * Complete skill schema
 */
export const skillSchema = z.object({
  metadata: skillMetadataSchema,
  parameters: skillParametersSchema,
  lifecycle: skillLifecycleSchema,
  readme: z.string().optional(),
  examples: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    parameters: z.record(z.unknown()),
    expectedOutput: z.string().optional(),
  })).optional(),
});

// ============================================
// Agent Configuration Validation
// ============================================

/**
 * Agent configuration schema
 */
export const agentConfigSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
  systemPrompt: z.string().max(10000).optional(),
  maxIterations: z.number().int().positive().default(10),
  timeout: z.number().int().positive().default(60000),
});

/**
 * Smart agent configuration schema
 */
export const smartAgentConfigSchema = agentConfigSchema.extend({
  autoDecide: z.boolean().default(true),
  maxAutoIterations: z.number().int().positive().default(5),
  enableStreaming: z.boolean().default(true),
  evaluationEnabled: z.boolean().default(true),
  evaluationLevel: z.enum(['none', 'basic', 'standard', 'strict']).default('standard'),
});

// ============================================
// MCP Validation Schemas
// ============================================

/**
 * MCP server configuration schema
 */
export const mcpServerConfigSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  auth: z.object({
    type: z.enum(['bearer', 'apiKey']),
    token: z.string().min(1),
  }).optional(),
  timeout: z.number().int().positive().default(30000),
  retries: z.number().int().min(0).default(3),
});

/**
 * MCP tool call schema
 */
export const mcpToolCallSchema = z.object({
  toolName: z.string().min(1),
  args: z.record(z.unknown()).default({}),
  timeout: z.number().int().positive().optional(),
});

// ============================================
// Execution Context Validation
// ============================================

/**
 * Execution context schema
 */
export const executionContextSchema = z.object({
  executionId: uuidSchema,
  sessionId: z.string().min(1),
  skillName: z.string().min(1),
  parentExecutionId: uuidSchema.optional(),
  timestamp: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================
// Validation Functions
// ============================================

/**
 * Validate data against schema
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): {
  success: true;
  data: T;
} | {
  success: false;
  errors: string[];
} {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return {
      success: false,
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }
}

/**
 * Validate with partial schema (for updates)
 */
export function validatePartial<T>(schema: ZodSchema<T>, data: unknown): {
  success: true;
  data: Partial<T>;
} | {
  success: false;
  errors: string[];
} {
  // Use deepPartial for object schemas
  const partialSchema = (schema as any).deepPartial?.() || schema;
  return validate(partialSchema, data);
}

/**
 * Validate async (for async schemas)
 */
export async function validateAsync<T>(
  schema: ZodSchema<T>,
  data: unknown
): Promise<{
  success: true;
  data: T;
} | {
  success: false;
  errors: string[];
}> {
  const result = await schema.safeParseAsync(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return {
      success: false,
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }
}

// ============================================
// Decorators for Method Validation
// ============================================

/**
 * Method parameter validation decorator
 */
export function ValidateParams(...schemas: ZodSchema<unknown>[]) {
  return function (
    _target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      // Validate each parameter
      for (let i = 0; i < schemas.length && i < args.length; i++) {
        const result = schemas[i].safeParse(args[i]);
        if (!result.success) {
          const errors = result.error.errors.map(e =>
            `Parameter ${i} at ${e.path.join('.')}: ${e.message}`
          );
          throw new Error(`Validation failed for ${propertyKey}: ${errors.join(', ')}`);
        }
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Method return value validation decorator
 */
export function ValidateReturn<T>(schema: ZodSchema<T>) {
  return function (
    _target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const result = await originalMethod.apply(this, args);
      const validation = schema.safeParse(result);

      if (!validation.success) {
        const errors = validation.error.errors.map(e =>
          `${e.path.join('.')}: ${e.message}`
        );
        throw new Error(`Return validation failed for ${propertyKey}: ${errors.join(', ')}`);
      }

      return validation.data;
    };

    return descriptor;
  };
}

// ============================================
// Input Sanitization
// ============================================

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control characters
}

/**
 * Sanitize object input
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

// ============================================
// Guard Functions
// ============================================

/**
 * Type guard for non-null values
 */
export function isNonNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard for non-empty strings
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Type guard for positive integers
 */
export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Type guard for valid JSON objects
 */
export function isValidJSONObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// Validation Middleware
// ============================================

export interface ValidationMiddlewareConfig {
  validateInput: boolean;
  validateOutput: boolean;
  sanitizeInput: boolean;
  onValidationError: (errors: string[]) => void;
}

export const defaultValidationConfig: ValidationMiddlewareConfig = {
  validateInput: true,
  validateOutput: false,
  sanitizeInput: true,
  onValidationError: (errors) => {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  },
};

/**
 * Create validation middleware
 */
export function createValidationMiddleware(
  inputSchema?: ZodSchema<unknown>,
  outputSchema?: ZodSchema<unknown>,
  config: Partial<ValidationMiddlewareConfig> = {}
) {
  const fullConfig = { ...defaultValidationConfig, ...config };

  return async function<T extends (...args: unknown[]) => unknown>(
    fn: T,
    ...args: Parameters<T>
  ): Promise<ReturnType<T>> {
    // Validate input
    if (fullConfig.validateInput && inputSchema) {
      const input = args[0];
      const result = inputSchema.safeParse(input);

      if (!result.success) {
        const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        fullConfig.onValidationError(errors);
        return undefined as ReturnType<T>;
      }

      // Sanitize if enabled
      if (fullConfig.sanitizeInput && typeof input === 'object' && input !== null) {
        args[0] = sanitizeObject(input as Record<string, unknown>) as Parameters<T>[0];
      }
    }

    // Execute function
    const output = await fn(...args);

    // Validate output
    if (fullConfig.validateOutput && outputSchema) {
      const result = outputSchema.safeParse(output);

      if (!result.success) {
        const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        fullConfig.onValidationError(errors);
        return undefined as ReturnType<T>;
      }
    }

    return output as ReturnType<T>;
  };
}
