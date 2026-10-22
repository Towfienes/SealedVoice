# Trust Constraint Insight — the blind-trust ledger

> **SealedVoice integration status:** adapted from the team's SealedBid analysis. Descriptions below are design requirements and inherited source observations, **not verified live SealedVoice results**. See [VALIDATION.md](VALIDATION.md) and [RED-TEAM-FINDINGS.md](RED-TEAM-FINDINGS.md). Mock mode stores plaintext in browser localStorage and simulates encryption, roles, time locks and pending grants; it proves no Tide security guarantee.

> This document is the long form of README §2. It exists because the 20% "Trust
> constraint insight" criterion rewards a *precise* answer, and precision does not
> fit in 300 words. Everything here is checkable against `docs.tide.org`,
> `tide.org/whitepaper` and the `forseti-crypto-quickstart` source.

---

## 1. The blind-trust ledger of a conventional IAM

Take Okta, Auth0, or plain Keycloak. Each is a good product. Each still asks you to
trust the following five anchors in a conventional deployment.

| # | What you must blindly trust | Why it is blind | What one compromise buys |
|---|---|---|---|
| **T1** | The **signing key** in the IAM's memory or HSM | The key exists, whole, at one address. You trust the process that holds it, its operator, and the network path to it. | Forge any token for any user, any role, forever. No audit trail distinguishes forged from real. |
| **T2** | The **administrator** | "Super admin" is a role whose entire purpose is to be able to do anything. You trust the *person*, not a rule. | Grant yourself the decrypt role. Read every envelope. Then remove the audit line. |
| **T3** | The **resource server's code** | `if (user.role === 'investigator')` is a string comparison in a file you can edit. | Patch one line, deploy, read plaintext. The check is advisory. |
| **T4** | The **database / backup / log custodian** | Data is encrypted *at rest* with a key the server also holds, so "at rest" means "until the app starts". | `SELECT * FROM reports` returns plaintext. So does last night's backup. |
| **T5** | The **clock** | "Not before 15:00" is `Date.now() < opensAt` — evaluated by the party you are trying to constrain. | Move the deadline. Or just call the decrypt function directly. |

The pattern: **every trust anchor is a single object at a single address, and the
party being constrained is often the party holding it.** That is not a bug in Okta
or Keycloak. It is the definition of a centralised IAM. The reason it persists is
that the alternative — distributing the key — used to mean distributing the *risk*
too, and nobody wanted to run a threshold network to log into a dashboard.

### The precise statement of the constraint

Let `A` be the set of parties who can unilaterally cause a disclosure. In a
centralised IAM, `|A| = 1` for each of T1–T5, and the sets overlap: the same
administrator usually sits in `A(T2)`, `A(T3)` and `A(T4)` simultaneously.

> **The constraint is not "encryption is weak". It is that `|A| = 1` and the
> members of `A` are the same people you are trying to constrain.**

SealedVoice exists because the person accused may also control the portal that stores the reporter's mandatory identity. Lan investigates content; Minh verifies identity separately; the council receives a timed access path if the ciphertext remains available. A guardian can disclose identities they legitimately open.

---

## 2. What TideCloak removes, and what it does not

Be exact here. Overclaiming is the fastest way to lose the security-literate
judge, and the README is graded by people who will check.

### 2.1 Removed: the single object

| Anchor | Conventional | With TideCloak | Mechanism |
|---|---|---|---|
| T1 signing key | one key in one place | **no complete key held by our app** | CMK sharded across ORK nodes; signing is an SMPC/threshold operation. TideCloak's own docs: *"TideCloak has no signing keys."* |
| T2 administrator | super-admin can do anything | **governed write → `202 PENDING`** | QEA: threshold `max(1, ⌊0.7·N⌋)`. With 3 admins, 2 must approve. Sub-quorum commit → `412 QUORUM_NOT_MET`. |
| T3 server code | role check is a string compare | **role check duplicated in a C# contract executed by ORKs** | Forseti `ValidateExecutor` runs inside the Fabric, not in your repo. Editing your app cannot change its verdict. |
| T4 data custodian | server holds the data key | **server holds ciphertext only** | Hermetic E2EE: plaintext is re-encrypted to the user's ephemeral session key; the server never sees it. |
| T5 clock | `Date.now()` in your code | **`Utils.GetEpochSeconds()` inside the contract** | The time comparison happens on each ORK node, against a tag the contract requires. |

### 2.2 Not removed — say this out loud

TideCloak does not make an insecure app secure. It relocates *authority*; it does
not audit your input handling. The following remain your problem, and
`docs/ATTACK-VECTORS.md` treats each one as a first-class threat:

- **The browser is the trust boundary now.** If the reporter's machine is
  compromised, the attacker acts as the reporter. DPoP binds the token to a key in
  that browser — which is exactly as strong as the browser.
- **You must verify the token yourself.** A threshold-signed JWT that your API
  accepts without checking is a threshold-signed JWT you are not using.
- **Transport is still yours.** TLS, HSTS, certificate validation. Tide does not
  terminate your TLS.
- **Metadata is not encrypted.** IP addresses, timing and envelope counts remain
  visible. Omitting Authorization does not establish unlinkability; check cookies,
  request credentials and application/proxy logs separately.
- **The staging ORK network is a test network.** `t=3, n=5` on
  `sork1.tideprotocol.com`. Production is described as `t=14, n=20`. Do not quote
  production numbers as if the demo ran on them.
- **Availability is now a dependency.** No Fabric connectivity, no decryption.
  This is a real trade-off, not a footnote.

---

