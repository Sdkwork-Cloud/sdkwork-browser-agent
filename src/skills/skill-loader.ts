/**
 * Agent Skills Specification Loader
 *
 * Loads skills following the Agent Skills Specification:
 * - skill-name/
 *   └── SKILL.md (with YAML frontmatter)
 *   └── scripts/ (optional)
 *   └── references/ (optional)
 *   └── assets/ (optional)
 */

import { Skill, SkillMetadata } from '../core/agent';

export interface SkillManifest {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowedTools?: string[];
}

export interface ParsedSkill {
  manifest: SkillManifest;
  instructions: string;
  skill: Skill;
}

/**
 * Parse SKILL.md content
 * Extracts YAML frontmatter and markdown body
 */
export function parseSkillMd(content: string): { manifest: SkillManifest; instructions: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error('Invalid SKILL.md format: missing YAML frontmatter');
  }

  const yamlContent = match[1];
  const instructions = match[2].trim();

  // Simple YAML parser for frontmatter
  const manifest = parseYaml(yamlContent);

  // Validate required fields
  if (!manifest.name || !manifest.description) {
    throw new Error('Invalid SKILL.md: name and description are required in frontmatter');
  }

  // Validate name format (per spec)
  if (!isValidSkillName(manifest.name)) {
    throw new Error(
      `Invalid skill name "${manifest.name}". Must be 1-64 chars, lowercase alphanumeric and hyphens only, ` +
        'cannot start/end with hyphen, no consecutive hyphens.'
    );
  }

  return { manifest, instructions };
}

/**
 * Simple YAML parser for frontmatter
 */
function parseYaml(yaml: string): SkillManifest {
  const result: Record<string, unknown> = {};
  const lines = yaml.split('\n');
  let currentKey: string | null = null;
  let currentIndent = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = line.match(/^(\s*)(\w+):\s*(.*)$/);
    if (match) {
      const [, indent, key, value] = match;
      currentIndent = indent.length;
      currentKey = key;

      if (value) {
        // Simple value
        result[key] = parseYamlValue(value);
      } else {
        // Could be a nested object or array
        result[key] = {};
      }
    } else if (currentKey && line.startsWith(' '.repeat(currentIndent + 2))) {
      // Nested value under currentKey
      const nestedMatch = line.match(/^\s+(\w+):\s*(.*)$/);
      if (nestedMatch) {
        const [, nestedKey, nestedValue] = nestedMatch;
        if (typeof result[currentKey] === 'object' && result[currentKey] !== null) {
          (result[currentKey] as Record<string, unknown>)[nestedKey] = parseYamlValue(nestedValue);
        }
      }
    }
  }

  return result as unknown as SkillManifest;
}

function parseYamlValue(value: string): unknown {
  const trimmed = value.trim();

  // Boolean
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // Null
  if (trimmed === 'null' || trimmed === '~') return null;

  // Number
  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);

  // String (remove quotes if present)
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

/**
 * Validate skill name per Agent Skills Specification
 */
function isValidSkillName(name: string): boolean {
  // 1-64 characters
  if (name.length < 1 || name.length > 64) return false;

  // Only lowercase alphanumeric and hyphens
  if (!/^[a-z0-9-]+$/.test(name)) return false;

  // Cannot start or end with hyphen
  if (name.startsWith('-') || name.endsWith('-')) return false;

  // No consecutive hyphens
  if (name.includes('--')) return false;

  return true;
}

/**
 * Convert manifest and instructions to Skill object
 * Note: This creates a placeholder skill. Real implementation
 * would need to load actual handler from scripts/ directory
 */
export function createSkillFromManifest(manifest: SkillManifest, _instructions: string): Skill {
  // Parse metadata
  const metadata: SkillMetadata = {
    category: manifest.metadata?.category,
    tags: manifest.metadata?.tags?.split(/\s+/),
    version: manifest.metadata?.version,
    author: manifest.metadata?.author,
  };

  // Create skill with placeholder handler
  // In real implementation, this would load from scripts/
  const skill: Skill = {
    name: manifest.name,
    description: manifest.description,
    parameters: {
      type: 'object',
      properties: {},
    },
    handler: async () => ({
      success: false,
      error: 'Skill handler not implemented. This is a manifest-only skill.',
    }),
    metadata,
  };

  return skill;
}

/**
 * Load skill from directory
 */
export async function loadSkillFromDirectory(skillPath: string): Promise<ParsedSkill> {
  // In browser environment, we can't read files
  if (typeof window !== 'undefined') {
    throw new Error('Directory loading not supported in browser environment');
  }

  // Dynamic import for Node.js fs
  const fs = await import('fs/promises');
  const path = await import('path');

  const skillMdPath = path.join(skillPath, 'SKILL.md');

  try {
    const content = await fs.readFile(skillMdPath, 'utf-8');
    const { manifest, instructions } = parseSkillMd(content);
    const skill = createSkillFromManifest(manifest, instructions);

    return { manifest, instructions, skill };
  } catch (error) {
    throw new Error(
      `Failed to load skill from ${skillPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate skill manifest
 */
export function validateManifest(manifest: SkillManifest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!manifest.name) {
    errors.push('Missing required field: name');
  } else if (!isValidSkillName(manifest.name)) {
    errors.push(`Invalid name format: "${manifest.name}"`);
  }

  if (!manifest.description) {
    errors.push('Missing required field: description');
  } else if (manifest.description.length > 1024) {
    errors.push('Description exceeds 1024 characters');
  }

  // Optional field validations
  if (manifest.compatibility && manifest.compatibility.length > 500) {
    errors.push('Compatibility exceeds 500 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
