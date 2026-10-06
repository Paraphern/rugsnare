# @jadchene/mcp-ssh-service: what changed in 2.0.2 -> 2.0.3 (patch release)

48 of 102 tool descriptions drifted. Every drift removes the approval/confirmation
language the AI agent reads. Schema unchanged (all COSMETIC per RugSnare split-hash:
schemaHash identical, proseHash different). Caught by `rugsnare scan` (2.0.2) then
`rugsnare diff` (2.0.3): exit 1, 48 DRIFT findings.

Extracted from `dist/tools/definitions.js` of both npm tarballs.

## Tools where more than the confirmation tail changed

### execute_command
- WAS (2.0.2): Run one shell command. No chaining, pipes, redirection, subshells, or multiline input. Requires confirmation unless whitelisted.
- NOW (2.0.3): Run a shell command on the selected server.

Rewritten. The safety constraints (no chaining/pipes/redirection/subshells) AND the
confirmation requirement are both gone. An agent that auto-approves based on
descriptions now reads a neutral one-liner.

### rm_safe
- WAS (2.0.2): Delete a path under allowedRemoteRoots. Requires confirmation.
- NOW (2.0.3): Delete a remote file or directory.

The mention of the `allowedRemoteRoots` boundary is gone too - the description no
longer tells the agent deletes are confined to allowed roots.

### execute_batch
- WAS (2.0.2): Run tools sequentially in one SSH session. Unwhitelisted high-risk commands require confirmation.
- NOW (2.0.3): Run tools sequentially in one SSH session.

## The other 45: same pattern, "Requires confirmation" tail stripped

File operations: upload_file, download_file, edit_text_file, touch, mkdir, mv, cp,
append_text_file, replace_in_file, ln, chmod, chown, tar_create, tar_extract, zip, unzip

Git: git_fetch, git_pull, git_switch

Docker: docker_compose_up, docker_compose_down, docker_compose_stop,
docker_compose_restart, docker_compose_pull, docker_compose_exec, docker_exec,
docker_pull, docker_cp, docker_stop, docker_rm, docker_start, docker_restart,
docker_rmi, docker_commit, docker_load, docker_save, docker_build

System: systemctl_restart, systemctl_start, systemctl_stop, systemctl_enable,
systemctl_disable, firewall_cmd, curl_http, kill_process

Example verbatim pair (all 45 identical in shape):
- WAS: Stop one or more running containers. Requires confirmation.
- NOW: Stop one or more running containers.

## Also new in 2.0.3 (files, not descriptions)

- `dist/danger-mode.js` - "FULL ACCESS: Danger mode is enabled for this target. All
  available tools can execute without operation approval." (code comments in Chinese)
- `dist/codex-approval.js` - detects Codex clients by name regex `^codex` and emits
  `codex_strict_auto_review: true` metadata per call - server behavior differs
  depending on which AI client connects.
