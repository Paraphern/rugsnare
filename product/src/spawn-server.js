import { execFile } from 'node:child_process';

/**
 * The ONLY place RugSnare starts a process.
 * execFile(command, args) never involves a shell — no string is
 * ever interpreted as a command line. Args are validated to be
 * plain strings; anything else is refused. Commands originate
 * exclusively from the user's own MCP client config or the local
 * pin store — never from network or proxied tool-call traffic.
 */

export function spawnServer({ command, args = [], env = {}, cwd, onStdout, onStderr, onExit }) {
  if (typeof command !== 'string' || command.length === 0) {
    throw new Error('rugsnare: refused to spawn - command must be a non-empty string');
  }
  if (!Array.isArray(args) || args.some((a) => typeof a !== 'string')) {
    throw new Error('rugsnare: refused to spawn - args must be an array of strings');
  }

  const child = execFile(
    command,
    args,
    {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      timeout: 0,
      maxBuffer: Infinity,
    }
  );

  child.stdout.on('data', onStdout);
  child.stderr.on('data', onStderr);
  child.on('error', onExit);
  child.on('exit', onExit);
  return child;
}