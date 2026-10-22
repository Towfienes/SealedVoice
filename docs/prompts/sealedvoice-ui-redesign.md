You are a senior product designer and frontend engineer. Redesign the existing SealedVoice interface using this visual reference:

https://uupm.cc/demo/educational-platform

Implement the redesign in the existing application. Deliver working screens, responsive styling and browser verification—not only a proposal or static mockup.

1. PROJECT CONTEXT

Repository:
https://github.com/Towfienes/SealedVoice

Local checkout, if available:
/Users/xuannguyen/Desktop/Competitions/2026/RMIT Hackathon/Challenge 2/SealedVoice

SealedVoice is a university misconduct-reporting prototype. Its central idea is separating a verified reporter’s identity from the allegation, particularly when the accused also controls the institution’s reporting system.

Every report has three envelopes:
- Content: opened by the investigator.
- Identity: opened by the identity guardian.
- Council copy: an escalation envelope with a time lock.

Personas:
- Mai: student/reporter.
- Inspector Lan: investigator.
- Guardian Minh: identity guardian.
- Dr. Hung: institutional insider and realm administrator.
- Council: an additional mock perspective; the live four-account setup assigns the council seat to Minh. Inspect the spec before changing persona presentation.

UI language: English.
Use synthetic information only.

This is a new frontend redesign request. The earlier “README-only” task does not define this task’s scope.

2. VISUAL DIRECTION

Open the reference in a real browser before implementation. Inspect desktop and mobile.

The reference uses a friendly, outlined, softly playful visual language:
- Warm off-white background #FFF9F5 and white surfaces.
- Dark ink #2D3748.
- Green #22C55E for primary actions.
- Pastel blue #ADD8E6, coral #FDBCB4, mint #98FF98 and lavender #E6E6FA.
- Fredoka display headings; Nunito body and controls.
- Approximately 3px dark outlines.
- Solid offset shadows: 4px 4px 0 for buttons; 6px 6px 0 for larger panels.
- Rounded buttons around 16px; larger panels around 24px.
- A floating white navigation container.
- A two-column desktop hero, generous spacing, compact outlined content cards and alternating background fields.

Translate this visual language into SealedVoice’s identity: approachable university software with clear, credible security states.

Keep the existing wax-seal/keyhole logo. Use its red as a brand and denial accent. Carry the envelope motif through illustrations, report previews and receipt presentation.

Use green button text/background combinations with sufficient contrast; adjust the reference’s combinations where necessary for accessibility.

The reference is the chosen art direction. If the installed design-taste-frontend skill is available, use its inspection and refinement workflow while retaining the explicitly requested outlines, offset shadows, rounded typography and pastel surfaces.

3. LANDING PAGE

Design a complete landing page with this sequence:

A. Header
- SealedVoice logo and name.
- Clear navigation to reporting, the relevant desks and “How it works”.
- Primary action: “File a sealed report”.
- Preserve the current persona selector, authentication controls and mode indicator.
- Keep the SIMULATED indicator visible in mock mode.
- Put technical token-role details in an accessible disclosure.
- On mobile, provide a working keyboard-accessible menu and enough clearance below the header.

B. Hero
- Desktop: left-side headline, supporting explanation and actions; right-side product illustration or interface preview.
- Suggested headline: “Your voice. Safely sealed.”
- Explain verified identity and separate disclosure permissions in plain language.
- Primary CTA links to /report.
- Secondary CTA links to /how-it-works or the existing insider demonstration.
- Replace the reference’s learning-progress widget with a SealedVoice-specific preview of the three envelopes.
- An optional envelope selector may explain who can open each envelope. Label this as an explanation or design preview; it must not impersonate a real decrypt operation.
- On mobile, stack the content and keep the main CTA immediately discoverable.

C. Trust constraint
- Explain the named-report requirement using the sourced wording already in README.
- Connect it to the conflict of an accused administrator controlling the reporting system.
- Keep this concise and understandable.

D. Three envelopes
- Present Content, Identity and Council copy with distinct, coherent illustrations.
- Show the permitted recipient and the information contained in each.
- Use the actual permission model.
- Explain that council access depends on ciphertext remaining available.

E. Insider demonstration
- Introduce Hung’s four existing attempts: inspect rows, reveal the reporter, request investigator access and attempt to bury the report.
- Link to /dean.
- Distinguish interface demonstrations from verified live enforcement.

F. Tide and validation
- Explain that Forseti policies on Tide’s ORK network decide decryption, while TideCloak QEA handles role-change requests.
- Present the actual validation boundary clearly.
- Use facts from current README and docs/VALIDATION.md; refresh your understanding from the repository before writing copy.

G. Closing CTA and footer
- Clear action to file a synthetic report or explore the demo.
- Product identity, useful existing links and synthetic-data notice.
- Use a finished visual composition rather than adding unsupported marketing sections.

Build sections from real product content. Do not import the reference’s course counts, student totals, reviews, testimonials, pricing or customer logos.

4. FUNCTIONAL SCREENS

Apply the same design system across the existing routes:

- /report:
  Readable allegation form, clearly grouped identity fields, privacy explanation, validation and visible submission progress. Preserve every current field and submission behavior.

- /receipt:
  A distinctive receipt presentation with alias, timestamp, digest, council unlock time and working download action. Preserve refresh/reload behavior.

