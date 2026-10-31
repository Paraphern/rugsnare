#!/usr/bin/env bash
# Publishes the rugsnare diff verdict to the `rugsnare/status` branch as
# status.json. The badge worker reads this to render verified/DRIFT with a
# timestamp. The branch is force-updated to a single commit (no history
# growth). Requires `permissions: contents: write` in the calling workflow.
#
# Inputs (env):
#   VERDICT   - clean | drift | error (from the diff step output)
#   FINDINGS  - number of findings (0 = clean)
#   CONFIG    - config file path used
#
set -euo pipefail

VERDICT="${1:-clean}"
FINDINGS="${2:-0}"
CONFIG="${3:-.mcp.json}"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# summary line for humans (what the CI log said, one sentence)
case "$VERDICT" in
  clean)  SUMMARY="Contracts clean ($FINDINGS findings)" ;;
  drift)  SUMMARY="DRIFT DETECTED: $FINDINGS finding(s) - a tool contract changed after approval" ;;
  error)  SUMMARY="Check failed (error) - see CI log" ;;
  *)      SUMMARY="Unknown verdict: $VERDICT" ;;
esac

STATUS_JSON=$(cat <<EOF
{
  "verdict": "$VERDICT",
  "findings": $FINDINGS,
  "config": "$CONFIG",
  "timestamp": "$TIMESTAMP",
  "runId": "$GITHUB_RUN_ID",
  "repo": "$GITHUB_REPOSITORY",
  "branch": "$GITHUB_REF_NAME",
  "summary": "$SUMMARY"
}
EOF
)

# Fast path: if the existing status.json is byte-identical (except timestamp),
# skip the commit to avoid a status-branch commit on every push.
TEMP_DIR=$(mktemp -d)
git fetch origin rugsnare/status --depth=1 2>/dev/null || true
if git show origin/rugsnare/status:status.json >/dev/null 2>&1; then
  EXISTING=$(git show origin/rugsnare/status:status.json | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
    // compare everything except timestamp/runId (they change every run)
    delete d.timestamp; delete d.runId;
    console.log(JSON.stringify(d));
  " 2>/dev/null || echo "{}")
  NEW=$(echo "$STATUS_JSON" | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
    delete d.timestamp; delete d.runId;
    console.log(JSON.stringify(d));
  ")
  if [ "$EXISTING" = "$NEW" ]; then
    echo "::notice::Status unchanged (verdict=$VERDICT, findings=$FINDINGS) - skipping status commit"
    exit 0
  fi
fi

# Write to a temp branch: single-file orphan commit, force-pushed
cd "$TEMP_DIR"
git init --quiet
git config user.name "rugsnare-status-bot"
git config user.email "noreply@rugsnare.local"
echo "$STATUS_JSON" > status.json
git add status.json
git commit --quiet -m "rugsnare status: $VERDICT ($FINDINGS findings) [skip ci]"
# token goes into a git credential header, never into a URL string
git remote add origin "https://github.com/${GITHUB_REPOSITORY}.git"
AUTH=$(printf 'x-access-token:%s' "$GITHUB_TOKEN" | base64 -w0)
git -c "http.https://github.com/.extraheader=Authorization: Basic $AUTH" push --force origin HEAD:refs/heads/rugsnare/status
cd - >/dev/null
rm -rf "$TEMP_DIR"

echo "::notice::Status published to rugsnare/status: $VERDICT ($FINDINGS findings) at $TIMESTAMP"
