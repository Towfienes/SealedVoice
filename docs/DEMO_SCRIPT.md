# SealedVoice — final 2:00 recording script

Edit plan, not a record of a completed video. Total **120 seconds**, including every title card and the outro. English narration: rehearse around 135–145 words/minute. All app footage below uses **mock mode** and synthetic data. Keep the app's **SIMULATED** badge visible; add a persistent “SIMULATED · mock walkthrough” caption over app footage. Do not label mock error text, HTTP 202 cards or browser-clock changes as live Tide evidence.

## Timeline and narration

All title cards are the existing 1920×1080 PNGs in [`video/`](video/). Use hard cuts or transitions contained inside the listed slots; do not add time between them. Status captions at 1:28 are an editorial summary attributed to the lead, not a captured live seal/decrypt result.

| Time | Part / visual | English narration |
|---|---|---|
| 0:00–0:03 | Opening: `video/00-title.png`. | Music only; hold the logo and tagline. |
| 0:03–0:05 | Possibility: `video/01-possibility.png`. | Begin the next line across the cut. |
| 0:05–0:20 | Mock `/dean`: Hung, then locked identity. Keep SIMULATED visible. | “The Head of School calls IT: ‘Find out which student wrote this.’ IT: ‘I can't. Nobody can.’ That's the dramatic premise, not an absolute guarantee: the guardian can read identity, and a compromised browser can expose it.” |
| 0:20–0:23 | Constraint: `video/02-constraint.png`. | Begin the next line across the cut. |
| 0:23–0:40 | Mock `/report`: synthetic named identity and allegation. Cut to `../architecture.png`, captioned “Design overview”. | “Our reporting scenario requires a name. But the accused may also control IT. SealedVoice separates the allegation, verified identity and council copy. Its design puts disclosure policy beyond a single application administrator, while the browser remains a trust boundary.” |
| 0:40–0:43 | Prototype: `video/03-prototype.png`. | Begin the next line across the cut. |
| 0:43–0:56 | Mock Mai: **Seal and send**, then receipt alias and unlock time. | “This walkthrough uses the mock vault. Mai submits a synthetic report and keeps a receipt. Three simulated envelopes separate content, identity and escalation. Mock mode stores plaintext locally; this is not real encryption.” |
| 0:56–1:08 | Mock Lan `/investigator`: **Open report**; Minh `/guardian`: **Verify reporter**. Hold each denial briefly. | “Lan sees the allegation without Mai's name. Minh verifies identity separately and cannot open the allegation. These refusals demonstrate the interface and intended role separation, not live ORK enforcement.” |
| 1:08–1:22 | Mock Hung `/dean`: **Inspect database**, **Reveal reporter**, **Add me as investigator**; hold “Pending, not granted”. | “Hung inspects simulated rows, attempts to reveal Mai and requests the investigator role. The interface shows denial and pending approval. This HTTP 202 card is simulated; it is not a captured Tide response.” |
| 1:22–1:28 | Mock `/council`: before-lock refusal, then a prepared after-lock take. Caption the cut “Later — SIMULATED browser time”. | “The council copy illustrates timed access, not guaranteed delivery. Both scenes are simulated.” |
| 1:28–1:43 | Hold architecture or receipt with readable status captions: **LEAD-CONFIRMED LIVE:** login ×4, Tide roles, 3 enclave-committed policies, QEA pending requests. **NOT VERIFIED LIVE:** end-to-end seal/decrypt — network issues. | “Live TideCloak login and roles worked for four personas. Three Forseti policies were committed through the Tide enclave, and QEA requests remained pending. Network issues prevented end-to-end live sealing and decryption.” |
| 1:43–1:46 | What changes: `video/04-what-changes.png`. | Begin the next line across the cut. |
| 1:46–1:56 | Receipt, Lan's report and locked identity. Keep SIMULATED visible. | “The goal is shared authority over disclosure. Metadata, malicious browser code, deletion and human collusion remain limits. We claim only the live checks confirmed.” |
| 1:56–2:00 | `video/05-outro.png`: team, TideCloak credit and repo URL. | Music only; hold long enough to read the URL. |

## Capture preparation

1. Start a clean mock session with `NEXT_PUBLIC_VAULT=mock npm run dev`. Use one browser profile and the **Signed in as** selector: Mai, Inspector Lan, Guardian Minh, Dr. Hung, then Council. Mock personas are separate from live accounts: live Lan uses Tide user `council`; Minh also holds the live council seat. No real login is required for this recording.
2. Use the fixture's synthetic report or equally fictitious text. Prefill before capture. Keep the receipt and record all desks in the **same browser origin/profile** so they share mock localStorage. Do not show real student information, credentials, tokens, invite links or subscription email.
3. For council footage, submit via `/report?delay=10` to set a ten-second demonstration delay. Record the refusal promptly, wait for the displayed unlock time, then record the successful open. Edit the waiting period out with the explicit “Later — SIMULATED browser time” caption. This tests no ORK clock. If a take misses the window, create a new report rather than inventing a denial.
4. Keep mock captions legible when cropping. Do not present placeholder digests as cryptographic proofs or simulated rows as a real database inspection. Do not insert an invented ORK message or a successful live decrypt take.
5. Lead-confirmed live status is from **22 October 2026, 15:32 VN**: four-persona login, Tide-issued roles, three Forseti policies committed through the enclave, QEA pending requests. No exact live ORK denial text or end-to-end seal/decrypt result was supplied. Pending is not a completed 2-of-3 approval; before/after ORK time-lock enforcement remains unverified.

## Export and final checks

Export `Video.mp4` to the repository root, **at most 120 seconds and strictly below 100,000,000 bytes**. Target a 1:59 export for timing margin; trim holds rather than speeding up caveats. The title-card masters stay 1920×1080; capture at that size if available. Recording/editing remains the lead/team's deliverable.

Verify the actual file, not only the editor timeline:

```bash
ffprobe -v error -show_entries format=duration,size -of json Video.mp4
```

Play the complete export with sound. Check that the opening qualification, mock captions, live-status boundary, council “Later” cut and final URL are readable. Check duration and byte size, then confirm GitHub can play the uploaded file. A script or a title-card set is not a completed video.
