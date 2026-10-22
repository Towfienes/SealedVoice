// A decrypt that does not throw is only "opened" if it yields the plaintext we sealed.
// Live finding: an investigator's identity decrypt returned without error but without identity fields,
// and the UI showed "Opened" with empty values. Anything that is not the sealed shape is reported as sealed.
import type { DenyReason } from "./vault/types.ts";

type Kind = "content" | "identity" | "council";
type Parsed = { ok: true; value: unknown } | { ok: false; reason: DenyReason; message: string };

const REQUIRED: Record<Kind, string[]> = {
  identity: ["fullName", "studentId"],
  content: ["title", "description"],
  council: ["title", "description"],
};

export function parseOpened(kind: Kind, text: string): Parsed {
  let value: unknown;
  try { value = JSON.parse(text); } catch { value = undefined; }
  const ok = !!value && typeof value === "object" && !Array.isArray(value)
    && REQUIRED[kind].every((k) => typeof (value as Record<string, unknown>)[k] === "string" && (value as Record<string, string>)[k] !== "");
  if (ok) return { ok: true, value };
  return {
    ok: false,
    reason: "role",
    message: `Tide did not release the ${kind} envelope for your role (decrypt returned no sealed data: ${JSON.stringify(text.slice(0, 60))}).`,
  };
}
