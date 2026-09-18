import { apiClient } from "./client";
import { toQuery } from "./schoolsApi";

export function normalizeLiveState(payload) {
  let state = payload;
  while (state && !state.matchId && !state.schoolA && !state.schoolB && !state.currentQuestion && !state.questionSlots) {
    const nested = state.liveState || state.state || state.data;
    if (!nested || nested === state) break;
    state = nested;
  }
  return state;
}

export function normalizeCollection(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

const LIVE_STATE_STORAGE_KEY = "school-competition-live-state";
const LIVE_STATE_CHANNEL = "school-competition-live-state";

export function publishLiveState(matchId, payload) {
  const state = normalizeLiveState(payload);
  if (!state || String(state.matchId) !== String(matchId)) return;

  const message = { matchId: String(matchId), state, timestamp: Date.now() };
  try {
    window.localStorage.setItem(LIVE_STATE_STORAGE_KEY, JSON.stringify(message));
  } catch {
    // Storage may be unavailable in a restricted browser context.
  }
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(LIVE_STATE_CHANNEL);
    channel.postMessage(message);
    channel.close();
  }
}

export function subscribeToLocalLiveState(matchId, onUpdate) {
  const handleMessage = (message) => {
    if (String(message?.matchId) !== String(matchId)) return;
    const state = normalizeLiveState(message?.state);
    if (state) onUpdate?.(state);
  };

  const handleStorage = (event) => {
    if (event.key !== LIVE_STATE_STORAGE_KEY || !event.newValue) return;
    try {
      handleMessage(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed browser storage events.
    }
  };

  window.addEventListener("storage", handleStorage);
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(LIVE_STATE_CHANNEL) : null;
  channel?.addEventListener("message", (event) => handleMessage(event.data));

  try {
    const saved = window.localStorage.getItem(LIVE_STATE_STORAGE_KEY);
    if (saved) handleMessage(JSON.parse(saved));
  } catch {
    // Ignore unavailable or malformed saved state.
  }

  return () => {
    window.removeEventListener("storage", handleStorage);
    channel?.close();
  };
}

// ---- Host Control API (spec section 12) ----
export const hostApi = {
  getLiveState: async (matchId) => normalizeLiveState(await apiClient.get(`/matches/${matchId}/live-state`)),
  selectSchool: (matchId, schoolId) => apiClient.post(`/matches/${matchId}/select-school`, { schoolId }),
  selectSubject: (matchId, subjectId) => apiClient.post(`/matches/${matchId}/select-subject`, { subjectId }),
  selectQuestion: (matchId, questionId) => apiClient.post(`/matches/${matchId}/select-question`, { questionId }),
  timer: (matchId, action, durationSeconds) =>
    apiClient.post(`/matches/${matchId}/timer`, { action, durationSeconds }),
  startMatch: (matchId) => apiClient.post(`/matches/${matchId}/start`, {}),
  endMatch: (matchId) => apiClient.post(`/matches/${matchId}/end`, {}),
  rematch: (matchId) => apiClient.post(`/matches/${matchId}/rematch`, {}),
  nextMatch: (matchId) => apiClient.post(`/matches/${matchId}/next`, {}),
  recordResult: (matchId, questionId, result) =>
    apiClient.post(`/matches/${matchId}/question-result`, { questionId, result }),
  setMode: (matchId, mode) => apiClient.post(`/matches/${matchId}/mode`, { mode }),
  listVideoQuestions: (matchId, subjectId) =>
    apiClient.get(`/matches/${matchId}/video-questions${toQuery({ subjectId })}`),
};

// ---- Controller / Public Display API (spec section 13) ----
export const controllerApi = {
  getPublicState: async (matchId) => normalizeLiveState(await apiClient.get(`/matches/${matchId}/public-state`)),
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

      if (!cancelled && state && (!state.matchId || String(state.matchId) === String(matchId))) onUpdate?.(state);
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
