"use client";
import { useEffect, useState } from "react";
import { fmtDuration, fmtTime } from "./format";

/** Live countdown to an epoch-seconds instant. Announces only the state change, not every tick. */
export function Countdown({ unlockAt, big = false }: { unlockAt: number; big?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return <div className={`sv-countdown ${big ? "big" : ""}`}>--:--</div>;
  const left = unlockAt - now;
  const open = left <= 0;
  return (
    <div className={`sv-countdown ${big ? "big" : ""} ${open ? "is-open" : ""}`}>
      <span className="sv-countdown-digits" aria-hidden="true">{open ? "00:00" : fmtDuration(left)}</span>
      <span className="sv-countdown-label">
        {open ? "Time lock has passed. The council copy can be opened." : `until the council copy opens (${fmtTime(unlockAt)})`}
      </span>
      <span className="sv-sr" role="status">{open ? "Time lock has passed" : ""}</span>
    </div>
  );
}

export const useUnlocked = (unlockAt: number) => {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return now !== null && now >= unlockAt;
};
