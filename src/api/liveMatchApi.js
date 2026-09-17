import { apiClient } from "./client";
import { toQuery } from "./schoolsApi";

// ---- Host Control API (spec section 12) ----
export const hostApi = {
  getLiveState: (matchId) => apiClient.get(`/matches/${matchId}/live-state`),
  selectSchool: (matchId, schoolId) => apiClient.post(`/matches/${matchId}/select-school`, { schoolId }),
  selectSubject: (matchId, subjectId) => apiClient.post(`/matches/${matchId}/select-subject`, { subjectId }),
  selectQuestion: (matchId, questionId) => apiClient.post(`/matches/${matchId}/select-question`, { questionId }),
  timer: (matchId, action, durationSeconds) =>
    apiClient.post(`/matches/${matchId}/timer`, { action, durationSeconds }),
  matchTimer: (matchId, action) =>
    apiClient.post(`/matches/${matchId}/match-timer`, { action }),
  recordResult: (matchId, questionId, result) =>
    apiClient.post(`/matches/${matchId}/question-result`, { questionId, result }),
  setMode: (matchId, mode) => apiClient.post(`/matches/${matchId}/mode`, { mode }),
  listVideoQuestions: (matchId, subjectId) =>
    apiClient.get(`/matches/${matchId}/video-questions${toQuery({ subjectId })}`),
};

// ---- Controller / Public Display API (spec section 13) ----
export const controllerApi = {
  getPublicState: (matchId) => apiClient.get(`/matches/${matchId}/public-state`),
  setControllerMode: (matchId, mode) => apiClient.post(`/matches/${matchId}/controller-mode`, { mode }),
};

// ---- Live state polling helper (stands in for the SSE stream of section 13.3) ----
// The frontend polls the read endpoint until the backend provides a real SSE
// stream. This is the only place the polling interval lives.
export function subscribeToLiveState(matchId, { asController = false, intervalMs = 1200, onUpdate, onError }) {
  let cancelled = false;
  let timeoutId = null;

  const fetchOnce = async () => {
    if (cancelled) return;

    try {
      const state = asController
        ? await controllerApi.getPublicState(matchId)
        : await hostApi.getLiveState(matchId);

      if (!cancelled && state) onUpdate?.(state);
    } catch (err) {
      if (!cancelled) onError?.(err);
    } finally {
      if (!cancelled) {
        timeoutId = setTimeout(fetchOnce, intervalMs);
      }
    }
  };

  fetchOnce();

  return () => {
    cancelled = true;
    if (timeoutId) clearTimeout(timeoutId);
  };
}
