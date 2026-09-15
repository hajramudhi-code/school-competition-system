import React from "react";
import { StatusBadge } from "../common/index.jsx";

export default function MatchCard({ match, schoolAName, schoolBName, onEditDate }) {
  return (
    <div className="card fixture-match-card" style={{ padding: 14, minWidth: 220 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{match.matchLabel}</span>
        <StatusBadge status={match.status} />
      </div>
      <div style={{ fontSize: 14, marginBottom: 6 }}>
        <strong>{schoolAName || "TBD"}</strong> vs <strong>{schoolBName || "TBD"}</strong>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {match.date} · {match.day}
        </span>
        {onEditDate && (
          <button className="btn btn-ghost" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => onEditDate(match)}>
            Edit date
          </button>
        )}
      </div>
    </div>
  );
}
