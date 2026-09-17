export function getSubjectCode(subject) {
  return subject?.code || subject?.subjectCode || subject?.subject_code || "-";
}

export const MAX_VISIBLE_QUESTION_SLOTS = 20;

export function getQuestionSlots(state) {
  const liveState = state?.data && !Array.isArray(state.data) ? state.data : state?.liveState || state;
  const slots = liveState?.questionSlots
    || liveState?.question_slots
    || liveState?.questions
    || liveState?.currentSubject?.questionSlots
    || liveState?.currentSubject?.question_slots
    || liveState?.currentSubject?.questions
    || [];
  if (!Array.isArray(slots)) return [];
  return slots.map((item, index) => ({
    questionId: item.questionId || item.question_id || item.question?.id || item.id,
    slot: item.slot || item.questionNumber || item.question_number || index + 1,
    status: item.status || item.slotStatus || item.slot_status || "AVAILABLE",
  })).filter((item) => item.questionId).slice(0, MAX_VISIBLE_QUESTION_SLOTS);
}