"use client";
// Single entry point for the UI. NEXT_PUBLIC_VAULT=mock (default until tide.ts lands) | tide
// WT-A replaces the tide branch below with a hook-based vault built on useAuth() (components/AuthProvider.tsx).
import { mockVault } from "./mock";
import type { Vault } from "./types";

export * from "./types";
export { MOCK_PERSONAS, setMockPersona } from "./mock";

export const VAULT_MODE: "mock" | "tide" = process.env.NEXT_PUBLIC_VAULT === "tide" ? "tide" : "mock";

/** UI calls this. In tide mode WT-A swaps in useTideVault() from ./tide. */
export function useVault(): Vault {
  return mockVault;
}
