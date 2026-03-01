import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
// Static import so bun embeds this into compiled binaries
import bundledDataJson from './bundled-data.json' with { type: 'json' };

export interface Framework {
  name: string;
  slug: string;
  description: string;
  body: string;
}

export interface Category {
  name: string;
  description: string;
  frameworkCount: number;
}

export interface CategoryData {
  skill: string;
  frameworks: Framework[];
}

// --- Bundled data support for standalone binaries ---
interface BundledCategory {
  skill: string;
  frameworks: string | null;
}

function getBundledData(): Record<string, BundledCategory> | null {
  if (bundledDataJson && typeof bundledDataJson === 'object' && Object.keys(bundledDataJson).length > 0) {
    return bundledDataJson as Record<string, BundledCategory>;
  }
  return null;
}

// --- Filesystem skills directory resolution ---
function getSkillsDir(): string | null {
  const thisDir = dirname(fileURLToPath(import.meta.url));

  // In npm package: cli/skills/ (sibling to dist/)
  const packageSkills = join(thisDir, '..', '..', 'skills');
  if (existsSync(join(packageSkills, 'founder', 'SKILL.md'))) {
    return packageSkills;
  }

  // In dev: ../skills/ (project root)
  const devSkills = join(thisDir, '..', '..', '..', 'skills');
  if (existsSync(join(devSkills, 'founder', 'SKILL.md'))) {
    return devSkills;
  }

  // Fallback: FOUNDER_SKILLS_DIR env var
  if (process.env.FOUNDER_SKILLS_DIR) {
    return process.env.FOUNDER_SKILLS_DIR;
  }

  return null;
}

let _skillsDir: string | null | undefined = undefined;

export function getSkillsDirPath(): string | null {
  if (_skillsDir !== undefined) return _skillsDir;
  _skillsDir = getSkillsDir();
  return _skillsDir;
}

// For testing
export function setSkillsDir(dir: string): void {
  _skillsDir = dir;
}

export function resetSkillsDir(): void {
  _skillsDir = undefined;
}

function useBundled(): boolean {
  return getSkillsDirPath() === null && getBundledData() !== null;
}

// --- Parsing utilities ---

export function parseFrontmatter(text: string): Record<string, string> {
  const fm: Record<string, string> = {};
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (match) {
    for (const line of match[1].split('\n')) {
      const kv = line.match(/^(\w[\w-]*):\s*"?(.+?)"?\s*$/);
      if (kv) {
        fm[kv[1]] = kv[2];
      }
    }
  }
  return fm;
}

export function stripFrontmatter(text: string): string {
  return text.replace(/^---\n[\s\S]*?\n---\n?/, '').trimStart();
}

export function parseFrameworks(text: string): Framework[] {
  const frameworks: Framework[] = [];
  const sections = text.split(/\n---\n/);

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const nameMatch = trimmed.match(/^##\s+(.+)$/m);
    if (!nameMatch) continue;

    const slugMatch = trimmed.match(/\*\*Slug\*\*:\s*`([^`]+)`/);
    const descMatch = trimmed.match(/\*\*Description\*\*:\s*(.+)/);

    const name = nameMatch[1].trim();
    const slug = slugMatch ? slugMatch[1] : slugify(name);
    const description = descMatch ? descMatch[1].trim() : '';

    frameworks.push({ name, slug, description, body: trimmed });
  }

  return frameworks;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function extractExpertInstructions(body: string): string | null {
  const match = body.match(/\*\*Expert instructions\*\*:\n```\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

// --- Data access (filesystem or bundled) ---

export function loadSkillFile(category: string): string {
  const bundled = getBundledData();
  if (bundled && bundled[category]) {
    return bundled[category].skill;
  }

  const skillsDir = getSkillsDirPath();
  if (!skillsDir) {
    throw new Error(`Skills data not found. Set FOUNDER_SKILLS_DIR or reinstall the package.`);
  }
  const path = join(skillsDir, category, 'SKILL.md');
  if (!existsSync(path)) {
    throw new Error(`Skill file not found: ${path}`);
  }
  return readFileSync(path, 'utf-8');
}

export function loadFrameworksFile(category: string): string | null {
  const bundled = getBundledData();
  if (bundled && bundled[category]) {
    return bundled[category].frameworks;
  }

  const skillsDir = getSkillsDirPath();
  if (!skillsDir) return null;
  const path = join(skillsDir, category, 'frameworks.md');
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf-8');
}

export function loadFramework(category: string, frameworkSlug: string): string | null {
  const fwText = loadFrameworksFile(category);
  if (!fwText) return null;

  const frameworks = parseFrameworks(fwText);
  const fw = frameworks.find(f => f.slug === frameworkSlug);
  if (!fw) return null;

  return fw.body;
}

export function getCategoryFrameworks(category: string): Framework[] {
  const fwText = loadFrameworksFile(category);
  if (!fwText) return [];
  return parseFrameworks(fwText);
}

export function getAllCategories(): Category[] {
  const bundled = getBundledData();

  if (bundled) {
    return Object.keys(bundled)
      .filter(name => name !== 'founder' && name !== 'commands' && name !== '.claude-plugin')
      .sort()
      .map(name => {
        const cat = bundled[name];
        const fm = parseFrontmatter(cat.skill);
        const frameworks = cat.frameworks ? parseFrameworks(cat.frameworks) : [];
        return {
          name,
          description: fm.description ?? '',
          frameworkCount: frameworks.length,
        };
      });
  }

  const skillsDir = getSkillsDirPath();
  if (!skillsDir) {
    throw new Error(`Skills data not found. Set FOUNDER_SKILLS_DIR or reinstall the package.`);
  }

  const dirs = readdirSync(skillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(join(skillsDir, d.name, 'SKILL.md')))
    .filter(d => d.name !== 'founder' && d.name !== 'commands' && d.name !== '.claude-plugin')
    .sort((a, b) => a.name.localeCompare(b.name));

  return dirs.map(d => {
    const skill = readFileSync(join(skillsDir, d.name, 'SKILL.md'), 'utf-8');
    const fm = parseFrontmatter(skill);
    const fwText = loadFrameworksFile(d.name);
    const frameworks = fwText ? parseFrameworks(fwText) : [];

    return {
      name: d.name,
      description: fm.description ?? '',
      frameworkCount: frameworks.length,
    };
  });
}
