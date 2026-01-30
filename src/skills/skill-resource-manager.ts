/**
 * Skill Resource Manager
 *
 * Manages loading and execution of skills following Agent Skills Specification
 * Implements progressive disclosure: metadata → instructions → resources
 */

import { SkillManifest } from './skill-loader';

// Resource types
export interface ScriptFile {
  name: string;
  path: string;
  language: 'javascript' | 'typescript' | 'python' | 'bash';
  content: string;
}

export interface ReferenceFile {
  name: string;
  path: string;
  content: string;
}

export interface AssetFile {
  name: string;
  path: string;
  type: 'template' | 'image' | 'data' | 'other';
  content: string;
}

// Progressive disclosure levels
export type DisclosureLevel = 'metadata' | 'instructions' | 'resources';

export interface LoadedSkill {
  name: string;
  path: string;
  manifest: SkillManifest;
  instructions?: string;
  scripts: Map<string, ScriptFile>;
  references: Map<string, ReferenceFile>;
  assets: Map<string, AssetFile>;
  currentLevel: DisclosureLevel;
  loadedAt: Date;
}

export interface SkillManagerConfig {
  basePath?: string;
  enableCaching?: boolean;
  maxCacheSize?: number;
}

/**
 * Skill Resource Manager
 * Manages loading and execution of skills following Agent Skills Specification
 */
export class SkillResourceManager {
  private config: Required<SkillManagerConfig>;
  private cache = new Map<string, LoadedSkill>();
  private metadataCache = new Map<string, SkillManifest>();

  constructor(config: SkillManagerConfig = {}) {
    this.config = {
      basePath: config.basePath ?? './skills',
      enableCaching: config.enableCaching ?? true,
      maxCacheSize: config.maxCacheSize ?? 50,
    };
  }

  /**
   * Level 1: Load metadata only (~100 tokens)
   * Loaded at startup for all skills
   */
  async loadMetadata(skillPath: string): Promise<SkillManifest> {
    // Check cache
    if (this.config.enableCaching && this.metadataCache.has(skillPath)) {
      return this.metadataCache.get(skillPath)!;
    }

    const content = await this.readFile(`${skillPath}/SKILL.md`);
    if (!content) {
      throw new Error(`SKILL.md not found at ${skillPath}`);
    }

    const { manifest } = this.parseSkillMd(content);

    // Validate manifest according to Agent Skills Specification
    this.validateManifest(manifest, skillPath);

    // Cache metadata
    if (this.config.enableCaching) {
      this.metadataCache.set(skillPath, manifest);
    }

    return manifest;
  }

  /**
   * Level 2: Load instructions (< 5000 tokens)
   * Loaded when skill is activated
   */
  async loadInstructions(skillPath: string): Promise<string> {
    const content = await this.readFile(`${skillPath}/SKILL.md`);
    if (!content) {
      throw new Error(`SKILL.md not found at ${skillPath}`);
    }

    const { instructions } = this.parseSkillMd(content);
    return instructions;
  }

  /**
   * Level 3: Load complete skill with resources
   * Resources loaded as needed
   */
  async loadFullSkill(skillPath: string): Promise<LoadedSkill> {
    // Check cache
    if (this.config.enableCaching && this.cache.has(skillPath)) {
      return this.cache.get(skillPath)!;
    }

    // Load manifest
    const manifest = await this.loadMetadata(skillPath);

    // Load instructions
    const instructions = await this.loadInstructions(skillPath);

    // Load resources
    const scripts = await this.loadScripts(skillPath);
    const references = await this.loadReferences(skillPath);
    const assets = await this.loadAssets(skillPath);

    const skill: LoadedSkill = {
      name: manifest.name,
      path: skillPath,
      manifest,
      instructions,
      scripts,
      references,
      assets,
      currentLevel: 'resources',
      loadedAt: new Date(),
    };

    // Cache
    if (this.config.enableCaching) {
      this.cache.set(skillPath, skill);
      this.enforceCacheLimit();
    }

    return skill;
  }

