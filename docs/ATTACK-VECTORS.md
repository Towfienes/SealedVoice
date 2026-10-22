# Attack Vectors — red-team review of SealedVoice

> **SealedVoice integration status:** adapted from the team's SealedBid analysis. Descriptions below are design requirements and inherited source observations, **not verified live SealedVoice results**. See [VALIDATION.md](VALIDATION.md) and [RED-TEAM-FINDINGS.md](RED-TEAM-FINDINGS.md). Mock mode stores plaintext in browser localStorage and simulates encryption, roles, time locks and pending grants; it proves no Tide security guarantee.

> Adversarial review of the architecture in `specs/001-sealedvoice/spec.md`, written from the
> position of an attacker who has read the source and wants the reports.
>
> Every verdict is one of: **BLOCKED** (observed at the relevant enforcement layer), **PARTIAL** (TideCloak
> helps but the app must do work), **OPEN** (TideCloak does nothing; the app must
> fix it), or **OUT OF SCOPE** (nobody can fix it at this layer).
>
> Source references distinguish the existing `lib/verifyToken.ts` helper from the
> intended `app/api/reports/route.ts` and `contracts/SealedVoicePolicy.cs` integration.

---

## Summary

| # | Attack | Design assessment, not a live verdict | Who must fix |
|---|---|---|---|
| 1 | Replay a captured token | **PARTIAL** | TideCloak (DPoP) + app must *enable and verify* it |
| 2 | Man-in-the-middle / TLS stripping | **PARTIAL** | App (TLS, HSTS) — Tide cannot help |
| 3 | DNS / IdP discovery spoofing | **OPEN** | App (pin the issuer, validate JWKS origin) |
| 4 | Compromised local client | **OUT OF SCOPE** | Nobody. This is the trust boundary. |
| 5 | Session hijacking via XSS | **PARTIAL** | App (CSP, no `localStorage` tokens) + DPoP |
| 6 | *Bonus:* insider admin self-grant | **UNTESTED** live | TideCloak QEA and realm configuration |
| 7 | *Bonus:* time-lock bypass via tag forgery | **PARTIAL** | App (contract hardening and live tests required) |
| 8 | *Bonus:* server compromise / RCE | **PARTIAL** | Ciphertext protects passive storage; future client delivery remains exposed |

---

## 1. Replay of a captured token

**Attacker.** Gets one access token — from a proxy log, a misconfigured Sentry
breadcrumb, a shared screenshot, a browser extension with `webRequest` access.

**What they try.** `curl -H "Authorization: Bearer <token>" /api/reports`.

**What happens.**

- Without DPoP: **the attack succeeds** until `exp`. A bearer token is a password.
  TideCloak's own docs say this plainly: *"A normal OAuth access token is a bearer
  token. Whoever holds it can use it."*
- With DPoP enabled (`useDPoP: { mode: "strict" }`): the token carries
  `cnf.jkt`, a thumbprint of a non-extractable key in the victim's browser. The
  attacker can copy the token but not the key, so they cannot produce the `DPoP:`
  proof header. **Expected to be blocked once live integration is verified.**

**What TideCloak gives you, and what it does not.** TideCloak implements RFC 9449
*and* extends it: the key is proven during authentication, not only at use time.
But — and this is the trap — **DPoP is opt-in and the SDK will not turn it on for
you.** A SealedVoice deployment that forgets `useDPoP` is a bearer-token app with
extra steps.

**What exists in the verifier helper; route integration remains unverified:**

- `verifyTideToken()` rejects a token whose header `typ` is `DPoP` when no proof is
  supplied — this closes the *downgrade* where an attacker strips the proof and
  hopes the server falls back to bearer. Code: `TOKEN_TYPE_REJECTED`.
- `checkDpop()` verifies `htm`, `htu`, `iat` (±300 s), the RFC 7638 thumbprint
  against `cnf.jkt`, and the proof's own signature.
- Test coverage: 7 tests in `tests/verifyToken.test.ts` → `attack: DPoP downgrade`.

