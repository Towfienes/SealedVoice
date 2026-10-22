export const fmtTime = (epochSec: number) =>
  new Date(epochSec * 1000).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "medium" });

export const shorten = (s: string, n = 28) => (s.length > n ? `${s.slice(0, n)}…` : s);

export const fmtDuration = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(r).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};
