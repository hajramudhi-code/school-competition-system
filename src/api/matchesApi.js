import { apiClient } from "./client";
import { toQuery } from "./schoolsApi";

export const matchesApi = {
  list: (params) => apiClient.get(`/matches${toQuery(params)}`),
  get: (id) => apiClient.get(`/matches/${id}`),
  update: (id, data) => apiClient.patch(`/matches/${id}`, data),
};

