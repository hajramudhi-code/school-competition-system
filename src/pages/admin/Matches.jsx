import React, { useEffect, useMemo, useState } from "react";
import { competitionsApi } from "../../api/competitionsApi";
import { schoolsApi } from "../../api/schoolsApi";
import { LoadingState, ErrorState, EmptyState, usePolling, useToast } from "../../components/common/index.jsx";

const ROUND_OPTIONS = ["Round of 16", "Round of 8", "Quarterfinals", "Semifinals", "Final"];
export default function Matches() {
  const [competitions, setCompetitions] = useState(null);
  const [schools, setSchools] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [rounds, setRounds] = useState([]);
  const [generated, setGenerated] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  function loadCompetitions() {
    Promise.all([competitionsApi.list({}), schoolsApi.list({})])
      .then(async ([res, schoolResponse]) => {
        const details = await Promise.all(res.data.map((competition) => competitionsApi.get(competition.id)));
        setCompetitions(details);
        setSchools(schoolResponse.data);
        if (details.length && !details.some((competition) => competition.id === selectedId)) setSelectedId(details[0].id);
      })
      .catch((e) => setError(e.message));
  }
  usePolling(loadCompetitions);

  useEffect(() => {
    if (!selectedId) return;
    setRounds([]);
    setGenerated(null);
    competitionsApi.getFixture(selectedId)
      .then((fixture) => {
        setGenerated(fixture);
        setRounds(fixture.rounds?.map((round) => ({
          name: round.roundName,
          matchCount: round.matches.length,
          date: round.matches[0]?.date || "",
          day: round.matches[0]?.day || getDayName(round.matches[0]?.date),
        })) || []);
      })
      .catch((e) => {
        if (e.status !== 404) setError(e.message);
      });
  }, [selectedId]);

  const competition = useMemo(() => competitions?.find((item) => item.id === selectedId), [competitions, selectedId]);
  const schoolCount = competition?.schoolIds?.length || 0;

  function updateRound(index, field, value) {
    setRounds((current) => current.map((round, roundIndex) => {
      if (roundIndex !== index) return round;
      return field === "date" ? { ...round, date: value, day: getDayName(value) } : { ...round, [field]: value };
    }));
  }

  function addRound() {
    setRounds((current) => {
      const previousDate = current[current.length - 1]?.date;
      const date = previousDate ? addDays(previousDate, 1) : competition?.startDate || "";
      return [...current, { name: "Quarterfinals", matchCount: 1, date, day: getDayName(date) }];
    });
  }

  function removeRound(index) {
    setRounds((current) => current.filter((_, roundIndex) => roundIndex !== index));
  }

  async function generate(e) {
    e.preventDefault();
    setError(null);
    if (!selectedId) return setError("Select a competition first.");
    if (schoolCount < 2) return setError("The competition needs at least 2 participating schools.");
    if (!rounds.length) return setError("Add at least one round.");
    if (rounds.some((round) => !round.name || !round.date || !round.day || Number(round.matchCount) < 1 || Number(round.matchCount) > 4)) {
      return setError("Every round needs a name, date, day and between 1 and 4 matches.");
    }

    setBusy(true);
    try {
      const result = await competitionsApi.generateFixture(selectedId, {
        rounds: rounds.map((round) => ({ ...round, matchCount: Number(round.matchCount) })),
      });
      setGenerated(result);
      showToast("Matches generated", "success");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !competitions) return <ErrorState message={error} />;
  if (!competitions || !schools) return <LoadingState label="Loading match settings..." />;

  const resolveSchoolName = (id) => schools.find((school) => school.id === id)?.name || "TBD";

  return (
    <div className="matches-settings-page">
      <div className="admin-page-heading">
        <div>
          <h3>Match Settings & Schedule</h3>
          <p>Choose participating schools, rounds, match dates and the daily match limit.</p>
        </div>
      </div>

      <form className="card matches-settings-form" onSubmit={generate}>
        <div className="matches-settings-topline">
          <div>
            <label className="field-label">Competition</label>
            <select className="input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {competitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div className="matches-school-count">
            <span>Participating schools</span>
            <strong>{schoolCount}</strong>
          </div>
        </div>

        <div className="matches-round-heading">
          <div><h4>Round schedule</h4><p>Maximum 4 matches can be played on one date.</p></div>
          <button type="button" className="btn btn-secondary" onClick={addRound}>+ Add round</button>
        </div>

        <div className="matches-round-list">
          {rounds.map((round, index) => (
            <div className="matches-round-row" key={`${index}-${round.name}`}>
              <span className="matches-round-number">{index + 1}</span>
              <select className="input" value={round.name} onChange={(e) => updateRound(index, "name", e.target.value)}>
                {ROUND_OPTIONS.map((option) => <option key={option}>{option}</option>)}
              </select>
              <input className="input" type="number" min="1" max="4" value={round.matchCount} onChange={(e) => updateRound(index, "matchCount", e.target.value)} aria-label={`Matches in round ${index + 1}`} />
              <input className="input matches-date-input" type="date" value={round.date} min={competition?.startDate} max={competition?.endDate} onChange={(e) => updateRound(index, "date", e.target.value)} aria-label={`Date for round ${index + 1}`} />
              <input className="input" placeholder="Day e.g. MONDAY" value={round.day} onChange={(e) => updateRound(index, "day", e.target.value.toUpperCase())} aria-label={`Day for round ${index + 1}`} />
              <button type="button" className="btn btn-ghost matches-remove-round" onClick={() => removeRound(index)} disabled={rounds.length === 1}>Remove</button>
            </div>
          ))}
        </div>

        {error && <span className="field-error">{error}</span>}
        <button className="btn btn-primary matches-generate-button" disabled={busy}>{busy ? "Generating..." : "Generate Match Table"}</button>
      </form>

      {generated?.rounds?.length ? (
        <div className="card matches-generated-table">
          <h4>Generated match table</h4>
          {generated.rounds.map((round) => (
            <section key={round.roundNumber}>
              <h5>{round.roundName}</h5>
              <div className="matches-table-grid">
                {round.matches.map((match) => (
                  <div key={match.matchId}>
                    <strong>{match.matchLabel}</strong>
                    <span>{resolveSchoolName(match.schoolAId)} vs {resolveSchoolName(match.schoolBId)}</span>
                    <span>{match.date} · {match.day}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title="No match table generated" description="Complete the round settings above, then generate the match table." />
      )}
    </div>
  );
}

function getDayName(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(`${date}T00:00:00`)).toUpperCase();
}

function addDays(date, amount) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + amount);
  return next.toISOString().slice(0, 10);
}
