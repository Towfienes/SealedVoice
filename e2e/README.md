# Browser coverage

`npm run test:e2e` starts the real Next dev server with `NEXT_PUBLIC_VAULT=mock` on localhost:3000 and runs two projects. It refuses to reuse a possibly live Tide server. Install Chromium first with `npx playwright install chromium`.

- **mock-vault:** six browser tests exercise the production `lib/vault/mock.ts` implementation using isolated browser localStorage and a test-only HTML harness. The harness transpiles that source without changing app code or replacing the vault logic. US1–US5 cover receipts/envelopes, investigator/guardian separation, simulated insider denial/pending role request and the exact council time boundary. An extra test checks signed-out reads.
- **ui-readiness:** real HTTP route checks and a visible SIMULATED-label check. This intentionally fails on the bootstrap revision until the UI stream integrates the reporting pages. It is a prerequisite check, **not** a complete form-to-receipt UI test.

Run only the available vault coverage with `npm run test:e2e -- --project=mock-vault`. A green result here does not establish a working SealedVoice interface. After UI integration, add form submission and actual persona interactions using the implemented accessible labels; do not guess selectors or substitute a fake app.

If Google Chrome is already installed, `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` uses it instead of downloading managed Chromium. The default needs `npx playwright install chromium`.

No browser-harness test claims real encryption, no-Authorization HTTP submission, Tide account authentication, ORK enforcement, actual HTTP 202, durable escalation or a cryptographic receipt. The mock intentionally stores plaintext and uses local browser time. See [validation status](../docs/VALIDATION.md).

Playwright's [web-server lifecycle](https://playwright.dev/docs/test-webserver) and [clock API](https://playwright.dev/docs/clock) document the test setup. Test results and traces remain ignored by git.
