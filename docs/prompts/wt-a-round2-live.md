# Prompt: WT-A round 2, live Tide verification and hardening. Worktree `sv-wt/tide`, branch `feat/tide-live`

Your round-1 code is merged into main (PR #1). The lead runs the live app on http://localhost:3000 (`NEXT_PUBLIC_VAULT=tide`, from the repo root, NOT your worktree). Dr. Hung is committing the 3 policies via `/admin/policies` right now. Hard stop **15:40 VN**. Push every 20 minutes. PR title: `fix(tide): live verification fixes`.

Tasks, in order:
1. **Wait until the policies are committed**: `sqlite3 /home/towfienes/orca/projects/RMIT_HACKATHON/db/database.sqlite 'select * from committed_policies'` (or the table you created) shows 3 labels. If Create fails on `RequireTimeLock` (int param), switch it to a string param ("1"/"0"), regenerate the contract and tell the lead immediately, because the policies must then be re-created.
2. `AuthProvider`: skip TideCloak init when `NEXT_PUBLIC_VAULT=mock` (it logs an init error in mock mode).
3. Tag-binding test (open question from your review): add a dev-only page `/admin/lab`, hidden from nav, where a council-role user can try to decrypt a council envelope with (a) the stored tags and (b) the tags with the `DecryptTimeLock:` value changed to a past epoch. Show both results verbatim. This proves on video whether the lock is bound to the ciphertext. Do not "fix" anything you cannot verify. Just report the result.
4. `scripts/security-tests.sh`: document in its header how to get `MAI_TOKEN`, `INVESTIGATOR_TOKEN` and `HUNG_TOKEN` (DevTools → copy the bearer). Make the role checks use the real usernames: Lan = Tide user `council`, Minh = `minh`, Hung = `admin`.
5. Write `docs/SETUP-LIVE.md` (exact, copy-pasteable steps for a fresh machine: init → setup-personas phases → open-persona → policies → admins #2/#3). Codex links it from the README Setup.

Rules: do not touch UI pages except `/admin/lab`. Do not touch `lib/vault/types.ts`. Run `npm test`, `npx tsc --noEmit -p .` and `npm run build` before each push and report the real results. Never run a server on port 3000 (the lead's is running). Use port 3001 if you need one, and note that Tide login redirects only to :3000, so use the lead's server for live checks.
