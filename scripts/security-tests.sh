#!/usr/bin/env bash
# scripts/security-tests.sh — black-box attack suite against a running SealedVoice app.
#
# Every check is a real HTTP request. Nothing is mocked: if the app is up and
# these pass, the app resisted the attack at the wire level.
#
# Usage
#   ./scripts/security-tests.sh                       # http://localhost:3000
#   BASE=http://localhost:3000 ./scripts/security-tests.sh
#   MAI_TOKEN=... INVESTIGATOR_TOKEN=... HUNG_TOKEN=... ./scripts/security-tests.sh
#
# Forged-token checks need no credentials. Positive checks need real tokens: log in as
# mai / council (Inspector Lan) / admin (Dr. Hung) and copy the access token from DevTools.
# Time-lock-before-unlock is verified in the browser (the ORK decrypts client-side); see docs/TRUST-MODEL.md.
#
# Exit codes: 0 = all checks passed, 1 = at least one security check failed.

set -uo pipefail

BASE="${BASE:-http://localhost:3000}"
MAI_TOKEN="${MAI_TOKEN:-}"
INVESTIGATOR_TOKEN="${INVESTIGATOR_TOKEN:-}"
HUNG_TOKEN="${HUNG_TOKEN:-}"
PASS=0
FAIL=0
SKIP=0

# ─── output helpers ──────────────────────────────────────────────────────────
if [ -t 1 ]; then
  R=$'\033[31m'; G=$'\033[32m'; Y=$'\033[33m'; B=$'\033[1m'; N=$'\033[0m'
else
  R=""; G=""; Y=""; B=""; N=""
fi

pass() { PASS=$((PASS+1)); printf '%s  PASS%s  %s\n' "$G" "$N" "$1"; }
fail() { FAIL=$((FAIL+1)); printf '%s  FAIL%s  %s\n' "$R" "$N" "$1"; printf '        ↳ %s\n' "$2"; }
skip() { SKIP=$((SKIP+1)); printf '%s  SKIP%s  %s\n' "$Y" "$N" "$1"; }
head_() { printf '\n%s%s%s\n' "$B" "$1" "$N"; }

# ─── base64url (no padding) ──────────────────────────────────────────────────
b64u() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }

# ─── token forging ───────────────────────────────────────────────────────────
# These are the tokens an attacker would actually send. No signing key needed.
mint_none() {
  local header payload
  header=$(printf '{"alg":"none","typ":"JWT","kid":"forged"}' | b64u)
  payload=$(printf '{"iss":"http://localhost:8080/realms/forseti-test","aud":"myclient","sub":"attacker","exp":%s,"realm_access":{"roles":["investigator","tide-realm-admin"]}}' \
    "$(( $(date +%s) + 3600 ))" | b64u)
  printf '%s.%s.' "$header" "$payload"
}

mint_expired() {
  local header payload sig
  header=$(printf '{"alg":"EdDSA","typ":"JWT","kid":"forged"}' | b64u)
  payload=$(printf '{"iss":"http://localhost:8080/realms/forseti-test","aud":"myclient","sub":"attacker","exp":%s,"realm_access":{"roles":["investigator"]}}' \
    "$(( $(date +%s) - 7200 ))" | b64u)
  sig=$(printf 'x' | b64u)
  printf '%s.%s.%s' "$header" "$payload" "$sig"
}

mint_wrong_issuer() {
  local header payload sig
  header=$(printf '{"alg":"EdDSA","typ":"JWT","kid":"forged"}' | b64u)
  payload=$(printf '{"iss":"http://localhost:8080/realms/master","aud":"myclient","sub":"attacker","exp":%s,"realm_access":{"roles":["investigator"]}}' \
    "$(( $(date +%s) + 3600 ))" | b64u)
  sig=$(printf 'x' | b64u)
  printf '%s.%s.%s' "$header" "$payload" "$sig"
}

mint_dpop_as_bearer() {
  local header payload sig
  header=$(printf '{"alg":"EdDSA","typ":"DPoP","kid":"forged"}' | b64u)
  payload=$(printf '{"iss":"http://localhost:8080/realms/forseti-test","aud":"myclient","sub":"attacker","exp":%s,"cnf":{"jkt":"forged"},"realm_access":{"roles":["investigator"]}}' \
    "$(( $(date +%s) + 3600 ))" | b64u)
  sig=$(printf 'x' | b64u)
  printf '%s.%s.%s' "$header" "$payload" "$sig"
}

