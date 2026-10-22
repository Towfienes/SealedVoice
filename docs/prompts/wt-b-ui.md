# Prompt: WT-B (UI). Run with `claude --model sonnet` in /home/towfienes/orca/projects/sv-wt/ui

You are the **WT-B** engineer for SealedVoice, a hackathon app due today. Feature freeze 15:45 VN.
Read `AGENTS.md`, then `specs/001-sealedvoice/{spec,plan,tasks}.md`. Your tasks: **T15–T19, T41**. Edit only WT-B files. The UI talks to `useVault()` from `@/lib/vault` **only**. Run with the mock vault (`NEXT_PUBLIC_VAULT=mock`, the default). The lead swaps in the real Tide vault later. Do not change `lib/vault/types.ts`. You may extend `lib/vault/mock.ts`.

Product: a university reporting channel where the reporter is **verified but sealed**. The judges score Vision 25, Trust insight 20, Value 20, Why TideCloak 20, Prototype & storytelling 15. The key demo moment is the insider (Dr. Hung, Head of School, a realm admin) being blocked four ways. UI language is English; persona names are Vietnamese.

Pages:
- `/`: problem ("The law requires your name. Your name is what gets you punished."), promise, CTA.
- `/report` → `/receipt`.
- `/investigator`: content opens; the identity shows 🔒 plus the exact denial text.
- `/guardian`.
- `/council`: live countdown to the time lock, then open.
- `/dean`: insider console with 4 big attack buttons: Inspect database (raw ciphertext rows) · Reveal reporter (denied) · Add me as investigator (202 pending, "needs 2 of 3 admins") · Bury the report (council countdown "cannot be stopped").
- `/how-it-works`: diagram browser → app server (ciphertext only) → TideCloak → ORK network, plus the Limits list from spec.md.

A persona bar shows who is signed in. In mock mode it shows a persona switcher (`MOCK_PERSONAS`, `setMockPersona`) and a visible "SIMULATED" badge. Every denial should feel dramatic but honest: show the exact message string from the vault.

Workflow:
1. Load the skill `ui-ux-pro-max` for a 10-minute UX plan: a calm, trustworthy, institutional look (no generic purple gradients), mobile-first, reduced motion.
2. Build with `frontend-design`, using plain CSS modules or `app/globals.css`. Do not add a UI framework unless it saves real time.
3. After it renders, audit with `impeccable` at 390/768/1440 (max 2 refinement rounds).
4. Then `accessibility` basics: labels, focus, contrast, buttons that are real buttons.

The template's `app/home/page.tsx` is the old Forseti demo. WT-A extracts logic from it, so leave that file alone and build the new routes alongside it. Make `/` your landing page.

Verify before every push: `npx tsc --noEmit -p .` and `npm run build`. Click through all pages in a browser in mock mode. Use conventional commits on `feat/ui` and push often. Open a draft PR to `main` early. Ask the lead before touching any file you don't own.
