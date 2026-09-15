import React from "react";
import { QUESTIONS_PER_TURN, VIDEO_QUESTIONS_PER_TURN } from "../../constants/status";

export default function SchoolSelector({ schoolA, schoolB, currentSchoolId, questionsAnsweredInTurn, questionMode, onSelect }) {
  const turnLimit = questionMode === "VIDEO" ? VIDEO_QUESTIONS_PER_TURN : QUESTIONS_PER_TURN;

  return (
    <div className="card school-selector" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h4 style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: "0.05em" }}>SELECT SCHOOL / TURN</h4>
      {[schoolA, schoolB].map((school) => {
        if (!school) return null;
        const isCurrent = school.id === currentSchoolId;
        const locked = !isCurrent && questionsAnsweredInTurn < turnLimit;
        return (
          <button
            key={school.id}
            onClick={() => onSelect(school.id)}
            disabled={locked}
            className="btn"
            style={{
              justifyContent: "space-between",
              padding: "12px 14px",
              background: isCurrent ? "var(--blue-primary)" : "var(--bg-card-elevated)",
              color: isCurrent ? "#fff" : locked ? "var(--text-disabled)" : "var(--text-main)",
              border: "1px solid " + (isCurrent ? "var(--blue-primary)" : "var(--border-color)"),
              opacity: locked ? 0.6 : 1,
              cursor: locked ? "not-allowed" : "pointer",
            }}
          >
            <span>{school.name}</span>
            <span style={{ fontSize: 12 }}>
              {isCurrent ? `Q${Math.min(questionsAnsweredInTurn + 1, turnLimit)}/${turnLimit}` : locked ? "🔒 Locked" : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
