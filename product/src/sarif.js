/**
 * SARIF 2.1.0 output for GitHub code scanning and other SARIF consumers.
 * Rules:
 *   RS001 DRIFT   — tool contract changed after approval (error)
 *   RS002 NEW     — unapproved new tool (warning)
 *   RS003 REMOVED — approved tool disappeared (warning)
 *   RS004 SHADOW  — same tool name exposed by multiple servers (error)
 */

const RULES = [
  { id: 'RS001', shortDescription: { text: 'MCP tool contract changed after approval (rug pull)' } },
  { id: 'RS002', shortDescription: { text: 'Unapproved new MCP tool appeared' } },
  { id: 'RS003', shortDescription: { text: 'Approved MCP tool disappeared' } },
  { id: 'RS004', shortDescription: { text: 'MCP tool name shadowed across servers' } },
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
      if (v.status === 'DRIFT') push('RS001', 'error', `Tool "${v.tool}" on MCP server "${server}" changed its contract after approval.`, server, v.tool);
      else if (v.status === 'NEW' && v.tool !== '(all)') push('RS002', 'warning', `Tool "${v.tool}" appeared on MCP server "${server}" without approval.`, server, v.tool);
      else if (v.status === 'REMOVED') push('RS003', 'warning', `Approved tool "${v.tool}" disappeared from MCP server "${server}".`, server, v.tool);
    }
  }
  for (const s of shadows) {
    push('RS004', 'error', `Tool name "${s.tool}" is exposed by multiple servers (${s.servers.join(', ')}) — the client's resolution order decides which one runs.`, s.servers[0], s.tool);
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
            version: '0.2.1',
            rules: RULES,
          },
        },
        results,
      },
    ],
  };
}