- /investigator:
  Clear report list, content-opening action and sealed identity state.

- /guardian:
  Identity verification view with clear separation from allegation content.

- /council:
  Readable countdown, unlock timestamp and the existing before/after-lock attempt behavior.

- /dean:
  Four clearly labelled attack sections, report selection, raw rows, denial messages, role-request result and actual quorum information.

- /how-it-works:
  Explain the three-envelope architecture, roles, Tide’s responsibility and practical limits.

- /admin/policies and /admin/lab:
  Keep these operational. Adapt shared styling without changing their policy or diagnostic behavior.

Keep the legacy /home demo functional.

Working screens should be more restrained and compact than the marketing page. Prioritize form readability, actions and results over decoration. Use the strongest outlined/shadow treatment selectively.

5. EXISTING IMPLEMENTATION

Stack:
- Next.js 16 App Router.
- React 19.
- TypeScript.
- npm.
- Existing plain CSS, primarily app/sealedvoice.css.
- Current fonts are configured through next/font in app/layout.tsx.

Inspect these before editing:
- AGENTS.md
- README.md
- specs/001-sealedvoice/spec.md
- specs/001-sealedvoice/plan.md
- specs/001-sealedvoice/tasks.md
- docs/VALIDATION.md
- app/layout.tsx
- app/page.tsx
- app/sealedvoice.css
- components/ui/PersonaBar.tsx
- components/ui/Callouts.tsx
- components/ui/DeskGate.tsx
- components/ui/ReportViewer.tsx
- components/ui/Countdown.tsx
- components/ui/useSession.ts
- lib/vault/types.ts
- e2e/ui.spec.ts

Existing assets:
- public/brand/logo-mark.svg
- public/brand/logo-wordmark.svg
- public/brand/logo-wordmark-light.svg
- public/brand/team-fprinciples.svg
- public/brand/architecture.svg
- docs/architecture.png
- public/brand/og.png

Use the existing logo artwork. The wordmark contains outlined Fraunces lettering and does not need its font loaded.

Implement shared tokens and reusable components. Keep the existing framework and package manager. Load the chosen fonts properly, preferably through next/font. Avoid adding a UI framework or animation dependency for effects achievable with CSS.

6. BEHAVIOR AND TRUTHFULNESS

Preserve:
- The existing vault abstraction and imports through @/lib/vault.
- Mock and Tide modes.
- Sign-in/sign-out and persona switching.
- Role-aware desk gates.
- Report submission, receipt persistence/download and report opening.
- Loading, empty, denied, pending, successful and error states.
- Existing asynchronous error handling and readable Tide/ORK messages.
- Accessible names and semantic landmarks used by existing browser tests.

Frontend scope: pages, layouts, styling and UI components. Preserve backend APIs, authentication implementation, cryptography, policies, database behavior and vault contracts.

Keep mock mode visibly labelled SIMULATED. It stores plaintext locally and simulates encryption, permissions, quorum and timing.

Previously lead-confirmed live:
- TideCloak login for four personas.
- Tide-issued roles.
- Three Forseti policies committed through the Tide enclave.
- QEA pending change requests.

End-to-end live sealing/decryption was not verified because of network issues. Check current documentation for newer evidence before making claims.

Quorum depends on actual configuration: a one-admin realm can approve its own pending request. Do not display a protective 2-of-3 threshold unless it is actually configured.

Use conditional language for council access: time locks do not prevent deletion or guarantee delivery. Preserve the documented browser, metadata and human-disclosure limits.

7. RESPONSIVE DESIGN AND INTERACTION

Verify at:
- 1440×900 desktop.
- 768px tablet.
- 390×844 mobile.
- 960×540 with 125% browser zoom for demo recording.

Requirements:
- No horizontal page overflow.
- No header/content overlap.
- Readable forms and status messages.
- Touch targets of at least 44px.
- Visible keyboard focus and correctly associated labels.
- Accessible contrast.
- Status meaning conveyed with text as well as color.
- Long ciphertext, digests and error messages wrap or scroll within their containers.
- Functional mobile navigation.
- Stable layout during session initialization and loading.

Use subtle button press feedback and short transitions. Respect prefers-reduced-motion. Content and actions must remain available without animation.

8. WORKFLOW AND DELIVERY

- Inspect the working tree and preserve existing work.
- Follow repository branch/PR rules.
- Record baseline screenshots before editing.
- Write a short implementation plan, then implement the full redesign.
- Scope CSS carefully to avoid breaking legacy screens.
- Review real browser screenshots and refine spacing, typography, responsive behavior and visual consistency.
- Run npm test and npm run build.
- Run the existing browser suite, using PLAYWRIGHT_CHANNEL=chrome npm run test:e2e when Chrome is available.
- Preserve behavioral assertions. If an accessible label changes intentionally, update its test precisely.
- Run git diff --check and any applicable existing lint commands.
- Do not claim checks you did not run.

Deliver:
1. The implemented interface.
2. Desktop and mobile screenshots of the landing page and key workflows.
3. A concise list of changed files.
4. Actual validation results and any unresolved limitations.

Aim for an immediately recognizable adaptation of the reference, with SealedVoice’s own envelope imagery, real workflows and clear security states.
