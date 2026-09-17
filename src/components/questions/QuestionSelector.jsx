import React from "react";

const STATE_STYLES = {
  AVAILABLE: { background: "var(--bg-card-elevated)", color: "var(--text-main)", border: "1px solid var(--border-color)" },
  SELECTED: { background: "var(--blue-primary)", color: "#fff", border: "1px solid var(--blue-primary)" },
  COMPLETED: { background: "var(--bg-secondary)", color: "var(--text-disabled)", border: "1px solid var(--border-color)" },
  DISABLED: { background: "var(--bg-secondary)", color: "var(--text-disabled)", border: "1px solid var(--border-color)" },
};

export default function QuestionSelector({ slots = [], onSelect, columns = 10 }) {
  return (
    <div className="card question-selector">
      <h4 style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: 12 }}>SELECT QUESTION</h4>
      {slots.length ? (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 8 }}>
          {slots.map((slot) => {
          const style = STATE_STYLES[slot.status] || STATE_STYLES.AVAILABLE;
          const disabled = slot.status !== "AVAILABLE";
          return (
            <button
              key={slot.questionId}
              onClick={() => onSelect(slot.questionId)}
              disabled={disabled}
              className="btn"
              style={{ ...style, padding: "10px 0", fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer" }}
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
      <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
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
