import { readFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import { draft } from "./fixtures";
import type { Receipt } from "../lib/vault/types";

type UIReceipt = Pick<Receipt, "reportId" | "alias" | "digest" | "councilUnlockAt">;
const reporterName = "Nguyen Thi Mai"; // Synthetic identity actually rendered by the report form.

async function choosePersona(page: Page, id: string): Promise<void> {
  const picker = page.getByRole("combobox", { name: "Signed in as", exact: true });
  await expect(picker).toBeEnabled();
  await picker.selectOption(id);
  await expect(picker).toHaveValue(id);
}

async function fileReport(page: Page): Promise<UIReceipt> {
  await page.goto("/report?delay=180");
  await choosePersona(page, "mai");
  await page.getByLabel("Short title", { exact: true }).fill(draft.title);
  await page.getByLabel("Category", { exact: true }).selectOption(draft.category);
  await page.getByLabel("Who is accused (role and unit)", { exact: true }).fill(draft.accused);
  await page.getByLabel("Description", { exact: true }).fill(draft.description);
  await page.getByLabel("Evidence (optional)", { exact: true }).fill(draft.evidence ?? "");
  await page.getByRole("button", { name: "Seal and send" }).click();
  await page.waitForURL(/\/receipt\?id=/);
  await expect(page.getByRole("heading", { name: "Receipt", exact: true })).toBeVisible();
  await expect(page.getByText("Sealed and received.", { exact: true })).toBeVisible();
  return page.evaluate((): UIReceipt => {
    const id = new URL(location.href).searchParams.get("id");
    const receipt = JSON.parse(localStorage.getItem(`sv-receipt:${id}`) ?? "null");
    if (!receipt || typeof receipt.reportId !== "string" || typeof receipt.alias !== "string"
      || typeof receipt.digest !== "string" || typeof receipt.councilUnlockAt !== "number") {
      throw new Error("The submitted form did not persist a complete receipt");
    }
    return {
      reportId: receipt.reportId, alias: receipt.alias,
      digest: receipt.digest, councilUnlockAt: receipt.councilUnlockAt,
    };
  });
}

test("US1 UI: Mai submits the form, retains a receipt and can download it", async ({ page }): Promise<void> => {
  const receipt = await fileReport(page);
  await expect(page.getByText(receipt.alias, { exact: true })).toBeVisible();
  await expect(page.getByText(receipt.digest, { exact: true })).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download receipt" }).click();
  const download = await downloadEvent;
  const file = await download.path();
  if (!file) throw new Error("Receipt download was not saved");
  const text = await readFile(file, "utf8");
  expect(text).toContain(`Report: ${receipt.alias}`);
  expect(text).toContain(`Digest: ${receipt.digest}`);
  await page.reload();
  await expect(page.getByText(receipt.alias, { exact: true })).toBeVisible();
  const rows = await page.evaluate(() => localStorage.getItem("sv-mock-rows"));
  expect(rows).not.toContain(draft.description);
  expect(rows).not.toContain(reporterName);
  // Mock mode has no real POST. HTTP credential/ciphertext enforcement needs live tests.
});

test("US2 UI: Lan opens content while the reporter stays sealed", async ({ page }): Promise<void> => {
  const receipt = await fileReport(page);
  await page.goto("/investigator");
  await choosePersona(page, "lan");
  const card = page.getByRole("article", { name: `Report ${receipt.alias}`, exact: true });
  await card.getByRole("button", { name: "Open report", exact: true }).click();
  await expect(card.getByText(draft.description, { exact: true })).toBeVisible();
  await expect(card.getByText(draft.evidence ?? "", { exact: true })).toBeVisible();
  await expect(card.getByRole("alert")).toContainText("[SIMULATED] Forseti: executor lacks realm role 'identity-guardian'");
  await expect(card.getByText(reporterName, { exact: true })).toHaveCount(0);
});

test("US3 UI: Minh verifies the student while content remains closed", async ({ page }): Promise<void> => {
  const receipt = await fileReport(page);
  await page.goto("/guardian");
  await choosePersona(page, "minh");
  const card = page.getByRole("article", { name: `Report ${receipt.alias}`, exact: true });
  await card.getByRole("button", { name: "Verify reporter", exact: true }).click();
  await expect(card.getByText(reporterName, { exact: true })).toBeVisible();
  await expect(card.getByText(`a verified student filed ${receipt.alias}.`, { exact: false })).toBeVisible();
  await expect(card.getByRole("alert")).toContainText("[SIMULATED] Forseti: executor lacks realm role 'investigator'");
  await expect(card.getByText(draft.description, { exact: true })).toHaveCount(0);
});

test("US4 UI: Hung's four insider actions show the simulated limits", async ({ page }): Promise<void> => {
  const receipt = await fileReport(page);
  await page.goto("/dean");
  await choosePersona(page, "hung");
  await page.getByLabel("Report to attack", { exact: true }).selectOption(receipt.reportId);
  await page.getByRole("region", { name: "Attack 1: Inspect database", exact: true }).getByRole("button", { name: "Run attack 1", exact: true }).click();
  const rows = page.getByRole("region", { name: "Raw database rows", exact: true });
  await expect(rows).toContainText(receipt.alias);
  await expect(rows).not.toContainText(draft.description);
  await expect(rows).not.toContainText(reporterName);
  await page.getByRole("region", { name: "Attack 2: Reveal reporter", exact: true }).getByRole("button", { name: "Run attack 2", exact: true }).click();
  await expect(page.getByText("Reporter stays hidden", { exact: true })).toBeVisible();
  await expect(page.getByText("[SIMULATED] Forseti: executor lacks realm role 'identity-guardian'", { exact: true })).toBeVisible();
  await page.getByRole("region", { name: "Attack 3: Add me as investigator", exact: true }).getByRole("button", { name: "Run attack 3", exact: true }).click();
  await expect(page.getByText("HTTP 202", { exact: true })).toBeVisible();
  await expect(page.getByText("Requested, not granted", { exact: true })).toBeVisible();
  await expect(page.getByText("[SIMULATED] Change request parked: grant 'investigator' to dr.hung needs 2 of 3 admins", { exact: true })).toBeVisible();
  await page.getByRole("region", { name: "Attack 4: Bury the report", exact: true }).getByRole("button", { name: "Run attack 4", exact: true }).click();
  await expect(page.getByText("[SIMULATED] Forseti: executor lacks realm role 'council'", { exact: true })).toBeVisible();
  // The countdown is simulated access timing; it does not prove deletion prevention.
  await page.goto("/investigator");
  await page.getByRole("button", { name: "Open report", exact: true }).click();
  await expect(page.getByText("[SIMULATED] Forseti: executor lacks realm role 'investigator'", { exact: true })).toBeVisible();
  await expect(page.getByText(draft.description, { exact: true })).toHaveCount(0);
});

test("US5 UI: council is refused before unlock and opens the same report afterward", async ({ page }): Promise<void> => {
  const receipt = await fileReport(page);
  await page.clock.setFixedTime(new Date((receipt.councilUnlockAt - 1) * 1000));
  await page.goto("/council");
  await choosePersona(page, "council");
  const card = page.getByRole("article", { name: `Report ${receipt.alias}`, exact: true });
  await card.getByRole("button", { name: /Open council copy/ }).click();
  await expect(card.getByRole("alert")).toContainText(`[SIMULATED] Time lock preventing decryption until ${receipt.councilUnlockAt}`);
  await expect(card.getByText(draft.description, { exact: true })).toHaveCount(0);
  await page.clock.setFixedTime(new Date(receipt.councilUnlockAt * 1000));
  await card.getByRole("button", { name: /Open council copy/ }).click();
  await expect(card.getByText(draft.description, { exact: true })).toBeVisible();
  await expect(card.getByText(draft.evidence ?? "", { exact: true })).toBeVisible();
});
