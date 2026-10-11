/**
 * SARIF 2.1.0 output for GitHub code scanning and other SARIF consumers.
 * Rules:
 *   RS001 DRIFT   - tool contract changed after approval (error)
 *   RS002 NEW     - unapproved new tool (warning)
 *   RS003 REMOVED - approved tool disappeared (warning)
 *   RS004 SHADOW  - same tool name exposed by multiple servers (error)
 *
 * Each rule cross-references the Agent Threat Rules that cover the same
 * technique (properties.atrRuleIds) - full table in docs/ATR-MAPPING.md.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
const VERSION = (() => {
  try { return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version ?? '0.2.2'; }
  catch { return '0.2.2'; }
})();

const ATR_DOC = 'https://github.com/Paraphern/rugsnare/blob/main/docs/ATR-MAPPING.md';

const RULES = [
  { id: 'RS001', helpUri: ATR_DOC, shortDescription: { text: 'MCP tool contract changed after approval (rug pull)' }, properties: { tags: ['mcp', 'supply-chain'], atrRuleIds: ['ATR-2026-00581', 'ATR-2026-02025', 'ATR-2026-01775'] } },
  { id: 'RS002', helpUri: ATR_DOC, shortDescription: { text: 'Unapproved new MCP tool appeared' }, properties: { tags: ['mcp', 'supply-chain'], atrRuleIds: ['ATR-2026-00581'] } },
  { id: 'RS003', helpUri: ATR_DOC, shortDescription: { text: 'Approved MCP tool disappeared' }, properties: { tags: ['mcp', 'supply-chain'], atrRuleIds: ['ATR-2026-00581'] } },
  { id: 'RS004', helpUri: ATR_DOC, shortDescription: { text: 'MCP tool name shadowed across servers' }, properties: { tags: ['mcp', 'privilege-escalation'], atrRuleIds: ['ATR-2026-00161', 'ATR-2026-00715'] } },
];

export function buildSarif(report, shadows = []) {
  const results = [];
  const push = (ruleId, level, text, server, tool) =>
    results.push({
      ruleId,
      level,
      message: { text },
      locations: [
        { logicalLocations: [{ fullyQualifiedName: `mcp:${server}/${tool}` }] },
      ],
    });

  for (const { server, verdicts = [] } of report) {
    for (const v of verdicts) {
      // tool verdicts carry {tool}; prompt/resource verdicts carry {item, kind} -
      // both must reach code scanning, instructions live in prompts too
      const target = v.tool ?? (v.item !== undefined ? `${v.kind}:${v.item}` : undefined);
      if (target === undefined) continue;
      if (v.status === 'DRIFT') push('RS001', 'error', `${v.kind ?? 'Tool'} "${target}" on MCP server "${server}" changed its contract after approval.`, server, target);
      else if (v.status === 'NEW') push('RS002', 'warning', `${v.kind ?? 'Tool'} "${target}" appeared on MCP server "${server}" without approval.`, server, target);
      else if (v.status === 'REMOVED') push('RS003', 'warning', `Approved ${v.kind ?? 'tool'} "${target}" disappeared from MCP server "${server}".`, server, target);
    }
  }
  for (const s of shadows) {
    push('RS004', 'error', `Tool name "${s.tool}" is exposed by multiple servers (${s.servers.join(', ')}) - the client's resolution order decides which one runs.`, s.servers[0], s.tool);
  }

  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'rugsnare',
            informationUri: 'https://rugsnare.com',
            version: VERSION,
            rules: RULES,
          },
        },
        results,
      },
    ],
  };
}
