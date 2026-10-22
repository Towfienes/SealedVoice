# Related work and how SealedVoice differs

| System | What it solves | SealedVoice difference |
|---|---|---|
| **CoverDrop** (Ahmed-Rengers et al., PETS; deployed in The Guardian app, 2025) | Hides *that* a source contacted a newsroom (cover traffic, threshold mix in a TEE) | We address *verified-but-sealed identity inside an institution*, where law requires the reporter's name |
| **Callisto** (Rajan et al., ACM COMPASS 2018; matching deployed 2023) | Information escrow: reports open to a counsellor only when ≥2 survivors name the same perpetrator | No matching needed. "Co-report" escrow is a natural extension |
| **WhoToo** (Kuykendall, Krawczyk, Rabin, PoPETs 2019) and **AWARE** (IACR ePrint 2026/1046) | Threshold opening of accusations or reports by a committee, using bespoke cryptography | We get committee-style guarantees from an **off-the-shelf, Keycloak-compatible IAM** that a university can deploy today |
| **Tide "Manifesting Unobtainable Secrets"** (nested Shamir threshold EC key generation) and **FROST** (RFC 9591, 2024) | Keys that never exist in one place; t-of-n Schnorr signatures | The basis for "there is no master key for IT to hand over" |

Sources: lightbluetouchpaper.org (CoverDrop), usenix.org Enigma 2019 (Callisto), crysp.petsymposium.org popets-2019-0054 (WhoToo), eprint.iacr.org/2026/1046 (AWARE), rfc-editor.org/rfc/rfc9591.
