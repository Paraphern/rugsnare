#!/bin/bash
# delta-sweep.sh — RugSnare pain-delta sweep (fresh MCP/skills/agent pains)
# Usage: delta-sweep.sh [since-date YYYY-MM-DD] [min-stars]
#   since-date: default = yesterday
#   min-stars:  default = 50
# Outputs: /tmp/mcp-hunt/delta/run-<ts>/report.md (+ raw tsv)
# Caches:  /tmp/mcp-hunt/star-cache.tsv (repo stars), /tmp/mcp-hunt/seen-issues.txt (dedupe across runs),
#          /tmp/mcp-hunt/known-repos.txt (cumulative known targets => marks NEW/KNOWN)
set -u
SINCE=${1:-$(date -d yesterday +%Y-%m-%d)}
MIN=${2:-50}
H=/tmp/mcp-hunt
TS=$(date +%Y%m%d-%H%M)
OUT="$H/delta/run-$TS"
mkdir -p "$OUT"
touch "$H/star-cache.tsv" "$H/seen-issues.txt" "$H/known-repos.txt"

QUERIES=(
  "mcp tool changed" "mcp broke after update" "mcp tools missing" "mcp breaking change"
  "mcp schema changed" "mcp security" "exfiltrates" "skill exfiltrates"
  "mcp tools not working" "tool poisoning" "mcp drift" "skill security"
  "skill leaked tokens" "mcp silent" "skill update broke" "mcp trust"
  "mcp credentials" "mcp token leaked" "prompt injection mcp" "mcp update broke"
  "mcp tools disappeared" "mcp allowlist" "skill malware" "mcp backdoor"
)
i=0
for q in "${QUERIES[@]}"; do
  i=$((i+1))
  gh search issues "$q" --created=">=$SINCE" --limit 50 \
    --json repository,title,url,createdAt \
    --jq '.[] | .repository.nameWithOwner + "\t" + .createdAt[0:10] + "\t" + .title[0:90] + "\t" + .url' \
    > "$OUT/q$i.tsv" 2>/dev/null
  sleep 1
done
cat "$OUT"/q*.tsv 2>/dev/null | grep -v '^$' | sort -u -t$'\t' -k4,4 > "$OUT/raw.tsv"

# stars with cache
cut -f1 "$OUT/raw.tsv" | sort -u > "$OUT/repos.txt"
while read -r r; do
  grep -qP "^\d+\t\Q$r\E$" "$H/star-cache.tsv" && continue
  s=$(gh api "repos/$r" --jq .stargazers_count 2>/dev/null)
  echo -e "${s:-0}\t$r" >> "$H/star-cache.tsv"
done < "$OUT/repos.txt"

REPORT="$OUT/report.md"
node "C:/GlobalWork/tools/delta-report.js" "$OUT" "$MIN" "$SINCE" "$H" "$REPORT"
echo "REPORT: $REPORT"
[ -f "$REPORT" ] && head -25 "$REPORT"
