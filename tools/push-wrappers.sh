#!/usr/bin/env bash
# One-off: push action.yml + README into the two wrapper repos via the GitHub
# contents API (no local git needed). Idempotent per file.
set -e
push_file () {
  local repo="$1" path="$2" localfile="$3"
  local b64
  b64=$(base64 -w0 "$localfile")
  gh api -X PUT "repos/Paraphern/$repo/contents/$path" \
    -f message="add $path" -f content="$b64" --jq '.content.path' 2>/dev/null \
    || echo "  (already exists or failed: $repo/$path)"
}
push_file rugsnare-pr-diff-action action.yml C:/GlobalWork/wrappers/pr-diff/action.yml
push_file rugsnare-pr-diff-action README.md  C:/GlobalWork/wrappers/pr-diff/README.md
push_file rugsnare-canary-action  action.yml C:/GlobalWork/wrappers/canary/action.yml
push_file rugsnare-canary-action  README.md  C:/GlobalWork/wrappers/canary/README.md
echo "--- check:"
for r in rugsnare-pr-diff-action rugsnare-canary-action; do
  gh api "repos/Paraphern/$r/contents" --jq '.[].path' | sed "s/^/$r: /"
done
