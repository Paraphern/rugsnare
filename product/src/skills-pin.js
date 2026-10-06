import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { scanToolDescription } from './advisory.js';

/**
 * Skills pinning and drift detection (v1.1).
 *
 * Skills are instruction files that AI agents read and follow. Unlike MCP
 * tool contracts (structured JSON), skills are freeform text - which makes
 * them easier to create, easier to share, and easier to poison silently.
 *
 * This module:
 *   1. Discovers skill files across all known AI platforms
 *   2. Hashes them (sha-256 of file content)
 *   3. Stores pins in .rugsnare/pins.json (same store as MCP tools)
 *   4. On diff: compares hashes, classifies severity, runs advisory signals
 *
 * The severity classification is content-based (not structure-based like
 * MCP's BREAKING/COSMETIC), because skills have no structured contract:
 *   DANGEROUS - added lines reference credentials, external URLs,
 *               concealment instructions, or executable commands
 *   REVIEW     - significant text changes without obvious danger signals
 *   SAFE       - minor edits (typos, formatting, documentation)
 */

const TEXT_EXTENSIONS = new Set(['.md', '.mdc', '.txt', '.yaml', '.yml', '.json', '.sh', '.py', '.js', '.ts']);
const MAX_FILE_SIZE = 1024 * 1024; // 1MB per file
const MAX_DEPTH = 4;

/**
 * Known skill file locations across AI platforms.
 * `user` = global (home directory), `project` = per-repository.
 * Ordered by likelihood of having content.
 */
export const SKILL_LOCATIONS = [
  // Claude Code (Anthropic)
  { app: 'claude-code', scope: 'user', pattern: '.claude/skills' },
  { app: 'claude-code', scope: 'user', pattern: '.claude/commands' },
  { app: 'claude-code', scope: 'project', pattern: '.claude/skills' },
  { app: 'claude-code', scope: 'project', pattern: '.claude/commands' },
  // Cursor
  { app: 'cursor', scope: 'project', pattern: '.cursor/rules' },
  { app: 'cursor', scope: 'user', pattern: '.cursor/rules' },
  // Windsurf (ex-Codeium)
  { app: 'windsurf', scope: 'project', pattern: '.windsurf/rules' },
  { app: 'windsurf', scope: 'user', pattern: '.windsurf/rules' },
  // Continue
  { app: 'continue', scope: 'project', pattern: '.continue' },
  { app: 'continue', scope: 'user', pattern: '.continue' },
  // Cline (VS Code extension)
  { app: 'cline', scope: 'project', pattern: '.cline' },
  // ZCode
  { app: 'zcode', scope: 'user', pattern: '.zcode/cli/plugins/cache' },
  // GitHub Copilot
  { app: 'copilot', scope: 'project', pattern: '.github/copilot-instructions.md' },
  // OpenAI Codex
  { app: 'codex', scope: 'project', pattern: '.codex' },
  // Amp (Anthropic)
  { app: 'amp', scope: 'project', pattern: '.amp' },
  // Kiro (AWS)
  { app: 'kiro', scope: 'project', pattern: '.kiro' },
  // OpenCode
  { app: 'opencode', scope: 'project', pattern: '.opencode' },
  // Antigravity (Google)
  { app: 'antigravity', scope: 'project', pattern: '.antigravity' },
  // Aider (convention files)
  { app: 'aider', scope: 'project', pattern: 'CONVENTIONS.md' },
  // Devin
  { app: 'devin', scope: 'project', pattern: '.devin' },
];

/**
 * Discover all skill files on this machine.
 * Returns [{ path, app, scope, relative }] - one entry per text file found.
 * `home` defaults to os.homedir() but can be overridden (tests).
 */
export function discoverSkills(cwd = process.cwd(), home = os.homedir()) {
  const found = [];
  const seen = new Set(); // dedup by resolved path

  for (const loc of SKILL_LOCATIONS) {
    const base = loc.scope === 'user' ? path.join(home, loc.pattern) : path.join(cwd, loc.pattern);
    if (!fs.existsSync(base)) continue;

    const files = walkSkillDir(base, 0);
    for (const file of files) {
      const resolved = path.resolve(file);
      if (seen.has(resolved)) continue; // same file found via multiple patterns
      seen.add(resolved);
      found.push({
        path: file,
        app: loc.app,
        scope: loc.scope,
        relative: path.relative(base, file),
      });
    }
  }

  return found;
}

function walkSkillDir(dir, depth) {
  if (depth > MAX_DEPTH) return [];
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip noise directories
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('__')) continue;
      out.push(...walkSkillDir(full, depth + 1));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (TEXT_EXTENSIONS.has(ext)) {
        try {
          const st = fs.statSync(full);
          if (st.size <= MAX_FILE_SIZE && st.size > 0) out.push(full);
        } catch { /* unreadable */ }
      }
    }
  }
  return out;
}

/**
 * Hash a skill file's content.
 * Returns sha-256 hex of the file bytes.
 */
export function hashSkillFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Build a pin entry for a skill file (stored in pins.json under `skills`).
 */
export function pinSkillFile(skill, cwd = process.cwd()) {
  const hash = hashSkillFile(skill.path);
  const content = fs.readFileSync(skill.path, 'utf8');
  const advisory = scanToolDescription(content);
  return {
    hash,
    app: skill.app,
    scope: skill.scope,
    relative: skill.relative,
    path: skill.path,
    size: content.length,
    // store content so diff can show was/became (skills are small: <=1MB)
    content,
    firstSeen: new Date().toISOString(),
    pinnedAt: new Date().toISOString(),
    approved: false,
    advisory: advisory.advisory ? { score: advisory.score, signals: advisory.signals.map((s) => s.id) } : null,
  };
}

