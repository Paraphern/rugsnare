// RugSnare site worker: static assets + the runtime-history endpoints.
//
// /api/history-run     POST — dispatch a runtime-exact scan to GitHub Actions
// /api/history-result  GET  — one published runtime result
// /api/history-archive GET  — the public archive of all runtime scans
//
// All outbound traffic lives in outbound.js (https-only, fixed-host
// allowlist) and every package name crossing into a request is rebuilt
// from a strict npm-name whitelist. The scan itself (actually starting
// each version) runs in an ephemeral GitHub Actions runner — never here.
// The old instant/static scan was retired: runtime truth only.

import { handleHistoryRun, handleHistoryResult } from './run.js';
import { handleHistoryArchive } from './archive.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/history-run') return handleHistoryRun(request, env);
    if (url.pathname === '/api/history-result') return handleHistoryResult(request);
    if (url.pathname === '/api/history-archive') return handleHistoryArchive(request, env);
    return env.ASSETS.fetch(request);
  },
};
