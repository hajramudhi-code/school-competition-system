import { apiClient } from "./client";
import { toQuery } from "./schoolsApi";

export const competitionsApi = {
  list: (params) => apiClient.get(`/competitions${toQuery(params)}`),
  listPublic: () => apiClient.get("/competitions/public"),
  get: (id) => apiClient.get(`/competitions/${id}`),
  create: (data) => apiClient.post("/competitions", data),
  update: (id, data) => apiClient.patch(`/competitions/${id}`, data),
  remove: (id) => apiClient.delete(`/competitions/${id}`),

  generateFixture: (id, schedule) => apiClient.post(`/competitions/${id}/fixtures/generate`, schedule),
  getFixture: (id) => apiClient.get(`/competitions/${id}/fixtures`),
  regenerateFixture: (id, schedule) => apiClient.post(`/competitions/${id}/fixtures/regenerate`, schedule),

  listResults: (id, params) => apiClient.get(`/competitions/${id}/results${toQuery(params)}`),

  requestReport: (id) => apiClient.post(`/competitions/${id}/reports`),
};

export const reportsApi = {
  getStatus: (reportId) => apiClient.get(`/reports/${reportId}`),
  downloadFile: (reportId) => apiClient.getBlob(`/reports/${reportId}/file`),
};

export const sponsorsApi = {
  list: () => apiClient.get("/sponsors"),
  create: (data) => apiClient.post("/sponsors", data),
  update: (id, data) => apiClient.patch(`/sponsors/${id}`, data),
  createWithLogo: (formData) => apiClient.postForm("/sponsors", formData),
  updateWithLogo: (id, formData) => apiClient.patchForm(`/sponsors/${id}`, formData),
};

export const dashboardApi = {
  getAdminSummary: () => apiClient.get("/admin/dashboard"),
};
