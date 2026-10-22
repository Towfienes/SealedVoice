# Codex validation status

Initial baseline: `553eae6`. Current integration baseline: `358b364` (`main`, 22 October 2026), with Codex docs/tests on `docs/codex` ([PR #3](https://github.com/Towfienes/SealedVoice/pull/3)). Local environment: macOS arm64, Node v24.5.0, npm 11.6.4, installed Google Chrome. This record is not live Tide security certification.

| Task | Work delivered | Verification / remaining work |
|---|---|---|
| T20 | README badge and original sentence preserved; five judging sections, Setup, Limits and Credits written. | `bash scripts/wordcount.sh`: **239** words; below 300. Setup distinguishes mock behavior from unverified live integration. |
| T21 | Two-minute English narration and per-persona shot list; trust and attack documents adapted to reporter/investigator/guardian/council. | Four timed sections total 120 seconds; 266 narration words. Recording is pending; no `Video.mp4` has been produced. |
| T22 | Student/investigator/report fixtures; test-runner fix; Playwright vault and actual UI workflows for US1–US5. | **41 unit tests and 12 browser tests pass, 0 fail** after integration. App and test TypeScript checks pass; production build passes. |
| T42 | Fresh-context, report-only localhost review plus post-integration source reassessment. | [Findings](RED-TEAM-FINDINGS.md) preserve history and distinguish source fixes from outstanding batch/tag and DPoP gaps. Real ORK/QEA behavior remains untested. |
| T51 | Isolated remote clone of `docs/codex` at `0998890`; followed the README's install/test/build/mock-browser path. | Install, **41/41 unit tests**, build, **12 browser tests (49.4s)** and 239-word check all pass. Checkout stays clean. Genuine Tide enrollment/login validation remains pending. |

## Current validation

- `npm test`: **41 tests, 41 pass, 0 fail**.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`: **12 passed (59.0s)**, zero retries. Six vault-harness tests plus five actual UI workflows and one route/label readiness test.
- `npm run build`: **exit 0**; all 18 static pages generated and API routes included. Existing SDK re-export warnings and the local multiple-lockfile warning remain.
- `npx tsc --noEmit`: **exit 0**.
- Explicit strict TypeScript check of `e2e/*.ts`, config and verifier tests: **exit 0**. The package has no lint script; `git diff --check` also passes.
- `bash scripts/wordcount.sh`: **239**, below 300.
- GitHub's build check for code snapshot `0998890`: **success** ([run](https://github.com/Towfienes/SealedVoice/actions/runs/39741325096)). The existing workflow runs build/unit checks; browser results above are local.

## Fresh-clone result

Cloned the remote PR branch with `git clone --branch docs/codex` into an independent temporary directory, without copying node_modules, data, `.env` files or config. Branch selection is the only difference from the README clone command while this PR is unmerged. Then ran its documented `npm install`, `npm test`, `npm run build` and Chrome alternative for `npm run test:e2e`. All exited zero; no retries. Installation took about five minutes on this connection. No further source changes were needed in the fresh checkout.

Read-only probes against that clone's production server also observed:

| Request, no Authorization | Result |
|---|---|
| GET `/api/reports` | **401**, `{"error":"unauthorized"}` |
| GET `/api/policies` | **401**, `{"error":"unauthorized"}` |
| GET `/api/policies?type=committed` | **200**, `[]` (intentionally public) |
| OPTIONS `/api/policies` | **204**, `Allow: GET, HEAD, OPTIONS, POST` |
| GET `/api/admin/db-dump` | **401**, `{"error":"unauthorized"}` |

These establish unauthenticated read gates and the declared methods, not successful token verification, admin mutations or real decryption. No mutating API probes were sent. The production server was stopped after inspection.

One dev-server attempt after rebasing timed out at startup. Preserving the old `.next/dev` cache outside the checkout and rebuilding a fresh cache restored startup; the subsequent full suite passed. No app/config source was changed to suppress the issue.

Mock mode still requests the missing Tide adapter through the inherited AuthProvider: `/api/tidecloakAdapter` returns 500 and the SDK attempts an undefined discovery path. The mock reporting UI works and the tests do not intercept these requests. This fresh-setup issue belongs to the AuthProvider owner; no private config was fabricated to hide it.

## Historical bootstrap observations

- `git clone https://github.com/Towfienes/SealedVoice`: succeeded after network permission was enabled.
- `git checkout -b docs/codex`: succeeded.
- `npm install`: succeeded, 69 packages installed. Existing dependencies produced six audit advisories; no automatic dependency upgrades were applied.
- Original `npm test`: failed with `Cannot find module '.../SealedVoice/tests'` on Node 24 because the script passed a directory.
- Corrected `npm test` (`node --experimental-strip-types --test "tests/*.test.ts"`): **26 tests, 26 pass, 0 fail**. Node emits a package-module-type warning; it does not fail the tests.
- `git diff --check`: passed.
- `bash scripts/wordcount.sh`: **239**.
- `NEXT_PUBLIC_VAULT=mock npm run dev`: server starts; `/` returns 200, but is still the Forseti bootstrap. `/report`, `/api/reports`, `/api/admin/grant-role` return 404.
- `/api/tidecloakAdapter`: 500, `{"error":"Failed to read tidecloak.json"}` on this fresh checkout. No private adapter config was fabricated.
- `docker info`: Docker daemon unavailable on this machine. TideCloak `localhost:8080` is not running; account enrollment, terms acceptance and live policy/quorum checks were not performed.

## Remaining live validation

The UI/Tide/API streams have integrated routes and the live vault. Codex has not changed `app/`, `lib/`, contracts, init scripts or security scripts. A mock pending status is not a real HTTP 202; a mock browser time lock is not an ORK result.

The default Playwright run now passes on the integrated UI. Still required: genuine login/enrollment, committed policies, direct investigator/guardian denials, real quorum pending/commit behavior, council ORK before/after timing and the final pre-submission clone on the final revision. Keep all simulated scenes labelled and preserve the report's architectural limits.
