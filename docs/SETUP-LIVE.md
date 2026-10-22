# SETUP-LIVE: run SealedVoice against real TideCloak (staging ORKs)

For a fresh Linux/macOS machine. Needs: Docker, Node >= 20.9, `curl`, `jq`, `sqlite3` (optional), Chromium or Chrome.
Order matters: **assign every role before adding admins #2 and #3.** After that every realm change is a quorum change request.
Ports: the app must run on **:3000** (Tide login only redirects there). TideCloak is on :8080.

## Live verification status (lead, 22 Oct 2026, 15:32 VN)

**Verified live:**
- TideCloak login for the 4 personas (admin, mai, council, minh).
- Realm roles (student, investigator, identity-guardian, council).
- The 3 Forseti policies committed via the enclave (investigator, guardian, council).
- QEA change requests pending (role grants are parked as change requests).

**NOT yet verified live:**
- Seal and decrypt end-to-end (Mai seals, Inspector Lan reads, the council time lock before and after). The hotspot DNS to `sork1.tideprotocol.com` was flaky, so the ORK calls could not be completed.

**Also not run live by WT-A (code is built and unit-tested only):** `setup-personas.sh admins`, `/api/admin/quorum`, `/admin/lab` (whether the time lock is bound to the ciphertext is unanswered), the 409 on a duplicate policy decision, and the re-login banner. Until `setup-personas.sh admins` has been run and committed, the realm has **one** admin: Dr. Hung alone is the quorum, so the "2 of 3" guarantee does not exist yet. The `/dean` card reads the real admin count and says so.

Versions that matter: the app uses the Tide SDKs **0.14** (`@tidecloak/js`, `@tideorg/js`, `heimdall-tide`, `asgard-tide`). The upstream quickstart pins 0.13.21, which cannot parse the v4 admin policy that the current `tidecloak-stg-dev` image exports (`Unknown policy version: 4`). Policies are therefore created as **v4** (`lib/policies/flow.ts`). Do not downgrade the SDKs.

Status of this document: written by WT-A from the repo scripts and the AGENTS.md rules. **WT-A did not run any step of it on a clean machine.** Steps that most need a first-run check: `npm run init` (step 2), the admin #2/#3 snippet (step 7) and `scripts/invite-user.sh`. If something fails, copy the exact error text and report it.

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

## 3. Start the app (production build, port 3000)
`NEXT_PUBLIC_VAULT` is baked in at build time, so build **after** creating `.env.local`:
```bash
npm run build && npm start        # http://localhost:3000
```
(`npm run dev` also works for development. Tide login only redirects to :3000.) Rebuild after any code or `.env.local` change.

## 4. Personas: the exact phase order
The free Tide licence allows **4 accounts**: `admin` (Dr. Hung), `mai` (student), `council` (Inspector Lan, investigator), `minh` (Guardian Minh: identity-guardian + council seat).
While the realm has one admin, every change is parked as a change request until Dr. Hung **approves and commits** it in tide-console (`bash scripts/open-persona.sh hung console`). REST can never commit. Phases:
```bash
bash scripts/setup-personas.sh submit   # 1. roles + users           -> change requests
# tide-console as Dr. Hung: approve + commit all (roles first, then users)
bash scripts/setup-personas.sh map      # 2. role mappings           -> change requests
# approve + commit all
bash scripts/setup-personas.sh invite   # 3. writes data/invite-links.txt (gitignored)
# step 5 below: enroll each persona, step 6: commit the 3 policies
bash scripts/setup-personas.sh admins   # 4. LAST: admins #2/#3 (council, minh) -> quorum
# approve + commit both, council and minh sign out and in, then:
EXPORT_ONLY=1 bash init/tcinit.sh       # refresh data/tidecloak.json + data/admin-policy.b64
bash scripts/setup-personas.sh status   # any time: tide-linked? roles? pending requests?
```
Commit the three policies (step 6) **before** `admins`: afterwards every realm change and policy approval needs a second admin's enclave approval.

## 5. One Chromium profile per persona
Each persona needs its own browser profile (separate Tide session). Usage: `bash scripts/open-persona.sh <hung|mai|council|minh> [invite|app|console|/path]` (`/path` opens that page of the app, e.g. `/investigator`).
```bash
bash scripts/open-persona.sh mai invite        # enroll Mai in the Tide enclave
bash scripts/open-persona.sh council invite    # Inspector Lan (Tide user `council`)
bash scripts/open-persona.sh minh invite       # Guardian Minh
bash scripts/open-persona.sh hung /admin/policies   # Dr. Hung, already enrolled in step 2
```
After enrolling, open the app per persona: `bash scripts/open-persona.sh <mai|council|minh|hung> app`.
Sign in once per persona at http://localhost:3000. Role changes only show in the token after a fresh sign-in.

## 6. Commit the three policies (Dr. Hung)
Open `/admin/policies` in Dr. Hung's profile (policy version 4, see the SDK note at the top). For each of `investigator`, `guardian`, `council`: **1 Create, 2 Approve, 3 Commit**. Each step opens the Tide enclave. The contract is frozen: editing `contracts/SealedVoicePolicy.cs` changes the contract ID and forces all three to be re-created.
Check: `sqlite3 db/database.sqlite 'select roleId, length(data) from committed_policies'` shows `council`, `guardian`, `investigator`.
(`bash scripts/reset-demo.sh` wipes reports and policies in the app database. TideCloak is untouched.)

## 7. Admins #2 and #3 (turns on quorum)
Quorum is `max(1, floor(0.7 * N))`: with 3 admins it is 2-of-3. Do this **last**, after every role mapping and the three policies are committed.
```bash
bash scripts/setup-personas.sh admins
```
It submits the `realm-management` / `tide-realm-admin` client-role grant for `council` and `minh` (each prints `202`, parked), lists the pending change requests, and reminds you of the follow-up. In tide-console as Dr. Hung: approve + commit both. Then `council` and `minh` sign out and in, and run `EXPORT_ONLY=1 bash init/tcinit.sh`.
From now on Dr. Hung's self-grant (the `/dean` scene) returns **202 pending** and needs a second admin's enclave approval.

## 8. Smoke test
1. Mai (`/report`): file a report. Expect a receipt with alias, digest and council unlock time.
2. Inspector Lan (`/investigator`): content opens, identity is denied with the exact ORK text.
3. Guardian Minh (`/guardian`): identity opens. `/council` before unlock shows `Time lock preventing decryption until <epoch>`.
4. Dr. Hung (`/dean`): database rows are ciphertext, reveal is denied, self-grant is 202.
5. Optional, council role only (Guardian Minh): `/admin/lab` (dev page, not linked). One click, "Try council envelope with forged past time lock", shows side by side what the ORK says for the stored tags and for a lock forged to a past epoch.
6. Wire-level checks: `bash scripts/security-tests.sh` (header explains how to copy the four tokens).

## Troubleshooting
- Login loops or redirects to the wrong port: the app must be on :3000.
- A role you just committed is missing: sign out and in again.
- `Policy 'x' is not committed yet`: step 6 for that label.
- A red banner "Tide requires re-authentication … session key mismatch" (or "Signed-in account changed from X to Y"): the Tide enclave/SSO session stored in that browser profile belongs to a different Tide account than the token. Click **Sign out**, sign in as the intended persona in that profile, retry. Never log two personas into one profile.
- Always copy the exact Tide/ORK error text; it is shown in the UI and used in the video.
