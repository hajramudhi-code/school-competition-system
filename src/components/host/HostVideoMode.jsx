import React, { useEffect, useState } from "react";
import VideoPlayer from "../questions/VideoPlayer";
import VideoQuestionCard from "../questions/VideoQuestionCard";
import HostControls from "./HostControls";
import { MAX_VISIBLE_VIDEO_QUESTIONS } from "../../utils/liveState";

export default function HostVideoMode({
  subjects,
  currentSubjectId,
  onSelectSubject,
  videoQuestions,
  onSelectQuestion,
  currentVideoQuestion,
  onDecision,
  onCloseQuestion,
  busy,
  timer,
  onExpire,
  result,
  canSelectSubject = false,
  canSelectQuestion = false,
}) {
  const [overlayOpen, setOverlayOpen] = useState(Boolean(currentVideoQuestion));
  const [selectedQuestionId, setSelectedQuestionId] = useState(currentVideoQuestion?.id || null);

  useEffect(() => {
    setSelectedQuestionId(currentVideoQuestion?.id || null);
    setOverlayOpen(Boolean(currentVideoQuestion));
  }, [currentVideoQuestion?.id]);

  function selectQuestion(questionId) {
    setSelectedQuestionId(questionId);
    setOverlayOpen(true);
    onSelectQuestion(questionId);
  }

  return (
    <div className="host-video-layout">
      <div className="card host-subject-panel">
        <h4 style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: 12 }}>LUCKY QUESTION</h4>
        <div className="host-subject-row">
          {subjects.map((s) => {
            const disabled = s.status === "DISABLED" || !canSelectSubject;
            const active = s.id === currentSubjectId;
            return (
              <button
                key={s.id}
                disabled={disabled}
                onClick={() => onSelectSubject(s.id)}
                className="btn host-subject-button"
                style={{
                  background: active ? "var(--blue-primary)" : "var(--bg-card-elevated)",
                  color: active ? "#fff" : disabled ? "var(--text-disabled)" : "var(--text-main)",
                  border: "1px solid var(--border-color)",
                  opacity: disabled ? 0.5 : 1,
                }}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="host-question-area">
        {currentSubjectId ? (
          <div className="card host-video-questions">
            <h4 style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: 12 }}>VIDEO QUESTIONS</h4>
            <div className="host-video-grid">
              {videoQuestions.slice(0, MAX_VISIBLE_VIDEO_QUESTIONS).map((q) => (
                <VideoQuestionCard
                  key={q.id}
                  question={q}
                  slot={q.slot}
                  status={q.id === selectedQuestionId || q.id === currentVideoQuestion?.id ? "SELECTED" : q.slotStatus}
                  onSelect={canSelectQuestion ? selectQuestion : undefined}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
            Select a subject to load its video questions.
          </div>
        )}
      </div>

      {currentVideoQuestion && overlayOpen && (
        <div className="host-video-overlay-backdrop" role="presentation">
          <section className="card host-video-overlay" role="dialog" aria-modal="true" aria-label="Selected video question">
            <button type="button" className="btn btn-ghost host-question-close" onClick={onCloseQuestion} aria-label="Close question" title="Close question">
              <i className="fas fa-xmark" aria-hidden="true" />
            </button>
            <div className="host-video-question">
              <VideoPlayer youtubeUrl={currentVideoQuestion.youtubeUrl} autoplay={false} square={false} />
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>QUESTION ({currentVideoQuestion.marks} marks)</span>
                  <p style={{ color: "var(--text-main)", fontSize: 15, marginTop: 4 }}>{currentVideoQuestion.text}</p>
                </div>
                <div className="card-elevated" style={{ padding: 10 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>CORRECT ANSWER</span>
                  <p style={{ color: "var(--success)", fontWeight: 700, marginTop: 4 }}>
                    {currentVideoQuestion.mode === "MULTIPLE_CHOICE"
                      ? `${currentVideoQuestion.correctAnswer}. ${currentVideoQuestion[`option${currentVideoQuestion.correctAnswer}`]}`
                      : currentVideoQuestion.correctAnswer}
                  </p>
                </div>
                {result?.questionId === currentVideoQuestion.id ? (
                  <div style={{ color: result.result === "CORRECT" ? "var(--success)" : "var(--danger)", fontWeight: 700, textAlign: "center" }}>
                    RESULT RECORDED: {result.result}
                  </div>
                ) : (
                  <button className="btn btn-success" style={{ width: "100%", padding: "12px 0" }} disabled={busy} onClick={() => onDecision("CORRECT")}>
                    <i className="fas fa-check" aria-hidden="true" /> CORRECT
                  </button>
                )}
                {timer && timer.state !== "IDLE" && <HostControls timer={timer} onExpire={onExpire} />}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

