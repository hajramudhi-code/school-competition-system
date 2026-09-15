import { apiClient } from "./client";
import { toQuery } from "./schoolsApi";

export const subjectsApi = {
  list: (params) => apiClient.get(`/subjects${toQuery(params)}`),
  create: (data) => apiClient.post("/subjects", data),
  update: (id, data) => apiClient.patch(`/subjects/${id}`, data),
  setStatus: (id, status) => apiClient.patch(`/subjects/${id}/status`, { status }),
};