  /**
   * Progressive loading - load up to specified level
   */
  async loadProgressive(
    skillPath: string,
    level: DisclosureLevel = 'metadata'
  ): Promise<LoadedSkill> {
    // Always load metadata first
    const manifest = await this.loadMetadata(skillPath);

    const skill: LoadedSkill = {
      name: manifest.name,
      path: skillPath,
      manifest,
      scripts: new Map(),
      references: new Map(),
      assets: new Map(),
      currentLevel: 'metadata',
      loadedAt: new Date(),
    };

    if (level === 'metadata') {
      return skill;
    }

    // Load instructions
    skill.instructions = await this.loadInstructions(skillPath);
    skill.currentLevel = 'instructions';

    if (level === 'instructions') {
      return skill;
    }

    // Load all resources
    skill.scripts = await this.loadScripts(skillPath);
    skill.references = await this.loadReferences(skillPath);
    skill.assets = await this.loadAssets(skillPath);
    skill.currentLevel = 'resources';

    return skill;
  }

  /**
   * Load a specific resource on demand
   */
  async loadResource(
    skillPath: string,
    type: 'script' | 'reference' | 'asset',
    name: string
  ): Promise<ScriptFile | ReferenceFile | AssetFile | null> {
    switch (type) {
      case 'script':
        return this.loadScript(skillPath, name);
      case 'reference':
        return this.loadReference(skillPath, name);
      case 'asset':
        return this.loadAsset(skillPath, name);
      default:
        return null;
    }
  }

  /**
   * Get reference content
   */
  async getReference(skillPath: string, referenceName: string): Promise<string | null> {
    const reference = await this.loadReference(skillPath, referenceName);
    return reference?.content ?? null;
  }

  /**
   * Get asset content
   */
  async getAsset(skillPath: string, assetName: string): Promise<string | null> {
    const asset = await this.loadAsset(skillPath, assetName);
    return asset?.content ?? null;
  }

  // Private methods

  private async loadScripts(skillPath: string): Promise<Map<string, ScriptFile>> {
    const scripts = new Map<string, ScriptFile>();

    try {
      const files = await this.listDirectory(`${skillPath}/scripts`);
      for (const file of files) {
        const content = await this.readFile(`${skillPath}/scripts/${file}`);
        if (content) {
          const language = this.detectLanguage(file);
          scripts.set(file, {
            name: file,
            path: `${skillPath}/scripts/${file}`,
            language,
            content,
          });
        }
      }
    } catch {
      // scripts/ directory may not exist
    }

    return scripts;
  }

