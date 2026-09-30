#!/usr/bin/env node
/**
 * RugSnare pre-commit hook — blocks commits when MCP tool contracts have drifted.
 * Installed by: rugsnare hook install
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const CWD = process.cwd();
const __filename = fileURLToPath(import.meta.url);
const CLI = path.join(path.dirname(__filename), 'cli.js');

// BOM-tolerant JSON read (same as the main CLI uses)
function readJson(file) {
  let raw = fs.readFileSync(file, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return JSON.parse(raw);
}

function findConfig() {
  if (process.env.RUGSNARE_CONFIG) return process.env.RUGSNARE_CONFIG;
  try {
    const cfg = readJson(path.join(CWD, '.rugsnare', 'config.json'));
    if (cfg.configPath) return cfg.configPath;
  } catch { /* no config or unreadable */ }
  const candidates = ['.mcp.json', '.cursor/mcp.json', '.cline/mcp.json', '.vscode/mcp.json'];
  for (const c of candidates) {
    if (fs.existsSync(path.join(CWD, c))) return c;
  }
  return null;
}

async function main() {
  const pinsFile = path.join(CWD, '.rugsnare', 'pins.json');
  if (!fs.existsSync(pinsFile)) process.exit(0); // no pins yet — nothing to check

  const config = findConfig();
  if (!config) {
    console.error('[rugsnare] no MCP config found — set RUGSNARE_CONFIG or create .mcp.json. Skipping check.');
    process.exit(0); // warn but don't block
  }

  try {
    const { stdout, stderr } = await exec('node', [CLI, 'diff', '--config', config], { cwd: CWD, timeout: 60000 });
    process.exit(0); // clean
  } catch (err) {
    const output = (err.stdout ?? '') + (err.stderr ?? '');
    if (output.includes('DRIFT DETECTED')) {
      console.error('');
      console.error('╔═══════════════════════════════════════════════════╗');
      console.error('║  🪤 RugSnare: COMMIT BLOCKED — tool contract drift ║');
      console.error('╚═══════════════════════════════════════════════════╝');
      console.error('');
      for (const line of output.split('\n')) {
        if (line.includes('[') || line.includes('DRIFT') || line.includes('NEW') || line.includes('SHADOW')) {
          console.error('  ' + line.trim());
        }
      }
      console.error('');
      console.error('  Options: fix the drift, or rugsnare approve <server>');
      console.error('  Bypass:  git commit --no-verify (not recommended)');
      console.error('');
      process.exit(1);
    }
    console.error(`[rugsnare] warning: diff check failed (${err.message?.slice(0, 100)}) — not blocking`);
    process.exit(0);
  }
}

main();
