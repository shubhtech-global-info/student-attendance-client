// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { hod, token, loading } = useAuth();

  // If we are still hydrating profile from token, don't redirect yet
  if (loading) {
    return null;
  }

  if (!hod || !token) {
    return <Navigate to="/hod/login" replace />;
  }

  return children;
}
