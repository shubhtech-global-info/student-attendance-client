// src/pages/HodDashboard.jsx
import { useAuth } from "../context/AuthContext";
import { LogOut, User, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getProfessors, getClasses, getStudents } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function HodDashboard() {
  const { hod, logout } = useAuth();
  const navigate = useNavigate();

  const [professors, setProfessors] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchProfessors();
    fetchClasses();
    fetchStudents();
  }, []);

  const fetchProfessors = async () => {
    try {
      const res = await getProfessors();
      setProfessors(res.data?.professors || []);
    } catch (err) {
      console.error("Error fetching professors", err);
    }
  };

  const fetchClasses = async () => {
    try {
      const list = await getClasses();
      setClasses(list);
    } catch (err) {
      console.error("Error fetching classes", err);
    }
  };

  const fetchStudents = async () => {
    try {
      const studs = await getStudents();
      setStudents(studs);
    } catch (err) {
      console.error("Error fetching students", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="flex-grow max-w-6xl mx-auto p-6 w-full">
        {/* Top Bar */}
        <div className="bg-white shadow-md rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between">
            {/* Left: Dashboard title (hidden on mobile) */}
            <h1 className="hidden sm:flex text-xl sm:text-2xl font-bold text-purple-700 items-center gap-2">
              🎓 HOD Dashboard
            </h1>

            {/* Center: college name (always centered) */}
            <div className="flex-1 flex justify-center">
              <h1 className="flex items-center gap-1 text-lg sm:text-2xl md:text-3xl font-bold text-purple-800 tracking-tight text-center">
                🏛️ {hod?.collegeName || "Your College"}
              </h1>
            </div>

            {/* Right: profile + logout on desktop, hamburger on mobile */}
            <div className="flex items-center gap-4">
              {/* Desktop buttons */}
              <div className="hidden sm:flex items-center gap-4">
                <span className="font-medium text-gray-700 hidden md:inline">
                  👋 Welcome, {hod?.username || ""}
                </span>

                <button
                  onClick={() => navigate("/hod/profile")}
                  className="p-2 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 hover:scale-110 transition-all shadow-md"
                  title="Profile"
                >
                  <User size={28} />
                </button>

                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 text-white font-medium hover:from-red-600 hover:to-pink-600 shadow-md hover:shadow-lg transition-all"
                >
                  <LogOut size={18} /> Logout
                </button>
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="sm:hidden p-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-all"
              >
                <Menu size={26} />
              </button>
            </div>
          </div>
        </div>


        {/* Sidebar (mobile only) */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex">
            {/* Sidebar panel */}
            <div className="w-64 bg-white shadow-xl p-6 flex flex-col gap-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-purple-700">
                  Menu
                </h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <X size={22} />
                </button>
              </div>

              <p className="font-medium text-gray-700">
                👋 Welcome, {hod?.username || ""}
              </p>

              <button
                onClick={() => {
                  navigate("/hod/profile");
                  setSidebarOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200"
              >
                <User size={20} /> Profile
              </button>

              <button
                onClick={() => {
                  logout();
                  setSidebarOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                <LogOut size={20} /> Logout
              </button>
            </div>

            {/* Click outside to close */}
            <div
              className="flex-1"
              onClick={() => setSidebarOpen(false)}
            ></div>
          </div>
        )}

        {/* Stats / Actions Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
          <div
            onClick={() => navigate("/hod/professors")}
            className="cursor-pointer bg-white rounded-2xl shadow-lg p-6 text-center hover:scale-105 transition"
          >
            <div className="text-4xl mb-2">👩‍🏫</div>
            <h2 className="text-xl font-bold text-gray-800">Professors</h2>
            <p className="text-gray-500">{professors.length} registered</p>
          </div>

          <div
            onClick={() => navigate("/hod/classes")}
            className="cursor-pointer bg-white rounded-2xl shadow-lg p-6 text-center hover:scale-105 transition"
          >
            <div className="text-4xl mb-2">🏫</div>
            <h2 className="text-xl font-bold text-gray-800">Classes</h2>
            <p className="text-gray-500">{classes.length} created</p>
          </div>

          <div
            onClick={() => navigate("/hod/students")}
            className="cursor-pointer bg-white rounded-2xl shadow-lg p-6 text-center hover:scale-105 transition"
          >
            <div className="text-4xl mb-2">🧑‍🎓</div>
            <h2 className="text-xl font-bold text-gray-800">Students</h2>
            <p className="text-gray-500">{students.length} enrolled</p>
          </div>

          <div
            onClick={() => navigate("/hod/assign-professors")}
            className="cursor-pointer bg-white rounded-2xl shadow-lg p-6 text-center hover:scale-105 transition"
          >
            <div className="text-4xl mb-2">📌</div>
            <h2 className="text-xl font-bold text-gray-800">Assign Professors</h2>
            <p className="text-gray-500">Map professors to classes</p>
          </div>

          <div
            onClick={() => navigate("/hod/assign-students")}
            className="cursor-pointer bg-white rounded-2xl shadow-lg p-6 text-center hover:scale-105 transition"
          >
            <div className="text-4xl mb-2">🧑‍🎓➕</div>
            <h2 className="text-xl font-bold text-gray-800">Assign Students</h2>
            <p className="text-gray-500">Map students to classes</p>
          </div>
          <div
            onClick={() => navigate("/hod/attendance")}
            className="cursor-pointer bg-white rounded-2xl shadow-lg p-6 text-center hover:scale-105 transition"
          >
            <div className="text-4xl mb-2">📊</div>
            <h2 className="text-xl font-bold text-gray-800">Attendance</h2>
            <p className="text-gray-500">View class/student attendance</p>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="relative bg-gradient-to-r from-purple-200 via-pink-200 to-purple-300 text-gray-800 pt-6 pb-4 shadow-lg mt-10">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-300/40 via-pink-300/40 to-purple-400/40 blur-2xl opacity-40"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 via-red-500 via-orange-400 via-yellow-400 via-green-400 via-blue-500 to-purple-600 animate-pulse"></div>

        <div className="relative z-10 flex flex-col items-center gap-3 w-full">
          <p className="text-base sm:text-lg font-semibold tracking-wide text-center">
            🚀 Developed with <span className="text-red-500 animate-pulse">❤️</span> by{" "}
            <span className="font-extrabold text-purple-700 hover:text-pink-600 transition-colors duration-300">
              Shubh Tech
            </span>
          </p>
          <p className="text-xs sm:text-sm mt-3 text-gray-600 text-center">
            © {new Date().getFullYear()} Shubh Tech. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
