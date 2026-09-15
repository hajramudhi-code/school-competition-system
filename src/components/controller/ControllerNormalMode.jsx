import React from "react";
import AnswerOptions from "../questions/AnswerOptions";

export default function ControllerNormalMode({ currentQuestion, timer }) {
  return (
    <div className={`controller-question-stage ${currentQuestion ? "has-question" : ""}`}>
      {currentQuestion ? (
        <div className="controller-question-overlay">
          <div className="controller-question-content">
            <p style={{ fontSize: 26, color: "var(--text-main)", lineHeight: 1.4 }}>{currentQuestion.text}</p>
            {currentQuestion.mode !== "MENTION" && <AnswerOptions question={currentQuestion} size="large" />}
            {timer && timer.state !== "IDLE" && <TimerBar timer={timer} />}
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

function TimerBar({ timer }) {
  const pct = timer.durationSeconds ? Math.max(0, (timer.remainingSeconds / timer.durationSeconds) * 100) : 0;
  return (
    <div style={{ width: "100%" }}>
      <div style={{ height: 14, borderRadius: 999, background: "var(--bg-card-elevated)", overflow: "hidden", border: "1px solid var(--border-color)" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: timer.remainingSeconds <= 10 ? "var(--danger)" : "var(--blue-highlight)",
            transition: "width 1s linear",
          }}
        />
      </div>
    </div>
  );
}
