import React, { useEffect, useState } from "react";
import { dashboardApi } from "../../api/competitionsApi";
import { LoadingState, ErrorState, StatusBadge, usePolling } from "../../components/common/index.jsx";

const STAT_CARDS = [
  ["Total Schools", "totalSchools"],
  ["Enabled Schools", "enabledSchools"],
  ["Total Subjects", "totalSubjects"],
  ["Enabled Subjects", "enabledSubjects"],
  ["Total Questions", "totalQuestions"],
  ["Video Questions", "videoQuestions"],
  ["Upcoming Matches", "upcomingMatches"],
  ["Completed Matches", "completedMatches"],
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    setError(null);
    dashboardApi
      .getAdminSummary()
      .then(setData)
      .catch((e) => setError(e.message));
  }
  usePolling(load);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <LoadingState label="Loading dashboard..." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        {STAT_CARDS.map(([label, key]) => (
          <div key={key} className="card">
            <p style={{ fontSize: 13, marginBottom: 8 }}>{label}</p>
            <h2 style={{ fontSize: 30 }}>{data[key]}</h2>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Upcoming Matches</h3>
          {data.upcomingMatchList.length === 0 ? (
            <p>No upcoming matches scheduled.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
                  <th style={th}>Competition</th>
                  <th style={th}>Match</th>
                  <th style={th}>Schools</th>
                  <th style={th}>Date</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.upcomingMatchList.map((m, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--border-color)" }}>
                    <td style={td}>{m.competitionName}</td>
                    <td style={td}>{m.matchLabel}</td>
                    <td style={td}>
                      {m.schoolAName} vs {m.schoolBName}
                    </td>
                    <td style={td}>{m.date}</td>
                    <td style={td}>
                      <StatusBadge status={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Sponsor</h3>
          {data.sponsor ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {data.sponsor.logoUrl && <img src={data.sponsor.logoUrl} alt="" width={44} height={44} style={{ borderRadius: 8 }} />}
              <span>{data.sponsor.name}</span>
            </div>
          ) : (
            <p>No sponsor configured.</p>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Recent Results</h3>
          {data.recentResults.length === 0 ? (
            <p>No results recorded yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
                  <th style={th}>Match</th>
                  <th style={th}>Score</th>
                  <th style={th}>Winner</th>
                </tr>
              </thead>
              <tbody>
                {data.recentResults.map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--border-color)" }}>
                    <td style={td}>{r.matchLabel}</td>
                    <td style={td}>
                      {r.schoolAName} {r.schoolAScore} – {r.schoolBScore} {r.schoolBName}
                    </td>
                    <td style={td}>{r.winnerName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Competition Summary</h3>
          {data.competitionSummaries.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i > 0 ? "1px solid var(--border-color)" : "none" }}>
              {c.logoUrl && <img src={c.logoUrl} alt="" width={36} height={36} style={{ borderRadius: 8 }} />}
              <div>
                <p style={{ color: "var(--text-main)", fontWeight: 600, fontSize: 14 }}>{c.name}</p>
                <p style={{ fontSize: 12 }}>
                  {c.startDate} – {c.endDate} · Host: {c.hostName} · Controller: {c.controllerName}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const th = { padding: "8px 6px" };
const td = { padding: "10px 6px", color: "var(--text-secondary)" };
