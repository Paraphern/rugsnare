// Edge-case fixture: a server that exits immediately after responding to
// initialize — RugSnare must surface a clear error, not hang.
'use strict';
process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: { name: 'edge-crash', version: '0.0.1' } } }) + '\n');
process.exit(1);
