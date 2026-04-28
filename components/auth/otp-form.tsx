"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useUser } from "@/app/utils/context";
import { authApi, persistSession, ApiError } from "@/lib/api";
import { toast } from "react-toastify";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const OTP_LENGTH = 6;

export function OtpForm() {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setAccessToken } = useUser();

  const otpToken = searchParams?.get("token") || "";
  const nextPath = searchParams?.get("next") || "/";
  const twoFaMethod = searchParams?.get("method") || "email_otp";
  const isTotp = twoFaMethod === "totp";
  const hasPasskey = searchParams?.get("hasPasskey") === "1";

  useEffect(() => {
    if (!otpToken) {
      router.replace("/sign-in");
    }
    inputRefs.current[0]?.focus();
  }, [otpToken, router]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d) && next.join("").length === OTP_LENGTH) {
      submitOtp(next.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (text.length === OTP_LENGTH) {
      setDigits(text.split(""));
      submitOtp(text);
    }
  };

  const submitOtp = async (otp: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const bundle = await authApi.verifyOtp({ otp_token: otpToken, otp });

      // Admin OTP: store admin token separately and skip user session
      if ((bundle as any).isAdmin) {
        localStorage.setItem("adminToken", (bundle as any).adminToken);
        toast.success("Welcome, Admin");
        router.push(nextPath || "/admin/reports");
        return;
      }

      persistSession(bundle);
      setAccessToken(bundle.access_token);
      setUser(bundle.user);
      toast.success("Signed in successfully");
      router.push(nextPath);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : "Verification failed. Try again.";
      toast.error(msg);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending || countdown > 0) return;
    setResending(true);
    try {
      await authApi.resendOtp(otpToken);
      toast.success("A new code has been sent.");
      setCountdown(30);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : "Could not resend code.";
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const otp = digits.join("");
    if (otp.length !== OTP_LENGTH) {
      toast.error("Please enter all 6 digits.");
      return;
    }
    submitOtp(otp);
  };

  const handlePasskeySignIn = async () => {
    setLoading(true);
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const { sessionId, options } = await authApi.passkeyLoginBegin();
      const credential = await startAuthentication({ optionsJSON: options as any });
      const bundle = await authApi.passkeyLoginComplete({
        session_id: sessionId,
        credential: credential as unknown as Record<string, unknown>,
      });
      persistSession(bundle);
      setAccessToken(bundle.access_token);
      setUser(bundle.user);
      toast.success("Signed in with passkey");
      router.push(nextPath);
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        toast.error("Passkey sign-in was cancelled.");
      } else {
        const msg = err instanceof ApiError ? err.message : "Passkey sign-in failed.";
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ToastContainer />
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* OTP digit inputs */}
        <div className="flex justify-center gap-3" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={loading}
              className="h-14 w-12 rounded-xl border text-center text-xl font-bold transition-all outline-none
                         focus:ring-2 focus:ring-offset-0 disabled:opacity-50"
              style={{
                backgroundColor: "#FBF8F3",
                borderColor: digit ? "#D97757" : "rgba(11,31,42,0.15)",
                color: "#0B1F2A",
              }}
              aria-label={`OTP digit ${i + 1}`}
            />
          ))}
        </div>

        <Button
          type="submit"
          disabled={loading || digits.join("").length !== OTP_LENGTH}
          className="group mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-70"
          style={{
            backgroundColor: "#D97757",
            boxShadow: "0 14px 32px -10px rgba(217,119,87,0.55), 0 4px 10px -4px rgba(217,119,87,0.25)",
          }}
        >
          {loading ? "Verifying…" : "Verify & Sign In"}
          {!loading && (
            <svg
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 8h12M9 3l5 5-5 5" />
            </svg>
          )}
        </Button>

        {!isTotp && (
          <p className="text-center text-[13px]" style={{ color: "rgba(11,31,42,0.55)" }}>
            Didn&apos;t receive the code?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || countdown > 0}
              className="font-semibold transition-colors disabled:opacity-40"
              style={{ color: "#D97757" }}
            >
              {countdown > 0 ? `Resend in ${countdown}s` : resending ? "Sending…" : "Resend code"}
            </button>
          </p>
        )}
        {isTotp && (
          <p className="text-center text-[13px]" style={{ color: "rgba(11,31,42,0.55)" }}>
            Open your authenticator app and enter the 6-digit code.
          </p>
        )}
        {isTotp && hasPasskey && (
          <div className="pt-1">
            <p className="mb-2 text-center text-[12px]" style={{ color: "rgba(11,31,42,0.5)" }}>
              Or sign in instantly with your passkey.
            </p>
            <button
              type="button"
              onClick={handlePasskeySignIn}
              disabled={loading}
              className="w-full h-11 rounded-full border font-semibold text-[13.5px] disabled:opacity-60"
              style={{
                borderColor: "rgba(11,31,42,0.15)",
                color: "#0B1F2A",
                background: "#fff",
              }}
            >
              {loading ? "Verifying…" : "Sign in with Passkey"}
            </button>
          </div>
        )}

        <p className="text-center text-[12px]" style={{ color: "rgba(11,31,42,0.4)" }}>
          <a href="/sign-in" style={{ color: "#D97757" }}>
            ← Back to sign in
          </a>
        </p>
      </form>
    </>
  );
}
