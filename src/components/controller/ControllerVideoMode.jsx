import React from "react";
import VideoPlayer from "../questions/VideoPlayer";
import AnswerOptions from "../questions/AnswerOptions";
import ControllerResultNotice from "./ControllerResultNotice";
import { MAX_VISIBLE_VIDEO_QUESTIONS } from "../../utils/liveState";
import { useLiveCountdown } from "../common/useLiveCountdown";

export default function ControllerVideoMode({ videoQuestion, videoQuestions = [], timer, lastResult }) {
  const displayedQuestion = videoQuestion;
  const isResultVisible = lastResult?.questionId === displayedQuestion?.id;
  const toneClass = isResultVisible && lastResult?.result === "CORRECT" ? "has-result-correct" : isResultVisible ? "has-result-incorrect" : "";

  return (
    <div className={displayedQuestion ? "controller-video-stage" : "controller-video-gallery"}>
      {displayedQuestion ? (
        <div className="controller-video-frame">
          <VideoPlayer youtubeUrl={displayedQuestion.youtubeUrl} autoplay square={false} />
          <div className={`controller-video-question-overlay ${toneClass}`}>
            {isResultVisible && <ControllerResultNotice question={displayedQuestion} lastResult={lastResult} />}
            <p>{displayedQuestion.text}</p>
            {displayedQuestion.mode !== "MENTION" && <AnswerOptions question={displayedQuestion} size="large" revealCorrect={isResultVisible} />}
            {timer && timer.state !== "IDLE" && <TimerBar timer={timer} toneClass={toneClass} />}
          </div>
        </div>
      ) : videoQuestions.length ? (
        videoQuestions.slice(0, MAX_VISIBLE_VIDEO_QUESTIONS).map((question) => {
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
  const remaining = useLiveCountdown(timer);
  const pct = timer.durationSeconds ? Math.max(0, (remaining / timer.durationSeconds) * 100) : 0;
  const accent = toneClass === "has-result-correct" ? "#22c55e" : toneClass === "has-result-incorrect" ? "#ef4444" : "#22d3ee";
  return (
    <div className="controller-video-timer">
      <span>{Math.ceil(remaining)}s</span>
      <div><i style={{ width: `${pct}%`, background: accent }} /></div>
    </div>
  );
}
