#!/usr/bin/env bash
# Provjera dokumenata prije commita (dok repo nema build, odluka 214):
#  1. svaki ```mermaid blok u docs/ parsira (mermaid + jsdom u privremenoj mapi)
#  2. SQL iz docs/09-d1-shema.md se izvršava u sqlite3 nad stubovima tablica campaign-corea
# Upotreba: scripts/provjera-docs.sh   (prvi put instalira mermaid i jsdom u $TMPDIR/crowdfund-mm)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MM="${TMPDIR:-/tmp}/crowdfund-mm"
if [ ! -d "$MM/node_modules/mermaid" ]; then
  mkdir -p "$MM" && (cd "$MM" && npm init -y >/dev/null && npm i mermaid jsdom >/dev/null 2>&1)
fi
cp "$ROOT/scripts/check-mermaid.mjs" "$MM/check.mjs"
(cd "$MM" && node check.mjs $(grep -rl '```mermaid' "$ROOT/docs"))

DB="$(mktemp -t crowdfund-sql)"; rm -f "$DB"
{
  echo "PRAGMA foreign_keys=ON;"
  for t in organizers campaigns campaign_tiers contributions subscriptions; do
    echo "CREATE TABLE $t(id TEXT PRIMARY KEY);"
  done
  awk '/^```sql/{f=1;next} /^```/{f=0} f' "$ROOT/docs/09-d1-shema.md"
} | sqlite3 -bail "$DB"
echo "SQL: $(sqlite3 "$DB" "select count(*) from sqlite_master where type='table'") tablica (5 stubova jezgre), kategorija $(sqlite3 "$DB" 'select count(*) from categories')"
rm -f "$DB"
