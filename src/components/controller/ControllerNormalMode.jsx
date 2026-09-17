import React from "react";
import AnswerOptions from "../questions/AnswerOptions";

export default function ControllerNormalMode({ currentQuestion, timer, lastResult }) {
  const toneClass = lastResult?.result === "CORRECT" ? "has-result-correct" : lastResult?.result === "INCORRECT" ? "has-result-incorrect" : "";

  return (
    <div className={`controller-question-stage ${currentQuestion ? "has-question" : ""}`}>
      {currentQuestion ? (
        <div className={`controller-question-overlay ${toneClass}`}>
          <div className="controller-question-content">
            <p style={{ fontSize: 26, color: "var(--text-main)", lineHeight: 1.4 }}>{currentQuestion.text}</p>
            {currentQuestion.mode !== "MENTION" && <AnswerOptions question={currentQuestion} size="large" />}
            {timer && timer.state !== "IDLE" && <TimerBar timer={timer} toneClass={toneClass} />}
          </div>
        </div>
      ) : (
        <div className="controller-waiting card">
          Waiting for the next question...
        </div>
      )}
    </div>
  );
}

function TimerBar({ timer, toneClass }) {
  const pct = timer.durationSeconds ? Math.max(0, (timer.remainingSeconds / timer.durationSeconds) * 100) : 0;
  const accent = toneClass === "has-result-correct" ? "var(--success)" : toneClass === "has-result-incorrect" ? "var(--danger)" : timer.remainingSeconds <= 10 ? "var(--danger)" : "var(--blue-highlight)";

  return (
    <div style={{ width: "100%" }}>
      <div style={{ height: 14, borderRadius: 999, background: "var(--bg-card-elevated)", overflow: "hidden", border: "1px solid var(--border-color)" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: accent,
            transition: "width 1s linear",
          }}
        />
      </div>
    </div>
  );
}