**Residual risk.** A replayed *DPoP proof* within its 300 s window, for the same
method and URL, from the same browser profile. Mitigated by `jti` caching — noted
as a follow-up, not implemented. It needs a shared store and explicit tests.

---

## 2. Man-in-the-middle

**Attacker.** Controls a Wi-Fi access point, an ISP, or an ARP-spoofed LAN.

**What they try.** (a) Terminate TLS with a forged certificate. (b) Strip HTTPS and
serve the app over HTTP. (c) Proxy the WebSocket/HTTP traffic to the ORK network.

**What happens.**

- (a) Fails if the client validates certificates. **TideCloak is irrelevant here** —
  this is TLS, and TLS is the app's job. A user who clicks through a certificate
  warning has opted out of every guarantee in this document.
- (b) Fails with HSTS + `preload`. Without it, the attacker serves a *modified app*
  that exfiltrates plaintext from the browser before `doEncrypt` runs. **This is the
  most underrated attack on the whole design**, because the crypto is perfect and
  the attacker never touches it.
- (c) Interesting: the ORK traffic is itself cryptographically protected and the
  attacker cannot forge shares. But they can *drop* it, which is a denial of
  service (see §5).

**What TideCloak gives you.** Nothing for (a) and (b). For (c), the protocol is
designed so that intercepted shares are useless — but that is a property of the
threshold scheme, not a substitute for TLS.

**What deployment must add and verify:**

```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header Content-Security-Policy "default-src 'self'; connect-src 'self' https://sork1.tideprotocol.com; frame-ancestors 'none'" always;
```

Configure transport and CSP against the actual deployed origins; the example is not a tested deployment configuration.

**Residual risk.** A user on a hostile network with a compromised CA store. Out of
scope for a prototype; worth one sentence in the video so the judge knows you know.

---

## 3. DNS spoofing / IdP discovery poisoning

**Attacker.** Poisons DNS for `localhost:8080` (trivially, on a shared machine) or
for the realm hostname in a real deployment.

**What they try.** Serve a *fake* TideCloak that issues tokens signed by the
attacker's own key, with `iss` set to your realm and `realm_access.roles:
["investigator"]`. The app then talks to the fake JWKS endpoint, which returns
the attacker's public key, and every signature "verifies".

**What happens.** **This is a full compromise, and it is the attack most likely to
be missed**, because the token is structurally perfect: right issuer, right
audience, unexpired, correctly signed — by the wrong key.

**What TideCloak gives you.** The Fabric is resilient to node compromise, but it
cannot protect you from *talking to the wrong server*. Discovery is the app's job.

**What the app must add or verify:**

- `verifyTideToken()` requires an exact `iss` match and an exact `aud` match. That
  stops a *lazy* fake but not a *careful* one that copies both.
- The real fix is **JWKS origin pinning**: derive the JWKS URL from a build-time
  constant, not from a runtime-configurable `auth-server-url`, and verify the
  certificate chain against a pinned public key for production.
- For the demo, `auth-server-url` is `http://localhost:8080` — a plaintext HTTP
  IdP. **Say this in the README.** On localhost it is acceptable; anywhere else it
  is a critical finding, and a security judge will spot it in ten seconds.

**Residual risk.** On a shared hackathon laptop, any local process can bind :8080
before TideCloak starts. Mitigation for the demo: start TideCloak first, and check
`docker ps` before recording.

---

## 4. Compromised local client

**Attacker.** Has code execution in the reporter's browser or OS — malicious
extension, infostealer, a colleague who left the laptop unlocked.

**What they try.** Read the plaintext from the DOM before `doEncrypt` is called.
Call `doEncrypt` themselves with `DecryptTimeLock:0`. Submit a report as the victim.

**What happens.** **Everything succeeds.** All of it.

This is not a flaw in SealedVoice; it is the definition of the trust boundary. Once
the attacker is inside the browser, they *are* the reporter. DPoP binds the token to
a key in that browser — which is exactly as strong as the browser. Hermetic E2EE
seals data to an ephemeral session key in that browser — same.