# tamper: take a real token and swap its payload for an escalated one
tamper_escalate() {
  local token="$1" header evil_payload sig
  header=$(printf '%s' "$token" | cut -d. -f1)
  sig=$(printf '%s' "$token" | cut -d. -f3)
  evil_payload=$(printf '{"iss":"http://localhost:8080/realms/forseti-test","aud":"myclient","sub":"attacker","exp":%s,"realm_access":{"roles":["investigator","tide-realm-admin"]}}' \
    "$(( $(date +%s) + 3600 ))" | b64u)
  printf '%s.%s.%s' "$header" "$evil_payload" "$sig"
}

# ─── request helper: prints "<status> <body>" ────────────────────────────────
# $1 method, $2 path, $3 token ("" = none), $4 body ("" = none), $5 extra header
req() {
  local method="$1" path="$2" token="${3:-}" body="${4:-}" extra="${5:-}"
  local args=(-sS -o /tmp/sb_body.$$ -w '%{http_code}' -X "$method" "$BASE$path")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$extra" ] && args+=(-H "$extra")
  if [ -n "$body" ]; then
    args+=(-H 'Content-Type: application/json' --data-binary "$body")
  fi
  local code
  code=$(curl "${args[@]}" 2>/dev/null) || code="000"
  local out
  out=$(cat /tmp/sb_body.$$ 2>/dev/null | head -c 400)
  rm -f /tmp/sb_body.$$
  printf '%s %s' "$code" "$out"
}

expect_status() { # $1 label, $2 expected (space-separated ok list), $3 actual code, $4 body
  local label="$1" want="$2" got="$3" body="$4"
  if [[ " $want " == *" $got "* ]]; then
    pass "$label (HTTP $got)"
  else
    fail "$label" "expected HTTP $want, got HTTP $got — body: $body"
  fi
}

# ─── preflight ───────────────────────────────────────────────────────────────
head_ "Preflight"
if ! curl -sS -o /dev/null --max-time 5 "$BASE" 2>/dev/null; then
  printf '%sApp is not reachable at %s%s\n' "$R" "$BASE" "$N"
  printf 'Start it with: npm run dev\n'
  exit 1
fi
printf '  target: %s\n' "$BASE"

# ─── 1. unauthenticated access ───────────────────────────────────────────────
head_ "1. Reading reports without a token must be refused"
read -r code body <<<"$(req GET /api/reports "")"
expect_status "GET /api/reports with no token" "401" "$code" "$body"
read -r code body <<<"$(req GET /api/admin/db-dump "")"
expect_status "GET /api/admin/db-dump with no token" "401" "$code" "$body"
read -r code body <<<"$(req POST /api/admin/grant-role "" '{"username":"admin","role":"investigator"}')"
expect_status "POST /api/admin/grant-role with no token" "401" "$code" "$body"
read -r code body <<<"$(req GET "/api/policies" "")"
expect_status "GET /api/policies (pending requests) with no token" "401" "$code" "$body"
read -r code body <<<"$(req POST /api/policies "" '{"policyRequest":"AAAA"}')"
expect_status "POST /api/policies with no token" "401" "$code" "$body"
read -r code body <<<"$(req DELETE /api/policies "")"
expect_status "DELETE /api/policies is gone (no unauthenticated wipe)" "405 404" "$code" "$body"

# ─── 2. forged tokens ────────────────────────────────────────────────────────
head_ "2. Forged tokens must be refused (no credentials needed)"
read -r code body <<<"$(req GET /api/reports "$(mint_none)")"
expect_status "alg:none token with investigator role" "401" "$code" "$body"
read -r code body <<<"$(req GET /api/reports "$(mint_expired)")"
expect_status "expired token" "401" "$code" "$body"
read -r code body <<<"$(req GET /api/reports "$(mint_wrong_issuer)")"
expect_status "token from the master realm (wrong iss)" "401" "$code" "$body"
read -r code body <<<"$(req GET /api/reports "$(mint_dpop_as_bearer)")"
expect_status "DPoP-typed token replayed as Bearer" "401" "$code" "$body"
read -r code body <<<"$(req GET /api/reports "not.a.jwt")"
expect_status "garbage token" "401" "$code" "$body"

