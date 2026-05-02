"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { authApi, persistSession, clearSession, ApiError } from "@/lib/api";

const UserContext = createContext();

/** Decode JWT `exp` (seconds since epoch) without verifying signature. */
function readAccessTokenExp(accessToken) {
  if (!accessToken || typeof accessToken !== "string") return null;
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return null;
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad) b64 += "=".repeat(4 - pad);
    const payload = JSON.parse(atob(b64));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (typeof window === "undefined") {
        setLoading(false);
        return;
      }

      const access = window.localStorage.getItem("accessToken");
      const refresh = window.localStorage.getItem("refreshToken");
      const storedUser = window.localStorage.getItem("userData");

      const finishFromStorage = () => {
        if (cancelled) return;
        if (access && storedUser) {
          try {
            setAccessToken(access);
            setUser(JSON.parse(storedUser));
          } catch {
            setAccessToken(null);
            setUser(null);
          }
        }
        setLoading(false);
      };

      // After reboot or long sleep the access JWT may be expired; refresh early
      // so children do not hit /me or protected APIs with a stale bearer first.
      if (refresh) {
        const now = Math.floor(Date.now() / 1000);
        const exp = readAccessTokenExp(access);
        const needsRefresh = !access || exp == null || exp < now + 120;

        if (needsRefresh) {
          try {
            const bundle = await authApi.refresh(refresh);
            if (cancelled) return;
            persistSession(bundle);
            setAccessToken(bundle.access_token);
            setUser(bundle.user);
            setLoading(false);
            return;
          } catch (err) {
            if (cancelled) return;
            if (err instanceof ApiError && err.code === "network_error") {
              finishFromStorage();
              return;
            }
            clearSession();
            setAccessToken(null);
            setUser(null);
            setLoading(false);
            return;
          }
        }
      }

      finishFromStorage();
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <UserContext.Provider
      value={{ user, setUser, accessToken, setAccessToken, loading }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