**What TideCloak gives you.** A smaller blast radius than a server-side design:
the attacker gets *this reporter's* session, not the investigator's, and not the
database. They cannot read other envelopes. That is a real improvement over a
centralised design where one phished admin reads everything.

**What the app must add or verify:**

- **Required:** the contract must reject missing/malformed lock and resource tags.
  That alone does not prevent a reporter choosing `DecryptTimeLock:0` for their own
  council envelope. See `docs/TRUST-MODEL.md` §4 for the policy-parameter proposal.
- **SealedVoice scope:** there is no inherited one-report-per-person constraint or
  guaranteed duplicate-submission rejection. Do not apply procurement uniqueness rules.
- **Recommended:** CSP with no `unsafe-inline`, no third-party scripts on the report
  page, and a visible "sealed at HH:MM:SS" receipt so a tampered UI is detectable.

**Residual risk.** Total, by construction. Say so in the video — a judge who hears
"we do not defend against a rooted endpoint, and here is why that is the right
boundary" trusts the rest of the claims more.

---

## 5. Session hijacking

Two distinct attacks share this name. Treat them separately.

### 5a. Token theft via XSS

**Attacker.** Finds an XSS in the report form (a proposal field rendered with
`dangerouslySetInnerHTML`, a markdown renderer, a PDF preview).

**What they try.** `fetch('/api/reports').then(r => r.text()).then(t => exfil(t))`, or
steal the token from wherever the SDK put it.

**What happens.**

- If the token is in `localStorage`: **stolen**, and usable from anywhere until
  `exp`. Note that TideCloak's DPoP key lives in IndexedDB and is non-extractable,
  so even a stolen token fails the proof check — **but only if DPoP is on**.
- If the token is memory-only and DPoP is on: the attacker can still make
  *same-origin authenticated requests* while the tab is open. They cannot exfiltrate
  a reusable credential, but they can act.

**What TideCloak gives you.** DPoP makes the stolen token non-transferable. It does
not make XSS harmless.

**What the app must add (recommended):**

- Never render report content as HTML. React's default escaping is the control; do not
  opt out of it.
- CSP `script-src 'self'` with no `unsafe-inline`, so an injected `<script>` does
  not execute.
- Do not persist tokens to `localStorage`. The quickstart's `AuthProvider` keeps
  them in the SDK; keep it that way.

### 5b. Session fixation / cookie tossing

**Attacker.** Sets a session cookie from a sibling subdomain, or forces a known
session ID.

**What happens.** Low risk here: TideCloak's flow is token-based, and the session
key is generated in the browser's Secure Web Enclave, not accepted from a cookie.
**Blocked by architecture**, not by configuration.

**Residual risk.** A shared browser profile. The demo uses separate Chrome profiles
per user — which is a demo convenience that happens to also be the correct security
boundary. Worth saying on camera.

---

## 6. Bonus: insider administrator self-grant

**Attacker.** Hùng, a realm admin with database and deploy access, wants to add
himself to `investigator`.

**What they try.** `POST /admin/realms/forseti-test/users/{id}/role-mappings/realm`.

**What happens.** `202 Accepted`, status `PENDING`, visible in tide-console → QEA
Approvals as 1/2. A `commit` before quorum returns `412 QUORUM_NOT_MET`.
**Expected to be blocked** — only once verified that the realm is in `multiAdmin` mode, which requires **three**
admins (`max(1, ⌊0.7·3⌋) = 2`). With two admins the threshold is still 1, and the
attack succeeds.

**This is the single most important setup detail in the project.** The role
assignments must all be done *before* promoting admins 2 and 3, because after the
switch every role change needs quorum — including the ones you still need to make.
Follow `scripts/setup-personas.sh` and the live quorum checks in `scripts/security-tests.sh`.

---

## 7. Bonus: time-lock bypass via tag forgery

