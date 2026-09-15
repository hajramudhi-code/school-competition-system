import React from "react";
import { NavLink } from "react-router-dom";

const MENU = [
  { to: "/admin", label: "Dashboard", icon: "fas fa-chart-line", end: true },
  { to: "/admin/schools", label: "Schools", icon: "fas fa-school" },
  { to: "/admin/subjects", label: "Subjects", icon: "fas fa-book" },
  { to: "/admin/question-bank", label: "Question Bank", icon: "fas fa-circle-question" },
  { to: "/admin/competition-setup", label: "Competition Setup", icon: "fas fa-trophy" },
  { to: "/admin/matches", label: "Matches", icon: "fas fa-calendar-days" },
  { to: "/admin/fixtures", label: "Fixtures", icon: "fas fa-diagram-project" },
  { to: "/admin/results", label: "Results", icon: "fas fa-chart-column" },
  { to: "/admin/reports", label: "Reports", icon: "fas fa-file-lines" },
];

export default function AdminSidebar({ collapsed, onToggle }) {
  return (
    <aside
      style={{
        width: collapsed ? 76 : 248,
        transition: "width 300ms ease-in-out",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 16px", borderBottom: "1px solid var(--border-color)" }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "linear-gradient(135deg, var(--blue-primary), var(--blue-highlight))",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontFamily: "var(--font-display)",
          }}
        >
          IC
        </div>
        <div
          style={{
            overflow: "hidden",
            whiteSpace: "nowrap",
            opacity: collapsed ? 0 : 1,
            transition: "opacity 200ms ease-in-out",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          Competition Control
        </div>
      </div>

      <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {MENU.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              textDecoration: "none",
              color: isActive ? "var(--text-main)" : "var(--text-secondary)",
              background: isActive ? "var(--bg-card-elevated)" : "transparent",
              borderLeft: isActive ? "3px solid var(--blue-highlight)" : "3px solid transparent",
              transition: "background 150ms ease, color 150ms ease",
              whiteSpace: "nowrap",
            })}
          >
            <span aria-hidden style={{ fontSize: 16, width: 20, textAlign: "center", flexShrink: 0 }}>
              <i className={item.icon} aria-hidden="true" />
            </span>
            <span style={{ overflow: "hidden", opacity: collapsed ? 0 : 1, transition: "opacity 200ms ease-in-out" }}>
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      <button
        onClick={onToggle}
        className="btn btn-ghost"
        style={{ margin: 12, justifyContent: collapsed ? "center" : "flex-start" }}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <i className={collapsed ? "fas fa-angles-right" : "fas fa-angles-left"} aria-hidden="true" />
        {!collapsed && " Collapse"}
      </button>
    </aside>
  );
}
