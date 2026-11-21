#!/bin/bash
# Build the rugsnare .mcpb bundle from smithery/ sources.
# Syncs server file copies from product/src, stamps the release version,
# and zips site/download/rugsnare-<ver>.mcpb
set -e
cd "$(dirname "$0")/.."

# 1. Sync bundled server copies with the shipping sources
for f in hash.js pins.js version.js index.js jsonfile.js; do
  [ -f "product/src/$f" ] && cp "product/src/$f" "smithery/server/$f"
done
# never ship local hook state in the bundle
rm -rf smithery/server/.mimosa

# 2. Stamp version from product/package.json into bundle manifests
VER=$(node -p "require('./product/package.json').version")
node -e "
const fs = require('fs');
for (const p of ['smithery/package.json', 'smithery/manifest.json']) {
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  j.version = '$VER';
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
}
console.log('stamped', '$VER');
"

# 3. Zip the .mcpb (manifest at bundle root, server/ payload)
OUT="site/download/rugsnare-${VER%%.*}.${VER#*.}.mcpb"
rm -f "$OUT"
(cd smithery && zip -r -q "../$OUT" manifest.json icon.png package.json server/)
ls -la "$OUT"
echo "built: $OUT"
