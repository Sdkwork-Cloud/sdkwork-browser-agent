/**
 * Built-in Skills
 *
 * Re-export from the organized skill directory structure.
 * Each skill follows the Agent Skills Specification with:
 * - Individual directory per skill
 * - SKILL.md with YAML frontmatter
 * - TypeScript implementation
 */

export {
  echoSkill,
  mathSkill,
  listSkillsSkill,
  builtInSkills,
  builtInSkillsMap,
} from './builtin/index';
