# Browser coverage

`npm run test:e2e` starts the real Next dev server with `NEXT_PUBLIC_VAULT=mock` on 127.0.0.1:3000 and runs two projects. It refuses to reuse a possibly live Tide server. Install Chromium first with `npx playwright install chromium`.

- **mock-vault:** six browser tests exercise the production `lib/vault/mock.ts` implementation using isolated browser localStorage and a test-only HTML harness. The harness transpiles that source without changing app code or replacing the vault logic. US1–US5 cover receipts/envelopes, investigator/guardian separation, simulated insider denial/pending role request and the exact council time boundary. An extra test checks signed-out reads.
- **mock-ui:** real HTTP route readiness and a visible SIMULATED-label check, plus five actual UI workflows using implemented accessible labels: Mai submits and downloads/reloads a receipt; Lan sees content and identity denial; Minh verifies identity and content denial; Hung tries four insider actions and still cannot read content after the pending grant; council is denied before unlock and opens the same report at the boundary. Every workflow submits its own report through the form in an isolated browser context.

Run only vault coverage with `npm run test:e2e -- --project=mock-vault`, or only the integrated UI with `npm run test:e2e -- --project=mock-ui`. The full suite has twelve tests. The readiness check intentionally failed on the historical bootstrap revision and now passes after UI integration.

If Google Chrome is already installed, `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` uses it instead of downloading managed Chromium. The default needs `npx playwright install chromium`.

No browser-harness test claims real encryption, no-Authorization HTTP submission, Tide account authentication, ORK enforcement, actual HTTP 202, durable escalation or a cryptographic receipt. The mock intentionally stores plaintext and uses local browser time. See [validation status](../docs/VALIDATION.md).

Playwright's [web-server lifecycle](https://playwright.dev/docs/test-webserver) and [clock API](https://playwright.dev/docs/clock) document the test setup. Test results and traces remain ignored by git.
