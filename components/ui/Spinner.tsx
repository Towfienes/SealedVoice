"use client";
import { useVault } from "@/lib/vault";

export function Spinner() {
  return <span className="sv-spinner" aria-hidden="true" />;
}

/** Step label for any button that is waiting on the vault. */
export function useWaitLabel() {
  const vault = useVault();
  return vault.mode === "tide" ? "Waiting for Tide enclave…" : "Checking (simulated)…";
}

/** Button face while busy: spinner + label. Callers also set disabled and aria-busy. */
export function BusyLabel({ label }: { label?: string }) {
  const wait = useWaitLabel();
  return (
    <>
      <Spinner />
      <span>{label ?? wait}</span>
    </>
  );
}
