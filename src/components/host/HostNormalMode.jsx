import React from "react";
import QuestionSelector from "../questions/QuestionSelector";
import QuestionPanel from "../questions/QuestionPanel";

export default function HostNormalMode({ subjects, currentSubjectId, onSelectSubject, questionSlots, onSelectQuestion, currentQuestion, onDecision, busy }) {
  return (
    <div className="host-normal-layout">
      <div className="card host-subject-panel">
        <h4 style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: 12 }}>SELECT SUBJECT</h4>
        <div className="host-subject-row">
          {subjects.map((s) => {
            const disabled = s.status === "DISABLED";
            const active = s.id === currentSubjectId;
            return (
              <button
                key={s.id}
                disabled={disabled}
                onClick={() => onSelectSubject(s.id)}
                className={`btn host-subject-button ${active ? "is-active" : ""}`}
                style={{ background: active ? "var(--blue-primary)" : "var(--bg-card-elevated)", color: active ? "#fff" : disabled ? "var(--text-disabled)" : "var(--text-main)", border: "1px solid var(--border-color)", opacity: disabled ? 0.5 : 1 }}
              >
                {compactSubjectName(s)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="host-question-area">
        {currentSubjectId ? <QuestionSelector slots={questionSlots} onSelect={onSelectQuestion} columns={10} /> : <div className="card host-empty-question">Select a subject to load its questions.</div>}
        <QuestionPanel question={currentQuestion} onDecision={onDecision} busy={busy} />
      </div>
    </div>
  );
}

function compactSubjectName(subject) {
  if (subject.code) return subject.code;
  const name = subject.name;
  const words = name.trim().split(/\s+/);
  return words.length > 1 ? `${words[0][0]}/${words.slice(1).join(" ").toLowerCase()}` : name;
}
