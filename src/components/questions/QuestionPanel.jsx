import React from "react";
export default function QuestionPanel({ question, onDecision, onClose, busy, result }) {
  if (!question) {
    return (
      <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 180, color: "var(--text-muted)", textAlign: "center" }}>
        Select a question slot to begin the round.
      </div>
    );
  }

  const correctLabel =
    question.mode === "MULTIPLE_CHOICE"
      ? `${question.correctAnswer}. ${question[`option${question.correctAnswer}`]}`
      : question.correctAnswer;

  const revealed = result?.questionId === question.id;

  return (
    <div className="host-question-overlay-backdrop" role="presentation">
      <section className="card host-question-overlay" role="dialog" aria-modal="true" aria-label="Selected question">
        <button type="button" className="btn btn-ghost host-question-close" onClick={onClose} aria-label="Close question" title="Close question">
          <i className="fas fa-xmark" aria-hidden="true" />
        </button>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>QUESTION ({question.marks} marks)</span>
            <p style={{ color: "var(--text-main)", fontSize: 16, marginTop: 4 }}>{question.text}</p>
          </div>
          {revealed ? (
            <div className="card-elevated" style={{ padding: 12 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>CORRECT ANSWER</span>
              <p style={{ color: "var(--success)", fontWeight: 700, marginTop: 4 }}>{correctLabel}</p>
            </div>
          ) : (
            <button className="btn btn-success" style={{ padding: "14px 0", fontSize: 15 }} disabled={busy} onClick={() => onDecision("CORRECT")}>
              <i className="fas fa-check" aria-hidden="true" /> CORRECT
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
