import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { matchesApi } from "../../api/matchesApi";
import { competitionsApi } from "../../api/competitionsApi";
import { subjectsApi } from "../../api/subjectsApi";
import { hostApi } from "../../api/liveMatchApi";
import { LoadingState, ErrorState, useToast } from "../../components/common/index.jsx";
import ScoreBoard from "../../components/competition/ScoreBoard";
import HostNormalMode from "../../components/host/HostNormalMode";
import HostVideoMode from "../../components/host/HostVideoMode";
import HostControls from "../../components/host/HostControls";
import { getQuestionSlots, MAX_VISIBLE_QUESTION_SLOTS } from "../../utils/liveState";
import { useLiveCountdown } from "../../components/common/useLiveCountdown";

export default function HostPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const competitionId = user?.competitionId ?? user?.competition?.id ?? user?.competition_id ?? null;
  const hostName = user?.name || user?.username || "Host";
  const [matchId, setMatchId] = useState(null);
  const [state, setState] = useState(null);
  const [subjects, setSubjects] = useState(null);
  const [videoQuestions, setVideoQuestions] = useState([]);
  const [matchDurationMinutes, setMatchDurationMinutes] = useState(30);
  const [matchTimer, setMatchTimer] = useState(null);
  const [matchTimerBusy, setMatchTimerBusy] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const timeoutFiredRef = useRef(false);
  const latestMutationRef = useRef(0);
  const dismissedQuestionRef = useRef(null);

  const closeQuestionView = useCallback((result, questionId, serverState = null) => {
    setState((current) => {
      const base = serverState ?? current;
      if (!base) return base;
      return {
        ...base,
        currentQuestion: null,
        videoQuestion: null,
        lastResult: {
          questionId,
          result,
          schoolId: base.currentSchoolId ?? current?.currentSchoolId,
          timestamp: new Date().toISOString(),
        },
      };
    });
  }, []);

  const refresh = useCallback(() => {
    if (!matchId) return;
    const requestStartedAt = Date.now();
    hostApi
      .getLiveState(matchId)
      .then((nextState) => {
        if (requestStartedAt < latestMutationRef.current) return;
        const revealedQuestionId = nextState?.lastResult?.questionId;
        const activeQuestionId = nextState?.currentQuestion?.id || nextState?.videoQuestion?.id;
        const shouldHideDismissedQuestion = dismissedQuestionRef.current
          && revealedQuestionId === dismissedQuestionRef.current
          && activeQuestionId === dismissedQuestionRef.current;
        setState(shouldHideDismissedQuestion ? { ...nextState, currentQuestion: null, videoQuestion: null } : nextState);
        if (nextState?.matchTimer) setMatchTimer(nextState.matchTimer);
      })
      .catch((e) => setError(e.message));
  }, [matchId]);

  const submitDecision = useCallback(async (result) => {
    const currentQuestion = state?.questionMode === "VIDEO" ? state?.videoQuestion : state?.currentQuestion;
    const questionId = currentQuestion?.id;
    if (!matchId || !questionId) return;

    latestMutationRef.current = Date.now();
    const isTimeout = result === "TIMEOUT";
    if (isTimeout) {
      dismissedQuestionRef.current = questionId;
      closeQuestionView(result, questionId, state);
    }
    setBusy(true);
    try {
      const nextState = await hostApi.recordResult(matchId, questionId, result);
      dismissedQuestionRef.current = questionId;
      closeQuestionView(result, questionId, nextState ?? state);
      if (!nextState) {
        refresh();
      }
    } catch (e) {
      if (isTimeout) refresh();
      showToast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }, [closeQuestionView, matchId, refresh, showToast, state, state?.currentQuestion, state?.questionMode, state?.videoQuestion]);

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
      setMatchDurationMinutes(Number(competition?.matchDurationMinutes) || 30);
      const selectedSubjectIds = new Set(competition?.subjectIds || []);
      setSubjects(subjectList.filter((subject) => subject?.status === "ENABLED" && selectedSubjectIds.has(subject.id)));

      let match = Array.isArray(activeResponse?.data) ? activeResponse.data[0] : null;
      if (!match) {
        const upcomingResponse = await matchesApi.list({ competitionId: competitionId, status: "UPCOMING" });
        match = Array.isArray(upcomingResponse?.data) ? upcomingResponse.data[0] : null;
      }
      if (!match) {
        setError("No match is currently assigned to this competition.");
        setMatchId(null);
        return;
      }
      setMatchId(match.id);
      setMatchTimer((current) => current || {
        state: "IDLE",
        durationSeconds: (Number(competition?.matchDurationMinutes) || 30) * 60,
        remainingSeconds: (Number(competition?.matchDurationMinutes) || 30) * 60,
      });
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
      hostApi.listVideoQuestions(matchId, state.currentSubjectId).then((res) => setVideoQuestions((res.data || []).slice(0, MAX_VISIBLE_QUESTION_SLOTS)));
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
      if (result) setState(result);
      refresh();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  const toggleMatchTimer = useCallback(async () => {
    if (!matchId || matchTimerBusy) return;
    const action = matchTimer?.state === "RUNNING" ? "PAUSE" : "START";
    const previousTimer = matchTimer;
    const durationSeconds = (matchDurationMinutes || 30) * 60;
    setMatchTimerBusy(true);
    setMatchTimer((current) => ({
      ...(current || {}),
      state: action === "START" ? "RUNNING" : "PAUSED",
      durationSeconds: current?.durationSeconds || durationSeconds,
      remainingSeconds: current?.remainingSeconds ?? durationSeconds,
    }));
    try {
      const response = await hostApi.matchTimer(matchId, action);
      if (response?.matchTimer) setMatchTimer(response.matchTimer);
      else if (response?.state && response?.remainingSeconds !== undefined) setMatchTimer(response);
    } catch (e) {
      setMatchTimer(previousTimer);
      showToast(e.message, "error");
    } finally {
      setMatchTimerBusy(false);
    }
  }, [matchDurationMinutes, matchId, matchTimer, matchTimerBusy, showToast]);

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
        <MatchTimerControl timer={matchTimer} busy={matchTimerBusy} onToggle={toggleMatchTimer} />
        <div className="host-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="btn btn-secondary"
            disabled={!matchId || !state}
            onClick={() => guarded(() => hostApi.setMode(matchId, state.questionMode === "NORMAL" ? "VIDEO" : "NORMAL"))}
          >
            MODE: {state?.questionMode || "NORMAL"}
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
                  busy={busy}
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
                  busy={busy}
                  timer={state.timer}
                />
              )}

              {(state.currentQuestion || state.videoQuestion) && (
                <HostControls timer={state.timer} disabled={busy} onExpire={() => submitDecision("TIMEOUT")} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MatchTimerControl({ timer, busy, onToggle }) {
  const remaining = useLiveCountdown(timer);
  const isRunning = timer?.state === "RUNNING";
  const totalMinutes = Math.floor((timer?.durationSeconds || 0) / 60);
  const minutes = Math.floor(remaining / 60);
  const seconds = Math.ceil(remaining % 60).toString().padStart(2, "0");

  return (
    <div
      className="host-match-timer"
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
        MATCH {totalMinutes ? `${minutes}:${seconds}` : "--:--"}
      </span>
      <button className={`btn ${isRunning ? "btn-secondary" : "btn-primary"}`} disabled={busy || !timer} onClick={onToggle}>
        <i className={`fas ${isRunning ? "fa-pause" : "fa-play"}`} aria-hidden="true" />
        {isRunning ? "PAUSE" : "START"}
      </button>
    </div>
  );
}
