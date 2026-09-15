import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ProfilePopup from "./ProfilePopup";

export default function AdminHeader({ title }) {
  const { user } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 28px",
        borderBottom: "1px solid var(--border-color)",
        background: "var(--bg-main)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <h2 style={{ fontSize: 20 }}>{title}</h2>
      <button
        onClick={() => setShowProfile(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-main)",
        }}
      >
        <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{user?.name}</span>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--bg-card-elevated)",
            border: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
          }}
        >
          {user?.name?.[0]?.toUpperCase() || "A"}
        </span>
      </button>
      {showProfile && <ProfilePopup onClose={() => setShowProfile(false)} />}
    </header>
  );
}
