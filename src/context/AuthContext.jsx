import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../api/authApi";
import { sessionStore } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // On refresh there is no token in memory (by design — no localStorage),
    // so the app simply lands unauthenticated. This effect exists so future
    // real-backend integration (e.g. httpOnly cookie session) can resolve
    // the session here without changing any component.
    setInitializing(false);
  }, []);

  async function loginAsAdmin(name, password) {
    const { user, token } = await authApi.adminLogin({ name, password });
    sessionStore.setToken(token);
    setUser(user);
    return user;
  }

  async function loginAsStaff(username, password) {
    const { user, token } = await authApi.staffLogin({ username, password });
    sessionStore.setToken(token);
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
