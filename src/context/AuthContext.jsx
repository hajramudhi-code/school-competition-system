import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../api/authApi";
import { sessionStore } from "../api/client";

const AuthContext = createContext(null);

function normalizeUser(payload) {
  if (!payload) return null;
  const user = payload.user ?? payload;
  if (!user) return null;

  const competitionId = user.competitionId ?? user.competition_id ?? user.competition?.id ?? null;
  return { ...user, competitionId };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!sessionStore.token) {
      setInitializing(false);
      return;
    }

    authApi
      .me()
      .then((payload) => setUser(normalizeUser(payload)))
      .catch(() => sessionStore.clearToken())
      .finally(() => setInitializing(false));
  }, []);

  async function loginAsAdmin(name, password) {
    const payload = await authApi.adminLogin({ name, password });
    const user = normalizeUser(payload);
    const token = payload?.token;
    if (token) sessionStore.setToken(token);
    setUser(user);
    return user;
  }

  async function loginAsStaff(username, password) {
    const payload = await authApi.staffLogin({ username, password });
    const user = normalizeUser(payload);
    const token = payload?.token;
    if (token) sessionStore.setToken(token);
    setUser(user);
    return user;
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      sessionStore.clearToken();
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, initializing, loginAsAdmin, loginAsStaff, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
