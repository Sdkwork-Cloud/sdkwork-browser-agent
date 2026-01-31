/**
 * Unified Error Handling System
 *
 * Provides standardized error types, codes, and handling utilities.
 */

import type { ErrorCode } from '../types';

// ============================================
// Error Codes
// ============================================

export const ErrorCodes = {
  // Skill Errors
  SKILL_NOT_FOUND: 'SKILL_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  EXECUTION_ERROR: 'EXECUTION_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  COMPOSITE_ERROR: 'COMPOSITE_ERROR',
  SUBSKILL_ERROR: 'SUBSKILL_ERROR',

  // MCP Errors
  MCP_ERROR: 'MCP_ERROR',
  MCP_CONNECTION_ERROR: 'MCP_CONNECTION_ERROR',
  MCP_TIMEOUT_ERROR: 'MCP_TIMEOUT_ERROR',
  MCP_NOT_FOUND: 'MCP_NOT_FOUND',

  // LLM Errors
  LLM_ERROR: 'LLM_ERROR',
  LLM_RATE_LIMIT: 'LLM_RATE_LIMIT',
  LLM_CONTEXT_LENGTH: 'LLM_CONTEXT_LENGTH',

  // Config Errors
  CONFIG_ERROR: 'CONFIG_ERROR',
  CONFIG_VALIDATION: 'CONFIG_VALIDATION',
  CONFIG_MISSING: 'CONFIG_MISSING',

  // System Errors
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// Type for error codes
export type ErrorCodeType = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================
// Base Agent Error
// ============================================

export class AgentError extends Error {
  readonly code: ErrorCodeType;
  readonly details?: unknown;
  readonly timestamp: Date;
  readonly isRetryable: boolean;
  readonly causeError?: Error;

  constructor(
    code: ErrorCodeType,
    message: string,
    options?: {
      details?: unknown;
      cause?: Error;
      isRetryable?: boolean;
    }
  ) {
    super(message);
    this.name = 'AgentError';
    this.code = code;
    this.details = options?.details;
    this.causeError = options?.cause;
    this.timestamp = new Date();
    this.isRetryable = options?.isRetryable ?? false;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AgentError.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      isRetryable: this.isRetryable,
      stack: this.stack,
      cause: this.causeError instanceof Error
        ? { message: this.causeError.message, stack: this.causeError.stack }
        : undefined,
    };
  }
}

// ============================================
// Specialized Error Classes
// ============================================

export class SkillError extends AgentError {
  readonly skillName: string;

  constructor(
    code: ErrorCodeType,
    skillName: string,
    message: string,
    options?: { details?: unknown; cause?: Error }
  ) {
    super(code, message, options);
    this.name = 'SkillError';
    this.skillName = skillName;
  }
}

export class MCPError extends AgentError {
  readonly toolName?: string;
  readonly serverName?: string;

  constructor(
    code: ErrorCodeType,
    message: string,
    options?: {
      toolName?: string;
      serverName?: string;
      details?: unknown;
      cause?: Error;
    }
  ) {
    super(code, message, {
      ...options,
      isRetryable: code === ErrorCodes.MCP_TIMEOUT_ERROR ||
                   code === ErrorCodes.MCP_CONNECTION_ERROR,
    });
    this.name = 'MCPError';
    this.toolName = options?.toolName;
    this.serverName = options?.serverName;
  }
}

export class ValidationError extends AgentError {
  readonly field?: string;
  readonly value?: unknown;

  constructor(
    message: string,
    options?: {
      field?: string;
      value?: unknown;
      details?: unknown;
    }
  ) {
    super(ErrorCodes.VALIDATION_ERROR, message, options);
    this.name = 'ValidationError';
    this.field = options?.field;
    this.value = options?.value;
  }
}

export class TimeoutError extends AgentError {
  readonly timeoutMs: number;
  readonly operation: string;

  constructor(operation: string, timeoutMs: number) {
    super(
      ErrorCodes.TIMEOUT_ERROR,
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      { isRetryable: true }
    );
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
    this.operation = operation;
  }
}

// ============================================
// Error Utilities
// ============================================

export function isAgentError(error: unknown): error is AgentError {
  return error instanceof AgentError;
}

