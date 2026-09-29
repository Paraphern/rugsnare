import readline from 'node:readline';
import { toolHash, short } from './hash.js';
import { loadPins, pinTool, savePins, ensureServer } from './pins.js';
import { logEvent } from './events.js';
import { sendAlert } from './alerts.js';

/**
 * The RugSnare live proxy (v0.2): the integrity gate between an MCP client
 * and one stdio server. Process spawning is deliberately NOT done here —
 * the proxy receives already-created stdio streams ({ stdin, stdout,
 * stderr, onExit }) from the caller. See `rugsnare run` in cli.js.
 *
 * Behavior on a tools/list response:
 *  - observe mode: pass through untouched; alert on DRIFT and NEW
 *  - enforce mode: DRIFT and unapproved NEW tools are stripped from the
 *    response and replaced by a `rugsnare_alert` tool explaining why
 * Every tools/call is logged (tool name + timestamp; args only if opted in).
 */

export function createProxy({ name, server, streams, mode = 'observe', config, cwd = process.cwd(), writeOut = (s) => process.stdout.write(s + '\n'), writeErr = (s) => process.stderr.write(s + '\n') }) {
  const pins = loadPins(cwd);
  const serverPin = ensureServer(pins, name, null);
  let pinsDirty = false;

  const alert = async (status, tool, extra = {}) => {
    const payload = { kind: 'rugsnare.alert', status, server: name, tool, mode, ...extra };
    writeErr(`[rugsnare] ${status}: ${name}/${tool}${extra.oldHash ? ` ${short(extra.oldHash)} -> ${short(extra.hash)}` : ''}`);
    logEvent(payload, cwd);
    await sendAlert(config, payload);
  };

  // ---- client -> server: log tool calls ----
  const clientIn = readline.createInterface({ input: streams.clientIn });
  clientIn.on('line', (line) => {
    try {
      const msg = JSON.parse(line);
      if (msg.method === 'tools/call' && msg.params) {
        const call = {
          kind: 'call',
          server: name,
          tool: msg.params.name,
          hasArgs: Boolean(msg.params.arguments && Object.keys(msg.params.arguments).length),
        };
        if (config.logCallArgs) call.args = msg.params.arguments;
        logEvent(call, cwd);
      }
    } catch {
      // not JSON — forward untouched
    }
    streams.server.stdin.write(line + '\n');
  });

  // ---- server -> client: integrity gate ----
  const serverOut = readline.createInterface({ input: streams.server.stdout });
  serverOut.on('line', (line) => {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      writeOut(line);
      return;
    }

    const tools = msg?.result?.tools;
    if (Array.isArray(tools) && tools.length > 0) {
      const verdicts = tools.map((tool) => {
        const hash = toolHash(tool);
        const pin = serverPin.tools[tool.name];
        return { tool, hash, pin, status: !pin ? 'NEW' : pin.hash !== hash ? 'DRIFT' : 'UNCHANGED' };
      });

      for (const v of verdicts) {
        if (v.status === 'NEW' && !v.pin) {
          pinTool(serverPin, v.tool, v.hash, { approved: false });
          pinsDirty = true;
          if (mode !== 'enforce') alert('NEW', v.tool.name, { hash: v.hash });
        } else if (v.status === 'DRIFT') {
          alert('DRIFT', v.tool.name, { oldHash: v.pin.hash, hash: v.hash, oldDescription: v.pin.description, newDescription: v.tool.description });
        }
      }
      if (pinsDirty) {
        savePins(pins, cwd);
        pinsDirty = false;
      }

      if (mode === 'enforce') {
        const allowed = new Set(
          verdicts
            .filter((v) => v.status === 'UNCHANGED' || (v.status === 'NEW' && v.pin?.approved))
            .map((v) => v.tool.name)
        );
        const blocked = verdicts.filter((v) => !allowed.has(v.tool.name));
        if (blocked.length > 0) {
          msg.result.tools = [
            ...verdicts.filter((v) => allowed.has(v.tool.name)).map((v) => v.tool),
            {
              name: 'rugsnare_alert',
              description:
                `[RUGSNARE] ${blocked.length} tool(s) quarantined on this server: ` +
                blocked.map((v) => `${v.tool.name} (${v.status})`).join(', ') +
                `. A tool description changed after approval (rug pull) or appeared without approval. ` +
                `Run \`rugsnare diff\` to inspect, \`rugsnare approve ${name}\` after review.`,
              inputSchema: { type: 'object', properties: {} },
            },
          ];
          logEvent({ kind: 'quarantine', server: name, blocked: blocked.map((v) => ({ tool: v.tool.name, status: v.status })) }, cwd);
        }
      }
      writeOut(JSON.stringify(msg));
      return;
    }

    writeOut(line);
  });

  streams.server.stderr?.on('data', (chunk) => process.stderr.write(`[server] ${chunk}`));
  const onExit = (code) => {
    if (pinsDirty) savePins(pins, cwd);
    logEvent({ kind: 'server-exit', server: name, code }, cwd);
    process.exit(code ?? 0);
  };
  streams.server.on?.('exit', onExit);
  streams.server.on?.('error', onExit);
  return { onExit };
}
