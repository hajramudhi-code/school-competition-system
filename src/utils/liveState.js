export function getSubjectCode(subject) {
  return subject?.code || subject?.subjectCode || subject?.subject_code || "-";
}

export function getQuestionSlots(state) {
  const slots = state?.questionSlots || state?.question_slots || state?.questions || [];
  return slots.map((item, index) => ({
    questionId: item.questionId || item.question_id || item.id,
    slot: item.slot || item.questionNumber || item.question_number || index + 1,
    status: item.status || item.slotStatus || item.slot_status || "AVAILABLE",
  })).filter((item) => item.questionId);
}