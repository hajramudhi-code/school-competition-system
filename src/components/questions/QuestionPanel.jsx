import React from "react";
export default function QuestionPanel({ question, onDecision, busy }) {
  if (!question) return null;

  const correctLabel =
    question.mode === "MULTIPLE_CHOICE"
      ? `${question.correctAnswer}. ${question[`option${question.correctAnswer}`]}`
      : question.correctAnswer;

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>QUESTION ({question.marks} marks)</span>
        <p style={{ color: "var(--text-main)", fontSize: 16, marginTop: 4 }}>{question.text}</p>
      </div>
      <div className="card-elevated" style={{ padding: 12 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>CORRECT ANSWER</span>
        <p style={{ color: "var(--success)", fontWeight: 700, marginTop: 4 }}>{correctLabel}</p>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button className="btn btn-success" style={{ flex: 1, padding: "14px 0", fontSize: 15 }} disabled={busy} onClick={() => onDecision("CORRECT")}>
          <i className="fas fa-check" aria-hidden="true" /> CORRECT
        </button>
        <button className="btn btn-danger" style={{ flex: 1, padding: "14px 0", fontSize: 15 }} disabled={busy} onClick={() => onDecision("INCORRECT")}>
          <i className="fas fa-xmark" aria-hidden="true" /> INCORRECT
        </button>
      </div>
    </div>
  );
}
