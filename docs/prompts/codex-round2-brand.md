# Prompt: Codex round 2 (khanhle1406), brand and visual assets. Branch `docs/brand` from the latest `main`

PR #3 is merged. Thank you! Next: make SealedVoice look like a real product in the video and the README. Hard stop **15:45 VN**. Open a PR to `main` titled `feat(brand): logo, icons, diagram, video cards`.

**Visual direction:** "sealed envelope + wax seal + institutional trust". The colours already used in `app/sealedvoice.css` are deep ink navy, warm paper and wax red. Fonts: Fraunces (display), Public Sans (body), IBM Plex Mono. Match them exactly. Read `app/sealedvoice.css` for the hex values.

**Deliverables** (all hand-made SVG unless stated, so there are no licence problems):
1. `public/brand/logo-mark.svg`: a wax-seal monogram (a stylised "SV" or keyhole inside a seal). It must read clearly at 32 px.
2. `public/brand/logo-wordmark.svg`: the mark plus "SealedVoice" in Fraunces (convert the text to outlined paths, or embed it so it renders without the font).
3. `app/icon.svg`: favicon (Next.js picks it up automatically). Plus `public/brand/og.png`, 1200×630, for link previews (export it from an SVG).
4. `public/brand/team-fprinciples.svg`: a small team logo for the video outro ("Team Fprinciples · RMIT SGS").
5. `docs/architecture.svg`: a clean 4-layer diagram (Browser [encrypts 3 envelopes] → App server [ciphertext only, never knows who reported] → TideCloak [roles, QEA quorum 2 of 3] → Tide ORK network [Forseti policy: role + time lock, no master key]). Show the insider "Dr. Hung" with red ✕ marks where he is blocked. Link it from the README section "Why TideCloak matters".
6. `docs/video/`: 1920×1080 title cards as SVG and PNG: `00-title` (logo + tagline "Verified, never exposed."), `01-possibility`, `02-constraint` ("The law requires your name. Your name is what gets you punished."), `03-prototype`, `04-what-changes`, `05-outro` (team logo + "Built with TideCloak" badge + repo URL). Follow the 4 parts of `docs/DEMO_SCRIPT.md`.
7. `docs/CREDITS.md`: list every asset and its source. If you use any third-party icon, use only MIT/ISC/CC0 icons (Lucide, Heroicons) and keep the licence notice.

**Integration:** you own `public/brand/**`, `app/icon.svg`, `docs/**`, and README image links. Do NOT edit pages or CSS. WT-B (UI) will swap the header lock icon for `logo-mark.svg`. Tell the lead when step 1 is pushed.

**Afterwards (around 15:15), README pass:** the lead will post the live Tide results (exact ORK denial texts, 202 pending, time-lock result). Replace "intended live path / must be verified separately" with what was actually verified, keep everything honestly labelled, and stay ≤ 300 words (`bash scripts/wordcount.sh`).

Verify `npm run build` still passes (because of `app/icon.svg`), then push.
