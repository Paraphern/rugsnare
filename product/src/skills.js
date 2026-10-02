import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scanToolDescription } from './advisory.js';

/**
 * Skill scanning: AI clients (Claude Code, Cursor, Continue) support "skills"
 * — markdown files (SKILL.md) that give the agent instructions. These can be
 * poisoned exactly like tool descriptions: hidden instructions, credential
 * exfiltration, instruction hijacking. Snyk agent-scan popularized this check.
 *
 * `rugsnare scan` discovers skill files alongside MCP configs and runs the
 * same A-series advisory signals over their content.
 */

const SKILL_DIRS = [
  // Claude Code: project-level and user-level skills
  { app: 'claude-code', dir: () => path.join(process.cwd(), '.claude', 'skills'), glob: '**/SKILL.md' },
  { app: 'claude-code', dir: () => path.join(os.homedir(), '.claude', 'skills'), glob: '**/SKILL.md' },
  // Cursor rules (similar concept, different name)
  { app: 'cursor', dir: () => path.join(process.cwd(), '.cursor', 'rules'), glob: '**/*.mdc' },
  { app: 'cursor', dir: () => path.join(os.homedir(), '.cursor', 'rules'), glob: '**/*.mdc' },
  // Continue.dev
  { app: 'continue', dir: () => path.join(os.homedir(), '.continue', 'rules'), glob: '**/*.md' },
];

/**
 * Discover skill files on disk.
 * Returns [{ app, file }] — each file is a markdown skill definition.
 */
export function discoverSkills() {
  const found = [];
  for (const { app, dir } of SKILL_DIRS) {
    try {
      if (!fs.existsSync(dir())) continue;
      walk(dir(), (file) => {
        if (file.endsWith('SKILL.md') || file.endsWith('.mdc') || file.endsWith('.md')) {
          found.push({ app, file });
        }
      });
    } catch { /* permission or missing — fine */ }
  }
  return found;
}

function walk(dir, cb) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full, cb);
    else if (item.isFile()) cb(full);
  }
}

/**
 * Scan a skill file's content with the same advisory signals used for
 * tool descriptions. Returns the advisory result plus the file path.
 */
export function scanSkillFile(file) {
  let content;
  try { content = fs.readFileSync(file, 'utf8'); } catch { return null; }
  // strip markdown formatting so signals match plain text
  const plain = content
    .replace(/```[\s\S]*?```/g, (m) => m) // keep code blocks (may contain payloads)
    .replace(/^#{1,6}\s+/gm, '') // headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1') // italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // links
  const result = scanToolDescription(plain);
  return { file, ...result, contentLength: content.length };
}

/**
 * Discover and scan all skills. Returns advisory findings only (not clean files).
 */
export function scanSkills() {
  const findings = [];
  for (const { app, file } of discoverSkills()) {
    const r = scanSkillFile(file);
    if (r && r.advisory) {
      findings.push({ app, file, score: r.score, signals: r.signals });
    }
  }
  return findings;
}
