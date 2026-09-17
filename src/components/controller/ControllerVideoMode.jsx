import React from "react";
import VideoPlayer from "../questions/VideoPlayer";
import AnswerOptions from "../questions/AnswerOptions";

export default function ControllerVideoMode({ videoQuestion, videoQuestions = [], timer, lastResult }) {
  const toneClass = lastResult?.result === "CORRECT" ? "has-result-correct" : lastResult?.result === "INCORRECT" ? "has-result-incorrect" : "";

  return (
    <div className={videoQuestion ? "controller-video-stage" : "controller-video-gallery"}>
      {videoQuestion ? (
        <div className="controller-video-frame">
          <VideoPlayer youtubeUrl={videoQuestion.youtubeUrl} autoplay square={false} />
          <div className={`controller-video-question-overlay ${toneClass}`}>
            <p>{videoQuestion.text}</p>
            {videoQuestion.mode !== "MENTION" && <AnswerOptions question={videoQuestion} size="large" />}
            {timer && timer.state !== "IDLE" && <TimerBar timer={timer} toneClass={toneClass} />}
          </div>
        </div>
      ) : videoQuestions.length ? (
        videoQuestions.map((question) => {
          const disabled = question.slotStatus !== "AVAILABLE";
          return (
          <button
            key={question.id}
            type="button"
            disabled={disabled}
            className={`controller-video-thumb ${disabled ? "is-unavailable" : ""}`}
            aria-label={`${question.personName} Q${String(question.slot).padStart(2, "0")}${disabled ? " unavailable" : " available"}`}
          >
            <img src={question.personImageUrl} alt="" />
            <span>{question.personName}</span>
            <small>Q{String(question.slot).padStart(2, "0")}</small>
          </button>
          );
        })
      ) : (
        <div className="controller-waiting card">Waiting for the Host to select a video question...</div>
      )}
    </div>
  );
}

function TimerBar({ timer, toneClass }) {
  const pct = timer.durationSeconds ? Math.max(0, (timer.remainingSeconds / timer.durationSeconds) * 100) : 0;
  const accent = toneClass === "has-result-correct" ? "#22c55e" : toneClass === "has-result-incorrect" ? "#ef4444" : "#22d3ee";
  return (
    <div className="controller-video-timer">
      <span>{timer.remainingSeconds}s</span>
      <div><i style={{ width: `${pct}%`, background: accent }} /></div>
    </div>
  );
}
