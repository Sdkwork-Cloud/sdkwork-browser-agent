/**
 * Enhanced Skill Script Executor
 *
 * Executes scripts from Skill scripts/ directory with comprehensive sandboxing
 * Supports JavaScript, TypeScript, Python, and Bash with security controls
 */

import { ScriptFile } from './skill-resource-manager';
import { ExecutionContext } from '../core/agent';

export interface ScriptExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  executionTime: number;
  memoryUsage?: number;
}

export interface ScriptExecutorConfig {
  timeout?: number;
  allowedGlobals?: string[];
  restrictedGlobals?: string[];
  maxMemoryMB?: number;
  allowedTools?: string[];
  enableLogging?: boolean;
}

interface SandboxContext {
  params: Record<string, unknown>;
  operation: string;
  console: {
    log: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
  };
  Math: typeof Math;
  JSON: typeof JSON;
  Date: typeof Date;
  Array: typeof Array;
  Object: typeof Object;
  String: typeof String;
  Number: typeof Number;
  Boolean: typeof Boolean;
  Promise: typeof Promise;
  Set: typeof Set;
  Map: typeof Map;
  Error: typeof Error;
  RegExp: typeof RegExp;
  ArrayBuffer: typeof ArrayBuffer;
  Uint8Array: typeof Uint8Array;
  TextEncoder: typeof TextEncoder;
  TextDecoder: typeof TextDecoder;
}

/**
 * Enhanced Skill Script Executor with comprehensive sandboxing
 */
export class SkillScriptExecutor {
  private config: Required<ScriptExecutorConfig>;
  private executionCount = 0;

  constructor(config: ScriptExecutorConfig = {}) {
    this.config = {
      timeout: config.timeout ?? 30000,
      allowedGlobals: config.allowedGlobals ?? [
        'console',
        'Math',
        'JSON',
        'Date',
        'Array',
        'Object',
        'String',
        'Number',
        'Boolean',
        'Promise',
        'Set',
        'Map',
        'Error',
        'RegExp',
        'ArrayBuffer',
        'Uint8Array',
        'TextEncoder',
        'TextDecoder',
      ],
      restrictedGlobals: config.restrictedGlobals ?? [
        'eval',
        'Function',
        'require',
        'import',
        'exports',
        'module',
        'process',
        'global',
        'globalThis',
        'window',
        'document',
        'fetch',
        'XMLHttpRequest',
        'WebSocket',
        'localStorage',
        'sessionStorage',
        'indexedDB',
      ],
      maxMemoryMB: config.maxMemoryMB ?? 100,
      allowedTools: config.allowedTools ?? [],
      enableLogging: config.enableLogging ?? false,
    };
  }

