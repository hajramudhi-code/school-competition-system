import { apiClient } from "./client";

export const authApi = {
  adminLogin: (data) => apiClient.post("/auth/admin/login", data),
  staffLogin: (data) => apiClient.post("/auth/staff/login", data),
  me: () => apiClient.get("/auth/me"),
  logout: () => apiClient.post("/auth/logout"),
};

export const usersApi = {
  getAdminProfile: () => apiClient.get("/admin/profile"),
  verifyAdminPassword: (currentPassword) =>
    apiClient.post("/admin/profile/verify-password", { currentPassword }),
  updateAdminProfile: (data) => apiClient.patch("/admin/profile", data),
  assignHost: (competitionId, data) => apiClient.post(`/competitions/${competitionId}/host`, data),
  assignController: (competitionId, data) =>
    apiClient.post(`/competitions/${competitionId}/controller`, data),
  updateStaff: (staffId, data) => apiClient.patch(`/staff/${staffId}`, data),
};
