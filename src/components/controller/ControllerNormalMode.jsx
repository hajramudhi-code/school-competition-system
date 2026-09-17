import React, { useEffect, useState } from "react";
import AnswerOptions from "../questions/AnswerOptions";
import ControllerResultNotice from "./ControllerResultNotice";

export default function ControllerNormalMode({ currentQuestion, timer, lastResult }) {
  const [previousQuestion, setPreviousQuestion] = useState(null);
  const [visibleResultKey, setVisibleResultKey] = useState(null);

  useEffect(() => {
    if (currentQuestion) setPreviousQuestion(currentQuestion);
  }, [currentQuestion]);

  useEffect(() => {
    if (!lastResult) return undefined;
    const resultKey = `${lastResult.questionId}-${lastResult.timestamp}`;
    setVisibleResultKey(resultKey);
    const timeoutId = setTimeout(() => setVisibleResultKey((key) => (key === resultKey ? null : key)), 3000);
    return () => clearTimeout(timeoutId);
  }, [lastResult?.questionId, lastResult?.timestamp]);

  const resultKey = lastResult ? `${lastResult.questionId}-${lastResult.timestamp}` : null;
  const isResultVisible = visibleResultKey === resultKey && lastResult?.questionId === previousQuestion?.id;
  const displayedQuestion = currentQuestion || (isResultVisible ? previousQuestion : null);
  const toneClass = isResultVisible && lastResult.result === "CORRECT" ? "has-result-correct" : isResultVisible && lastResult.result === "INCORRECT" ? "has-result-incorrect" : "";

  return (
    <div className={`controller-question-stage ${displayedQuestion ? "has-question" : ""}`}>
      {displayedQuestion ? (
        <div className={`controller-question-overlay ${toneClass}`}>
          <div className="controller-question-content">
            {isResultVisible && <ControllerResultNotice question={displayedQuestion} lastResult={lastResult} />}
            <p style={{ fontSize: 26, color: "var(--text-main)", lineHeight: 1.4 }}>{displayedQuestion.text}</p>
            {displayedQuestion.mode !== "MENTION" && <AnswerOptions question={displayedQuestion} size="large" revealCorrect={isResultVisible} />}
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
