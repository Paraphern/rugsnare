#!/usr/bin/env node
/**
 * RugSnare pre-commit hook — catches contract drift BEFORE the commit lands.
 *
 * Install (one time):
 *   rugsnare hook install
 *
 * Or manually:
 *   cp product/src/precommit.mjs .git/hooks/pre-commit
 *   chmod +x .git/hooks/pre-commit
 *
 * How it works:
 *   On every `git commit`, runs `rugsnare diff` (quiet mode).
 *   If drift is detected → commit is BLOCKED with a human-readable summary.
 *   If no pins exist → hook passes silently (first scan creates them).
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';

const exec = promisify(execFile);

const CWD = process.cwd();
const RUGSNARE_CLI = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'cli.js');

async function main() {
  // If no pins exist, pass silently (user hasn't run `rugsnare scan` yet)
  const pinsFile = path.join(CWD, '.rugsnare', 'pins.json');
  if (!fs.existsSync(pinsFile)) {
    process.exit(0);
  }

  // Find the config file
  const configCandidates = ['.mcp.json', '.cursor/mcp.json', '.cline/mcp.json'];
  let config = null;
  for (const c of configCandidates) {
    if (fs.existsSync(path.join(CWD, c))) { config = c; break; }
  }
  if (!config) {
    // No MCP config in this repo — nothing to check
    process.exit(0);
  }

  // Run rugsnare diff quietly
  try {
    const { stdout, stderr } = await exec('node', [RUGSNARE_CLI, 'diff', '--config', config], {
      cwd: CWD,
      timeout: 60000,
      env: { ...process.env, RUGSNARE_QUIET: '1' },
    });

    // Check exit code
    const lines = (stdout + stderr).trim().split('\n');
    const summary = lines[lines.length - 1] ?? '';

    if (summary.includes('DRIFT DETECTED')) {
      console.error('');
      console.error('╔═══════════════════════════════════════════════════╗');
      console.error('║  🪤 RugSnare: COMMIT BLOCKED — tool contract drift ║');
      console.error('╚═══════════════════════════════════════════════════╝');
      console.error('');
      console.error('  An MCP tool contract changed since you approved it.');
      console.error('  Review the changes below, then either:');
      console.error('    1. Fix the drift and try again');
      console.error('    2. rugsnare approve <server>  (deliberately accept)');
      console.error('    3. git commit --no-verify     (bypass — not recommended)');
      console.error('');
      for (const line of lines) {
        if (line.includes('[') || line.includes('DRIFT') || line.includes('NEW') || line.includes('SHADOW')) {
          console.error('  ' + line);
        }
      }
      console.error('');
      process.exit(1);
    }

    // Clean — pass
    process.exit(0);
  } catch (err) {
    // If diff exits non-zero (drift), err.stdout has the output
    const output = (err.stdout ?? '') + (err.stderr ?? '');
    if (output.includes('DRIFT DETECTED')) {
      console.error('');
      console.error('╔═══════════════════════════════════════════════════╗');
      console.error('║  🪤 RugSnare: COMMIT BLOCKED — tool contract drift ║');
      console.error('╚═══════════════════════════════════════════════════╝');
      console.error('');
      console.error('  An MCP tool contract changed since you approved it.');
      console.error('');
      for (const line of output.split('\n')) {
        if (line.includes('[') || line.includes('DRIFT') || line.includes('NEW') || line.includes('SHADOW')) {
          console.error('  ' + line.trim());
        }
      }
      console.error('');
      console.error('  Options:');
      console.error('    1. Fix the drift and try again');
      console.error('    2. rugsnare approve <server>  (accept the change)');
      console.error('    3. git commit --no-verify     (bypass)');
      console.error('');
      process.exit(1);
    }
    // Other error (server unreachable etc.) — warn but don't block
    console.error(`[rugsnare] warning: diff check failed (${err.message?.slice(0, 100)})`);
    process.exit(0);
  }
}

main();
