import React from "react";

export default function ScoreBoard({ schoolA, schoolB, currentSchoolId, questionsAnsweredInTurn, questionMode, onSelectSchool, size = "normal" }) {
  const big = size === "large";
  return (
    <div className={`host-scoreboard ${big ? "host-scoreboard-large" : ""}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: big ? 48 : 28 }}>
      <SchoolBlock school={schoolA} active={currentSchoolId === schoolA?.id} currentSchoolId={currentSchoolId} big={big} side="left" questionsAnsweredInTurn={questionsAnsweredInTurn} questionMode={questionMode} onSelectSchool={onSelectSchool} />
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--text-muted)", fontSize: big ? 28 : 18 }}>
        VS
      </div>
      <SchoolBlock school={schoolB} active={currentSchoolId === schoolB?.id} currentSchoolId={currentSchoolId} big={big} side="right" align="right" questionsAnsweredInTurn={questionsAnsweredInTurn} questionMode={questionMode} onSelectSchool={onSelectSchool} />
    </div>
  );
}

function SchoolBlock({ school, active, currentSchoolId, big, align = "left", side, questionsAnsweredInTurn, questionMode, onSelectSchool }) {
  if (!school) return <div style={{ width: big ? 220 : 140 }} />;
  const turnLimit = questionMode === "VIDEO" ? 1 : 5;
  const locked = !active && currentSchoolId && questionsAnsweredInTurn < turnLimit;
  if (big) {
    return (
      <div className={`controller-score-school controller-score-school-${side} ${active ? "is-active" : ""}`}>
        <span className="controller-score-school-name">{school.name}</span>
        <span className="controller-score-value">{String(school.score).padStart(3, "0")}</span>
      </div>
    );
  }
  return (
    <div className={`host-school-block host-school-${side}`} style={{ textAlign: align === "right" ? "right" : "left", minWidth: big ? 220 : 140 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
        {school.logoUrl && (
          <img src={school.logoUrl} alt="" width={big ? 44 : 28} height={big ? 44 : 28} style={{ borderRadius: 8, order: align === "right" ? 2 : 0 }} />
        )}
        {onSelectSchool && side === "right" && (
          <button
            className={`school-toggle ${active ? "school-toggle-on" : "school-toggle-off"}`}
            onClick={() => onSelectSchool(school.id)}
            disabled={active || locked}
            title={locked ? `Available after ${turnLimit} question${turnLimit === 1 ? "" : "s"}` : active ? "Current school" : "Select school"}
          >
            {active ? "ON" : "OFF"}
          </button>
        )}
        <span
          style={{
            fontSize: big ? 22 : 15,
            fontWeight: 700,
            color: active ? "var(--blue-highlight)" : "var(--text-main)",
          }}
        >
          {school.name}
        </span>
        {onSelectSchool && side === "left" && (
          <button
            className={`school-toggle ${active ? "school-toggle-on" : "school-toggle-off"}`}
            onClick={() => onSelectSchool(school.id)}
            disabled={active || locked}
            title={locked ? `Available after ${turnLimit} question${turnLimit === 1 ? "" : "s"}` : active ? "Current school" : "Select school"}
          >
            {active ? "ON" : "OFF"}
          </button>
        )}
      </div>
      <div
        className={`school-score ${side === "left" ? "school-score-a" : "school-score-b"}`}
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: big ? 64 : 36,
          color: "var(--text-main)",
          lineHeight: 1,
          marginTop: 6,
        }}
      >
        {String(school.score).padStart(3, "0")}
      </div>
      <div style={{ fontSize: big ? 13 : 11, color: "var(--text-muted)", letterSpacing: "0.05em" }}>POINTS</div>
    </div>
  );
}
