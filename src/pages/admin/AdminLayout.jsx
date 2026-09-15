import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AdminHeader from "../../components/layout/AdminHeader";

const TITLES = {
  "/admin": "Dashboard",
  "/admin/schools": "Schools",
  "/admin/subjects": "Subjects",
  "/admin/question-bank": "Question Bank",
  "/admin/competition-setup": "Competition Setup",
  "/admin/matches": "Matches",
  "/admin/fixtures": "Fixtures",
  "/admin/results": "Results",
  "/admin/reports": "Reports",
};

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const title = TITLES[location.pathname] || "Admin";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div style={{ flex: 1, minWidth: 0, transition: "width 300ms ease-in-out" }}>
        <AdminHeader title={title} />
        <main style={{ padding: 28 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
