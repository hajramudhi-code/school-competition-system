import { useEffect, useRef, useState } from "react";

function normalizeSeconds(value) {
  return Math.max(0, Number(value) || 0);
}

export function useLiveCountdown(timer) {
  const initialRemaining = normalizeSeconds(timer?.remainingSeconds);
  const [remaining, setRemaining] = useState(initialRemaining);
  const syncRef = useRef({ remaining: initialRemaining, syncedAt: Date.now() });

  useEffect(() => {
    const nextRemaining = normalizeSeconds(timer?.remainingSeconds);
    syncRef.current = { remaining: nextRemaining, syncedAt: Date.now() };
    setRemaining(nextRemaining);
  }, [timer?.remainingSeconds, timer?.state]);

  useEffect(() => {
    if (timer?.state !== "RUNNING") return undefined;
    const intervalId = setInterval(() => {
      const elapsed = (Date.now() - syncRef.current.syncedAt) / 1000;
      setRemaining(Math.max(0, syncRef.current.remaining - elapsed));
    }, 100);
    return () => clearInterval(intervalId);
  }, [timer?.state]);

  return remaining;
}
