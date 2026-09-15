import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/common/index.jsx";
import ProtectedRoute from "./routes/ProtectedRoute";

import LandingPage from "./pages/LandingPage";
import AdminLogin from "./pages/auth/AdminLogin";
import StaffLogin from "./pages/auth/StaffLogin";

import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Schools from "./pages/admin/Schools";
import Subjects from "./pages/admin/Subjects";
import QuestionBank from "./pages/admin/QuestionBank";
import CompetitionSetup from "./pages/admin/CompetitionSetup";
import MatchesFixtures from "./pages/admin/MatchesFixtures";
import Results from "./pages/admin/Results";
import Reports from "./pages/admin/Reports";
import Matches from "./pages/admin/Matches";

import HostPage from "./pages/host/HostPage";
import ControllerPage from "./pages/controller/ControllerPage";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/staff/login" element={<StaffLogin />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute allow={["ADMIN"]}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="schools" element={<Schools />} />
              <Route path="subjects" element={<Subjects />} />
              <Route path="question-bank" element={<QuestionBank />} />
              <Route path="competition-setup" element={<CompetitionSetup />} />
              <Route path="matches" element={<Matches />} />
              <Route path="fixtures" element={<MatchesFixtures />} />
              <Route path="results" element={<Results />} />
              <Route path="reports" element={<Reports />} />
            </Route>

            <Route
              path="/host"
              element={
                <ProtectedRoute allow={["HOST"]}>
                  <HostPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/controller"
              element={
                <ProtectedRoute allow={["CONTROLLER"]}>
                  <ControllerPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
