#!/usr/bin/env bash
# Open one persona in its own Chromium profile (separate Tide session per persona).
# Usage: bash scripts/open-persona.sh <hung|mai|lan|minh|council> [invite|app|console]
set -euo pipefail
name="${1:?persona}"; what="${2:-app}"
root="$(cd "$(dirname "$0")/.." && pwd)"
profile="${SV_PROFILES:-$root/../sv-profiles}/$name"; mkdir -p "$profile"
case "$what" in
  invite)  url=$(awk -v n="$name" '$1==n{print $2}' "$root/data/invite-links.txt") ;;
  console) url="http://localhost:8080/realms/forseti-test/tide-console/" ;;
  *)       url="http://localhost:3000/" ;;
esac
[ -n "$url" ] || { echo "no URL for $name/$what (run scripts/setup-personas.sh first)"; exit 1; }
browser="$(command -v chromium || command -v google-chrome || command -v chromium-browser)"
nohup "$browser" --user-data-dir="$profile" --no-first-run --no-default-browser-check "$url" >/dev/null 2>&1 &
echo "opened $name ($what)"