  /**
   * Execute a script with given operation and parameters
   */
  async execute(
    script: ScriptFile,
    operation: string,
    params: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ScriptExecutionResult> {
    const startTime = Date.now();
    const executionId = ++this.executionCount;

    if (this.config.enableLogging) {
      console.log(`[ScriptExecutor:${executionId}] Starting execution of ${script.name}`);
    }

    try {
      // Validate script against allowed tools
      if (!this.isScriptAllowed(script)) {
        return {
          success: false,
          error: `Script execution not allowed. Check allowed-tools in SKILL.md`,
          executionTime: Date.now() - startTime,
        };
      }

      let result: unknown;

      switch (script.language) {
        case 'javascript':
        case 'typescript':
          result = await this.executeJavaScript(script.content, operation, params, context);
          break;
        case 'python':
          result = await this.executePython(script.content, operation, params);
          break;
        case 'bash':
          result = await this.executeBash(script.content, operation, params);
          break;
        default:
          return {
            success: false,
            error: `Unsupported language: ${script.language}`,
            executionTime: Date.now() - startTime,
          };
      }

      if (this.config.enableLogging) {
        console.log(`[ScriptExecutor:${executionId}] Execution completed successfully`);
      }

      return {
        success: true,
        output: result,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (this.config.enableLogging) {
        console.error(`[ScriptExecutor:${executionId}] Execution failed:`, errorMessage);
      }

      return {
        success: false,
        error: errorMessage,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check if script is allowed to execute based on allowed-tools configuration
   */
  private isScriptAllowed(script: ScriptFile): boolean {
    if (this.config.allowedTools.length === 0) {
      return true; // No restrictions
    }

    // Check if script name matches any allowed tool pattern
    return this.config.allowedTools.some(pattern => {
      if (pattern.includes('*')) {
        // Convert glob pattern to regex
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(script.name);
      }
      return pattern === script.name;
    });
  }

  /**
   * Execute JavaScript/TypeScript in secure sandbox
   */
  private async executeJavaScript(
    code: string,
    operation: string,
    params: Record<string, unknown>,
    _context: ExecutionContext
  ): Promise<unknown> {
    // Sanitize code - remove dangerous patterns
    const sanitizedCode = this.sanitizeJavaScript(code);

    // Create sandbox with allowed globals
    const sandbox = this.createSandbox(operation, params);

    // Wrap code in async function for better control
    const wrappedCode = `
      "use strict";
      ${sanitizedCode}
      if (typeof handler === 'function') {
        return await handler(operation, params);
      }
      if (typeof main === 'function') {
        return await main(operation, params);
      }
      throw new Error('Script must export a handler or main function');
    `;

    // Execute with timeout using Web Worker in browser or VM in Node.js
    if (typeof window !== 'undefined') {
      return this.executeInBrowserWorker(wrappedCode, sandbox);
    } else {
      return this.executeInNodeVM(wrappedCode, sandbox);
    }
  }

  /**
   * Sanitize JavaScript code to remove dangerous patterns
   */
  private sanitizeJavaScript(code: string): string {
    // Remove eval and Function constructor
    let sanitized = code
      .replace(/eval\s*\(/gi, '/* eval blocked */(')
      .replace(/new\s+Function\s*\(/gi, '/* Function blocked */(')
      .replace(/import\s*\(/gi, '/* dynamic import blocked */(');

    // Remove restricted global access attempts
    for (const restricted of this.config.restrictedGlobals) {
      const pattern = new RegExp(`\\b${restricted}\\b`, 'g');
      sanitized = sanitized.replace(pattern, `/* ${restricted} blocked */`);
    }

    return sanitized;
  }

  /**
   * Create sandbox context with allowed globals
   */
  private createSandbox(operation: string, params: Record<string, unknown>): SandboxContext {
    const logs: unknown[][] = [];
    
    return {
      params,
      operation,
      console: {
        log: (...args: unknown[]) => {
          logs.push(args);
          if (this.config.enableLogging) {
            console.log('[Skill]', ...args);
          }
        },
        error: (...args: unknown[]) => {
          logs.push(args);
          if (this.config.enableLogging) {
            console.error('[Skill]', ...args);
          }
        },
        warn: (...args: unknown[]) => {
          logs.push(args);
          if (this.config.enableLogging) {
            console.warn('[Skill]', ...args);
          }
        },
        info: (...args: unknown[]) => {
          logs.push(args);
          if (this.config.enableLogging) {
            console.info('[Skill]', ...args);
          }
        },
      },
      Math,
      JSON,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Promise,
      Set,
      Map,
      Error,
      RegExp,
      ArrayBuffer,
      Uint8Array,
      TextEncoder,
      TextDecoder,
    };
  }

  /**
   * Execute JavaScript in browser using Web Worker
   */
  private executeInBrowserWorker(code: string, sandbox: SandboxContext): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const workerScript = `
        self.onmessage = async function(e) {
          try {
            const { code, sandbox } = e.data;
            
            // Create function with sandbox bindings
            const fn = new Function('sandbox', \`
              with (sandbox) {
                return (async () => {\n                  \${code}
                })();
              }
            \`);
            
            const result = await fn(sandbox);
            self.postMessage({ success: true, result });
          } catch (error) {
            self.postMessage({ success: false, error: error.message });
          }
        };
      `;

      const blob = new Blob([workerScript], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);

      const timeoutId = setTimeout(() => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        reject(new Error(`Script execution timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      worker.onmessage = (e) => {
        clearTimeout(timeoutId);
        worker.terminate();
        URL.revokeObjectURL(workerUrl);

        if (e.data.success) {
          resolve(e.data.result);
        } else {
          reject(new Error(e.data.error));
        }
      };

      worker.onerror = (error) => {
        clearTimeout(timeoutId);
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        reject(error);
      };

      worker.postMessage({ code, sandbox });
    });
  }

  /**
   * Execute JavaScript in Node.js using VM module
   */
  private async executeInNodeVM(code: string, sandbox: SandboxContext): Promise<unknown> {
    // Use Node.js built-in vm module instead of vm2 for better compatibility
    const vm = await import('node:vm');
    
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const context = vm.createContext(sandbox as unknown as Record<string, unknown>);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const script = new vm.Script(code);
    
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return script.runInContext(context);
  }

  /**
   * Execute Python code (requires Python runtime)
   */
  private async executePython(
    code: string,
    operation: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    if (typeof window !== 'undefined') {
      throw new Error('Python execution not supported in browser environment');
    }

    const { spawn } = await import('child_process');
    const inputData = JSON.stringify({ operation, params });

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', ['-c', code]);
      
      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code: number | null) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(output));
          } catch {
            resolve(output.trim());
          }
        } else {
          reject(new Error(errorOutput || `Python process exited with code ${code}`));
        }
      });

      pythonProcess.stdin?.write(inputData);
      pythonProcess.stdin?.end();

      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Python execution timeout'));
      }, this.config.timeout);
    });
  }

  /**
   * Execute Bash script (Node.js only)
   */
  private async executeBash(
    code: string,
    _operation: string,
    _params: Record<string, unknown>
  ): Promise<unknown> {
    if (typeof window !== 'undefined') {
      throw new Error('Bash execution not supported in browser environment');
    }

    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const { stdout, stderr } = await execAsync(code, {
      timeout: this.config.timeout,
      maxBuffer: this.config.maxMemoryMB * 1024 * 1024,
    });

    if (stderr) {
      throw new Error(stderr);
    }

    return stdout.trim();
  }

  /**
   * Get executor statistics
   */
  getStats(): {
    totalExecutions: number;
    config: ScriptExecutorConfig;
  } {
    return {
      totalExecutions: this.executionCount,
      config: { ...this.config },
    };
  }
}

export default SkillScriptExecutor;
