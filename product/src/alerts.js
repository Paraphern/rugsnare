import fs from 'node:fs';
import path from 'node:path';
import { rugsnareDir } from './pins.js';
import { readJsonFile } from './jsonfile.js';

/**
 * Alerts: webhook (raw JSON) or Slack incoming webhook (formatted).
 * Configured in `.rugsnare/config.json`: { "mode": "observe"|"enforce", "alertWebhook": "https://...", "failMode": "open"|"closed" }
 * `failMode: "closed"` — if the proxy hits an internal error, the message is BLOCKED
 * instead of forwarded (strict environments: integrity over availability).
 * Failures never break the proxy — alert delivery is best-effort.
 */

const DEFAULT_CONFIG = { mode: 'observe', alertWebhook: null, logCallArgs: false, failMode: 'open' };

export function loadConfig(cwd = process.cwd()) {
  try {
    const raw = readJsonFile(path.join(rugsnareDir(cwd), 'config.json'));
    return { ...DEFAULT_CONFIG, ...raw };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config, cwd = process.cwd()) {
  fs.mkdirSync(rugsnareDir(cwd), { recursive: true });
  fs.writeFileSync(path.join(rugsnareDir(cwd), 'config.json'), JSON.stringify(config, null, 2) + '\n');
}

function slackPayload(alert) {
  const icon = alert.status === 'DRIFT' ? '🪤' : alert.status === 'NEW' ? '🆕' : '⚠️';
  return {
    text: `${icon} RugSnare: ${alert.status} on \`${alert.server}\` → \`${alert.tool}\` (${alert.mode} mode)`,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `${icon} *RugSnare ${alert.status}*\n*server:* ${alert.server}\n*tool:* \`${alert.tool}\`${alert.oldHash ? `\n*hash:* \`${alert.oldHash}\` → \`${alert.hash}\`` : ''}\n*mode:* ${alert.mode}` } },
    ],
  };
}

export async function sendAlert(config, alert) {
  const url = config.alertWebhook;
  if (!url) return false;
  const body = url.includes('hooks.slack.com') ? slackPayload(alert) : alert;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return true;
  } catch {
    return false; // best-effort by design
  }
}

// Debounced alert: collects alerts for 500ms then sends one summary
// (instead of spamming N individual alerts when N tools drift simultaneously)
const alertBuffer = new Map(); // server -> alerts[]
let debounceTimer = null;

export function queueAlert(config, alert, cwd) {
  const server = alert.server ?? 'unknown';
  if (!alertBuffer.has(server)) alertBuffer.set(server, []);
  alertBuffer.get(server).push(alert);

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const allAlerts = [...alertBuffer.values()].flat();
    alertBuffer.clear();

    if (allAlerts.length === 1) {
      await sendAlert(config, allAlerts[0]);
      return;
    }

    // Aggregated summary
    const breaking = allAlerts.filter((a) => a.status === 'DRIFT' && a.driftType === 'BREAKING');
    const cosmetic = allAlerts.filter((a) => a.status === 'DRIFT' && a.driftType === 'COSMETIC');
    const news = allAlerts.filter((a) => a.status === 'NEW');
    const servers = [...new Set(allAlerts.map((a) => a.server))];

    const summary = {
      kind: 'rugsnare.summary',
      total: allAlerts.length,
      breaking: breaking.length,
      cosmetic: cosmetic.length,
      newTools: news.length,
      servers: servers,
      tools: allAlerts.map((a) => `${a.server}/${a.tool} (${a.status}${a.driftType ? ' ' + a.driftType : ''})`),
      note: `${allAlerts.length} finding(s) — run rugsnare diff for details`,
    };
    await sendAlert(config, summary);
  }, 500);
}
