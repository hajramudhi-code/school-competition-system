import React, { useEffect, useState } from "react";
import { competitionsApi } from "../../api/competitionsApi";
import { LoadingState, ErrorState, EmptyState, usePolling } from "../../components/common/index.jsx";

export default function Results() {
  const [competitions, setCompetitions] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [results, setResults] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    competitionsApi
      .list({})
      .then((res) => {
        setCompetitions(res.data);
        if (res.data[0]) setSelectedId(res.data[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  usePolling(() => {
    if (!selectedId) return;
    competitionsApi
      .listResults(selectedId, {})
      .then((res) => setResults(Array.isArray(res.data) ? res.data : res.data?.data || []))
      .catch((e) => setError(e.message));
  }, 5000, [selectedId]);

  if (error) return <ErrorState message={error} />;
  if (!competitions) return <LoadingState label="Loading results..." />;

  return (
    <div>
      <label className="results-competition-picker">
        <span>Competition</span>
        <select className="input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
        {competitions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
        </select>
      </label>

      {results === undefined ? (
        <LoadingState label="Loading..." />
      ) : results.length === 0 ? (
        <EmptyState title="No results yet" description="Results will appear here once matches are finalized by the Host." />
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "var(--bg-card-elevated)" }}>
                <th style={th}>Match</th>
                <th style={th}>School A</th>
                <th style={th}>Score</th>
                <th style={th}>School B</th>
                <th style={th}>Winner</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.matchId} style={{ borderTop: "1px solid var(--border-color)" }}>
                  <td style={td}>{r.matchId}</td>
                  <td style={td}>{r.schoolA.name}</td>
                  <td style={td}>
                    {r.schoolA.score} – {r.schoolB.score}
                  </td>
                  <td style={td}>{r.schoolB.name}</td>
                  <td style={{ ...td, fontWeight: 600, color: "var(--success)" }}>
                    {r.winnerId === r.schoolA.id ? r.schoolA.name : r.schoolB.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = { padding: "12px 16px", fontSize: 12, color: "var(--text-muted)", fontWeight: 600 };
const td = { padding: "12px 16px" };
