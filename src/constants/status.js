// Centralized status/enum values. Never hard-code these strings elsewhere.

export const EntityStatus = { ENABLED: "ENABLED", DISABLED: "DISABLED" };

export const CompetitionStatus = {
  UPCOMING: "UPCOMING",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
};

export const MatchStatus = {
  UPCOMING: "UPCOMING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
};

export const QuestionSlotStatus = {
  AVAILABLE: "AVAILABLE",
  SELECTED: "SELECTED",
  COMPLETED: "COMPLETED",
  DISABLED: "DISABLED",
};

export const QuestionResult = {
  CORRECT: "CORRECT",
  INCORRECT: "INCORRECT",
  TIMEOUT: "TIMEOUT",
};

export const QuestionMode = {
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  TRUE_FALSE: "TRUE_FALSE",
  MENTION: "MENTION",
};

export const MatchMode = { NORMAL: "NORMAL", VIDEO: "VIDEO" };

export const VideoPlaybackState = {
  IDLE: "IDLE",
  LOADING: "LOADING",
  PLAYING: "PLAYING",
  ENDED: "ENDED",
};

export const TimerState = {
  IDLE: "IDLE",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  EXPIRED: "EXPIRED",
};

export const Role = { ADMIN: "ADMIN", HOST: "HOST", CONTROLLER: "CONTROLLER" };

export const QUESTIONS_PER_TURN = 5;
export const VIDEO_QUESTIONS_PER_TURN = 1;
