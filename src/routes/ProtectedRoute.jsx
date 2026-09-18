import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingState } from "../components/common/index.jsx";

export default function ProtectedRoute({ allow, children }) {
  const { user, initializing } = useAuth();

  if (initializing) return <LoadingState label="Checking session..." />;
  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (allow && !allow.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
