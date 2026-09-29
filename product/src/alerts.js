import fs from 'node:fs';
import path from 'node:path';
import { rugsnareDir } from './pins.js';
import { readJsonFile } from './jsonfile.js';

/**
 * Alerts: webhook (raw JSON) or Slack incoming webhook (formatted).
 * Configured in `.rugsnare/config.json`: { "mode": "observe"|"enforce", "alertWebhook": "https://..." }
 * Failures never break the proxy — alert delivery is best-effort.
 */

const DEFAULT_CONFIG = { mode: 'observe', alertWebhook: null, logCallArgs: false };

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
