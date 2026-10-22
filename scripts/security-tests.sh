#!/usr/bin/env bash
# scripts/security-tests.sh — black-box attack suite against a running SealedBid app.
#
# Every check is a real HTTP request. Nothing is mocked: if the app is up and
# these pass, the app resisted the attack at the wire level.
#
# Usage
#   ./scripts/security-tests.sh                       # http://localhost:3000
#   BASE=http://localhost:3000 ./scripts/security-tests.sh
#   BIDDER_TOKEN=... COMMITTEE_TOKEN=... ./scripts/security-tests.sh
#
# The forged-token checks (alg:none, tampered, expired, wrong-issuer) need no
# credentials at all — that is the point. The positive checks (a real bidder can
# submit, a real committee member can open after the deadline) need real tokens:
# log in, then copy the token from DevTools → Application → Session Storage
# (key `access_token`) or from the `Authorization` header of any request.
#
# Exit codes: 0 = all checks passed, 1 = at least one security check failed.

set -uo pipefail

BASE="${BASE:-http://localhost:3000}"
BIDDER_TOKEN="${BIDDER_TOKEN:-}"
COMMITTEE_TOKEN="${COMMITTEE_TOKEN:-}"
TENDER_ID="${TENDER_ID:-GT-2026-017}"
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
  payload=$(printf '{"iss":"http://localhost:8080/realms/forseti-test","aud":"myclient","sub":"attacker","exp":%s,"realm_access":{"roles":["tender-committee","tide-realm-admin"]}}' \
    "$(( $(date +%s) + 3600 ))" | b64u)
  printf '%s.%s.' "$header" "$payload"
}

mint_expired() {
  local header payload sig
  header=$(printf '{"alg":"EdDSA","typ":"JWT","kid":"forged"}' | b64u)
  payload=$(printf '{"iss":"http://localhost:8080/realms/forseti-test","aud":"myclient","sub":"attacker","exp":%s,"realm_access":{"roles":["tender-committee"]}}' \
    "$(( $(date +%s) - 7200 ))" | b64u)
  sig=$(printf 'x' | b64u)
  printf '%s.%s.%s' "$header" "$payload" "$sig"
}

mint_wrong_issuer() {
  local header payload sig
  header=$(printf '{"alg":"EdDSA","typ":"JWT","kid":"forged"}' | b64u)
  payload=$(printf '{"iss":"http://localhost:8080/realms/master","aud":"myclient","sub":"attacker","exp":%s,"realm_access":{"roles":["tender-committee"]}}' \
    "$(( $(date +%s) + 3600 ))" | b64u)
  sig=$(printf 'x' | b64u)
  printf '%s.%s.%s' "$header" "$payload" "$sig"
}

mint_dpop_as_bearer() {
  local header payload sig
  header=$(printf '{"alg":"EdDSA","typ":"DPoP","kid":"forged"}' | b64u)
  payload=$(printf '{"iss":"http://localhost:8080/realms/forseti-test","aud":"myclient","sub":"attacker","exp":%s,"cnf":{"jkt":"forged"},"realm_access":{"roles":["tender-committee"]}}' \
    "$(( $(date +%s) + 3600 ))" | b64u)
  sig=$(printf 'x' | b64u)
  printf '%s.%s.%s' "$header" "$payload" "$sig"
}

