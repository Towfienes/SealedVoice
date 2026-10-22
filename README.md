[![Built with TideCloak](https://tide.org/badges/built-with-tidecloak.svg)](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked)

## Project overview

**SealedVoice lets a student report misconduct under their verified name, a name no administrator can ever unseal.**

Built with [TideCloak](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked).

### 1. Vision & originality
Students should be able to report misconduct even when the accused controls the institution's IT. SealedVoice separates a verified identity from an investigation. Unlike CoverDrop's concealed contact or Callisto's matching escrow, our focus is verified-but-sealed reporting inside a university. See [related work](docs/SOTA.md).

### 2. Trust constraint insight
The design starts from the named-report requirement described in our [spec](specs/001-sealedvoice/spec.md). A conventional reporting portal asks students to trust the very administrator they may accuse: that administrator controls storage, permissions and the application.

### 3. Value & impact
Mai receives a pseudonymous receipt. Inspector Lan reads the allegation without the identity. Guardian Minh verifies the student separately. A timed council copy provides an escalation path, provided the ciphertext remains available.

### 4. Why TideCloak matters
The intended live path encrypts three envelopes in the browser. Forseti on Tide's ORKs enforces separate decryption roles and the council time lock; TideCloak governs role changes through administrator quorum. A backend permission check alone cannot provide that separation.

### 5. Prototype & storytelling
The demo follows Mai, Lan, Minh and insider Dr. Hung through submission, investigation, identity denial, a pending self-grant and council escalation. **Mocked mode simulates encryption, roles, quorum and time locks; it proves no Tide security guarantee.** Live enforcement must be verified separately; see [validation status](docs/VALIDATION.md).

## Demo video

[Video.mp4](Video.mp4) — target: at most 2:00 and under 100 MB. Recording is pending; the [shot list and English narration](docs/DEMO_SCRIPT.md) are ready for production.

## Setup

Use Node.js **22.18+** (or Node 24+) and npm. Run commands from the repository root.

```bash
git clone https://github.com/Towfienes/SealedVoice
cd SealedVoice
npm install
npm test
npm run build
NEXT_PUBLIC_VAULT=mock npm run dev
```

Open <http://localhost:3000>. Mock mode needs no Tide account and uses synthetic data in this browser's localStorage, including plaintext under `sv-mock-plain`. Use the **Signed in as** selector to choose Mai, file a report, then switch personas on the investigator, guardian, insider and council pages. Use it only for development; see [validation status](docs/VALIDATION.md) for the revision tested.

### Browser acceptance tests

```bash
npx playwright install chromium
npm run test:e2e
```

The test server runs with `NEXT_PUBLIC_VAULT=mock` on port 3000; stop another dev server first. Tests cover US1–US5 through both the browser vault and actual form/persona interactions. If Google Chrome is installed, use `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` to use it instead of managed Chromium. Mock results are not evidence of real encryption, anonymous HTTP submission, QEA or ORK enforcement.

### Live TideCloak setup

This path requires Docker with its daemon running, Bash, curl, jq and a Tide subscription email. Review the scripts before running them; local development credentials come from the existing init configuration. Never use those defaults on a public deployment.

1. Start a local development server: `bash scripts/start-tidecloak.sh`.
2. Run `bash init/tcinit.sh`. Enter your own subscription email and personally review and accept the displayed Tide terms. Complete the enrollment steps the script prints.
3. Run `bash scripts/setup-personas.sh submit`. In the realm's Tide console, approve and commit the role requests first, then the user requests. Run `bash scripts/setup-personas.sh map`, approve and commit those mappings, then `bash scripts/setup-personas.sh invite`. Invitation links are saved to ignored `data/invite-links.txt`.
4. Use separate browser profiles for each persona. The Linux Chromium helper is `bash scripts/open-persona.sh <persona> invite`; on macOS, open the saved invitation link manually in the appropriate profile. The four-account licence requires the lead's persona mapping in the spec; do not enroll extra accounts blindly.
5. Have the lead verify three distinct realm admins and a two-admin approval threshold. Refresh local config with `EXPORT_ONLY=1 bash init/tcinit.sh`. Keep `data/tidecloak.json` and `data/admin-policy.b64` private.
6. At `/admin/policies`, commit the investigator, guardian and council policies, then use `NEXT_PUBLIC_VAULT=tide npm run dev`. Verify the live checklist in [TRUST-MODEL.md](docs/TRUST-MODEL.md) before claiming the demo is secured by Tide.

Live setup is not yet certified from a fresh clone. It needs interactive enrollment, committed policies and real ORK/QEA checks; see [validation status](docs/VALIDATION.md).

## Limits
- Writing style, evidence or contextual details can identify a reporter.
- Tide restricts reading; it does not prevent deletion, withholding or rollback. Keep the receipt; it is not an external backup or an automatic delivery service.
- Metadata, IP addresses and timing remain visible. Omitting an Authorization header is not network anonymity.
- The demo targets the **staging ORK network, t=3, n=5**; this is not a production deployment.
- The browser is the trust boundary. A compromised browser, extension or server-delivered JavaScript can capture plaintext before sealing or after opening.
- Mock mode stores plaintext locally and its digest is a placeholder, not a cryptographic integrity proof. Do not enter real reports.
- Bearer-token replay and DPoP proof replay need separate controls; see [attack vectors](docs/ATTACK-VECTORS.md). Live role, tag and quorum enforcement remain unverified until tested.
- A guardian can disclose identities they legitimately open; colluding administrators and unavailable ORKs remain threats.

## Credits
Built on [tide-foundation/forseti-crypto-quickstart](https://github.com/tide-foundation/forseti-crypto-quickstart).
Token-verifier tests and the original trust/attack analyses were adapted from the team's SealedBid work. [TideCloak](https://tide.org/tidecloak) provides the intended identity, policy and threshold-cryptography infrastructure. All demo personas and reports are synthetic.