export function isRetryableError(error: unknown): boolean {
  if (isAgentError(error)) {
    return error.isRetryable;
  }
  // Network errors are typically retryable
  if (error instanceof Error) {
    const retryableMessages = [
      'network',
      'timeout',
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
    ];
    return retryableMessages.some(msg =>
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }
  return false;
}

export function toAgentError(error: unknown): AgentError {
  if (isAgentError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AgentError(
      ErrorCodes.UNKNOWN_ERROR,
      error.message,
      { cause: error }
    );
  }

  return new AgentError(
    ErrorCodes.UNKNOWN_ERROR,
    String(error)
  );
}

export function createErrorResult(error: unknown): {
  success: false;
  error: {
    code: ErrorCodeType;
    message: string;
    details?: unknown;
    stack?: string;
  };
} {
  const agentError = toAgentError(error);
  return {
    success: false,
    error: {
      code: agentError.code,
      message: agentError.message,
      details: agentError.details,
      stack: agentError.stack,
    },
  };
}

// ============================================
// Retry Utilities
// ============================================

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableCodes?: ErrorCodeType[];
}

export const DefaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableCodes: [
    ErrorCodes.MCP_TIMEOUT_ERROR,
    ErrorCodes.MCP_CONNECTION_ERROR,
    ErrorCodes.TIMEOUT_ERROR,
    ErrorCodes.LLM_RATE_LIMIT,
  ],
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  operationName: string = 'operation'
): Promise<T> {
  const retryConfig = { ...DefaultRetryConfig, ...config };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const agentError = toAgentError(error);
      const shouldRetry = attempt < retryConfig.maxRetries &&
        isRetryableError(error) &&
        (!retryConfig.retryableCodes ||
         retryConfig.retryableCodes.includes(agentError.code));

      if (!shouldRetry) {
        throw error;
      }

      const delay = Math.min(
        retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
        retryConfig.maxDelay
      );

      console.log(`[Retry] ${operationName} failed (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}), retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// Error Handler Registry
// ============================================

export type ErrorHandler = (error: AgentError) => void | Promise<void>;

export class ErrorHandlerRegistry {
  private handlers = new Map<ErrorCodeType, ErrorHandler[]>();
  private globalHandlers: ErrorHandler[] = [];

  register(code: ErrorCodeType, handler: ErrorHandler): () => void {
    const handlers = this.handlers.get(code) || [];
    handlers.push(handler);
    this.handlers.set(code, handlers);

    return () => {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  registerGlobal(handler: ErrorHandler): () => void {
    this.globalHandlers.push(handler);
    return () => {
      const index = this.globalHandlers.indexOf(handler);
      if (index > -1) {
        this.globalHandlers.splice(index, 1);
      }
    };
  }

  async handle(error: AgentError): Promise<void> {
    // Call specific handlers
    const specificHandlers = this.handlers.get(error.code) || [];
    for (const handler of specificHandlers) {
      try {
        await handler(error);
      } catch (handlerError) {
        console.error('[ErrorHandler] Handler failed:', handlerError);
      }
    }

    // Call global handlers
    for (const handler of this.globalHandlers) {
      try {
        await handler(error);
      } catch (handlerError) {
        console.error('[ErrorHandler] Global handler failed:', handlerError);
      }
    }
  }
}

// Global error handler instance
export const errorHandlerRegistry = new ErrorHandlerRegistry();

// ============================================
// Safe Execution Wrapper
// ============================================

export async function safeExecute<T>(
  operation: () => Promise<T>,
  options?: {
    operationName?: string;
    onError?: (error: AgentError) => void;
    defaultValue?: T;
  }
): Promise<{ success: true; data: T } | { success: false; error: AgentError }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const agentError = toAgentError(error);

    if (options?.onError) {
      try {
        options.onError(agentError);
      } catch (callbackError) {
        console.error('[safeExecute] Error callback failed:', callbackError);
      }
    }

    // Log error
    console.error(`[safeExecute] ${options?.operationName || 'Operation'} failed:`, {
      code: agentError.code,
      message: agentError.message,
      details: agentError.details,
    });

    if (options?.defaultValue !== undefined) {
      return { success: true, data: options.defaultValue };
    }

    return { success: false, error: agentError };
  }
}
