import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, UserRoundCheck } from "lucide-react"; // <-- icons
import { useNavigate } from "react-router-dom";

export default function HodLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOk("");
  
    try {
      // Use AuthContext.login which already posts to /hods/login internally
      const res = await login({ username, password });
  
      // AuthContext.login saves token & hod (and fetches profile). Show success & navigate:
      const message = res?.data?.message || "🎉 Login successful!";
      setOk(message);
  
      setTimeout(() => navigate("/hod/dashboard"), 800);
    } catch (err) {
      // AuthContext.login already alerts server message; still set error UI
      const msg = err?.response?.data?.error || "Login failed ❌";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="relative bg-white/90 backdrop-blur shadow-2xl rounded-3xl w-full max-w-md p-8 ring-1 ring-indigo-100">
        {/* Decorative badge (emoji instead of image) */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-full p-4 ring-1 ring-indigo-100">
          <UserRoundCheck className="w-12 h-12 text-purple-600" />
        </div>

        <h2 className="text-3xl font-extrabold text-center text-indigo-700 mt-6">
          🎓 HOD Login
        </h2>
        <p className="text-center text-gray-500 mt-2">
          Welcome back! Access your attendance dashboard.
        </p>

        {/* Alerts */}
        {error && (
          <div className="mt-6 bg-red-50 text-red-700 text-sm p-3 rounded-xl border border-red-100">
            {error}
          </div>
        )}
        {ok && (
          <div className="mt-6 bg-green-50 text-green-700 text-sm p-3 rounded-xl border border-green-100">
            {ok}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              👤 Username
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none"
              placeholder="e.g. testadmin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          {/* Password with eye toggle */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              🔑 Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none pr-12"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] transition disabled:opacity-60"
          >
            {loading ? "⏳ Logging in..." : "🚀 Login"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Don’t have an account?{" "}
          <a href="/hod/register" className="text-indigo-600 font-semibold hover:underline">
            Register here ✨
          </a>
        </div>

        {/* Decorative footer (emoji instead of image) */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-400">
          <span className="text-base">📝</span>
          <span>Student Attendance System • v1.0</span>
        </div>
      </div>
    </div>
  );
}
