# Plan 001: SealedVoice

## Architecture
```
Browser (Next.js client)          App server (Next.js API + SQLite)      TideCloak (Keycloak + IGA)        Tide ORK network
- TideCloak login (BYOiD)   --->  /api/reports  POST (no auth!)          realm forseti-test                 Forseti contract runs on every ORK
- doEncrypt x3 envelopes          stores ciphertext + tags only          roles: student, investigator,      - checks executor role
- doDecrypt per envelope    <---  GET (token-verified, ciphertext only)    identity-guardian, council       - checks DecryptTimeLock tag
                                  /api/admin/grant-role -> 202 PENDING   QEA: 3 admins, threshold 2         - no single node holds the key
```

## Seam
`lib/vault/types.ts`. The UI uses `useVault()` only.
- `mock.ts` (WT-B, for e2e) and `tide.ts` (WT-A) both implement `Vault`.
- `NEXT_PUBLIC_VAULT=tide|mock`.

## Policies (one Forseti contract, three policies)
| Label | EncryptionRealmRole | DecryptionRealmRole | RequireTimeLock |
|---|---|---|---|
| investigator | student | investigator | 0 |
| guardian | student | identity-guardian | 0 |
| council | student | council | 1 |

- The contract is `contracts/SealedVoicePolicy.cs`, from the fail-closed SealedBid contract. It denies a null role, a missing or unparseable lock when `RequireTimeLock=1`, and a missing ResourceTag.
- Its contract ID changes on every edit, so freeze it **before** committing the policies.

## Data
```
reports(id TEXT PK, alias TEXT, created_at INT, status TEXT,
        content_ct TEXT, content_tags TEXT, identity_ct TEXT, identity_tags TEXT,
        council_ct TEXT, council_tags TEXT, council_unlock_at INT)
committed_policies(label TEXT PK, data BLOB)   -- re-keyed from upstream modelIds[0]
```
The POST validator rejects bodies that contain plaintext field names (`description`, `fullName`, …) or non-base64 ciphertext.

## Reuse
- Template: `components/AuthProvider.tsx` (doEncrypt/doDecrypt/approve/execute), `hooks/useAuth.ts`, `lib/tidecloakConfig.ts`, `lib/adminPolicy.ts`, `lib/tideSerialization.ts`, `init/*`.
- The policy create/approve/commit handlers are in `app/home/page.tsx:725-934`. Move them to `lib/policies/flow.ts` and delete the demo UI.
- From the SealedBid work at `/home/towfienes/orca/projects/RMIT_HACKATHON/_workspace/c2/`: `lib/verifyToken.ts` (copied), `tests/verifyToken.test.ts` (copied), `scripts/security-tests.sh` (copied, adapt), `app/api/committee/open/route.ts` (pattern), `docs/TRUST-MODEL.md`, `docs/ATTACK-VECTORS.md` (adapt).
- QEA 202: `POST /admin/realms/{realm}/users/{id}/role-mappings/realm`. See `init/tcinit.sh` (~line 575).

## Risks and fallbacks
| Risk | Fallback |
|---|---|
| Time lock is unreliable for more than 20 minutes | Drop the council envelope. The core still ships. |
| Forseti/staging is down for more than 45 minutes | `_tide_<tag>` self/role E2EE plus real QEA; label the rest "mocked". |
| Enrolment link expires | Re-run the invite and open it within 5 minutes. |
| Quorum is not reached because only 2 admins exist | Three distinct Tide accounts are mandatory. Make all role grants before admins 2 and 3. |
