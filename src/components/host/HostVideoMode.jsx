import React, { useEffect, useState } from "react";
import VideoPlayer from "../questions/VideoPlayer";
import VideoQuestionCard from "../questions/VideoQuestionCard";
import { getSubjectCode } from "../../utils/liveState";

export default function HostVideoMode({
  subjects,
  currentSubjectId,
  onSelectSubject,
  videoQuestions,
  onSelectQuestion,
  currentVideoQuestion,
  onDecision,
  busy,
  timer,
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
        <h4 style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: 12 }}>SELECT SUBJECT</h4>
        <div className="host-subject-row">
          {subjects.map((s) => {
            const disabled = s.status === "DISABLED";
            const active = s.id === currentSubjectId;
            return (
              <button
                key={s.id}
                disabled={disabled}
                onClick={() => onSelectSubject(s.id)}
                className="btn"
                style={{
                  background: active ? "var(--blue-primary)" : "var(--bg-card-elevated)",
                  color: active ? "#fff" : disabled ? "var(--text-disabled)" : "var(--text-main)",
                  border: "1px solid var(--border-color)",
                  opacity: disabled ? 0.5 : 1,
                }}
              >
                {getSubjectCode(s)}
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
              {videoQuestions.map((q) => (
                <VideoQuestionCard
                  key={q.id}
                  question={q}
                  slot={q.slot}
                  status={q.id === selectedQuestionId || q.id === currentVideoQuestion?.id ? "SELECTED" : q.slotStatus}
                  onSelect={selectQuestion}
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
                <div style={{ display: "flex", gap: 12 }}>
                  <button className="btn btn-success" style={{ flex: 1, padding: "12px 0" }} disabled={busy} onClick={() => onDecision("CORRECT")}>
                    <i className="fas fa-check" aria-hidden="true" />
                  </button>
                  <button className="btn btn-danger" style={{ flex: 1, padding: "12px 0" }} disabled={busy} onClick={() => onDecision("INCORRECT")}>
                    <i className="fas fa-xmark" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

