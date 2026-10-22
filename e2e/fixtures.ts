import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { test as base, expect } from "@playwright/test";
import type { Receipt, ReportDraft, ReporterIdentity } from "../lib/vault/types";

type MockModule = typeof import("../lib/vault/mock");

declare global {
  interface Window {
    sealedVoice: MockModule;
  }
}

interface Fixtures {
  mockBrowser: void;
  sealedReport: Receipt;
}

export const draft: ReportDraft = {
  title: "Synthetic grade pressure report",
  category: "grade-for-favours",
  accused: "Synthetic lecturer, Engineering",
  description: "A fictional lecturer requested a favour before releasing a grade.",
  evidence: "Synthetic evidence reference SV-TEST-001",
};

export const identity: ReporterIdentity = {
  fullName: "Mai Synthetic Student",
  studentId: "SV-TEST-001",
  email: "mai@sealedvoice.test",
  faculty: "Engineering",
};

export const test = base.extend<Fixtures>({
  mockBrowser: [async ({ page }, use): Promise<void> => {
    // Load the actual mock implementation into a real browser. This harness
    // deliberately makes no claim to test the not-yet-integrated app UI or HTTP API.
    const source = readFileSync(path.resolve("lib/vault/mock.ts"), "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 },
    });
    await page.route("**/__e2e__/vault-harness", async (route): Promise<void> => {
      await route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><html lang='en'><title>Mock vault test harness</title><body></body></html>",
      });
    });
    await page.goto("/__e2e__/vault-harness");
    await page.evaluate(async (javascript: string): Promise<void> => {
      const url = URL.createObjectURL(new Blob([javascript], { type: "text/javascript" }));
      try {
        window.sealedVoice = await import(url);
      } finally {
        URL.revokeObjectURL(url);
      }
    }, outputText);
    await use();
  }, { auto: true }],
  sealedReport: async ({ page }, use): Promise<void> => {
    const receipt = await page.evaluate(async ({ draft, identity }): Promise<Receipt> => {
      const { mockVault, setMockPersona } = window.sealedVoice;
      setMockPersona("mai");
      return mockVault.sealReport(draft, identity, { councilDelaySec: 180 });
    }, { draft, identity });
    await use(receipt);
  },
});

export { expect };
