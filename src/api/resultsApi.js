import { apiClient } from "./client";

export const resultsApi = {
  getMatchResult: (matchId) => apiClient.get(`/matches/${matchId}/result`),
  finalize: (matchId) => apiClient.post(`/matches/${matchId}/finalize`),
};
