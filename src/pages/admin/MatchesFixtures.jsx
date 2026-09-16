import React, { useEffect, useState } from "react";
import { competitionsApi } from "../../api/competitionsApi";
import { matchesApi } from "../../api/matchesApi";
import { schoolsApi } from "../../api/schoolsApi";
import { LoadingState, ErrorState, EmptyState, Modal, usePolling } from "../../components/common/index.jsx";
import FixtureBracket from "../../components/competition/FixtureBracket";

export default function MatchesFixtures() {
  const [competitions, setCompetitions] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [fixture, setFixture] = useState(null);
  const [matches, setMatches] = useState(null);
  const [schools, setSchools] = useState(null);
  const [error, setError] = useState(null);
  const [editMatch, setEditMatch] = useState(null);

  useEffect(() => {
    Promise.all([competitionsApi.list({}), schoolsApi.list({})])
      .then(([c, s]) => {
        setCompetitions(c.data);
        setSchools(s.data);
        if (c.data[0]) setSelectedId(c.data[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  function loadFixture(competitionId) {
    if (!competitionId) return;
    setError(null);
    Promise.all([
      competitionsApi.getFixture(competitionId).catch((e) => (e.status === 404 ? null : Promise.reject(e))),
      matchesApi.list({ competitionId }),
    ])
      .then(([f, m]) => {
        setFixture(f);
        setMatches(m.data);
      })
      .catch((e) => setError(e.message));
  }
  usePolling(() => loadFixture(selectedId), 5000, [selectedId]);

  function resolveSchoolName(id) {
    if (!id) return null;
    return schools?.find((s) => s.id === id)?.name;
  }

  if (error) return <ErrorState message={error} onRetry={() => loadFixture(selectedId)} />;
  if (!competitions || !schools) return <LoadingState label="Loading matches..." />;

  const mergedRounds = fixture?.rounds?.map((round) => ({
    ...round,
    matches: round.matches.map((m) => {
      const full = matches?.find((mm) => mm.id === m.matchId);
      return { ...m, ...full };
    }),
  }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <select className="input" style={{ width: 280 }} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {fixture === undefined || matches === undefined ? (
        <LoadingState label="Loading fixture..." />
      ) : !fixture ? (
        <EmptyState title="No fixture yet" description="Configure and generate matches from the Matches menu first." />
      ) : (
        <FixtureBracket rounds={mergedRounds} resolveSchoolName={resolveSchoolName} onEditDate={setEditMatch} />
      )}

      {editMatch && (
        <EditDateModal
          match={editMatch}
          competition={competitions.find((c) => c.id === selectedId)}
          onClose={() => setEditMatch(null)}
          onSaved={() => {
            setEditMatch(null);
            loadFixture(selectedId);
          }}
        />
      )}
    </div>
  );
}

function EditDateModal({ match, competition, onClose, onSaved }) {
  const [date, setDate] = useState(match.date);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await matchesApi.update(match.id, { date });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Edit Date — ${match.matchLabel}`} onClose={onClose} width={360}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label className="field-label">Match Date</label>
          <input
            className="input"
            type="date"
            value={date}
            min={competition?.startDate}
            max={competition?.endDate}
            onChange={(e) => setDate(e.target.value)}
          />
          <p style={{ fontSize: 12, marginTop: 6 }}>
            Must fall within {competition?.startDate} – {competition?.endDate}
          </p>
        </div>
        {error && <span className="field-error">{error}</span>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Saving..." : "Save"}
        </button>
      </form>
    </Modal>
  );
}
