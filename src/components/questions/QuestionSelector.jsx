import React from "react";

const STATE_STYLES = {
  AVAILABLE: { background: "var(--bg-card-elevated)", color: "var(--text-main)", border: "1px solid var(--border-color)" },
  SELECTED: { background: "var(--blue-primary)", color: "#fff", border: "1px solid var(--blue-primary)" },
  COMPLETED: { background: "#64748b", color: "#e2e8f0", border: "1px solid #94a3b8" },
  DISABLED: { background: "#64748b", color: "#e2e8f0", border: "1px solid #94a3b8" },
};

export default function QuestionSelector({ slots = [], onSelect, columns = 5 }) {
  return (
    <div className="card question-selector" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h4 style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: 0 }}>SELECT QUESTION</h4>
      {slots.length ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: 8,
            width: "100%",
            maxWidth: 500,
            margin: "0 auto",
          }}
        >
          {slots.map((slot) => {
            const style = STATE_STYLES[slot.status] || STATE_STYLES.AVAILABLE;
            const disabled = slot.status !== "AVAILABLE";
            return (
              <button
                key={slot.questionId}
                onClick={() => onSelect(slot.questionId)}
                disabled={disabled}
                className="btn"
                style={{
                  ...style,
                  width: "100%",
                  minHeight: 58,
                  height: 58,
                  fontSize: "clamp(18px, 1.8vw, 24px)",
                  fontWeight: 700,
                  lineHeight: 1,
                  padding: 0,
                  cursor: disabled ? "not-allowed" : "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
                title={slot.status}
              >
                {String(slot.slot).padStart(2, "0")}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="question-selector-empty">No questions available for this subject.</p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: "var(--text-muted)" }}>
        <LegendDot color="var(--bg-card-elevated)" label="Available" />
        <LegendDot color="var(--blue-primary)" label="Selected" />
        <LegendDot color="var(--bg-secondary)" label="Completed" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color, border: "1px solid var(--border-color)" }} />
      {label}
    </span>
  );
}
