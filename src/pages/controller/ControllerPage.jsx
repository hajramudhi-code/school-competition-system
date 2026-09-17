import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { matchesApi } from "../../api/matchesApi";
import { competitionsApi } from "../../api/competitionsApi";
import { subjectsApi } from "../../api/subjectsApi";
import { controllerApi, subscribeToLiveState } from "../../api/liveMatchApi";
import { LoadingState, ErrorState, useToast } from "../../components/common/index.jsx";
import ScoreBoard from "../../components/competition/ScoreBoard";
import ControllerNormalMode from "../../components/controller/ControllerNormalMode";
import ControllerVideoMode from "../../components/controller/ControllerVideoMode";
import ResultAnimation from "../../components/controller/ResultAnimation";
import SubjectCarousel from "../../components/controller/SubjectCarousel";
import QuestionNumberRow from "../../components/controller/QuestionNumberRow";
import { getQuestionSlots } from "../../utils/liveState";

export default function ControllerPage() {
  const { user, logout } = useAuth();
  const competitionId = user?.competitionId ?? user?.competition?.id ?? user?.competition_id ?? null;
  const [matchId, setMatchId] = useState(null);
  const [state, setState] = useState(null);
  const [subjects, setSubjects] = useState(null);
  const [controllerMode, setControllerMode] = useState("NORMAL");
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { showToast } = useToast();

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
        setError("No match is currently assigned to this competition.");
        setMatchId(null);
        return;
      }
      setMatchId(match.id);
    } catch (e) {
      setError(e.message || "Unable to load controller assignment.");
      showToast(e.message || "Unable to load controller assignment.", "error");
    }
  }, [competitionId, showToast]);

  useEffect(() => {
    loadAssignment();
  }, [loadAssignment]);

  useEffect(() => {
    if (!matchId) return undefined;
    return subscribeToLiveState(matchId, {
      asController: true,
      intervalMs: 1000,
      onUpdate: (nextState) => {
        if (nextState) {
          setError(null);
          setState(nextState);
        }
      },
      onError: (e) => setError(e.message || "Unable to refresh controller state."),
    });
  }, [matchId]);

  const toggleMode = useCallback(() => {
    if (!matchId) return;
    const next = controllerMode === "NORMAL" ? "VIDEO" : "NORMAL";
    setControllerMode(next);
    controllerApi.setControllerMode(matchId, next).catch(() => {});
  }, [controllerMode, matchId]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen can be unavailable until a user gesture or on unsupported browsers.
    }
  }

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  return (
    <div
      className={`controller-page ${controllerMode === "NORMAL" ? "controller-normal-page" : ""}`}
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <ResultAnimation lastResult={state?.lastResult} />

      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 32px",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>{state?.matchName || "Controller Display"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-secondary" disabled={!matchId} onClick={toggleMode}>
            MODE: {controllerMode}
          </button>
          <button className="btn btn-ghost" onClick={logout} style={{ fontSize: 13 }}>
            Logout
          </button>
        </div>
      </header>

      <div style={{ padding: "36px 24px", display: "flex", flexDirection: "column", gap: 36, alignItems: "center", flex: 1 }}>
        {error ? <ErrorState message={error} onRetry={loadAssignment} /> : !state || !subjects ? <LoadingState label="Loading public display..." /> : (
          <>
            <ScoreBoard schoolA={state.schoolA} schoolB={state.schoolB} currentSchoolId={state.currentSchoolId} size="large" />
            <SubjectCarousel subjects={subjects} selectedSubjectId={state.currentSubjectId} />
            {controllerMode === "NORMAL" && <QuestionNumberRow slots={getQuestionSlots(state)} selectedQuestionId={state.currentQuestion?.id} />}
            {controllerMode === "NORMAL" ? (
              <ControllerNormalMode currentQuestion={state.currentQuestion} timer={state.timer} lastResult={state?.lastResult} />
            ) : (
              <ControllerVideoMode videoQuestion={state.videoQuestion} videoQuestions={state.videoQuestions} timer={state.timer} lastResult={state?.lastResult} />
            )}
          </>
        )}
      </div>
      <button className="controller-fullscreen" onClick={toggleFullscreen}>
        {isFullscreen ? "EXIT FULL SCREEN" : "FULL SCREEN"}
      </button>
    </div>
  );
}
