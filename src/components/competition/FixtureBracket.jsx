import React from "react";
import MatchCard from "./MatchCard";

export default function FixtureBracket({ rounds, resolveSchoolName, onEditDate }) {
  return (
    <div className="fixture-bracket">
      {rounds.map((round, roundIndex) => (
        <section className={`fixture-round fixture-round-${roundIndex}`} key={round.roundNumber}>
          <h4 className="fixture-round-title">{round.roundName}</h4>
          <div className="fixture-round-matches">
            {round.matches.map((m) => (
              <MatchCard
                key={m.matchId}
                match={{ matchLabel: m.matchLabel || "", status: m.status || "UPCOMING", date: m.date, day: m.day, ...m }}
                schoolAName={resolveSchoolName(m.schoolAId)}
                schoolBName={resolveSchoolName(m.schoolBId)}
                onEditDate={onEditDate}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
