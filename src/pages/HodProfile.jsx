// src/pages/HodProfile.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  updateHod,
  verifyUpdateOtp,
  sendDeleteOtp,
  confirmDeleteHod,
} from "../services/api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  User,
  Mail,
  Lock,
  Save,
  KeyRound,
  Trash2,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";

export default function HodProfile() {
  const { hod, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Profile states
  const [profile, setProfile] = useState({
    collegeName: "",
    username: "",
    email: "",
    password: "",
    altPassword: "",

  });
  const [editedProfile, setEditedProfile] = useState(profile);
  const [isEditingDirect, setIsEditingDirect] = useState(false);
  const [isEditingSensitive, setIsEditingSensitive] = useState(false);

  // Loading & OTP
  const [updateLoading, setUpdateLoading] = useState(false);
  const [sendDeleteLoading, setSendDeleteLoading] = useState(false);
  const [confirmDeleteLoading, setConfirmDeleteLoading] = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState("");
  const [deleteOtp, setDeleteOtp] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showAltPassword, setShowAltPassword] = useState(false);

  // Initialize profile
  useEffect(() => {
    if (hod) {
      const initProfile = {
        collegeName: hod.collegeName || "",
        username: hod.username || "",
        email: hod.email || "",
        password: "",
        altPassword: "",

      };
      setProfile(initProfile);
      setEditedProfile(initProfile);
    }
  }, [hod]);

  // ---------------- Handlers ----------------
  const handleCancelDirect = () => {
    setEditedProfile({ ...profile, password: "", altPassword: "" });
    setIsEditingDirect(false);
  };
  const handleCancelSensitive = () => {
    setEditedProfile({ ...profile, password: "", altPassword: "" });
    setIsEditingSensitive(false);
  };

  const handleUpdate = async (e) => {
    e?.preventDefault?.();
    setUpdateLoading(true);
    setPendingMessage("");
    try {
      const direct = {};
      const sensitive = {};

      if (editedProfile.username !== profile.username)
        direct.username = editedProfile.username;
      if (editedProfile.collegeName !== profile.collegeName)
        direct.collegeName = editedProfile.collegeName;

      if (editedProfile.email !== profile.email)
        sensitive.email = editedProfile.email;
      if (editedProfile.password) sensitive.password = editedProfile.password;

      if (editedProfile.altPassword)
        sensitive.altPassword = editedProfile.altPassword;

      if (Object.keys(direct).length && Object.keys(sensitive).length) {
        toast.error("⚠️ Cannot update normal and sensitive fields together.");
        return;
      }

      if (Object.keys(direct).length) {
        const res = await updateHod(direct);
        toast.success(res?.data?.message || "✅ Profile updated successfully.");
        setProfile({ ...profile, ...direct });
        setIsEditingDirect(false);
        await refreshProfile();
      } else if (Object.keys(sensitive).length) {
        const res = await updateHod(sensitive);
        toast.success(res?.data?.message || "🔐 OTP sent. Please verify.");
        setOtpMode(true);
        setPendingMessage(
          res?.data?.email ? `📩 OTP sent to ${res.data.email}` : ""
        );
        setIsEditingSensitive(false);
      } else {
        toast.info("ℹ️ No changes detected.");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "❌ Failed to update profile.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleVerifyUpdateOtp = async (e) => {
    e?.preventDefault?.();
    if (!otp) return toast.error("Enter the OTP.");
    setUpdateLoading(true);
    try {
      const res = await verifyUpdateOtp({ otp });
      toast.success(res?.data?.message || "✅ Update verified.");
      setOtp("");
      setOtpMode(false);
      await refreshProfile();
    } catch (err) {
      toast.error(err?.response?.data?.message || "❌ OTP verification failed.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleResendUpdateOtp = async () => {
    if (!hod?.pendingUpdates)
      return toast.info("ℹ️ No pending sensitive update.");
    setUpdateLoading(true);
    try {
      await updateHod(hod.pendingUpdates);
      toast.success("🔄 OTP resent. Check your email.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "❌ Failed to resend OTP.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleSendDeleteOtp = async () => {
    setSendDeleteLoading(true);
    try {
      await sendDeleteOtp();
      toast.success("📩 Delete OTP sent to your email.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "❌ Failed to send delete OTP.");
    } finally {
      setSendDeleteLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteOtp) return toast.error("Enter delete OTP.");
    setConfirmDeleteLoading(true);
    try {
      await confirmDeleteHod({ otp: deleteOtp });
      toast.success("🗑️ Account deleted. Redirecting...");
      logout();
      navigate("/hod/login");
    } catch (err) {
      toast.error(err?.response?.data?.message || "❌ Failed to confirm delete.");
    } finally {
      setConfirmDeleteLoading(false);
    }
  };

  // ---------------- Render ----------------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-purple-700 mb-6 flex items-center gap-2">
          <ShieldCheck className="text-purple-600" /> HOD Profile & Settings ⚙️
        </h2>

        {/* Direct Info */}
        <form onSubmit={handleUpdate} className="space-y-6 mb-6">
          <div className="p-4 border rounded-lg bg-indigo-50">
            <h3 className="font-semibold text-purple-700 mb-3 flex items-center gap-2">
              <Building2 size={18} /> General Info (Direct Update)
            </h3>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Building2 size={16} /> College Name
                </label>
                <input
                  type="text"
                  value={editedProfile.collegeName}
                  onChange={(e) =>
                    setEditedProfile((prev) => ({
                      ...prev,
                      collegeName: e.target.value,
                    }))
                  }
                  disabled={!isEditingDirect}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 ${isEditingDirect
                    ? "border-purple-400"
                    : "border-gray-200 bg-gray-100"
                    }`}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <User size={16} /> Username
                </label>
                <input
                  type="text"
                  value={editedProfile.username}
                  onChange={(e) =>
                    setEditedProfile((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  disabled={!isEditingDirect}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 ${isEditingDirect
                    ? "border-purple-400"
                    : "border-gray-200 bg-gray-100"
                    }`}
                />
              </div>

              <div className="flex gap-2 mt-4 flex-wrap">
                {isEditingDirect ? (
                  <>
                    <button
                      type="submit"
                      disabled={updateLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition"
                    >
                      <Save size={16} />{" "}
                      {updateLoading ? "⏳ Working..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelDirect}
                      disabled={updateLoading}
                      className="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingDirect(true)}
                    className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                  >
                    ✏️ Edit General Info
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Sensitive Info */}
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="p-4 border rounded-lg bg-red-50">
            <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
              <Lock size={18} /> Sensitive Info (Requires OTP)
            </h3>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Mail size={16} /> Email
                </label>
                <input
                  type="email"
                  value={editedProfile.email}
                  onChange={(e) =>
                    setEditedProfile((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  disabled={!isEditingSensitive}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 ${isEditingSensitive
                    ? "border-red-400"
                    : "border-gray-200 bg-gray-100"
                    }`}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mt-2">
                  <KeyRound size={16} /> Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={editedProfile.password}
                    onChange={(e) =>
                      setEditedProfile((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    disabled={!isEditingSensitive}
                    placeholder="Enter new password"
                    className={`mt-1 block w-full rounded-md border px-3 py-2 ${isEditingSensitive
                      ? "border-red-400"
                      : "border-gray-200 bg-gray-100"
                      }`}
                  />
                  {isEditingSensitive && (
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mt-2">
                  <KeyRound size={16} /> Alternate Password
                </label>
                <div className="relative">
                  <input
                    type={showAltPassword ? "text" : "password"}
                    value={editedProfile.altPassword}
                    onChange={(e) =>
                      setEditedProfile((prev) => ({
                        ...prev,
                        altPassword: e.target.value,
                      }))
                    }
                    disabled={!isEditingSensitive}
                    placeholder="Enter new alternate password"
                    className={`mt-1 block w-full rounded-md border px-3 py-2 ${isEditingSensitive
                      ? "border-red-400"
                      : "border-gray-200 bg-gray-100"
                      }`}
                  />
                  {isEditingSensitive && (
                    <button
                      type="button"
                      onClick={() => setShowAltPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
                    >
                      {showAltPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-4 flex-wrap">
                {isEditingSensitive ? (
                  <>
                    <button
                      type="submit"
                      disabled={updateLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition"
                    >
                      <Save size={16} />{" "}
                      {updateLoading ? "⏳ Working..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelSensitive}
                      disabled={updateLoading}
                      className="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingSensitive(true)}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                  >
                    ✏️ Edit Sensitive Info
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Resend OTP */}
          {hod?.pendingUpdates && (
            <div className="mt-2">
              <button
                type="button"
                onClick={handleResendUpdateOtp}
                disabled={updateLoading}
                className="px-4 py-2 border rounded-lg"
              >
                🔄 Resend OTP
              </button>
            </div>
          )}
        </form>

        {/* OTP Verification */}
        {otpMode && (
          <div className="mt-6 p-4 border rounded-md bg-gray-50">
            <p className="text-sm text-gray-600 mb-2">
              Enter OTP to complete update{" "}
              {pendingMessage && <span>- {pendingMessage}</span>}
            </p>
            <form onSubmit={handleVerifyUpdateOtp} className="flex gap-2">
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit OTP"
                className="px-3 py-2 border rounded-md"
              />
              <button
                type="submit"
                disabled={updateLoading}
                className="px-3 py-2 bg-green-600 text-white rounded-md"
              >
                Verify OTP
              </button>
            </form>
          </div>
        )}

        {/* Delete Section */}
        <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">
            <Trash2 size={18} /> Danger Zone
          </h3>
          <p className="text-sm text-gray-600 mt-2">
            ⚠️ Delete your account and all related data. This action is
            irreversible.
          </p>
          <div className="mt-4 flex gap-2 flex-wrap items-center">
            <button
              onClick={handleSendDeleteOtp}
              type="button"
              disabled={sendDeleteLoading}
              className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition"
            >
              {sendDeleteLoading ? "⏳ Sending OTP..." : "📩 Send Delete OTP"}
            </button>
            <input
              value={deleteOtp}
              onChange={(e) => setDeleteOtp(e.target.value)}
              placeholder="Enter delete OTP"
              className="px-3 py-2 border rounded-md"
            />
            <button
              onClick={handleConfirmDelete}
              type="button"
              disabled={confirmDeleteLoading}
              className="px-4 py-2 border rounded-lg text-red-600 hover:bg-red-50 transition"
            >
              {confirmDeleteLoading ? "⏳ Deleting..." : "🗑️ Confirm Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
