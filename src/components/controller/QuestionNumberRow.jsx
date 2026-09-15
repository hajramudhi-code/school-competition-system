import React from "react";

export default function QuestionNumberRow({ slots = [], selectedQuestionId }) {
  return (
    <div className="controller-question-row" aria-label="Questions">
      {slots.map((slot) => {
        const selected = slot.questionId === selectedQuestionId || slot.status === "SELECTED";
        const disabled = selected || slot.status !== "AVAILABLE";
        return (
          <button
            key={slot.questionId}
            type="button"
            disabled={disabled}
            aria-label={`Question ${String(slot.slot).padStart(2, "0")}${disabled ? " unavailable" : " available"}`}
            className={`controller-question-number ${selected ? "is-selected" : ""} ${disabled ? "is-unavailable" : ""}`}
          >
            {String(slot.slot).padStart(2, "0")}
          </button>
        );
      })}
    </div>
  );
}
