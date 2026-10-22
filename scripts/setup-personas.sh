#!/usr/bin/env bash
# scripts/setup-personas.sh: SealedVoice roles, demo users and Tide invite links.
#
# After `npm run init` the realm is already quorum-governed (IGA multiAdmin): every change is a
# change request that the enrolled admin must APPROVE and then COMMIT in the tide-console
# (http://localhost:8080/realms/forseti-test/tide-console/). REST cannot auto-commit. So run in phases:
#
#   bash scripts/setup-personas.sh submit   # roles + users -> 8 change requests
#   (approve + commit them in tide-console: roles first, then users)
#   bash scripts/setup-personas.sh map      # realm role mappings -> 4 change requests
#   (approve + commit them)
#   bash scripts/setup-personas.sh invite   # writes data/invite-links.txt (gitignored)
#   bash scripts/open-persona.sh mai invite # one Chromium profile per persona
#   bash scripts/setup-personas.sh admins   # LAST: admins #2/#3 (council, minh) -> quorum on; approve + commit, then EXPORT_ONLY=1 bash init/tcinit.sh
#   bash scripts/setup-personas.sh status
set -uo pipefail
URL="${TIDECLOAK_LOCAL_URL:-http://localhost:8080}"
REALM="${NEW_REALM_NAME:-forseti-test}"
KC_USER="${KC_USER:-admin}"; KC_PASSWORD="${KC_PASSWORD:-password}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/data/invite-links.txt"
ROLES=(student investigator identity-guardian council)
# The free Tide licence allows 4 accounts (admin = Dr. Hung + these three). Role lists are comma-separated.
#   council = Inspector Lan's login (investigator); minh = Guardian Minh, who also holds the University Council seat.
USERS=("mai:student:Mai:Nguyen" "council:investigator:Lan:Tran" "minh:identity-guardian,council:Minh:Le")

tok() { curl -s -X POST "$URL/realms/master/protocol/openid-connect/token" \
  --data-urlencode "username=$KC_USER" --data-urlencode "password=$KC_PASSWORD" \
  --data-urlencode grant_type=password --data-urlencode client_id=admin-cli | jq -r .access_token; }
code() { local m="$1" p="$2"; shift 2; curl -s -o /dev/null -w '%{http_code}' -X "$m" "$URL/admin/realms/$REALM$p" -H "Authorization: Bearer $T" "$@"; }
uid() { curl -s "$URL/admin/realms/$REALM/users?username=$1&exact=true" -H "Authorization: Bearer $T" | jq -r '.[0].id // empty'; }
pending() { curl -s "$URL/admin/realms/$REALM/iga/change-requests?status=PENDING" -H "Authorization: Bearer $T" \
  | jq -r '.[] | "  \(.actionType) \(.rows[0].USERNAME // .rows[0].NAME // "") approvals=\(.authorizationCount)/\(.threshold)"'; }

T=$(tok); [ -n "$T" ] && [ "$T" != null ] || { echo "cannot get master admin token from $URL"; exit 1; }

case "${1:-status}" in
  submit)
    for r in "${ROLES[@]}"; do echo "role $r -> $(code POST /roles -H 'Content-Type: application/json' -d "{\"name\":\"$r\"}")"; done
    for u in "${USERS[@]}"; do IFS=: read -r n _ f l <<<"$u"
      echo "user $n -> $(code POST /users -H 'Content-Type: application/json' -d "{\"username\":\"$n\",\"email\":\"$n@sealedvoice.test\",\"firstName\":\"$f\",\"lastName\":\"$l\",\"enabled\":true,\"attributes\":{\"tideInvitable\":[\"true\"]}}")"; done
    echo "Now approve + commit in tide-console:"; pending ;;
  map)
    for u in "${USERS[@]}"; do IFS=: read -r n rs _ _ <<<"$u"; id=$(uid "$n"); [ -n "$id" ] || { echo "user $n missing: commit CREATE_USER first"; continue; }
      for r in ${rs//,/ }; do
        rep=$(curl -s "$URL/admin/realms/$REALM/roles/$r" -H "Authorization: Bearer $T")
        echo "$n += $r -> $(code POST "/users/$id/role-mappings/realm" -H 'Content-Type: application/json' -d "[$rep]")"; done; done
    echo "Now approve + commit in tide-console:"; pending ;;
  invite)
    : > "$OUT"
    for u in "${USERS[@]}"; do IFS=: read -r n _ _ _ <<<"$u"; id=$(uid "$n"); [ -n "$id" ] || continue
      link=$(curl -s -X POST "$URL/admin/realms/$REALM/tideAdminResources/get-required-action-link?userId=$id&lifespan=43200" \
        -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -H 'Accept: text/plain' -d '["link-tide-account-action"]')
      printf '%s %s\n' "$n" "$link" >> "$OUT"; echo "$n: invite written"; done
    echo "Open with: bash scripts/open-persona.sh <name> invite" ;;
  admins)
    # Admins #2 and #3 (turns on quorum). Run only after every role mapping from `map` is committed.
    RM=$(curl -s "$URL/admin/realms/$REALM/clients?clientId=realm-management" -H "Authorization: Bearer $T" | jq -r '.[0].id // empty')
    [ -n "$RM" ] || { echo "cannot resolve the realm-management client"; exit 1; }
    ROLE=$(curl -s "$URL/admin/realms/$REALM/clients/$RM/roles/tide-realm-admin" -H "Authorization: Bearer $T")
    [ "$(jq -r '.name // empty' <<<"$ROLE")" = tide-realm-admin ] || { echo "role tide-realm-admin not found: $ROLE"; exit 1; }
    for n in council minh; do id=$(uid "$n"); [ -n "$id" ] || { echo "user $n missing"; continue; }
      if curl -s "$URL/admin/realms/$REALM/users/$id/role-mappings/clients/$RM" -H "Authorization: Bearer $T" | jq -e 'any(.[]?; .name=="tide-realm-admin")' >/dev/null; then
        echo "$n already has tide-realm-admin"; continue; fi
      echo "$n += tide-realm-admin -> $(code POST "/users/$id/role-mappings/clients/$RM" -H 'Content-Type: application/json' -d "[$ROLE]")"; done
    echo "Now approve + commit in tide-console (as Dr. Hung):"; pending
    echo
    echo "After BOTH are committed: council and minh sign out and in again, then refresh the data files:"
    echo "  EXPORT_ONLY=1 bash init/tcinit.sh" ;;
  status)
    for u in admin "${USERS[@]}"; do n=${u%%:*}; id=$(uid "$n")
      info=$(curl -s "$URL/admin/realms/$REALM/users/$id?userProfileMetadata=false" -H "Authorization: Bearer $T" | jq -r 'if .attributes.vuid then "tide-linked" else "NOT linked" end' 2>/dev/null)
      roles=$(curl -s "$URL/admin/realms/$REALM/users/$id/role-mappings/realm" -H "Authorization: Bearer $T" | jq -r '[.[].name]|map(select(test("^(student|investigator|identity-guardian|council)$")))|join(",")' 2>/dev/null)
      printf '  %-8s %-11s roles=%s\n' "$n" "${info:-missing}" "${roles:-none}"; done
    echo "pending:"; pending ;;
  *) echo "usage: $0 submit|map|invite|admins|status"; exit 1 ;;
esac