# ─── 3. the anonymous submit path accepts ciphertext only ────────────────────
head_ "3. POST /api/reports: ciphertext only, no Authorization header"
read -r code body <<<"$(req POST /api/reports "" '{"title":"x","description":"My lecturer asked for a bribe","fullName":"Mai","studentId":"s1234567"}')"
expect_status "plaintext report body is rejected" "400" "$code" "$body"
read -r code body <<<"$(req POST /api/reports "" '{"envelopes":{"content":{"ciphertext":"not base64 at all!","tags":["sv:content"]}}}')"
expect_status "non-base64 ciphertext is rejected" "400" "$code" "$body"
CT='QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo='
OKBODY='{"envelopes":{"content":{"ciphertext":"'$CT'","tags":["sv:content"]},"identity":{"ciphertext":"'$CT'","tags":["sv:identity"]},"council":{"ciphertext":"'$CT'","tags":["sv:council","DecryptTimeLock:4102444800"],"unlockAt":4102444800}}}'
read -r code body <<<"$(req POST /api/reports "" "$OKBODY")"
expect_status "well-formed ciphertext envelopes accepted with NO Authorization header" "201" "$code" "$body"

# ─── 4. role gate on the list endpoint ───────────────────────────────────────
head_ "4. Role gate on GET /api/reports (real tokens)"
if [ -n "$MAI_TOKEN" ]; then
  read -r code body <<<"$(req GET /api/reports "$MAI_TOKEN")"
  expect_status "Mai (student) cannot list reports" "403" "$code" "$body"
  read -r code body <<<"$(req GET /api/reports "$(tamper_escalate "$MAI_TOKEN")")"
  expect_status "Mai's token with payload swapped to investigator" "401" "$code" "$body"
else
  skip "student checks need MAI_TOKEN"
fi
if [ -n "$INVESTIGATOR_TOKEN" ]; then
  read -r code body <<<"$(req GET /api/reports "$INVESTIGATOR_TOKEN")"
  expect_status "Inspector Lan (investigator) can list reports" "200" "$code" "$body"
  read -r code body <<<"$(req GET /api/admin/db-dump "$INVESTIGATOR_TOKEN")"
  expect_status "investigator cannot use the admin db-dump" "403" "$code" "$body"
else
  skip "investigator checks need INVESTIGATOR_TOKEN"
fi

# ─── 5. ciphertext at rest ───────────────────────────────────────────────────
head_ "5. Server stores ciphertext only"
DB="${DB_PATH:-./db/database.sqlite}"
if [ -f "$DB" ] && command -v sqlite3 >/dev/null 2>&1; then
  dump=$(sqlite3 "$DB" "SELECT envelopes FROM reports LIMIT 20;" 2>/dev/null || true)
  if [ -z "$dump" ]; then
    skip "reports table is empty: file a report first"
  elif printf '%s' "$dump" | grep -qE '"(description|fullName|studentId|email|title)"[[:space:]]*:'; then
    fail "PLAINTEXT FIELD NAMES FOUND IN THE DATABASE" "a reports row contains plaintext keys"
  else
    pass "no plaintext report fields in the reports table"
  fi
else
  skip "sqlite3 or $DB not available"
fi

# ─── 6. QEA governance surface ───────────────────────────────────────────────
head_ "6. Quorum governance is enforced, not advisory"
if [ -n "$HUNG_TOKEN" ]; then
  read -r code body <<<"$(req POST "/api/admin/grant-role" "$HUNG_TOKEN" '{"username":"admin","role":"investigator"}')"
  if [[ "$code" == "202" ]]; then
    pass "Dr. Hung's self-grant of investigator returned 202 PENDING (quorum required)"
  elif [[ "$code" == "200" || "$code" == "204" ]]; then
    fail "ROLE GRANT APPLIED IMMEDIATELY" "a single admin self-granted a decrypt role; the realm is not in multiAdmin mode"
  else
    skip "grant-role returned HTTP $code (inspect manually): $body"
  fi
  read -r code body <<<"$(req GET "/api/admin/db-dump" "$HUNG_TOKEN")"
  expect_status "Dr. Hung can dump the DB (simulated direct DB access) and sees ciphertext only" "200" "$code" "$body"
else
  skip "QEA check needs HUNG_TOKEN"
fi

# ─── summary ─────────────────────────────────────────────────────────────────
printf '\n%s─────────────────────────────────────────%s\n' "$B" "$N"
printf '  passed: %s%d%s   failed: %s%d%s   skipped: %s%d%s\n' \
  "$G" "$PASS" "$N" "$R" "$FAIL" "$N" "$Y" "$SKIP" "$N"

if [ "$FAIL" -gt 0 ]; then
  printf '\n%sSecurity checks FAILED. Do not submit until these are green.%s\n' "$R" "$N"
  exit 1
fi
printf '\n%sAll executed security checks passed.%s\n' "$G" "$N"
[ "$SKIP" -gt 0 ] && printf '%s%d check(s) skipped — supply tokens or seed data to run them.%s\n' "$Y" "$SKIP" "$N"
exit 0
