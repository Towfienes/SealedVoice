# SealedVoice — 2:00 demo script

Production plan, not a record of a completed live demonstration. Total timeline: exactly 120 seconds, including the final card. Narration is English; use synthetic reports only. Rehearse at approximately 135 words/minute. Keep real Tide error text visible long enough to read; never replace an error with invented dialogue.

| Time | Part | Persona and shot | English narration |
|---|---|---|---|
| 0:00–0:20 | Possibility | Dr. Hung's profile: office title card, then the insider console. Cut to a locked identity envelope. | “The Head of School calls IT into his office: 'Find out which student wrote this.' IT: 'I can't. Nobody can.' That is the promise we want to test: a student can identify herself without giving the accused administrator a way to expose her.” |
| 0:20–0:40 | Constraint | Mai's profile: show the named identity fields, then a simple browser → ciphertext store → ORK diagram. | “Our reporting scenario requires a name. But what if the person accused also controls the reporting system? A conventional portal asks Mai to trust that administrator with her identity, her allegation and the power to decide who investigates.” |
| 0:40–0:55 | Prototype + TideCloak | Mai: enter a synthetic allegation, seal it, hold on receipt alias, digest and council unlock time. Show Network request headers if real submission is available. | “Mai seals three envelopes in her browser: report, identity and council copy. The app receives ciphertext without a submission Authorization header. She keeps a receipt. That does not conceal her IP address or prevent deletion.” |
| 0:55–1:08 | Prototype + TideCloak | Inspector Lan: open the report, then attempt identity. Guardian Minh: open identity, attempt content. | “Lan investigates the allegation; the identity stays closed. Minh can verify the student separately. A guardian can still disclose what they legitimately read. In live mode, Tide's ORKs must enforce this separation.” |
| 1:08–1:30 | Prototype + TideCloak | Dr. Hung: inspect ciphertext rows, reveal reporter, request investigator role. Cut to the actual Tide console pending request and approvals. | “Now Hung inspects the database, attempts to reveal Mai and tries to make himself an investigator. Capture the actual denial and the pending change request. With three distinct admins, a second approval is required. Editing our application's role check must not defeat Tide's decision.” |
| 1:30–1:43 | Prototype + TideCloak | Council: open before the recorded unlock epoch; show exact denial. Cut explicitly to a later wall-clock time, then open again. | “The council copy is time locked. Before the deadline, it must refuse; afterward, the council can open it if the ciphertext is still available. This is an access path, not guaranteed delivery.” |
| 1:43–2:00 | What changes | Split view: Mai's receipt, Lan's report and a locked identity. End with repo URL, actual validation status and limits. | “The change is who must be trusted: one administrator should no longer control every disclosure. The browser, metadata, deletion and human collusion remain limits. Any simulated scene is labelled SIMULATED. Real protection is claimed only for the Tide checks we actually ran.” |

## Per-persona capture checklist

- **Mai / student:** named synthetic identity, completed form, seal action, receipt; real POST headers and ciphertext payload if integrated. Never expose a real token, password, invitation URL or subscription email.
- **Inspector Lan / investigator:** report content and evidence; exact identity denial. Confirm the actual logged-in account and roles; the four-account allocation in the spec must be resolved by the lead before filming.
- **Guardian Minh / identity-guardian:** synthetic identity verification, denied content. Use a separate profile from Lan.
- **Dr. Hung / realm admin without investigator or guardian:** raw rows, identity denial and pending self-grant. The real Tide QEA console is the evidence for quorum, rather than a frontend card alone.
- **Council / council role:** same envelope before and after the lock; show timestamps. Use a visible “Later, after unlock time” cut. Never imply that fast-forwarding a mock browser clock tests ORK time.

## Recording gates

1. Confirm the app revision, realm, policy labels, three distinct admins and two-admin threshold with the lead. Record live checks only after Gate 1 succeeds.
2. Preserve the required opening as the scenario's dramatic premise. Immediately qualify “Nobody can”: the guardian can read identity, malicious delivered JavaScript can capture it, and collusion remains possible. Do not present the line as an unconditional security guarantee.
3. If live integration is unavailable, keep a persistent **SIMULATED** badge and say “This scene uses the mock vault.” Do not call generated mock text an ORK response or a real HTTP 202.
4. Keep all four sections within their allotted times. Export `Video.mp4` at the repo root, at most 120 seconds and below 100 MB; inspect duration, size and playback before submission. The video is a lead/team deliverable, not created by this script.
