# SETUP-LIVE: run SealedVoice against real TideCloak (staging ORKs)

For a fresh Linux/macOS machine. Needs: Docker, Node >= 20.9, `curl`, `jq`, `sqlite3` (optional), Chromium or Chrome.
Order matters: **assign every role before adding admins #2 and #3.** After that every realm change is a quorum change request.
Ports: the app must run on **:3000** (Tide login only redirects there). TideCloak is on :8080.

Status of this document: steps 1, 3, 5 and 6 mirror what the lead ran at Gate 1. Step 2 (`npm run init` on a clean machine), the admin #2/#3 REST snippet in step 7 and `scripts/invite-user.sh` were written from the scripts and are **not re-run by WT-A on a clean machine**. If one fails, copy the exact error text.

## 1. Clone and install
```bash
git clone https://github.com/Towfienes/SealedVoice.git && cd SealedVoice
npm install
printf 'NEXT_PUBLIC_VAULT=tide\n' > .env.local      # gitignored; omit it to run the UI in SIMULATED mock mode
```

## 2. TideCloak + realm + Dr. Hung (admin #1)
```bash
npm run init
```
`init/start.sh` starts container `mytidecloak` (image `tideorg/tidecloak-stg-dev`, staging ORKs), creates realm `forseti-test` and client `myclient`, then **prints a Tide enrollment link for the user `admin` (Dr. Hung)**. Open it, complete enrollment in the Tide enclave (a few minutes), and the script continues by itself. It writes `data/tidecloak.json` and `data/admin-policy.b64` (both gitignored, never commit them).
Notes: `init/start.sh` calls `sudo docker`. If your Docker works without sudo and the container already exists, use `bash scripts/start-tidecloak.sh` to start it and `EXPORT_ONLY=1 bash init/tcinit.sh` to refresh the two data files.
Check: `curl -s http://localhost:8080/realms/forseti-test/.well-known/openid-configuration | jq .issuer`

## 3. Start the app
```bash
npm run dev          # http://localhost:3000, uses NEXT_PUBLIC_VAULT from .env.local
```

## 4. Personas (roles and users) in phases
The free Tide licence allows **4 accounts**: `admin` (Dr. Hung), `mai` (student), `council` (Inspector Lan, investigator), `minh` (Guardian Minh: identity-guardian + council seat).
While the realm has one admin, change requests are parked until Dr. Hung commits them in tide-console.
```bash
bash scripts/setup-personas.sh submit   # creates roles + users -> change requests
bash scripts/open-persona.sh hung console
```
In tide-console (as Dr. Hung): **approve, then commit** every pending request. Roles first, then users. Then:
```bash
bash scripts/setup-personas.sh map      # role mappings -> more change requests
```
Approve + commit those too, then:
```bash
bash scripts/setup-personas.sh invite   # writes data/invite-links.txt (gitignored)
bash scripts/setup-personas.sh status   # every user should say "tide-linked" after step 5, with roles listed
```

## 5. One Chromium profile per persona
Each persona needs its own browser profile (separate Tide session).
```bash
bash scripts/open-persona.sh mai invite        # enroll Mai in the Tide enclave
bash scripts/open-persona.sh council invite    # Inspector Lan (Tide user `council`)
bash scripts/open-persona.sh minh invite       # Guardian Minh
bash scripts/open-persona.sh hung app          # Dr. Hung, already enrolled in step 2
```
After enrolling, open the app per persona: `bash scripts/open-persona.sh <mai|council|minh|hung> app` (the `lan` name also works as a profile name).
Sign in once per persona at http://localhost:3000. Role changes only show in the token after a fresh login.

## 6. Commit the three policies (Dr. Hung)
Open `/admin/policies` in Dr. Hung's profile. For each of `investigator`, `guardian`, `council`: **1 Create, 2 Approve, 3 Commit**. Each step opens the Tide enclave. The contract is frozen: editing `contracts/SealedVoicePolicy.cs` changes the contract ID and forces all three to be re-created.
Check: `sqlite3 db/database.sqlite 'select roleId, length(data) from committed_policies'` shows `council`, `guardian`, `investigator`.
(`bash scripts/reset-demo.sh` wipes reports and policies in the app database. TideCloak is untouched.)

## 7. Admins #2 and #3 (turns on quorum)
Quorum is `max(1, floor(0.7 * N))`, so it needs 3 admins to be 2-of-3. Do this **last**, after every role mapping from step 4 is committed.
```bash
URL=http://localhost:8080; R=forseti-test
T=$(curl -s -X POST $URL/realms/master/protocol/openid-connect/token -d username=admin -d password=password -d grant_type=password -d client_id=admin-cli | jq -r .access_token)
RM=$(curl -s "$URL/admin/realms/$R/clients?clientId=realm-management" -H "Authorization: Bearer $T" | jq -r '.[0].id')
ROLE=$(curl -s "$URL/admin/realms/$R/clients/$RM/roles/tide-realm-admin" -H "Authorization: Bearer $T")
for u in council minh; do
  id=$(curl -s "$URL/admin/realms/$R/users?username=$u&exact=true" -H "Authorization: Bearer $T" | jq -r '.[0].id')
  curl -s -o /dev/null -w "$u -> %{http_code}\n" -X POST "$URL/admin/realms/$R/users/$id/role-mappings/clients/$RM" \
    -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d "[$ROLE]"
done
```
Each prints `202` (parked). In tide-console as Dr. Hung: approve + commit both. Admins #2 and #3 then log in again to pick up `tide-realm-admin`.
From now on, Dr. Hung's self-grant (the `/dean` scene) returns **202 pending** and needs a second admin's enclave approval.

## 8. Smoke test
1. Mai (`/report`): file a report. Expect a receipt with alias, digest and council unlock time.
2. Inspector Lan (`/investigator`): content opens, identity is denied with the exact ORK text.
3. Guardian Minh (`/guardian`): identity opens. `/council` before unlock shows `Time lock preventing decryption until <epoch>`.
4. Dr. Hung (`/dean`): database rows are ciphertext, reveal is denied, self-grant is 202.
5. Optional, council role only: `/admin/lab` (dev page, not linked) tries the council envelope with the stored tags, with the lock changed to a past epoch, and with the lock removed.
6. Wire-level checks: `bash scripts/security-tests.sh` (header explains how to copy the four tokens).

## Troubleshooting
- Login loops or redirects to the wrong port: the app must be on :3000.
- A role you just committed is missing: sign out and in again.
- `Policy 'x' is not committed yet`: step 6 for that label.
- Always copy the exact Tide/ORK error text; it is shown in the UI and used in the video.
