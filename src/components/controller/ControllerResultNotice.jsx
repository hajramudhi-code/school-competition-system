import React from "react";

export default function ControllerResultNotice({ question, lastResult }) {
  if (!question || !lastResult) return null;

  const result = String(lastResult.result || "").toUpperCase();
  const isCorrect = result === "CORRECT";
  const answer = lastResult.correctAnswer ?? question.correctAnswer;
  const answerLabel = question.mode === "MULTIPLE_CHOICE" && answer
    ? `${answer}. ${question[`option${answer}`] || ""}`
    : answer;

  return (
    <div className={`controller-result-notice ${isCorrect ? "is-correct" : "is-incorrect"}`} role="status" aria-live="polite">
      <strong>{isCorrect ? "CORRECT" : "INCORRECT"}</strong>
      {answerLabel && (
        <span>
          Correct answer: <b>{answerLabel}</b>
        </span>
      )}
    </div>
  );
}
