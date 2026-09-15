import React from "react";

export default function AnswerOptions({ question, size = "normal", revealCorrect = false }) {
  if (!question) return null;
  const big = size === "large";

  if (question.mode === "MULTIPLE_CHOICE") {
    const options = [
      ["A", question.optionA],
      ["B", question.optionB],
      ["C", question.optionC],
      ["D", question.optionD],
    ];
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: big ? 16 : 10 }}>
        {options.map(([letter, text]) => {
          const isCorrect = revealCorrect && question.correctAnswer === letter;
          return (
            <div
              key={letter}
              className="card-elevated"
              style={{
                padding: big ? "18px 20px" : "10px 14px",
                fontSize: big ? 20 : 14,
                borderColor: isCorrect ? "var(--success)" : "var(--border-color)",
              }}
            >
              <strong style={{ marginRight: 8 }}>{letter}.</strong> {text}
            </div>
          );
        })}
      </div>
    );
  }

  if (question.mode === "TRUE_FALSE") {
    return (
      <div style={{ display: "flex", gap: big ? 16 : 10 }}>
        {["TRUE", "FALSE"].map((val) => (
          <div
            key={val}
            className="card-elevated"
            style={{
              flex: 1,
              textAlign: "center",
              padding: big ? "18px 0" : "10px 0",
              fontSize: big ? 20 : 14,
              fontWeight: 700,
              borderColor: revealCorrect && question.correctAnswer === val ? "var(--success)" : "var(--border-color)",
            }}
          >
            {val === "TRUE" ? "TRUE" : "FALSE"}
          </div>
        ))}
      </div>
    );
  }

  return (
    <p style={{ fontSize: big ? 18 : 14, fontStyle: "italic" }}>
      Open response — the host records correctness after the student answers verbally.
    </p>
  );
}
