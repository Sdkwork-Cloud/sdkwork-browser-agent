/**
 * Enhanced Skill Executor
 *
 * Integrates SkillResourceManager and SkillScriptExecutor
 * Provides complete Skill execution with resource loading
 */

import { SkillResourceManager, LoadedSkill } from './skill-resource-manager';
import { SkillScriptExecutor, ScriptExecutionResult } from './skill-script-executor';
import { ExecutionContext, SkillResult } from '../core/agent';

export interface EnhancedSkillExecutorConfig {
  resourceManager?: SkillResourceManager;
  scriptExecutor?: SkillScriptExecutor;
  defaultScriptName?: string;
}

/**
 * Enhanced Skill Executor with full resource support
 */
export class EnhancedSkillExecutor {
  private resourceManager: SkillResourceManager;
  private scriptExecutor: SkillScriptExecutor;
  private defaultScriptName: string;

  constructor(config: EnhancedSkillExecutorConfig = {}) {
    this.resourceManager = config.resourceManager ?? new SkillResourceManager();
    this.scriptExecutor = config.scriptExecutor ?? new SkillScriptExecutor();
    this.defaultScriptName = config.defaultScriptName ?? 'handler.js';
  }

  /**
   * Execute a skill with full resource loading
   *
   * This method:
   * 1. Loads the skill with all resources (if not cached)
   * 2. Finds the appropriate script
   * 3. Executes the script with the operation and parameters
   * 4. Returns the result
   */
  async execute(
    skillPath: string,
    operation: string,
    params: Record<string, unknown> = {},
    context: ExecutionContext
  ): Promise<SkillResult> {
    try {
      // Load skill with all resources
      const skill = await this.resourceManager.loadFullSkill(skillPath);

      // Find script to execute
      const scriptName = this.findScript(skill, operation);
      if (!scriptName) {
        return {
          success: false,
          error: `No script found for operation "${operation}" in skill "${skill.name}"`,
        };
      }

      const script = skill.scripts.get(scriptName);
      if (!script) {
        return {
          success: false,
          error: `Script "${scriptName}" not found in skill "${skill.name}"`,
        };
      }

      // Execute script
      const result: ScriptExecutionResult = await this.scriptExecutor.execute(
        script,
        operation,
        params,
        context
      );

      if (result.success) {
        return {
          success: true,
          data: result.output,
          metadata: {
            skillName: skill.name,
            operation,
            scriptName,
            executionTime: result.executionTime,
          },
        };
      } else {
        return {
          success: false,
          error: result.error || 'Script execution failed',
          metadata: {
            skillName: skill.name,
            operation,
            scriptName,
            executionTime: result.executionTime,
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute skill with progressive loading
   * Loads only metadata first, then instructions if needed, then resources
   */
  async executeProgressive(
    skillPath: string,
    operation: string,
    params: Record<string, unknown> = {},
    context: ExecutionContext
  ): Promise<SkillResult> {
    try {
      // Step 1: Load metadata (fast, ~100 tokens)
      const metadata = await this.resourceManager.loadMetadata(skillPath);

      // Check if operation is supported by looking at instructions
      const instructions = await this.resourceManager.loadInstructions(skillPath);

      // If instructions don't mention the operation, return early
      if (!this.operationSupported(instructions, operation)) {
        return {
          success: false,
          error: `Operation "${operation}" not supported by skill "${metadata.name}"`,
        };
      }

      // Step 2: Load full skill with resources
      return this.execute(skillPath, operation, params, context);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get skill information without loading resources
   */
  async getSkillInfo(skillPath: string): Promise<{
    name: string;
    description: string;
    hasScripts: boolean;
    hasReferences: boolean;
    hasAssets: boolean;
  }> {
    const skill = await this.resourceManager.loadProgressive(skillPath, 'instructions');

    return {
      name: skill.manifest.name,
      description: skill.manifest.description,
      hasScripts: skill.scripts.size > 0,
      hasReferences: skill.references.size > 0,
      hasAssets: skill.assets.size > 0,
    };
  }

  /**
   * Get reference documentation
   */
  async getReference(skillPath: string, referenceName: string): Promise<string | null> {
    return this.resourceManager.getReference(skillPath, referenceName);
  }

  /**
   * Get asset content
   */
  async getAsset(skillPath: string, assetName: string): Promise<string | null> {
    return this.resourceManager.getAsset(skillPath, assetName);
  }

  /**
   * List all available skills in a directory
   */
  async listSkills(directoryPath: string): Promise<
    Array<{
      path: string;
      name: string;
      description: string;
    }>
  > {
    const skills: Array<{ path: string; name: string; description: string }> = [];

    try {
      // In Node.js, list directory
      if (typeof window === 'undefined') {
        const fs = await import('fs/promises');
        const path = await import('path');

        const entries = await fs.readdir(directoryPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory()) {
            const skillPath = path.join(directoryPath, entry.name);
            try {
              const manifest = await this.resourceManager.loadMetadata(skillPath);
              skills.push({
                path: skillPath,
                name: manifest.name,
                description: manifest.description,
              });
            } catch {
              // Not a valid skill directory
            }
          }
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }

    return skills;
  }

  // Private helper methods

  private findScript(skill: LoadedSkill, operation: string): string | null {
    // Priority order:
    // 1. Script with name matching operation (e.g., extract-text.js)
    // 2. Default script (handler.js or index.js)
    // 3. First available script

    const operationScript = `${operation}.js`;
    if (skill.scripts.has(operationScript)) {
      return operationScript;
    }

    if (skill.scripts.has(this.defaultScriptName)) {
      return this.defaultScriptName;
    }

    if (skill.scripts.has('index.js')) {
      return 'index.js';
    }

    const firstScript = skill.scripts.keys().next().value;
    return firstScript ?? null;
  }

  private operationSupported(instructions: string, operation: string): boolean {
    // Simple check: see if operation name appears in instructions
    // In production, this could be more sophisticated (parse markdown, etc.)
    const lowerInstructions = instructions.toLowerCase();
    const lowerOperation = operation.toLowerCase();

    return (
      lowerInstructions.includes(lowerOperation) ||
      lowerInstructions.includes('## ' + lowerOperation) ||
      lowerInstructions.includes('### ' + lowerOperation)
    );
  }
}

export default EnhancedSkillExecutor;