  private async loadReferences(skillPath: string): Promise<Map<string, ReferenceFile>> {
    const references = new Map<string, ReferenceFile>();

    try {
      const files = await this.listDirectory(`${skillPath}/references`);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = await this.readFile(`${skillPath}/references/${file}`);
          if (content) {
            references.set(file, {
              name: file,
              path: `${skillPath}/references/${file}`,
              content,
            });
          }
        }
      }
    } catch {
      // references/ directory may not exist
    }

    return references;
  }

  private async loadAssets(skillPath: string): Promise<Map<string, AssetFile>> {
    const assets = new Map<string, AssetFile>();

    try {
      const files = await this.listDirectory(`${skillPath}/assets`);
      for (const file of files) {
        const content = await this.readFile(`${skillPath}/assets/${file}`);
        if (content) {
          assets.set(file, {
            name: file,
            path: `${skillPath}/assets/${file}`,
            type: this.detectAssetType(file),
            content,
          });
        }
      }
    } catch {
      // assets/ directory may not exist
    }

    return assets;
  }

  private async loadScript(skillPath: string, name: string): Promise<ScriptFile | null> {
    const content = await this.readFile(`${skillPath}/scripts/${name}`);
    if (!content) return null;

    return {
      name,
      path: `${skillPath}/scripts/${name}`,
      language: this.detectLanguage(name),
      content,
    };
  }

  private async loadReference(skillPath: string, name: string): Promise<ReferenceFile | null> {
    const content = await this.readFile(`${skillPath}/references/${name}`);
    if (!content) return null;

    return {
      name,
      path: `${skillPath}/references/${name}`,
      content,
    };
  }

  private async loadAsset(skillPath: string, name: string): Promise<AssetFile | null> {
    const content = await this.readFile(`${skillPath}/assets/${name}`);
    if (!content) return null;

    return {
      name,
      path: `${skillPath}/assets/${name}`,
      type: this.detectAssetType(name),
      content,
    };
  }

  private parseSkillMd(content: string): { manifest: SkillManifest; instructions: string } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      throw new Error('Invalid SKILL.md format: missing YAML frontmatter');
    }

    const yamlContent = match[1];
    const instructions = match[2].trim();

    return { manifest: this.parseYaml(yamlContent), instructions };
  }

  private parseYaml(yaml: string): SkillManifest {
    const result: Record<string, unknown> = {};
    const lines = yaml.split('\n');
    let currentKey: string | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        currentKey = key;
        result[key] = value ? this.parseYamlValue(value) : {};
      } else if (currentKey && line.startsWith('  ')) {
        const nestedMatch = line.match(/^\s+(\w+):\s*(.*)$/);
        if (nestedMatch && typeof result[currentKey] === 'object') {
          const [, nestedKey, nestedValue] = nestedMatch;
          (result[currentKey] as Record<string, unknown>)[nestedKey] =
            this.parseYamlValue(nestedValue);
        }
      }
    }

    return result as unknown as SkillManifest;
  }

  private parseYamlValue(value: string): unknown {
    const trimmed = value.trim();
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;
    if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  }

  /**
   * Validate manifest according to Agent Skills Specification
   */
  private validateManifest(manifest: SkillManifest, skillPath: string): void {
    // Required fields
    if (!manifest.name) {
      throw new Error('Skill manifest missing required field: name');
    }
    if (!manifest.description) {
      throw new Error('Skill manifest missing required field: description');
    }

    // Name must match directory name
    const expectedName = skillPath.split('/').pop();
    if (manifest.name !== expectedName) {
      throw new Error(`Skill name "${manifest.name}" must match directory name "${expectedName}"`);
    }

    // Name constraints per specification
    if (!/^[a-z0-9-]+$/.test(manifest.name)) {
      throw new Error(
        `Skill name "${manifest.name}" contains invalid characters. Only lowercase alphanumeric and hyphens allowed.`
      );
    }

    if (manifest.name.startsWith('-') || manifest.name.endsWith('-')) {
      throw new Error('Skill name cannot start or end with hyphen');
    }

    if (manifest.name.includes('--')) {
      throw new Error('Skill name cannot contain consecutive hyphens');
    }

    if (manifest.name.length < 1 || manifest.name.length > 64) {
      throw new Error('Skill name must be 1-64 characters');
    }

    // Description constraints
    if (manifest.description.length < 1 || manifest.description.length > 1024) {
      throw new Error('Skill description must be 1-1024 characters');
    }

    // Optional field validations
    if (manifest.compatibility && manifest.compatibility.length > 500) {
      throw new Error('Compatibility field exceeds 500 characters');
    }
  }

  private detectLanguage(filename: string): ScriptFile['language'] {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
        return 'javascript';
      case 'ts':
        return 'typescript';
      case 'py':
        return 'python';
      case 'sh':
        return 'bash';
      default:
        return 'javascript';
    }
  }

  private detectAssetType(filename: string): AssetFile['type'] {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['json', 'yaml', 'yml', 'csv', 'xml'].includes(ext || '')) return 'data';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext || '')) return 'image';
    if (['template', 'tpl'].includes(ext || '')) return 'template';
    return 'other';
  }

  private enforceCacheLimit(): void {
    if (this.cache.size > this.config.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  // File system abstraction
  private async readFile(path: string): Promise<string | null> {
    if (typeof window !== 'undefined') {
      // Browser environment - fetch from server
      try {
        const response = await fetch(path);
        if (!response.ok) return null;
        return await response.text();
      } catch {
        return null;
      }
    } else {
      // Node.js environment
      try {
        const fs = await import('fs/promises');
        return await fs.readFile(path, 'utf-8');
      } catch {
        return null;
      }
    }
  }

  private async listDirectory(path: string): Promise<string[]> {
    if (typeof window !== 'undefined') {
      // Browser - would need server API
      return [];
    } else {
      try {
        const fs = await import('fs/promises');
        const entries = await fs.readdir(path, { withFileTypes: true });
        return entries.filter(e => e.isFile()).map(e => e.name);
      } catch {
        return [];
      }
    }
  }
}

export default SkillResourceManager;
