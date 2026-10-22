# Prompt: WT-B round 2, UI polish for the demo video. Worktree `sv-wt/ui`, branch `feat/ui-polish`

Your round-1 UI is merged into main (PR #2). The app now runs with REAL TideCloak (`NEXT_PUBLIC_VAULT=tide`). The look is too plain for judges. This round is **visual quality only**: do not change vault, API or logic files. Hard stop **15:40 VN**. Push every 20 minutes. Open a PR to `main` titled `feat(ui): polish for demo`.

**Use these skills in order** (load each with the Skill tool and follow it):
1. `ui-ux-pro-max`: pick ONE coherent design system in 5 minutes. Direction: "sealed envelope / wax seal / institutional trust". Deep ink navy + warm paper + one wax-red accent for sealed/denied states, a serif display face for headings plus a clean sans for body (use `next/font/google`), an 8-pt spacing scale, a radius scale, and shadows.
2. `frontend-design`: implement it across `app/sealedvoice.css`, `components/ui/**` and the pages.
3. `impeccable`: rendered audit with Playwright screenshots at 390, 768 and 1440 (Chromium is installed). At most 2 refinement rounds.
4. `accessibility`: contrast AA, focus rings, labels, reduced motion.

**Must-fix defects (seen in the real Tide session):**
- `components/ui/PersonaBar.tsx` dumps ~40 raw token roles (`realm-management:*`, `executive`, …). Show only the app roles (`student`, `investigator`, `identity-guardian`, `council`) as clean badges, plus one "Realm admin" badge when `session.isRealmAdmin`. Move the raw list into a collapsed `<details>` labelled "Token roles (debug)".
- `/admin/policies` (`app/admin/policies/page.tsx`): the buttons look like unstyled native buttons. Make each policy a card with a 3-step stepper (Create → Approve → Commit), a clear status pill (not created / pending approval / committed), and the error text in a monospace callout. **Only change the JSX and CSS. Keep every handler and call exactly as it is** (WT-A owns the logic; diff the handler lines to prove they are unchanged).
- Landing `/`: give it a real hero ("The law requires your name. Your name is what gets you punished.") with a sealed-envelope illustration (inline SVG), three envelope cards (content → investigator, identity → guardian, escalation → council with a time lock) and one CTA "File a sealed report".
- `/dean` insider console: this is the climax of the video. Use 4 large attack cards with a red "BLOCKED by Tide" or amber "PENDING 2 of 3 admins" result state, and show the exact message in a monospace block.
- Denial and lock states everywhere: a consistent 🔒 sealed visual, and countdowns that are big and legible at 125% browser zoom (we record at 1080p).
- Navigation: active-link state; the header must not wrap awkwardly at 768 px.

Verify: `npx tsc --noEmit -p .`, `npm run build`, and `npm test` all green. Click through all pages in mock mode (`NEXT_PUBLIC_VAULT=mock npx next dev --webpack -p 3002`). Do NOT run on port 3000: the lead's live Tide server uses it. Report back: before and after screenshot paths, check results, anything you could not do.
