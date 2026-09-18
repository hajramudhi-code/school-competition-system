import React, { useEffect, useState } from "react";

const STYLE_ID = "result-animation-keyframes";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes edge-flash-in {
      0% { opacity: 1; }
      70% { opacity: 0.55; }
      100% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

export default function ResultAnimation({ lastResult }) {
  const [visibleKey, setVisibleKey] = useState(null);

  useEffect(() => {
    if (!lastResult) return;
    const key = `${lastResult.questionId}-${lastResult.timestamp}`;
    setVisibleKey(key);
    const t = setTimeout(() => setVisibleKey((k) => (k === key ? null : k)), 3000);
    return () => clearTimeout(t);
  }, [lastResult?.questionId, lastResult?.timestamp]);

  if (!lastResult || !visibleKey) return null;
  const color = lastResult?.result === "CORRECT" ? "var(--success)" : "var(--danger)";

  return (
    <div
      key={visibleKey}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 50,
        boxShadow: `inset 0 0 0 14px ${color}, inset 0 0 120px 40px ${color}`,
        animation: "edge-flash-in 3s ease-out forwards",
      }}
    />
  );
}
