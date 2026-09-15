import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AuthShell from "./AuthShell";
import { PasswordInput } from "../../components/common/index.jsx";

export default function AdminLogin() {
  const { loginAsAdmin } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!name || !password) return setError("Name and password are required.");
    setBusy(true);
    try {
      await loginAsAdmin(name, password);
      navigate("/admin");
    } catch (err) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="ADMIN LOGIN" subtitle="Welcome back! Please sign in to continue." side="left" icon="fas fa-chess-rook" accent="cyan">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label className="field-label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="field-label">Password</label>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <span className="field-error">{error}</span>}
        <button className="btn btn-primary" disabled={busy} style={{ marginTop: 4 }}>
          {busy ? "Logging in..." : "Log In"}
        </button>
        {/* <p style={{ fontSize: 12, textAlign: "center", color: "var(--text-muted)" }}>
          Demo credentials: <strong>Admin</strong> / <strong>admin123</strong>
        </p> */}
      </form>
    </AuthShell>
  );
}
