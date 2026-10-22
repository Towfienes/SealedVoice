#!/usr/bin/env bash
# scripts/invite-user.sh <username> <role...>
# Creates the realm user, assigns realm roles, prints the Tide invite link.
# Works while the realm is still single-admin (firstAdmin): pending change requests are auto-approved the way
# init/tcinit.sh does it. Once the realm is multiAdmin, REST can only park change requests (HTTP 202) and an admin must
# approve + commit them in tide-console, so run this BEFORE adding admin #2 and #3. See scripts/setup-personas.sh for that phase.
set -uo pipefail
URL="${TIDECLOAK_LOCAL_URL:-http://localhost:8080}"
REALM="${NEW_REALM_NAME:-forseti-test}"
KC_USER="${KC_USER:-admin}"; KC_PASSWORD="${KC_PASSWORD:-password}"

[[ $# -ge 1 && "$1" =~ ^[A-Za-z0-9._-]{1,64}$ ]] || { echo "usage: $0 <username> [role...]" >&2; exit 2; }
USERNAME="$1"; shift
ROLES=("$@")

tok() { curl -s -X POST "$URL/realms/master/protocol/openid-connect/token" \
  --data-urlencode "username=$KC_USER" --data-urlencode "password=$KC_PASSWORD" \
  --data-urlencode grant_type=password --data-urlencode client_id=admin-cli | jq -r '.access_token // empty'; }
T="$(tok)"; [[ -n "$T" ]] || { echo "admin token request failed (KC_USER/KC_PASSWORD, $URL)" >&2; exit 1; }
adm() { local m="$1" p="$2"; shift 2; curl -s -w '\n%{http_code}' -X "$m" "$URL/admin/realms/$REALM$p" -H "Authorization: Bearer $T" "$@"; }

drain() {
  local round id
  for round in 1 2 3 4 5 6 7 8; do
    T="$(tok)"
    local ids; ids="$(curl -s "$URL/admin/realms/$REALM/iga/change-requests?status=PENDING" -H "Authorization: Bearer $T" -H 'Cache-Control: no-store' \
      | jq -r 'if type=="array" then .[].id // empty else empty end')"
    [[ -z "$ids" ]] && return 0
    while IFS= read -r id; do
      [[ -z "$id" ]] && continue
      curl -s -o /dev/null -X POST "$URL/admin/realms/$REALM/iga/change-requests/$id/approve" \
        -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d '{}'
    done <<< "$ids"
  done
}

uid() { curl -s "$URL/admin/realms/$REALM/users?username=$USERNAME&exact=true" -H "Authorization: Bearer $T" | jq -r '.[0].id // empty'; }

UID_="$(uid)"
if [[ -z "$UID_" ]]; then
  out="$(adm POST /users -H 'Content-Type: application/json' \
    -d "{\"username\":\"$USERNAME\",\"enabled\":true,\"emailVerified\":false,\"attributes\":{\"tideInvitable\":[\"true\"]}}")"
  echo "create user -> $(tail -n1 <<< "$out")"
  drain
  UID_="$(uid)"
fi
[[ -n "$UID_" ]] || { echo "user $USERNAME was not created (change request may be parked: multiAdmin realm needs tide-console approval)" >&2; exit 1; }

for r in "${ROLES[@]}"; do
  rep="$(curl -s "$URL/admin/realms/$REALM/roles/$r" -H "Authorization: Bearer $T")"
  [[ "$(jq -r '.name // empty' <<< "$rep")" == "$r" ]] || { echo "role '$r' does not exist in realm $REALM" >&2; exit 1; }
  out="$(adm POST "/users/$UID_/role-mappings/realm" -H 'Content-Type: application/json' -d "[$rep]")"
  code="$(tail -n1 <<< "$out")"
  echo "assign $r -> $code"
  [[ "$code" == "202" ]] && echo "  (202: change request parked; approve + commit it in tide-console)"
done
drain

T="$(tok)"
link="$(curl -s -X POST "$URL/admin/realms/$REALM/tideAdminResources/get-required-action-link?userId=$UID_&lifespan=43200" \
  -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -H 'Accept: text/plain' -d '["link-tide-account-action"]')"
[[ "$link" == http* ]] || { echo "invite link request failed: $link" >&2; exit 1; }
echo
echo "Tide invite link for $USERNAME (valid 12h):"
echo "$link"
