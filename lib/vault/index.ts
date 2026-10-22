"use client";
// Single entry point for the UI. NEXT_PUBLIC_VAULT=mock (default until tide.ts lands) | tide
// WT-A replaces the tide branch below with a hook-based vault built on useAuth() (components/AuthProvider.tsx).
import { mockVault } from "./mock";
import { useTideVault } from "./tide";
import type { Vault } from "./types";

export * from "./types";
export { MOCK_PERSONAS, setMockPersona } from "./mock";

export const VAULT_MODE: "mock" | "tide" = process.env.NEXT_PUBLIC_VAULT === "tide" ? "tide" : "mock";

/** UI calls this. VAULT_MODE is a build-time constant, so the hook order never changes at runtime. */
export function useVault(): Vault {
  if (VAULT_MODE === "tide") return useTideVault();
  return mockVault;
}
