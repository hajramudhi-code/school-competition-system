import { apiClient } from "./client";

function toQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, v);
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export const schoolsApi = {
  list: (params) => apiClient.get(`/schools${toQuery(params)}`),
  get: (id) => apiClient.get(`/schools/${id}`),
  create: (data) => apiClient.post("/schools", data),
  update: (id, data) => apiClient.patch(`/schools/${id}`, data),
  setStatus: (id, status) => apiClient.patch(`/schools/${id}/status`, { status }),
};

export { toQuery };