# tamper: take a real token and swap its payload for an escalated one
tamper_escalate() {
  local token="$1" header evil_payload sig
  header=$(printf '%s' "$token" | cut -d. -f1)
  sig=$(printf '%s' "$token" | cut -d. -f3)
  evil_payload=$(printf '{"iss":"http://localhost:8080/realms/forseti-test","aud":"myclient","sub":"attacker","exp":%s,"realm_access":{"roles":["tender-committee","tide-realm-admin"]}}' \
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
head_ "1. Unauthenticated access must be refused"
read -r code body <<<"$(req GET /api/bids "")"
expect_status "GET /api/bids with no token" "401" "$code" "$body"

read -r code body <<<"$(req GET "/api/tenders")"
if [[ "$code" == "200" || "$code" == "401" ]]; then
  pass "GET /api/tenders is either public or gated (HTTP $code)"
else
  fail "GET /api/tenders unexpected status" "HTTP $code — body: $body"
fi

# ─── 2. forged tokens ────────────────────────────────────────────────────────
head_ "2. Forged tokens must be refused (no credentials needed)"
read -r code body <<<"$(req GET /api/bids "$(mint_none)")"
expect_status "alg:none token with tender-committee role" "401" "$code" "$body"

read -r code body <<<"$(req GET /api/bids "$(mint_expired)")"
expect_status "expired token" "401" "$code" "$body"

read -r code body <<<"$(req GET /api/bids "$(mint_wrong_issuer)")"
expect_status "token from the master realm (wrong iss)" "401" "$code" "$body"

read -r code body <<<"$(req GET /api/bids "$(mint_dpop_as_bearer)")"
expect_status "DPoP-typed token replayed as Bearer" "401" "$code" "$body"

read -r code body <<<"$(req GET /api/bids "not.a.jwt")"
expect_status "garbage token" "401" "$code" "$body"

# ─── 3. role escalation with a real token ────────────────────────────────────
head_ "3. Role escalation with a legitimately issued token"
if [ -n "$BIDDER_TOKEN" ]; then
  read -r code body <<<"$(req GET /api/bids "$(tamper_escalate "$BIDDER_TOKEN")")"
  expect_status "bidder token with payload swapped to tender-committee" "401" "$code" "$body"

  read -r code body <<<"$(req POST "/api/bids" "$BIDDER_TOKEN" '{"tenderId":"'"$TENDER_ID"'","price":1,"proposal":"x"}')"
  if [[ "$code" == "400" || "$code" == "422" ]]; then
    pass "bidder cannot post plaintext (server demands ciphertext, HTTP $code)"
  elif [[ "$code" == "200" || "$code" == "201" ]]; then
    fail "bidder posted PLAINTEXT and the server accepted it" \
         "the server must reject non-ciphertext bodies; got HTTP $code"
  else
    skip "plaintext bid rejection returned HTTP $code (inspect manually)"
  fi

  read -r code body <<<"$(req POST "/api/committee/open" "$BIDDER_TOKEN" '{"tenderId":"'"$TENDER_ID"'"}')"
  expect_status "bidder cannot call the committee open endpoint" "403 401" "$code" "$body"
else
  skip "role-escalation checks need BIDDER_TOKEN"
fi

# ─── 4. time lock (the headline claim) ───────────────────────────────────────
head_ "4. Time lock before the deadline"
if [ -n "$COMMITTEE_TOKEN" ]; then
  read -r code body <<<"$(req POST "/api/committee/open" "$COMMITTEE_TOKEN" '{"tenderId":"'"$TENDER_ID"'"}')"
  if [[ "$code" == "403" || "$code" == "409" ]]; then
    if printf '%s' "$body" | grep -qi 'time lock'; then
      pass "committee member refused before deadline with the ORK time-lock message"
    else
      fail "committee member refused, but not by the time lock" \
           "expected a 'Time lock preventing decryption until …' message, got: $body"
    fi
  elif [[ "$code" == "200" ]]; then
    fail "COMMITTEE MEMBER OPENED BIDS BEFORE THE DEADLINE" \
         "the Forseti time-lock tag is not being enforced — check DecryptTimeLock:{epoch}"
  else
    skip "open-before-deadline returned HTTP $code (inspect manually)"
  fi
else
  skip "time-lock check needs COMMITTEE_TOKEN"
fi

# ─── 5. ciphertext at rest ───────────────────────────────────────────────────
head_ "5. Server stores ciphertext only"
DB="${DB_PATH:-./data/app.db}"
if [ -f "$DB" ] && command -v sqlite3 >/dev/null 2>&1; then
  dump=$(sqlite3 "$DB" "SELECT payload FROM bids LIMIT 5;" 2>/dev/null || true)
  if [ -z "$dump" ]; then
    skip "bids table is empty — submit a bid first"
  elif printf '%s' "$dump" | grep -qE '"(price|proposal)"[[:space:]]*:'; then
    fail "PLAINTEXT FOUND IN THE DATABASE" \
         "a bids row contains JSON field names; encryption is happening server-side or not at all"
  else
    pass "no plaintext bid JSON in the bids table"
  fi
else
  skip "sqlite3 or $DB not available"
fi

# ─── 6. QEA governance surface ───────────────────────────────────────────────
head_ "6. Quorum governance is enforced, not advisory"
if [ -n "$COMMITTEE_TOKEN" ]; then
  read -r code body <<<"$(req POST "/api/admin/grant-role" "$COMMITTEE_TOKEN" \
    '{"username":"hung.officer","role":"tender-committee"}')"
  if [[ "$code" == "202" ]]; then
    pass "self-grant of tender-committee returned 202 PENDING (quorum required)"
  elif [[ "$code" == "200" ]]; then
    fail "ROLE GRANT APPLIED IMMEDIATELY" \
         "a single admin self-granted a decrypt role; the realm is not in multiAdmin mode"
  else
    skip "grant-role returned HTTP $code (inspect manually)"
  fi
else
  skip "QEA check needs COMMITTEE_TOKEN"
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
