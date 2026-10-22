# Message for khanhle1406 (Codex, own machine)

Hi! Repo: https://github.com/Towfienes/SealedVoice. Accept the collaborator invite (write access), then:
```
git clone https://github.com/Towfienes/SealedVoice && cd SealedVoice && git checkout -b docs/codex
npm install && npm test        # 26 tests should pass; Node 22+ (Node 26: npm 12 asks to approve better-sqlite3 scripts)
```
Read `AGENTS.md` and `specs/001-sealedvoice/*`. Your stream: **Codex**. You own `README.md`, `docs/**` (except MASTERPLAN and prompts), `tests/**`, `e2e/**`, `playwright.config.ts`. Your tasks: **T20, T21, T22, T42, T51** in `specs/001-sealedvoice/tasks.md`. In order:
1. **T20 README** (most important for the judges): keep the badge and the one sentence. Write 5 sections answering the judging prompts, **≤ 300 words total** (`bash scripts/wordcount.sh`). Then Setup, Limits (from spec.md) and Credits. Use the insight from spec.md (Law on Denunciation 2018 requires a name; the accused is often an admin) and the SOTA positioning in `docs/SOTA.md`.
2. **T21** `docs/DEMO_SCRIPT.md`: 2:00 video in 4 parts (Possibility → Constraint → Prototype + TideCloak's role → What changes), shot list per persona, English narration. Opening line: *"The Head of School calls IT into his office: 'Find out which student wrote this.' IT: 'I can't. Nobody can.'"* Also adapt the generic parts of `docs/TRUST-MODEL.md` and `docs/ATTACK-VECTORS.md` from https://github.com/Towfienes/SealedVoice/tree/main (we will copy the SealedBid versions in; swap the domain to reporter / investigator / guardian / council).
3. **T22** tests: rename SealedBid fixtures in `tests/verifyToken.test.ts` (tender-committee → investigator, bidder → student). Add a Playwright e2e suite in mock mode for US1–US5 (`NEXT_PUBLIC_VAULT=mock npm run dev`).
4. **T42** red team: once the app runs (Gate 1, around 14:30), run the prompt in `docs/RED-TEAM-PROMPT.md` in a fresh Codex chat, and send the findings table to the lead.
5. **T51**: around 16:45, do a fresh clone on your machine, follow the README Setup exactly, and report anything that breaks.

Commit small (`docs: …`, `test: …`), push to `docs/codex`, open a PR to `main`. You may merge your own PR once CI is green. Do not touch app code, `lib/`, or `app/`. Ask Towfienes first.
