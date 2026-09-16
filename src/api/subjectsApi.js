import { apiClient } from "./client";
import { toQuery } from "./schoolsApi";

export const subjectsApi = {
  list: (params) => apiClient.get(`/subjects${toQuery(params)}`),
  get: (id) => apiClient.get(`/subjects/${id}`),
  create: (data) => apiClient.post("/subjects", data),
  update: (id, data) => apiClient.patch(`/subjects/${id}`, data),
  remove: (id) => apiClient.delete(`/subjects/${id}`),
  setStatus: (id, status) => apiClient.patch(`/subjects/${id}/status`, { status }),
};
