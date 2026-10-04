// Insert the rugsnare entry into an awesome-list README at the verified spot.
// Usage: node awesome-insert.mjs <repo=punkpeye|corca> <in> <out>
// Fails loudly if the anchor lines are not found exactly once — never guesses.
import fs from 'node:fs';

const [,, repo, inFile, outFile] = process.argv;
if (!repo || !inFile || !outFile) throw new Error('usage: node awesome-insert.mjs <punkpeye|corca> <in> <out>');

const ENTRY = {
  punkpeye: '- [Paraphern/rugsnare](https://github.com/Paraphern/rugsnare) [![rugsnare MCP server](https://glama.ai/mcp/servers/Paraphern/rugsnare/badges/score.svg)](https://glama.ai/mcp/servers/Paraphern/rugsnare) 📇 🏠 - Pin MCP tool contracts by hash and catch silent drift, rug pulls and per-client bait-and-switch after approval, with a CI gate, live stdio/HTTP proxies, canary replay, call policies and on-chain release verification.',
  corca: '- [RugSnare](https://github.com/Paraphern/rugsnare): runtime integrity for MCP tool contracts - pin by hash, catch silent drift and rug pulls after approval via CI gate, live stdio/HTTP proxies and canary replay ![GitHub Repo stars](https://img.shields.io/github/stars/Paraphern/rugsnare?style=social)',
};

const ANCHORS = {
  // insert AFTER the first anchor line, verified to appear exactly once
  punkpeye: /^-\s\[panther-labs\/mcp-panther\]/,
  corca: /^-\s\[PurpleLlama\]/,
};

const text = fs.readFileSync(inFile, 'utf8');
if (text.includes('Paraphern/rugsnare')) throw new Error('entry already present — refusing to double-add');
const lines = text.split('\n');
const anchor = ANCHORS[repo];
const idx = lines.findIndex((l) => anchor.test(l));
const count = lines.filter((l) => anchor.test(l)).length;
if (idx < 0 || count !== 1) throw new Error(`anchor not found exactly once (found ${count}) for ${repo}`);
lines.splice(idx + 1, 0, ENTRY[repo]);
fs.writeFileSync(outFile, lines.join('\n'));
console.log(`${repo}: inserted after line ${idx + 1}: ${ENTRY[repo].slice(0, 60)}…`);
