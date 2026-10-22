// Pure registry of in-flight Tide operations, so a forced re-login can reject them instead of killing the page silently.
const pending = new Set<(e: Error) => void>();

/** Rejects if rejectAllPending() is called while `p` is in flight. */
export function raceForcedRelogin<T>(p: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    pending.add(reject);
    p.then(resolve, reject).finally(() => pending.delete(reject));
  });
}

export function rejectAllPending(err: Error): number {
  const n = pending.size;
  pending.forEach((reject) => reject(err));
  pending.clear();
  return n;
}

/** Prefix an error with the failing step name, keeping the underlying message verbatim. */
export async function inStep<T>(name: string, fn: () => Promise<T>): Promise<T> {
  try { return await fn(); } catch (e) { throw new Error(`${name}: ${String((e as any)?.message ?? e)}`); }
}
