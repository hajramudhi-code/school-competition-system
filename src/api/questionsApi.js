import { apiClient } from "./client";
import { toQuery } from "./schoolsApi";

export const questionsApi = {
  list: (params) => apiClient.get(`/questions${toQuery(params)}`),
  get: (id) => apiClient.get(`/questions/${id}`),
  create: (data) => apiClient.post("/questions", data),
  update: (id, data) => apiClient.patch(`/questions/${id}`, data),
  remove: (id) => apiClient.delete(`/questions/${id}`),
  setStatus: (id, status) => apiClient.patch(`/questions/${id}/status`, { status }),
};

export const templatesApi = {
  requestDownload: (config) => apiClient.post("/questions/templates/download", config),
  upload: (formData) => apiClient.postForm("/questions/templates/upload", formData),
};
