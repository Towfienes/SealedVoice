# Spec 001: SealedVoice

**One line:** A university reporting channel where the reporter is *verified but sealed*. No admin, not even the Head of School or IT, can unmask the reporter, read the report without the investigator role, stack the investigation team, or bury the report.

**Why now (trust constraint):** Vietnam's Law on Denunciation 2018 requires a reporter's name and address. Anonymous reports are generally not processed (Art. 25). So students must identify themselves, and the person accused is often an admin or a friend of one. With ordinary login plus backend roles, whoever runs the server can read everything and grant themselves anything.

## Personas (synthetic)
- **Mai**: student (`student`), the reporter.
- **Dr. Hung**: Head of School, realm admin #1, friend of the accused. The insider.
- **Inspector Lan**: `investigator`, admin #2.
- **Guardian Minh**: `identity-guardian`, independent student-affairs officer, admin #3.
- **University Council**: `council`, the escalation body.

## User stories and acceptance criteria
**US1 · Mai files a sealed report (P1)**
- Given Mai is signed in with the `student` role, when she submits a report, then three envelopes (content, identity, council) are encrypted in her browser and the server stores only ciphertext.
- And the submit request carries **no** Authorization header. She gets a receipt (alias `#A7`, digest, council unlock time).

**US2 · Inspector Lan investigates without knowing who reported (P1)**
- Given Lan has `investigator`, when she opens #A7, then she reads the content and evidence.
- When she tries the identity envelope, then Tide refuses it.

**US3 · Guardian Minh verifies without exposing (P1)**
- Given Minh has `identity-guardian`, when he opens the identity envelope, then he can confirm "a verified student filed #A7".
- Content stays closed to him.

**US4 · Dr. Hung is blocked four ways (P1, the demo's key moment)**
- Raw DB rows show only ciphertext.
- "Reveal reporter" → ORK denial, shown verbatim.
- "Add me as investigator" → HTTP **202 pending**, visible in the tide-console QEA inbox, needs 2 of 3 admins.
- He cannot stop the council copy (see US5).

**US5 · Council cannot be kept in the dark (P2)**
- Given the council envelope has `DecryptTimeLock:{t}`, when the Council opens before `t`, then they get "Time lock preventing decryption until …".
- After `t`, it opens. Nobody can cancel or extend it.

**US6 · How it works page (P2):** a one-screen architecture diagram (browser → app server [ciphertext only] → TideCloak → ORK network), plus the honest Limits list.

## Non-goals (today)
Two-way pseudonymous inbox (stretch), mobile app, real university SSO, deletion protection, network-metadata anonymity (IP, timing), production ORK network.

## Limits (must appear in README)
- Writing style can de-anonymise.
- Tide stops *reading*, not *deleting*, so the student keeps the receipt.
- Metadata and IP are visible.
- Staging ORK network (t=3, n=5).
- The browser is the trust boundary.
