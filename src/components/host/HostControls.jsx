import React, { useEffect, useRef } from "react";
import { useLiveCountdown } from "../common/useLiveCountdown";

export default function HostControls({ timer, onExpire }) {
  const displayRemaining = useLiveCountdown(timer);
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
  }, [timer.state, timer.durationSeconds]);

  useEffect(() => {
    if (timer.state === "RUNNING" && displayRemaining <= 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpire?.();
    }
  }, [displayRemaining, onExpire, timer.state]);

  const pct = timer.durationSeconds ? Math.max(0, (displayRemaining / timer.durationSeconds) * 100) : 0;
  const low = displayRemaining <= 10;
  const ringColor = low ? "var(--danger)" : "var(--blue-highlight)";

  return (
    <div
      className="card host-controls"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 12,
        padding: "10px 12px",
        width: "fit-content",
        marginLeft: "auto",
        maxWidth: "100%",
      }}
    >
      <div
        aria-label={`Time remaining ${Math.ceil(displayRemaining)} seconds`}
        title={`${Math.ceil(displayRemaining)} seconds remaining`}
        style={{
          width: 46,
          height: 46,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: `conic-gradient(${ringColor} ${pct}%, rgba(148, 163, 184, 0.18) 0)`,
          boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06)`,
          flex: "0 0 auto",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "rgba(2, 6, 23, 0.96)",
            fontSize: 11,
            fontWeight: 800,
            color: low ? "var(--danger)" : "var(--text-main)",
            border: "1px solid rgba(148, 163, 184, 0.24)",
          }}
        >
          {Math.ceil(displayRemaining)}
        </div>
      </div>
    </div>
  );
}
