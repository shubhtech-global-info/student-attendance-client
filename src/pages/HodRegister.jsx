// src/pages/HodRegister.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api, { resendOtp } from "../services/api";
import { Eye, EyeOff, Building2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function HodRegister() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  // step state
  const [step, setStep] = useState(1);

  // form values
  const [collegeName, setCollegeName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [altPassword, setAltPassword] = useState("");
  const [showAltPassword, setShowAltPassword] = useState(false);

  // ui state
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setError("");

    try {
      const res = await api.post("/hods/register", {
        collegeName,
        username,
        password,
        altPassword,
        email,
      });

      setMsg(res.data.message || "✅ Registered successfully, check your email for OTP.");
      setStep(2);
    } catch (err) {
      const backendMsg = err?.response?.data?.error;
      const finalMsg = backendMsg
        ? `Registration failed: ${backendMsg}`
        : "Registration failed";
      setError(finalMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setError("");

    try {
      const res = await api.post("/hods/verify-otp", {
        email,
        otp,
      });

      const { token, hod, message } = res.data;
      setAuth(hod, token);
      setMsg(message || "🎉 OTP Verified! You’re logged in.");

      setTimeout(() => navigate("/hod/dashboard"), 1200);
    } catch (err) {
      const backendMsg = err?.response?.data?.error;
      const finalMsg = backendMsg
        ? `OTP verification failed: ${backendMsg}`
        : "OTP verification failed";
      setError(finalMsg);
    } finally {
      setLoading(false);
    }
  };

  // resend OTP
  const handleResendOtp = async () => {
    if (!email) {
      setError("Please provide your email in the form above to resend OTP.");
      return;
    }
    setLoading(true);
    setError("");
    setMsg("");
    try {
      await resendOtp({ email });
      setMsg("✅ OTP resent to your email. Check spam/junk too.");
    } catch (err) {
      const backendMsg = err?.response?.data?.error || err?.response?.data?.message;
      setError(backendMsg ? `Failed to resend OTP: ${backendMsg}` : "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="relative bg-white/90 backdrop-blur shadow-2xl rounded-3xl w-full max-w-lg p-8 ring-1 ring-purple-100">

        {/* Dummy College Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 flex items-center justify-center bg-purple-100 rounded-full">
            <Building2 className="w-12 h-12 text-purple-600" />
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-center text-purple-700">
          🏫 HOD Registration
        </h2>
        <p className="text-center text-gray-500 mt-2">
          Create your college admin account
        </p>

        {error && (
          <div className="mt-6 flex items-center justify-between bg-red-50 text-red-700 text-sm p-3 rounded-xl border border-red-100">
            <span className="flex items-center gap-2">
              <XCircle size={18} />
              {error}
            </span>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-700 hover:text-red-900"
            >
              ✖
            </button>
          </div>
        )}

        {msg && (
          <div className="mt-6 bg-green-50 text-green-700 text-sm p-3 rounded-xl border border-green-100">
            {msg}
          </div>
        )}

        {/* STEP 1: Register */}
        {step === 1 && (
          <form onSubmit={handleRegister} className="mt-6 space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                🏫 College Name
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none"
                placeholder="e.g. Test College"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">
                👤 Username
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none"
                placeholder="e.g. testadmin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">
                📧 Email
              </label>
              <input
                type="email"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none"
                placeholder="your_real_email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password with Eye Toggle */}
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                🔑 Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none pr-12"
                  placeholder="Choose a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <div>
              <label className="block text-gray-700 font-medium mb-1">
                🔑 Alternate Password (for Email Login)
              </label>
              <div className="relative">
                <input
                  type={showAltPassword ? "text" : "password"}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none pr-12"
                  placeholder="Choose another strong password"
                  value={altPassword}
                  onChange={(e) => setAltPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowAltPassword(!showAltPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showAltPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.99] transition disabled:opacity-60"
            >
              {loading ? "⏳ Registering..." : "🚀 Register"}
            </button>

            {/* 🔹 Extra button to go to Verify OTP form */}
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-2 mt-2 rounded-xl font-semibold text-purple-600 bg-purple-100 hover:bg-purple-200 active:scale-[0.99] transition"
            >
              Go to Verify OTP
            </button>
          </form>
        )}

        {/* STEP 2: Verify OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                🔒 Enter OTP
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none"
                placeholder="6-digit code from your email"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 active:scale-[0.99] transition disabled:opacity-60"
            >
              {loading ? "⏳ Verifying..." : "✅ Verify OTP"}
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading}
              className="text-sm text-purple-600 font-semibold hover:underline"
            >
              Didn't receive? Resend OTP
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a href="/hod/login" className="text-purple-600 font-semibold hover:underline">
            Login here 🔐
          </a>
        </div>
      </div>
    </div>
  );
}
