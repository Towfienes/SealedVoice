# Tasks 001: SealedVoice
Format: `ID [stream] [P = parallel-safe] task · files · done when`. Tick `[x]` in your PR.

## Phase 0 (lead, 13:15–13:40)
- [x] T00 [Lead] Repo, template, reused files, `lib/vault/{types,mock,index}.ts`, specs, AGENTS.md
- [ ] T01 [Lead] Push `main`, add collaborator khanhle1406, create worktrees, hand out prompts

## Phase 1 (13:40–14:30), all streams in parallel
- [ ] T10 [WT-A] Fail-closed contract with a `RequireTimeLock` param · `contracts/SealedVoicePolicy.cs`, `lib/forsetiContract.ts` · contract string exported, contract ID logged
- [ ] T11 [WT-A] Re-key committed policies by label, add `getCommittedPolicy(label)` · `lib/database/policyDb.ts`, `app/api/policies/route.ts` (remove unauthenticated DELETE) · unit test: 3 commits leave 3 rows
- [ ] T12 [WT-A] `lib/policies/flow.ts`: create/approve/commit for a label (lifted from `app/home/page.tsx:725-854`), plus admin-only page `/admin/policies` with 3 buttons · all 3 policies committed on the live realm
- [ ] T13 [WT-A] `init/realm.json` roles (student, investigator, identity-guardian, council), `scripts/invite-user.sh <username> <roles…>` that creates a user, assigns realm roles and prints a Tide invite link (pattern from `init/tcinit.sh`)
- [ ] T14 [WT-A] `reports` table and `/api/reports` (POST without auth, ciphertext-only validation; GET requires a verified token and any of investigator/identity-guardian/council) · `lib/verifyToken.ts` reused
- [ ] T15 [WT-B] [P] App shell, landing page (problem → promise → "File a sealed report"), persona bar showing the session and a SIMULATED badge in mock mode · `app/layout.tsx`, `app/page.tsx`, `components/ui/*`
- [ ] T16 [WT-B] [P] `/report` form (draft + identity auto-filled) → `/receipt` (alias, digest, council countdown)
- [ ] T17 [WT-B] [P] `/investigator` list + open content (identity shows 🔒 + exact denial) · `/guardian` · `/council` with countdown + open
- [ ] T18 [WT-B] [P] `/dean` insider console: (1) Inspect database → raw rows; (2) Reveal reporter → denial; (3) Add me as investigator → 202 pending card; (4) Bury the report → council countdown "cannot be stopped"
- [ ] T19 [WT-B] [P] `/how-it-works`: architecture diagram + Limits
- [ ] T20 [Codex] [P] README: badge + one sentence + 5 sections (≤ 300 words) + Demo video + Setup + Limits + Credits (forseti-crypto-quickstart)
- [ ] T21 [Codex] [P] `docs/DEMO_SCRIPT.md` (2:00, Possibility → Constraint → Prototype → What changes, EN narration), `docs/TRUST-MODEL.md`, `docs/ATTACK-VECTORS.md` adapted from `c2/docs`
- [ ] T22 [Codex] [P] `tests/verifyToken.test.ts` fixtures → SealedVoice roles; `package.json` `test` script; e2e Playwright suite in mock mode (US1–US5)

## Gate 1 (14:30)
- [ ] T30 [WT-A] `lib/vault/tide.ts` implementing `Vault` with `useAuth()`; switch `useVault()` on `NEXT_PUBLIC_VAULT` (lead approves the index.ts change)
- [ ] T31 [WT-A] `/api/admin/grant-role` proxy → TideCloak role mapping, returns 202 + message; requires a verified admin token
- [ ] T32 [Lead] Add admins #2 and #3 → multiAdmin; `EXPORT_ONLY=1 bash init/tcinit.sh`; run end-to-end with real Tide; capture exact ORK error texts

## Phase 2 (14:30–15:30)
- [ ] T40 [WT-A] Council time lock verified live (before → denial text, after → opens); `scripts/security-tests.sh` adapted, no FAIL
- [ ] T41 [WT-B] `impeccable` pass at 390/768/1440; accessibility basics (labels, focus, contrast)
- [ ] T42 [Codex] Red team run with `docs/RED-TEAM-PROMPT.md`; findings table to the lead; fixes or README Limits
- [ ] T43 [Lead] Review: code-reviewer + security-auditor subagents, ponytail-review; fix P0s

## Ship (15:45–17:40)
- [ ] T50 [All] Record scenes (one Chrome profile per persona), edit, `ffmpeg` to <100 MB, `Video.mp4` at root
- [ ] T51 [Codex] Fresh clone on another machine → README Setup works; `bash scripts/wordcount.sh` ≤ 300
- [ ] T52 [Lead] Tag `v1.0-submission`, confirm the repo is public and the video plays, submit the Google Form. No pushes afterwards.
