// Central fetch wrapper. Every API service module goes through this client
// so the base URL / auth header / error shape is handled in exactly one place.
// Change VITE_API_BASE_URL to point the frontend at a different backend.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function getToken() {
  return sessionStore.token;
}

// In-memory token store (NOT localStorage — see spec section 4).
// Token lives only for the lifetime of the JS runtime/tab; on refresh the
// app re-resolves the session via GET /api/auth/me against the configured API.
export const sessionStore = {
  token: null,
  setToken(token) {
    this.token = token;
  },
  clearToken() {
    this.token = null;
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
      throw new ApiError(res.status, payload);
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
    throw new ApiError(res.status, payload);
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
