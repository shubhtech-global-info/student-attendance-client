import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import HodLogin from "./pages/HodLogin";
import HodRegister from "./pages/HodRegister";
import HodDashboard from "./pages/HodDashboard";
import ProfessorsPage from "./pages/ProfessorsPage";
import ClassesPage from "./pages/ClassesPage";
import AssignProfessorsPage from "./pages/AssignProfessorsPage";
import StudentsPage from "./pages/StudentsPage";
import AssignStudentsPage from "./pages/AssignStudentsPage";
import HodProfile from "./pages/HodProfile";
import ProtectedRoute from "./components/ProtectedRoute";
import { ConfirmProvider } from "./components/ConfirmProvider"; // ⬅️ add this
import HodAttendance from "./pages/HodAttendance";

function App() {
  const { hod, token } = useAuth();

  return (
    <Router>
      <ConfirmProvider>
        <Routes>
          {/* Protected Routes */}
          <Route
            path="/hod/assign-students"
            element={
              <ProtectedRoute>
                <AssignStudentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/attendance"
            element={<HodAttendance />
            }
          />

          <Route
            path="/hod/students"
            element={
              <ProtectedRoute>
                <StudentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/assign-professors"
            element={
              <ProtectedRoute>
                <AssignProfessorsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/dashboard"
            element={
              <ProtectedRoute>
                <HodDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/professors"
            element={
              <ProtectedRoute>
                <ProfessorsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/classes"
            element={
              <ProtectedRoute>
                <ClassesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/hod/profile"
            element={
              <ProtectedRoute>
                <HodProfile />
              </ProtectedRoute>
            }
          />

          {/* Redirect root to HOD login */}
          <Route path="/" element={<Navigate to="/hod/login" replace />} />

          {/* HOD Authentication */}
          <Route
            path="/hod/login"
            element={
              hod && token ? <Navigate to="/hod/dashboard" replace /> : <HodLogin />
            }
          />
          <Route path="/hod/register" element={<HodRegister />} />

          {/* 404 fallback */}
          <Route
            path="*"
            element={
              <h1 className="text-center mt-10 text-red-600 text-2xl">
                404 🚫 Page Not Found
              </h1>
            }
          />
        </Routes>
      </ConfirmProvider>
    </Router>
  );
}

export default App;