**Attacker.** Seals a report with `tags: ["report"]` and no `DecryptTimeLock`, then
decrypts immediately.

**What happens with the *upstream* quickstart contract:** **the attack succeeds.**
The upstream `ValidateData` only checks a lock tag *if one is present*, and
`ValidateExecutor` returns `Allow()` when `DecryptionRealmRole` is null. Both are
fail-open.

**What happens with `contracts/SealedVoicePolicy.cs` (requires live verification):** a missing lock tag
is a `Deny`, a missing `ResourceTag` is a `Deny`, and a null role parameter is a
`Deny`. **Partially blocked** — the accidental and lazy cases die; a reporter who
deliberately seals with `DecryptTimeLock:0` still bypasses *their own* lock.

**Full fix:** `OpenAt` as a `[PolicyParam] public int`, so the deadline lives in the
quorum-approved policy. Requires re-creating, re-approving and re-committing the
policy. Scoped as a follow-up; stated openly in `docs/TRUST-MODEL.md` §4.

---

## 8. Bonus: server compromise / RCE

**Attacker.** Gets a shell on the Next.js server. Reads `.env`, the SQLite file,
and the process memory.

**What they may get.** Ciphertext, timestamps, logs and identifying metadata.
The intended report table contains no reporter identity or server-held decrypt key;
verify actual storage and logs before making that claim. **PARTIAL**: passive storage exposure should reveal no plaintext, but a malicious
server can replace client code and collect future plaintext.

**What they can still do.** Deny service, tamper with the UI to phish a reporter's
plaintext *before* encryption, and alter council unlock metadata in SQLite (which
changes the UI countdown but not the ORK's decision — the contract reads the tag,
not the database). Verify that distinction on disposable synthetic fixtures;
do not alter existing reports or policies during review.

**Passive ciphertext storage reduces exposure, but arbitrary server compromise
is not harmless: storage availability, metadata and future client delivery remain exposed.**

---

## What to fix before the deadline, ranked

| Priority | Item | Effort | Why |
|---|---|---|---|
| **P0** | Enable `useDPoP: { mode: "strict" }` + serve `tide_dpop_auth.html` | 15 min | Without it, attack #1 is a full compromise |
| **P0** | 3 admins and governed role assignments via phased setup | 20 min | Verify actual approval threshold and effective privileges |
| **P0** | Ship `contracts/SealedVoicePolicy.cs` (fail-closed) | 20 min | Without it, attack #7 succeeds |
| **P1** | HSTS + CSP headers | 10 min | Attacks #2b, #5a |
| **P1** | Ciphertext-only report POST and metadata/log review | integration | Avoid exposing the reporter or plaintext at submission |
| **P2** | `jti` replay cache for DPoP proofs | 30 min | Narrow residual of #1 |
| **P2** | `OpenAt` as `[PolicyParam]` | 45 min + re-quorum | Full fix for #7 |
| **P3** | JWKS certificate pinning | infra | Attack #3 in production |

No P0 item is certified by this document. The Tide/API stream owns contract and
route fixes; Codex records evidence and limits without editing those files.

## SealedVoice-specific checks

- Lan can read content and is denied identity; Minh can verify identity and is denied content. Capture real Tide decisions, not disabled UI controls.
- Council must fail before and succeed after the same envelope's unlock epoch. Missing/malformed/past lock tags, changed tags, replay and batch order require separate tests.
- The actual report POST must reject plaintext and omit Authorization and identifying credentials. IP/timing/log correlation remains possible.
- A council access path does not prevent deletion, withholding or rollback. Keep the receipt; it is not a durable backup. Do not delete reports or policies to demonstrate this risk.
- Mock vault role checks, HTTP-status return values and clocks are simulated; plaintext lives in localStorage. They establish no Tide guarantee.
- The verifier has no DPoP `jti` replay cache or `ath` access-token binding check. Test routes independently of helper coverage.
- Check realm versus client role namespaces: the helper can read both; a similarly named client role must not accidentally authorize a realm-only action.
