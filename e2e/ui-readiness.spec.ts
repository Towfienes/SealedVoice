import { test, expect } from "@playwright/test";

test("SealedVoice routes and visible mock label are integrated", async ({ page, request }): Promise<void> => {
  // This must fail on the Forseti bootstrap. Do not silently skip missing UI.
  for (const route of ["/report", "/receipt", "/investigator", "/guardian", "/dean", "/council", "/how-it-works"]) {
    const response = await request.get(route);
    expect.soft(response.status(), `${route} must exist before UI acceptance can run`).toBe(200);
  }
  await page.goto("/");
  await expect(page.getByText(/SIMULATED/).first(), "mock mode must be visibly labelled").toBeVisible();
});
