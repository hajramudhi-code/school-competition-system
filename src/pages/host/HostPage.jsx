import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { matchesApi } from "../../api/matchesApi";
import { competitionsApi } from "../../api/competitionsApi";
import { subjectsApi } from "../../api/subjectsApi";
import { hostApi, normalizeLiveState, publishLiveState } from "../../api/liveMatchApi";
import { LoadingState, ErrorState, useToast } from "../../components/common/index.jsx";
import ScoreBoard from "../../components/competition/ScoreBoard";
import HostNormalMode from "../../components/host/HostNormalMode";
import HostVideoMode from "../../components/host/HostVideoMode";
import HostControls from "../../components/host/HostControls";
import { getQuestionSlots, MAX_VISIBLE_VIDEO_QUESTIONS, MAX_VISIBLE_QUESTION_SLOTS } from "../../utils/liveState";

export default function HostPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const competitionId = user?.competitionId ?? user?.competition?.id ?? user?.competition_id ?? null;
  const hostName = user?.name || user?.username || "Host";
  const [matchId, setMatchId] = useState(null);
  const [state, setState] = useState(null);
  const [subjects, setSubjects] = useState(null);
  const [videoQuestions, setVideoQuestions] = useState([]);
  const [matchStarted, setMatchStarted] = useState(false);
  const [matchEnded, setMatchEnded] = useState(false);
  const [matchControlBusy, setMatchControlBusy] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const timeoutFiredRef = useRef(false);
  const latestMutationRef = useRef(0);
  const dismissedQuestionRef = useRef(null);

  const closeQuestionView = useCallback((questionId) => {
    setState((current) => {
      if (!current) return current;
      return { ...current, currentQuestion: null, videoQuestion: null };
    });
    dismissedQuestionRef.current = questionId;
  }, []);

  const refresh = useCallback(() => {
    if (!matchId) return;
    const requestStartedAt = Date.now();
    hostApi
      .getLiveState(matchId)
      .then((nextState) => {
        if (requestStartedAt < latestMutationRef.current) return;
        const activeQuestionId = nextState?.currentQuestion?.id || nextState?.videoQuestion?.id;
        const shouldHideDismissedQuestion = dismissedQuestionRef.current
          && activeQuestionId === dismissedQuestionRef.current;
        const liveState = shouldHideDismissedQuestion ? { ...nextState, currentQuestion: null, videoQuestion: null } : nextState;
        setState(liveState);
        publishLiveState(matchId, liveState);
      })
      .catch((e) => setError(e.message));
  }, [matchId]);

  const submitDecision = useCallback(async (result) => {
    const currentQuestion = state?.questionMode === "VIDEO" ? state?.videoQuestion : state?.currentQuestion;
    const questionId = currentQuestion?.id;
    if (!matchId || !questionId) return;

    latestMutationRef.current = Date.now();
    setBusy(true);
    try {
      const nextState = await hostApi.recordResult(matchId, questionId, result);
      const liveState = normalizeLiveState(nextState) ?? state;
      setState(liveState);
      publishLiveState(matchId, liveState);
      if (!nextState) {
        refresh();
      }
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }, [matchId, refresh, showToast, state, state?.currentQuestion, state?.questionMode, state?.videoQuestion]);

  const loadAssignment = useCallback(async () => {
    setError(null);
    if (!competitionId) {
      setError("No competition assigned to this user.");
      return;
    }
    try {
      const [subjectResponse, competition, activeResponse] = await Promise.all([
        subjectsApi.list({}),
        competitionsApi.get(competitionId),
        matchesApi.list({ competitionId: competitionId, status: "IN_PROGRESS" }),
      ]);

      const subjectList = Array.isArray(subjectResponse?.data) ? subjectResponse.data : [];
      const selectedSubjectIds = new Set(competition?.subjectIds || []);
      setSubjects(subjectList.filter((subject) => subject?.status === "ENABLED" && selectedSubjectIds.has(subject.id)));

      let match = Array.isArray(activeResponse?.data) ? activeResponse.data[0] : null;
      if (!match) {
        const upcomingResponse = await matchesApi.list({ competitionId: competitionId, status: "UPCOMING" });
        match = Array.isArray(upcomingResponse?.data) ? upcomingResponse.data[0] : null;
      }
      if (!match) {
        const completedResponse = await matchesApi.list({ competitionId: competitionId, status: "COMPLETED" });
        match = Array.isArray(completedResponse?.data) ? completedResponse.data[0] : null;
      }
      if (!match) {
        setError("No match is currently assigned to this competition.");
        setMatchId(null);
        return;
      }
      setMatchId(match.id);
      setMatchStarted(match.status === "IN_PROGRESS");
      setMatchEnded(match.status === "COMPLETED");
    } catch (e) {
      setError(e.message || "Unable to load host assignment.");
    }
  }, [competitionId]);

  useEffect(() => {
    loadAssignment();
  }, [loadAssignment]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 1000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (state?.questionMode === "VIDEO" && state?.currentSubjectId) {
      hostApi.listVideoQuestions(matchId, state.currentSubjectId).then((res) => setVideoQuestions((res.data || []).slice(0, MAX_VISIBLE_VIDEO_QUESTIONS)));
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
    latestMutationRef.current = Date.now();
    setBusy(true);
    try {
      const result = await fn();
      if (result) {
        const liveState = normalizeLiveState(result);
        setState(liveState);
        publishLiveState(matchId, liveState);
      }
      refresh();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  const updateFromMatchResponse = useCallback((response, fallbackMatchId) => {
    const liveState = normalizeLiveState(response);
    const nextMatchId = response?.matchId || liveState?.matchId || fallbackMatchId;
    if (nextMatchId && nextMatchId !== matchId) setMatchId(nextMatchId);
    if (liveState?.schoolA || liveState?.currentQuestion || liveState?.questionSlots) {
      setState(liveState);
      publishLiveState(nextMatchId, liveState);
    }
    return { liveState, nextMatchId };
  }, [matchId]);

  const transitionToMatch = useCallback((response, fallbackMatchId) => {
    const liveState = normalizeLiveState(response);
    const nextMatchId = response?.matchId || liveState?.matchId || fallbackMatchId;
    if (nextMatchId && nextMatchId !== matchId) setMatchId(nextMatchId);
    setState(liveState);
    publishLiveState(nextMatchId, liveState);
    setMatchStarted(true);
    setMatchEnded(false);
    dismissedQuestionRef.current = null;
    timeoutFiredRef.current = false;
    return nextMatchId;
  }, [matchId]);

  const startMatch = useCallback(async () => {
    if (!matchId || matchControlBusy) return;
    setMatchControlBusy(true);
    try {
      const response = await hostApi.startMatch(matchId);
      transitionToMatch(response, matchId);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setMatchControlBusy(false);
    }
  }, [matchControlBusy, matchId, showToast, transitionToMatch]);

  const endMatch = useCallback(async () => {
    if (!matchId || matchControlBusy || !matchStarted) return;
    setMatchControlBusy(true);
    try {
      const response = await hostApi.endMatch(matchId);
      updateFromMatchResponse(response, matchId);
      setMatchStarted(false);
      setMatchEnded(true);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setMatchControlBusy(false);
    }
  }, [matchControlBusy, matchId, matchStarted, showToast, updateFromMatchResponse]);

  const chooseNextMatch = useCallback(async (rematch) => {
    if (!matchId || matchControlBusy) return;
    if (rematch && !window.confirm("Start a rematch with the same schools?")) return;
    setMatchControlBusy(true);
    try {
      const response = rematch ? await hostApi.rematch(matchId) : await hostApi.nextMatch(matchId);
      transitionToMatch(response, matchId);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setMatchControlBusy(false);
    }
  }, [matchControlBusy, matchId, showToast, transitionToMatch]);

  return (
    <div className="host-page">
      <header
        className="host-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          padding: "12px 24px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
        }}
      >
        <div className="host-match-meta">
          <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.03em" }}>{state?.matchName || "Host Control"}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {state ? `${state.date} | ${state.day}` : "Waiting for match data"}
          </div>
        </div>
        <MatchControl
          started={matchStarted}
          ended={matchEnded}
          busy={matchControlBusy}
          onStart={startMatch}
          onEnd={endMatch}
          onRematch={() => chooseNextMatch(true)}
          onNext={() => chooseNextMatch(false)}
        />
        <div className="host-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="btn btn-secondary"
            disabled={!matchId || !state}
            onClick={() => guarded(() => hostApi.setMode(matchId, state.questionMode === "NORMAL" ? "VIDEO" : "NORMAL"))}
          >
            {state?.questionMode === "VIDEO" ? "BONUS QN" : "NORMAL"}
          </button>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{hostName}</span>
          <button className="btn btn-ghost" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <div className="host-content" style={{ padding: "24px 24px 40px", maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        {error ? <ErrorState message={error} onRetry={loadAssignment} /> : !state || !subjects ? <LoadingState label="Loading match control..." /> : (
          <>
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
                  questionSlots={getQuestionSlots(state)}
                  onSelectQuestion={(qid) => {
                    dismissedQuestionRef.current = null;
                    guarded(() => hostApi.selectQuestion(matchId, qid));
                  }}
                  currentQuestion={state.currentQuestion}
                  onDecision={(result) => submitDecision(result)}
                  onCloseQuestion={() => closeQuestionView(state.currentQuestion?.id)}
                  busy={busy}
                  result={state.lastResult}
                />
              ) : (
                <HostVideoMode
                  subjects={subjects}
                  currentSubjectId={state.currentSubjectId}
                  onSelectSubject={(id) => guarded(() => hostApi.selectSubject(matchId, id))}
                  videoQuestions={videoQuestions}
                  onSelectQuestion={(qid) => {
                    dismissedQuestionRef.current = null;
                    guarded(() => hostApi.selectQuestion(matchId, qid));
                  }}
                  currentVideoQuestion={state.videoQuestion}
                  onDecision={(result) => submitDecision(result)}
                  onCloseQuestion={() => closeQuestionView(state.videoQuestion?.id)}
                  busy={busy}
                  timer={state.timer}
                  result={state.lastResult}
                />
              )}

              {(state.currentQuestion || state.videoQuestion)
                && state.lastResult?.questionId !== (state.currentQuestion?.id || state.videoQuestion?.id) && (
                <HostControls timer={state.timer} disabled={busy} onExpire={() => submitDecision("TIMEOUT")} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MatchControl({ started, ended, busy, onStart, onEnd, onRematch, onNext }) {
  if (ended) {
    return (
      <div className="host-match-control" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.04em" }}>MATCH COMPLETED</span>
        <button className="btn btn-secondary" disabled={busy} onClick={onRematch}>
          <i className="fas fa-rotate-right" aria-hidden="true" /> REMATCH
        </button>
        <button className="btn btn-primary" disabled={busy} onClick={onNext}>
          <i className="fas fa-forward" aria-hidden="true" /> NEXT MATCH
        </button>
      </div>
    );
  }

  return (
    <div
      className="host-match-control"
      style={{
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
        {ended ? "MATCH ENDED" : started ? "MATCH IN PROGRESS" : "MATCH NOT STARTED"}
      </span>
      <button className={`btn ${started ? "btn-danger" : "btn-primary"}`} disabled={busy} onClick={started ? onEnd : onStart}>
        <i className={`fas ${started ? "fa-stop" : "fa-play"}`} aria-hidden="true" />
        {started ? "END" : "START"}
      </button>
    </div>
  );
}
