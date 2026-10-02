/**
 * Floating-version advisory: warns when an MCP config references a package
 * without a version pin (or with @latest) — the #1 vector for silent rug
 * pulls, because `npx -y package` re-rolls the dice on every launch.
 *
 * Checked during `rugsnare scan` — the config is the contract's origin.
 */

const FLOATING_PATTERNS = [
  { test: /@latest\b/i, desc: 'explicitly pinned to @latest — re-rolls on every launch' },
  { test: /@next\b/i, desc: 'pinned to @next (pre-release channel) — unstable by definition' },
];

/**
 * Check a server's command/args for floating version references.
 * Returns an array of advisory strings (empty = no findings).
 */
export function checkFloatingVersion({ command, args = [] }) {
  const findings = [];
  const full = [command, ...args].join(' ');

  // npx/uvx without explicit version = floating
  if (/\b(npx|uvx|pnpm|yarn)\b/.test(full)) {
    const hasVersion = args.some((a) => /@\d+\.\d+/.test(a));
    if (!hasVersion) {
      const hasLatest = args.some((a) => /@(latest|next)/i.test(a));
      if (hasLatest) {
        const pkg = args.find((a) => /@(latest|next)/i.test(a)) ?? '';
        findings.push(`uses floating version: \`${pkg}\` — every launch downloads the newest code, the exact moment a rug pull strikes`);
      } else {
        const pkg = args.find((a) => !a.startsWith('-')) ?? 'unknown';
        findings.push(`no version pin on \`${pkg}\` — npx/uvx will silently use the latest version on every launch; pin it (\`pkg@1.2.3\`) or use rugsnare canary to test upgrades`);
      }
    }
  }

  // docker without :tag = latest
  if (/\bdocker\b|\bpodman\b/.test(full)) {
    const hasTag = args.some((a) => /:\w/.test(a) && !a.startsWith('-'));
    if (!hasTag) {
      findings.push('docker/podman without image tag — implicitly uses :latest, re-pulling on every run');
    }
  }

  return findings;
}
