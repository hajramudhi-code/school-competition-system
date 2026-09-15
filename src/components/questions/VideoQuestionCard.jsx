import React from "react";

const STATE_STYLES = {
  AVAILABLE: { background: "var(--bg-card-elevated)", color: "var(--text-main)", border: "1px solid var(--border-color)", opacity: 1 },
  SELECTED: { background: "var(--bg-card-elevated)", color: "var(--text-main)", border: "1px solid var(--border-color)", opacity: 1 },
  COMPLETED: { background: "var(--bg-secondary)", color: "var(--text-disabled)", border: "1px solid var(--border-color)", opacity: 1 },
  DISABLED: { background: "var(--bg-secondary)", color: "var(--text-disabled)", border: "1px solid var(--border-color)", opacity: 1 },
};

export default function VideoQuestionCard({ question, slot, status, onSelect }) {
  const style = STATE_STYLES[status] || STATE_STYLES.AVAILABLE;
  const disabled = status !== "AVAILABLE";
  const unavailable = status === "COMPLETED" || status === "DISABLED";
  return (
    <button
      onClick={() => onSelect(question.id)}
      disabled={disabled}
      className={`card-elevated host-video-card ${status === "SELECTED" ? "is-selected" : ""} ${unavailable ? "is-unavailable" : ""}`}
      style={{
        ...style,
        padding: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        minWidth: 0,
        width: "100%",
      }}
    >
      <span className="host-video-card-image">
        <img src={question.personImageUrl} alt="" width={28} height={28} />
        {unavailable && <span className="host-video-card-status">UNAVAILABLE</span>}
      </span>
      <span style={{ fontSize: 10, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.2, overflowWrap: "anywhere" }}>{question.personName}</span>
      <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700 }}>Q{String(slot).padStart(2, "0")}</span>
    </button>
  );
}