/**
 * Pin all discovered skills into the pins store.
 * Returns { pinned, skipped } counts.
 */
export function pinAllSkills(pins, cwd = process.cwd(), home = os.homedir()) {
  if (!pins.skills) pins.skills = {};
  const skills = discoverSkills(cwd, home);
  let pinnedCount = 0;
  for (const skill of skills) {
    const key = `${skill.app}/${skill.scope}/${skill.relative}`;
    const existing = pins.skills[key];
    const entry = pinSkillFile(skill, cwd);
    if (existing) {
      entry.firstSeen = existing.firstSeen; // preserve
      entry.approved = existing.approved; // preserve
    }
    pins.skills[key] = entry;
    pinnedCount++;
  }
  return { pinned: pinnedCount };
}

// ---- diff & severity ---------------------------------------------------------

const DANGEROUS_PATTERNS = [
  { re: /\.env|credentials?|api[_-]?key|secret|password|token/i, desc: 'references sensitive files or credentials' },
  { re: /https?:\/\/(?!.*\b(github\.com|npmjs|readthedocs|wikipedia)\b)/i, desc: 'communicates with an external URL' },
  { re: /do\s+not\s+tell|don'?t\s+tell|do\s+not\s+inform|don'?t\s+inform|hide\s+from\s+(the\s+)?(user|owner)/i, desc: 'instructs the AI to hide information from the user' },
  { re: /\b(curl|wget|rm\s+-rf|chmod\s+777|eval|exec|system\s*\()/i, desc: 'executes dangerous commands' },
  { re: /ignore\s+(all\s+)?(previous|prior|above|system)\s+(instructions?|prompt|rules?)/i, desc: 'attempts to override system instructions' },
  { re: /base64[ -]?(encode|decoded?)|exfiltrat|upload\s+to|send\s+to|forward\s+to/i, desc: 'exfiltration pattern' },
];

const SAFE_PATTERNS = [
  { re: /^(typo|fix|format|cleanup|docs?|readme|comment)/i, desc: 'documentation or formatting change' },
];

/**
 * Compare pinned skills against current files.
 * Returns [{ key, status, oldHash, newHash, severity, changes, advisory }]
 * status: UNCHANGED | DRIFT | NEW | REMOVED
 * severity: DANGEROUS | REVIEW | SAFE | null (for non-drift)
 */
export function diffSkills(pins, cwd = process.cwd(), home = os.homedir()) {
  const results = [];
  const current = discoverSkills(cwd, home);
  const currentMap = new Map();
  for (const s of current) currentMap.set(`${s.app}/${s.scope}/${s.relative}`, s);

  const pinnedSkills = pins.skills ?? {};

  // Check pinned skills against current
  for (const [key, pin] of Object.entries(pinnedSkills)) {
    const live = currentMap.get(key);
    if (!live) {
      results.push({ key, status: 'REMOVED', oldHash: pin.hash, newHash: null, severity: null, changes: [], advisory: null });
      continue;
    }
    const newHash = hashSkillFile(live.path);
    if (newHash === pin.hash) {
      results.push({ key, status: 'UNCHANGED', oldHash: pin.hash, newHash, severity: null, changes: [], advisory: null });
    } else {
      // DRIFT: analyze the change using the PINNED content (not the live file)
      const newContent = fs.readFileSync(live.path, 'utf8');
      const oldContent = pin.content ?? readOldContent(pin) ?? '';
      const changes = diffLines(oldContent, newContent);
      const severity = classifySeverity(changes);
      const advisory = scanToolDescription(newContent);
      results.push({
        key, status: 'DRIFT', oldHash: pin.hash, newHash,
        severity, changes,
        advisory: advisory.advisory ? { score: advisory.score, signals: advisory.signals.map((s) => s.id) } : null,
      });
    }
    currentMap.delete(key); // handled
  }

  // Anything left in currentMap is NEW (not pinned)
  for (const [key, s] of currentMap) {
    const content = fs.readFileSync(s.path, 'utf8');
    const advisory = scanToolDescription(content);
    results.push({
      key, status: 'NEW', oldHash: null, newHash: hashSkillFile(s.path),
      severity: advisory.advisory ? 'REVIEW' : null,
      changes: [], advisory: advisory.advisory ? { score: advisory.score, signals: advisory.signals.map((x) => x.id) } : null,
    });
  }

  return results;
}

function readOldContent(pin) {
  try { return fs.readFileSync(pin.path, 'utf8'); } catch { return null; }
}

/**
 * Simple line diff: returns { added: [lines], removed: [lines] }
 */
export function diffLines(oldText, newText) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const oldSet = new Map(oldLines.map((l, i) => [l, i]));
  const newSet = new Map(newLines.map((l, i) => [l, i]));
  const added = [];
  const removed = [];
  for (const line of newLines) {
    if (!oldSet.has(line)) added.push(line);
  }
  for (const line of oldLines) {
    if (!newSet.has(line)) removed.push(line);
  }
  return { added, removed };
}

/**
 * Classify severity based on what was ADDED (not the whole file).
 */
export function classifySeverity({ added }) {
  if (added.length === 0) return 'SAFE';
  const addedText = added.join('\n');

  for (const p of DANGEROUS_PATTERNS) {
    if (p.re.test(addedText)) return 'DANGEROUS';
  }

  if (added.length > 5) return 'REVIEW'; // significant text changes
  for (const p of SAFE_PATTERNS) {
    if (p.re.test(addedText)) return 'SAFE';
  }

  return 'REVIEW'; // default for any change without a clear signal
}
