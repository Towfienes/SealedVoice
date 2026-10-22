# AGENTS.md: SealedVoice (RMIT Hackathon 2026, Challenge 2 "Tide UNLOCKED")

Read first, in this order: `specs/001-sealedvoice/spec.md` → `plan.md` → `tasks.md` (find YOUR stream) → `docs/MASTERPLAN.md` (background).

## Hard rules
- **Deadline:** Google Form submitted by **17:40 VN, 22/10/2026**. Feature freeze **15:45**. **No pushes after 17:40.** The repo at the deadline is what gets judged.
- **TideCloak does real work.** The insider (Dr. Hung, a realm admin) must be stopped by Tide/ORK, not by an `if` in our code. Anything simulated is labelled `SIMULATED` in the UI and "mocked" in the README. Never claim a Tide capability we did not run.
- **Server never sees plaintext and never learns who reported.** `POST /api/reports` takes ciphertext only and is called **without** an Authorization header.
- **Synthetic data only.** Never commit `data/tidecloak.json`, `data/admin-policy.b64`, `*.db`, `*.sqlite`, `.env*`, tokens or passwords.
- **UI language: English.** Persona names stay Vietnamese (Mai, Dr. Hung, Inspector Lan, Guardian Minh).
- A fresh clone must run by following README → Setup. `npm run build` and `npm test` must stay green.
- README "Project overview" must stay ≤ 300 words (`bash scripts/wordcount.sh`). `Video.mp4` at the root must be ≤ 2:00 and < 100 MB.

## Streams and file ownership (edit only your files; ask the lead for anything else)
| Stream | Who | Branch / worktree | Owns |
|---|---|---|---|
| Lead | Opus + Towfienes | `main` (repo root) | `lib/vault/types.ts`, `lib/vault/index.ts`, `AGENTS.md`, `specs/`, merges, TideCloak setup |
| WT-A Tide/API | Claude Sonnet | `feat/tide-core` @ `../sv-wt/tide` | `contracts/`, `lib/forsetiContract.ts`, `lib/policies/**`, `lib/vault/tide.ts`, `lib/database/**`, `app/api/**`, `init/**`, `scripts/{invite-user,security-tests,reset-demo}.sh`, `components/AuthProvider.tsx` |
| WT-B UI | Claude Sonnet | `feat/ui` @ `../sv-wt/ui` | `app/**/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/ui/**`, `lib/vault/mock.ts`, `public/**` |
| Codex | khanhle1406 | `docs/codex` (own machine) | `README.md`, `docs/**` (except MASTERPLAN), `tests/**`, `e2e/**`, `playwright.config.ts`, seed text |

`lib/vault/types.ts` is the contract between UI and Tide. Changes go through the lead.

## Git
- Conventional commits: `feat(api): …`, `feat(ui): …`, `fix: …`, `docs: …`, `test: …`. Small commits, push often.
- Open a PR into `main` early (draft is fine). Squash-merge. Never force-push `main`. Rebase your branch on `main` after each gate.
- The final tag is `v1.0-submission`. The lead pushes it.

## Gates
- **14:30 Gate 1:** end-to-end once with real Tide (seal → investigator reads → insider blocked).
- **15:30 Gate 2:** review (code-reviewer, security-auditor, red team), then fix P0s.
- **15:45 freeze.**

## Tide tips
- Ask the `tide-pack` MCP (`.mcp.json`) before guessing TideCloak/Forseti APIs. Copy exact Tide error text into the UI, because it is part of the demo.
- Committed policies must be keyed by label (`investigator|guardian|council`). Upstream `policyDb.ts` overwrites by `modelIds[0]`.
- One `doEncrypt` per envelope. The contract only reads tags from batch item 0. Store each envelope's tags and pass them back unchanged.
- Quorum needs **3** admins (`max(1, floor(0.7*N))`). Assign every role **before** adding admin #2 and #3.

## Definition of Done
- [ ] Fresh clone → README Setup → login → Mai seals a report → Inspector Lan reads the content → Dr. Hung is blocked 4 ways (DB ciphertext, identity decrypt denied, self-grant 202 pending, council time lock).
- [ ] `npm run build` and `npm test` pass. `scripts/security-tests.sh` shows no FAIL. No secrets in `git log -p`.
- [ ] README: badge, one sentence, 5 sections ≤ 300 words, Setup, Limits, link to `Video.mp4`.
- [ ] `Video.mp4` ≤ 2:00, < 100 MB, plays on GitHub. Repo is public.
