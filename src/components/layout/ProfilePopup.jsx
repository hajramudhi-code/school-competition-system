import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { usersApi } from "../../api/authApi";
import { Modal, PasswordInput, useToast } from "../common/index.jsx";

export default function ProfilePopup({ onClose }) {
  const { user, logout, setUser } = useAuth();
  const { showToast } = useToast();
  const [stage, setStage] = useState("menu"); // menu | verify | edit
  const [currentPassword, setCurrentPassword] = useState("");
  const [name, setName] = useState(user?.name || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function verify() {
    setBusy(true);
    setError("");
    try {
      await usersApi.verifyAdminPassword(currentPassword);
      setStage("edit");
    } catch {
      setError("Access denied");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    if (newPassword && newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }
    try {
      const updated = await usersApi.updateAdminProfile({
        currentPassword,
        name,
        newPassword: newPassword || undefined,
        confirmNewPassword: confirmNewPassword || undefined,
      });
      setUser({ ...user, name: updated.name });
      showToast("Profile updated", "success");
      onClose();
    } catch (e) {
      setError(e.message || "Could not update profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Profile" onClose={onClose} width={380}>
      {stage === "menu" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="card" style={{ padding: 16 }}>
            <p style={{ color: "var(--text-main)", fontWeight: 600 }}>{user?.name}</p>
            <p style={{ fontSize: 13 }}>Administrator</p>
          </div>
          <button className="btn btn-secondary" onClick={() => setStage("verify")}>
            Edit Profile
          </button>
          <button className="btn btn-danger" onClick={logout}>
            Logout
          </button>
        </div>
      )}

      {stage === "verify" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label className="field-label">Current Password</label>
          <PasswordInput className={`input ${error ? "has-error" : ""}`} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoFocus />
          {error && <span className="field-error">{error}</span>}
          <button className="btn btn-primary" onClick={verify} disabled={busy || !currentPassword}>
            Continue
          </button>
        </div>
      )}

      {stage === "edit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label className="field-label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="field-label">New Password (optional)</label>
            <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Confirm New Password</label>
            <PasswordInput value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
          </div>
          {error && <span className="field-error">{error}</span>}
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            Save
          </button>
        </div>
      )}
    </Modal>
  );
}
