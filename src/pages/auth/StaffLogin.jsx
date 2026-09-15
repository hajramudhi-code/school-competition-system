import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AuthShell from "./AuthShell";
import { PasswordInput } from "../../components/common/index.jsx";

export default function StaffLogin() {
  const { loginAsStaff } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!username || !password) return setError("Username and password are required.");
    setBusy(true);
    try {
      const user = await loginAsStaff(username, password);
      navigate(user.role === "HOST" ? "/host" : "/controller");
    } catch (err) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Staff Log In" subtitle="Your role is determined automatically after Log in.">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label className="field-label">Username</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
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
          Demo Host: <strong>host1</strong> / <strong>host123</strong>
          <br />
          Demo Controller: <strong>controller1</strong> / <strong>ctrl123</strong>
        </p> */}
      </form>
    </AuthShell>
  );
}