## 3. Evidence, rather than a security multiplier

The original SealedBid probability tables are not carried over. Their invented
compromise probabilities and multiplication of admin/ORK failures do not establish
SealedVoice's security. Guardian disclosure, malicious delivered JavaScript and
storage deletion are separate paths, not a product of two independent events.

The target demo uses three distinct realm admins and a two-admin approval
threshold; the staging ORK target is t=3, n=5. These are configuration targets
until live tests establish them. Three accounts owned by one person provide no
organizational independence. The lead must reconcile the spec's four-account
licence allocation before enrolling or promoting more accounts.

Live checks must establish: ciphertext POST without Authorization; investigator/guardian
separation at Tide; a real pending self-grant that cannot commit below quorum;
and the same council envelope denied before its epoch and opened after it.
Test missing/malformed/past lock epochs, altered/replayed tags and batch item order.
Use separate browser profiles and record exact errors, policy IDs and timestamps.

---

## 4. Where the guarantee is actually enforced

The chain has four links. A judge will ask which one is real. Answer precisely.

```
reporter browser        your server              ORK network
──────────────          ───────────              ───────────
doEncrypt(policy)  →    stores ciphertext   →    contract ValidateData
  tags: [sv:council,                                • ResourceTag present?
         DecryptTimeLock:1792800000]               • DecryptTimeLock present?
                                                   • now < lockEpoch?  → DENY
                                                   contract ValidateExecutor
                                                   • doken role == council?
                                                   → threshold shares → browser
```

1. **`doEncrypt` in the browser.** Intended live path; not yet verified here. The plaintext never leaves the tab.
2. **Your server.** Stores an opaque blob. It has no key and no decrypt endpoint
   that can succeed. It can refuse, delete, withhold or replace stored data, and alter future client code.
3. **The Forseti contract.** The intended enforcement point, requiring live verification. `Contract ID
   = SHA512(C# source)`. Change one character and the ID changes, so the policy
   must be re-approved by quorum. The contract runs in a gas-metered sandbox with
   `System.IO` and `System.Net` blocked.
4. **The ORK threshold.** Intended live path; not yet verified here. Below threshold, no shares, no plaintext — not a
   permission error, an arithmetic impossibility.

**The one honest caveat:** the *tag* `DecryptTimeLock:<epoch>` is supplied by the
client at encryption time. If the contract merely checks "is there a lock tag and
has it passed", a malicious client could seal a report with `DecryptTimeLock:0` and
read it immediately. Two mitigations, in increasing strength:

- **Required for SealedVoice council policy** (`contracts/SealedVoicePolicy.cs`): the tag is *mandatory* and a
  missing/malformed tag is a DENY. This stops the accidental case and the lazy
  attacker, not a determined one.
- **Recommended next**: make `OpenAt` a `[PolicyParam] public int`, so the deadline
  is part of the quorum-approved policy rather than a client-supplied tag. Then the
  client cannot influence it at all. This requires re-creating, re-approving and
  re-committing the policy, which is why it is scoped as a follow-up rather than
  shipped at 17:00 on deadline day.

Being explicit about this is worth more than pretending it does not exist.

---

## 5. When the model breaks

| Failure | Effect on the guarantee | Mitigation |
|---|---|---|
| **Correlated admin compromise** (one phishing campaign hits all three) | Multiple accounts no longer provide independent approval. | Independent organizations, hardware keys, and admins who do not share a reporting line. |
| **All three admins are the same human** | The quorum provides no organizational independence. | Verify distinct operators as well as distinct Tide accounts. |
| **Malicious reporter** seals with `DecryptTimeLock:0` | Time lock bypassed for *their own* report. | `OpenAt` as a `[PolicyParam]` (§4). Note the blast radius is their own envelope, not others'. |
| **Compromised reporter browser** | Attacker acts as the reporter, before sealing. | Out of scope, and honestly so: this is the trust boundary. DPoP limits token theft *after* the fact, not a rooted endpoint. |
| **Staging ORK outage** | Availability, not confidentiality. | Show the actual connectivity error and fail closed; never fall back to plaintext. |
| **Server compromised** | Attacker can read ciphertext, deny service, and tamper with the UI. Cannot directly decrypt existing envelopes without authority, but can steal future plaintext through modified delivered code. | Protect client delivery; do not claim server RCE is harmless. |

---

## 6. SealedVoice boundaries and verification

Each report has three independently encrypted envelopes. The content policy requires
`investigator`, identity requires `identity-guardian`, and council requires `council`
plus a valid time lock. Use one `doEncrypt` call per envelope, because the contract
examines batch item zero. Preserve encryption tags unchanged for decryption.

The intended `POST /api/reports` sends ciphertext without Authorization. This does
not hide IP addresses, cookies, timing or identifying evidence. Tide restricts reads,
not deletion: a council time lock does not guarantee delivery or surviving storage.
The reporter should keep the receipt and an independent escalation path.

The browser is the trust boundary. An authorized guardian can disclose identity;
colluding admins can approve changes. A compromised server can serve malicious code
to future visitors. Availability, TLS, trusted issuer/JWKS configuration and logging
remain deployment responsibilities.

Mock receipts use a ciphertext substring, not a cryptographic integrity proof.
Mock plaintext lives under `sv-mock-plain`; never enter real reports. Unit tests
validate the verifier helper, not every route. Its current DPoP checks have no
`jti` replay cache or `ath` access-token binding check.

Before filming, complete the live checks in section 3 and publish observations
with exact evidence. Never label a simulated denial or mock 202 as a Tide result.
