import fs from 'node:fs';
import os from 'node:os';
import { scanToolDescription } from './advisory.js';
import { discoverSkills as discoverSkillFiles } from './skills-pin.js';

/**
 * Skill scanning: AI clients support "skills" - markdown and script files
 * (SKILL.md, rules, instructions, conventions) that give the agent
 * instructions. These can be poisoned exactly like tool descriptions:
 * hidden instructions, credential exfiltration, instruction hijacking.
 * Snyk agent-scan popularized this check.
 *
 * `rugsnare scan` discovers skill files alongside MCP configs and runs the
 * same A-series advisory signals over their content.
 *
 * R26: discovery is the SAME table the pin layer uses (SKILL_LOCATIONS in
 * skills-pin.js, 16 platforms, project + user scope). Before R26 the
 * advisory layer had its own hand-copied list covering only 3 platforms,
 * so R25's canonical skills/ dir was pinned but never advisory-scanned -
 * two lists always drift; one list cannot.
 */

/**
 * Discover skill files on disk (all SKILL_LOCATIONS platforms, both scopes).
 * Shape-compat wrapper over the pin layer's discovery.
 * Returns [{ app, file }].
 */
export function discoverSkills(cwd = process.cwd(), home = process.env.RUGSNARE_TEST_HOME ?? os.homedir()) {
  return discoverSkillFiles(cwd, home).map(({ app, path: file }) => ({ app, file }));
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
export function scanSkills(cwd = process.cwd(), home = process.env.RUGSNARE_TEST_HOME ?? os.homedir()) {
  const findings = [];
  for (const { app, path: file } of discoverSkillFiles(cwd, home)) {
    const r = scanSkillFile(file);
    if (r && r.advisory) {
      findings.push({ app, file, score: r.score, signals: r.signals });
    }
  }
  return findings;
}
