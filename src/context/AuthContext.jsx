// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { loginHod, getHodProfile } from "../services/api";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [hod, setHod] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("hodToken") || null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("hodToken"))); // true if token exists -> fetch profile

  // Normalize backend profile object
  const normalizeProfile = (profile) => {
    if (!profile) return null;
    return {
      id: profile._id || profile.id,
      username: profile.username,
      collegeName: profile.collegeName,
      email: profile.email,
      pendingUpdates: profile.pendingUpdates || undefined,
      ...profile,
    };
  };

  // Helper to fetch profile from backend and set hod
  const fetchProfile = async () => {
    if (!token) {
      setHod(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await getHodProfile();
      const data = res?.data || {};
      const profile = data.hod || data.data?.hod || data; // normalize shapes
      setHod(normalizeProfile(profile));
    } catch (err) {
      toast.error("Session expired. Please log in again.");
      // if token invalid, clear it
      localStorage.removeItem("hodToken");
      setToken(null);
      setHod(null);
    } finally {
      setLoading(false);
    }
  };

  // When token changes, persist to localStorage and refetch profile
  useEffect(() => {
    if (token) {
      localStorage.setItem("hodToken", token);
      fetchProfile();
    } else {
      localStorage.removeItem("hodToken");
      setHod(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // login: call loginHod (from services/api), extract token, then fetch profile
  const login = async (credentials) => {
    try {
      const res = await loginHod(credentials);
      const tokenFromServer = res?.data?.token || res?.data?.data?.token || null;
      if (!tokenFromServer) {
        console.warn("AuthContext.login: token not found in response", res.data);
        throw new Error("Token not returned by server");
      }

      setToken(tokenFromServer); // this triggers fetchProfile via useEffect

      // If login response already included hod info, set it immediately
      const data = res?.data || {};
      const profile = data.hod || data.data?.hod || data;
      if (profile) {
        setHod(normalizeProfile(profile));
      }

      toast.success("Login successful 🎉");
      return res;
    } catch (err) {
      const serverMsg = err?.response?.data?.error || err?.response?.data?.message;
      if (serverMsg) {
        toast.error(`Login failed: ${serverMsg}`);
      } else {
        toast.error("Login failed: Unexpected error. Check console for details.");
      }
      throw err;
    }
  };

  const logout = () => {
    setHod(null);
    setToken(null);
    localStorage.removeItem("hodToken");
    toast.info("Logged out successfully 👋");
  };

  // helper to set auth after OTP verify flows
  const setAuth = (hodData, tokenFromServer) => {
    if (!tokenFromServer) return;
    setToken(tokenFromServer); // triggers fetchProfile via useEffect
    localStorage.setItem("hodToken", tokenFromServer);
    if (hodData) {
      setHod(normalizeProfile(hodData));
    }
    toast.success("Authentication updated ✅");
  };

  return (
    <AuthContext.Provider
      value={{
        hod,
        token,
        login,
        logout,
        setAuth,
        loading,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
