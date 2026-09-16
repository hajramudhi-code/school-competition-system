import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { matchesApi } from "../../api/matchesApi";
import { subjectsApi } from "../../api/subjectsApi";
import { hostApi } from "../../api/liveMatchApi";
import { LoadingState, ErrorState, useToast } from "../../components/common/index.jsx";
import ScoreBoard from "../../components/competition/ScoreBoard";
import HostNormalMode from "../../components/host/HostNormalMode";
import HostVideoMode from "../../components/host/HostVideoMode";
import HostControls from "../../components/host/HostControls";

export default function HostPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [matchId, setMatchId] = useState(null);
  const [state, setState] = useState(null);
  const [subjects, setSubjects] = useState(null);
  const [videoQuestions, setVideoQuestions] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const timeoutFiredRef = useRef(false);

  const loadAssignment = useCallback(async () => {
    setError(null);
    try {
      const [subjectResponse, activeResponse] = await Promise.all([
        subjectsApi.list({}),
        matchesApi.list({ competitionId: user.competitionId, status: "IN_PROGRESS" }),
      ]);
      setSubjects(subjectResponse.data);
      let match = activeResponse.data[0];
      if (!match) {
        const upcomingResponse = await matchesApi.list({ competitionId: user.competitionId, status: "UPCOMING" });
        match = upcomingResponse.data[0];
      }
      if (!match) throw new Error("No match is currently assigned to this competition.");
      setMatchId(match.id);
    } catch (e) {
      setError(e.message);
    }
  }, [user.competitionId]);

  useEffect(() => {
    loadAssignment();
  }, [loadAssignment]);

  const refresh = useCallback(() => {
    if (!matchId) return;
    hostApi
      .getLiveState(matchId)
      .then(setState)
      .catch((e) => setError(e.message));
  }, [matchId]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 250);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (state?.questionMode === "VIDEO" && state?.currentSubjectId) {
      hostApi.listVideoQuestions(matchId, state.currentSubjectId).then((res) => setVideoQuestions(res.data));
    }
  }, [matchId, state?.questionMode, state?.currentSubjectId]);

  useEffect(() => {
    if (state?.lastResult?.result !== "TIMEOUT") return;
    const key = `${state.lastResult.questionId}-${state.lastResult.timestamp}`;
    if (timeoutFiredRef.current === key) return;
    timeoutFiredRef.current = key;
    showToast("Time's up — question closed with 0 points.", "error");
  }, [state?.lastResult, showToast]);

  async function guarded(fn) {
    setBusy(true);
    try {
      const result = await fn();
      if (result) setState(result);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={loadAssignment} />;
  if (!state || !subjects) return <LoadingState label="Loading match control..." />;

  return (
    <div className="host-page">
      <header
        className="host-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 24px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
        }}
      >
        <div className="host-match-meta">
          <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.03em" }}>{state.matchName}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {state.date} | {state.day}
          </div>
        </div>
        <div className="host-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="btn btn-secondary"
            onClick={() => guarded(() => hostApi.setMode(matchId, state.questionMode === "NORMAL" ? "VIDEO" : "NORMAL"))}
          >
            MODE: {state.questionMode}
          </button>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{user.name}</span>
          <button className="btn btn-ghost" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <div className="host-content" style={{ padding: "24px 24px 40px", maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="card host-score-card">
          <ScoreBoard
            schoolA={state.schoolA}
            schoolB={state.schoolB}
            currentSchoolId={state.currentSchoolId}
            questionsAnsweredInTurn={state.questionsAnsweredInTurn}
            questionMode={state.questionMode}
            onSelectSchool={(schoolId) => guarded(() => hostApi.selectSchool(matchId, schoolId))}
          />
        </div>

        <div className="host-main-area" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {state.questionMode === "NORMAL" ? (
              <HostNormalMode
                subjects={subjects}
                currentSubjectId={state.currentSubjectId}
                onSelectSubject={(id) => guarded(() => hostApi.selectSubject(matchId, id))}
                questionSlots={state.questionSlots}
                onSelectQuestion={(qid) => guarded(() => hostApi.selectQuestion(matchId, qid))}
                currentQuestion={state.currentQuestion}
                onDecision={(result) => guarded(() => hostApi.recordResult(matchId, state.currentQuestion.id, result))}
                busy={busy}
              />
            ) : (
              <HostVideoMode
                subjects={subjects}
                currentSubjectId={state.currentSubjectId}
                onSelectSubject={(id) => guarded(() => hostApi.selectSubject(matchId, id))}
                videoQuestions={videoQuestions}
                onSelectQuestion={(qid) => guarded(() => hostApi.selectQuestion(matchId, qid))}
                currentVideoQuestion={state.videoQuestion}
                onDecision={(result) => guarded(() => hostApi.recordResult(matchId, state.videoQuestion.id, result))}
                busy={busy}
                timer={state.timer}
              />
            )}

            {state.currentQuestion && (
              <HostControls
                timer={state.timer}
                disabled={busy}
              />
            )}
        </div>
      </div>
    </div>
  );
}
