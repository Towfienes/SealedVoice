import { test, expect, draft, identity } from "./fixtures";

test("US1: Mai seals three mock envelopes and receives a matching receipt", async ({ page, sealedReport }): Promise<void> => {
  const rows = await page.evaluate(() => window.sealedVoice.mockVault.rawDatabaseRows());
  expect(rows).toHaveLength(1);
  const row = rows[0];
  expect(sealedReport.reportId).toBe(row.id);
  expect(sealedReport.alias).toBe(row.alias);
  expect(sealedReport.digest).toBeTruthy();
  expect(sealedReport.councilUnlockAt).toBe(row.envelopes.council.unlockAt);
  expect(Object.keys(row.envelopes).sort()).toEqual(["content", "council", "identity"]);
  const ciphertexts = Object.values(row.envelopes).map((envelope): string => envelope.ciphertext);
  expect(new Set(ciphertexts).size).toBe(3);
  for (const ciphertext of ciphertexts) expect(ciphertext).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
  expect(row.envelopes.content.tags).toEqual(["sv:content"]);
  expect(row.envelopes.identity.tags).toEqual(["sv:identity"]);
  expect(row.envelopes.council.tags).toContain(`DecryptTimeLock:${sealedReport.councilUnlockAt}`);
  expect(JSON.stringify(rows)).not.toContain(identity.fullName);
  expect(JSON.stringify(rows)).not.toContain(draft.description);
  // Fake ciphertext-only rows do not establish encrypted transport or anonymous POST.
  const plain = await page.evaluate(() => localStorage.getItem("sv-mock-plain"));
  expect(plain).toContain(identity.fullName);
});

test("US2: Lan reads the allegation and is refused the identity", async ({ page, sealedReport }): Promise<void> => {
  const result = await page.evaluate(async (id: string) => {
    const { mockVault, setMockPersona } = window.sealedVoice;
    setMockPersona("lan");
    const row = (await mockVault.listReports()).find((report) => report.id === id);
    if (!row) throw new Error("Sealed report disappeared");
    return { content: await mockVault.openContent(row), identity: await mockVault.openIdentity(row) };
  }, sealedReport.reportId);
  expect(result.content).toEqual({ ok: true, value: draft });
  expect(result.identity).toEqual({
    ok: false, reason: "role", message: "[SIMULATED] Forseti: executor lacks realm role 'identity-guardian'",
  });
});

test("US3: Minh verifies the identity and is refused the content", async ({ page, sealedReport }): Promise<void> => {
  const result = await page.evaluate(async (id: string) => {
    const { mockVault, setMockPersona } = window.sealedVoice;
    setMockPersona("minh");
    const row = (await mockVault.listReports()).find((report) => report.id === id);
    if (!row) throw new Error("Sealed report disappeared");
    return { identity: await mockVault.openIdentity(row), content: await mockVault.openContent(row) };
  }, sealedReport.reportId);
  expect(result.identity).toEqual({ ok: true, value: identity });
  expect(result.content).toEqual({
    ok: false, reason: "role", message: "[SIMULATED] Forseti: executor lacks realm role 'investigator'",
  });
});

test("US4: Hung sees opaque rows, is denied both envelopes and cannot self-grant in the mock", async ({ page, sealedReport }): Promise<void> => {
  const result = await page.evaluate(async (id: string) => {
    const { mockVault, setMockPersona } = window.sealedVoice;
    setMockPersona("hung");
    const rows = await mockVault.rawDatabaseRows();
    const row = rows.find((report) => report.id === id);
    if (!row) throw new Error("Sealed report disappeared");
    const pending = await mockVault.requestRole("hung", "investigator");
    return {
      rows, pending, session: mockVault.session(),
      identity: await mockVault.openIdentity(row),
      content: await mockVault.openContent(row),
      council: await mockVault.openCouncil(row),
    };
  }, sealedReport.reportId);
  expect(JSON.stringify(result.rows)).not.toContain(identity.fullName);
  expect(JSON.stringify(result.rows)).not.toContain(draft.description);
  for (const denial of [result.identity, result.content, result.council]) {
    expect(denial).toMatchObject({ ok: false, reason: "role" });
  }
  expect(result.pending).toMatchObject({ status: "pending", httpStatus: 202 });
  expect(result.pending.message).toContain("[SIMULATED]");
  expect(result.pending.message).toContain("2 of 3 admins");
  expect(result.session.roles).not.toContain("investigator");
  // httpStatus here is a mock return value, not an observed HTTP response.
});

test("US5: the same council envelope refuses before its epoch and opens exactly at it", async ({ page, sealedReport }): Promise<void> => {
  const openCouncil = async () => page.evaluate(async (id: string) => {
    const { mockVault, setMockPersona } = window.sealedVoice;
    setMockPersona("council");
    const row = (await mockVault.listReports()).find((report) => report.id === id);
    if (!row) throw new Error("Sealed report disappeared");
    return { row, opened: await mockVault.openCouncil(row) };
  }, sealedReport.reportId);

  await page.clock.setFixedTime(new Date((sealedReport.councilUnlockAt - 1) * 1000));
  const before = await openCouncil();
  expect(before.opened).toEqual({
    ok: false, reason: "timelock",
    message: `[SIMULATED] Time lock preventing decryption until ${sealedReport.councilUnlockAt}`,
  });
  await page.clock.setFixedTime(new Date(sealedReport.councilUnlockAt * 1000));
  const after = await openCouncil();
  expect(after.opened).toEqual({ ok: true, value: draft });
  expect(after.row).toEqual(before.row);
});

test("signed-out mock readers cannot open any envelope", async ({ page, sealedReport }): Promise<void> => {
  const results = await page.evaluate(async (id: string) => {
    const { mockVault } = window.sealedVoice;
    const row = (await mockVault.listReports()).find((report) => report.id === id);
    if (!row) throw new Error("Sealed report disappeared");
    await mockVault.signOut();
    return Promise.all([mockVault.openContent(row), mockVault.openIdentity(row), mockVault.openCouncil(row)]);
  }, sealedReport.reportId);
  for (const result of results) expect(result).toMatchObject({ ok: false, reason: "not-signed-in" });
});
