// Central fetch wrapper. Every API service module goes through this client
// so the base URL / auth header / error shape is handled in exactly one place.
// Change VITE_API_BASE_URL to point the frontend at a different backend.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function getToken() {
  return sessionStore.token;
}

const TOKEN_STORAGE_KEY = "school-competition-auth-token";

export const sessionStore = {
  token: localStorage.getItem(TOKEN_STORAGE_KEY),
  setToken(token) {
    this.token = token;
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  },
  clearToken() {
    this.token = null;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  },
};

class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.error?.message || "Request failed");
    this.status = status;
    this.code = payload?.error?.code;
    this.fields = payload?.error?.fields;
  }
}

function notifyApiError(message) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("api-error", { detail: message }));
  }
}

async function request(path, { method = "GET", body, isFormData = false, responseType = "json" } = {}) {
  const headers = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  if (responseType === "blob") {
    if (!res.ok) {
      let payload = null;
      try {
        payload = await res.json();
      } catch {
        /* noop */
      }
      const error = new ApiError(res.status, payload);
      notifyApiError(error.message);
      throw error;
    }
    return res.blob();
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    const error = new ApiError(res.status, payload);
    notifyApiError(error.message);
    throw error;
  }
  return payload;
}

export const apiClient = {
  get: (path) => request(path),
  post: (path, body, opts) => request(path, { method: "POST", body, ...opts }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  delete: (path) => request(path, { method: "DELETE" }),
  postForm: (path, formData) => request(path, { method: "POST", body: formData, isFormData: true }),
  getBlob: (path) => request(path, { responseType: "blob" }),
};

export { ApiError };
