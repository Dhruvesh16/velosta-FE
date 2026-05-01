"use client";

import type React from "react";
import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SocialButton } from "./social-button";
import { useUser } from "@/app/utils/context";
import { Eye, EyeOff } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { authApi, persistSession, ApiError } from "@/lib/api";
import { completePasskeySignIn } from "@/lib/passkeys";
import Link from "next/link";

// ── Passkey sign-in button (lazy-loads @simplewebauthn/browser) ───────────────
function PasskeySignInButton({
  nextPath,
  webauthnFieldRef,
}: {
  nextPath: string;
  webauthnFieldRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [loading, setLoading] = useState(false);
  const { setUser, setAccessToken } = useUser();
  const router = useRouter();

  const handlePasskeySignIn = async () => {
    setLoading(true);
    try {
      const bundle = await completePasskeySignIn({ webauthnFieldRef });
      persistSession(bundle);
      setAccessToken(bundle.access_token);
      setUser(bundle.user);
      toast.success("Signed in with passkey");
      router.push(nextPath || "/");
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        toast.error("Passkey sign-in was cancelled.");
      } else if (err instanceof ApiError || (err && typeof err?.message === "string" && typeof err?.status === "number")) {
        toast.error(err.message);
      } else {
        toast.error("Passkey sign-in failed. Try email instead.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePasskeySignIn}
      disabled={loading}
      className="group w-full h-11 flex items-center justify-center gap-2.5 rounded-full border font-semibold text-[13.5px] transition-all duration-200 hover:shadow-sm disabled:opacity-60"
      style={{
        borderColor: "rgba(11,31,42,0.15)",
        color: "#0B1F2A",
        background: "#fff",
      }}
    >
      {loading ? (
        <div className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#D97757" }} />
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" />
          <circle cx="16.5" cy="7.5" r=".5" />
        </svg>
      )}
      {loading ? "Verifying…" : "Sign in with Passkey"}
    </button>
  );
}

interface AuthFormProps {
  type: "signin" | "signup";
}

export function AuthForm({ type }: AuthFormProps) {
  const emailPasskeyAnchorRef = useRef<HTMLInputElement | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams?.get("next") || "/";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);

  const { user, setUser, setAccessToken } = useUser();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "email" && pendingVerificationEmail) {
      setPendingVerificationEmail(null);
    }
  };

  const passwordStrength = useMemo(() => {
    const password = formData.password;
    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
      /[\W_]/.test(password),
    ];
    const score = checks.filter(Boolean).length;
    if (!password) return { score: 0, label: "Too weak", color: "rgba(11,31,42,0.16)" };
    if (score <= 2) return { score, label: "Weak", color: "#E55A57" };
    if (score <= 4) return { score, label: "Good", color: "#E0A94A" };
    return { score, label: "Strong", color: "#3BAF7A" };
  }, [formData.password]);

  const handleResendVerification = async () => {
    const email = pendingVerificationEmail || formData.email;
    if (!email) return;
    setResendingVerification(true);
    try {
      const result = await authApi.resendVerificationEmail(email);
      toast.success(result.message || "Verification email sent. Check your inbox.");
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : "Could not resend verification email.";
      toast.error(msg);
    } finally {
      setResendingVerification(false);
    }
  };

  const validateForm = () => {
    const { email, password, confirmPassword, name } = formData;

    if (!email || !password) {
      toast.error("Email and password are required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Invalid email address");
      return false;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      toast.error("Password must contain an uppercase letter");
      return false;
    }
    if (!/[a-z]/.test(password)) {
      toast.error("Password must contain a lowercase letter");
      return false;
    }
    if (!/[0-9]/.test(password)) {
      toast.error("Password must contain a number");
      return false;
    }
    if (!/[\W_]/.test(password)) {
      toast.error("Password must contain a special character");
      return false;
    }

    if (type === "signup" && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }

    if (type === "signup" && !name.trim()) {
      toast.error("Full name is required");
      return false;
    }

    if (type === "signup" && !acceptedTerms) {
      toast.error("You must accept the Privacy Policy and Terms of Service to continue");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      if (type === "signup") {
        await authApi.signup({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          accepted_terms: acceptedTerms,
          marketing_opt_in: marketingOptIn,
        });
        toast.success("Welcome aboard! We sent a single email with your verification link.");
        router.push("/sign-in");
      } else {
        // Try admin login first — now also returns OTP challenge
        let adminOtpToken: string | null = null;
        try {
          const adminResult = await authApi.adminLogin({
            email: formData.email,
            password: formData.password,
          });
          // adminLogin returns OTP challenge for admin
          if ((adminResult as any).otpToken) {
            adminOtpToken = (adminResult as any).otpToken;
          }
        } catch {
          // Not admin credentials — proceed with regular login
        }

        if (adminOtpToken) {
          const params = new URLSearchParams({ token: adminOtpToken, next: "/admin/reports" });
          toast.info("A verification code has been sent to your admin email.");
          router.push(`/verify-otp?${params.toString()}`);
          return;
        }

        // Regular user login — returns an OTP challenge
        try {
          const challenge = await authApi.login({
            email: formData.email,
            password: formData.password,
          });
          const method = challenge.twoFaMethod || "email_otp";
          const params = new URLSearchParams({ token: challenge.otpToken, method });
          if (challenge.hasPasskey) params.set("hasPasskey", "1");
          if (nextPath !== "/") params.set("next", nextPath);
          if (method === "totp") {
            toast.info("Enter the code from your authenticator app.");
          } else {
            toast.info("A verification code has been sent to your email.");
          }
          router.push(`/verify-otp?${params.toString()}`);
          return;
        } catch (err: any) {
          if (err instanceof ApiError && err.code === "email_not_verified") {
            const unverifiedEmail =
              (typeof err.details?.email === "string" && err.details.email) || formData.email;
            setPendingVerificationEmail(unverifiedEmail);
            toast.info("You haven’t verified your email yet. Verify it and then sign in.");
            return;
          }
          const msg =
            err instanceof ApiError
              ? err.message
              : err?.message || "Request failed";
          toast.error(msg);
        }
      }
    } catch (err: any) {
      console.error(err);
      const msg =
        err instanceof ApiError ? err.message : err?.message || "Request failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 GOOGLE LOGIN HANDLERS
  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const token = credentialResponse.credential;
      if (!token) throw new Error("No Google token found");

      const bundle = await authApi.google(token);

      persistSession(bundle);
      setAccessToken(bundle.access_token);
      setUser(bundle.user);

      toast.success("Google sign-in successful");
      router.push(nextPath);
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      const msg =
        err instanceof ApiError ? err.message : err?.message || "Google Sign-In failed";
      toast.error(msg);
    }
  };

  const handleGoogleError = () => {
    toast.error("Google Sign-In was cancelled or failed");
  };

  return (
    <>
      <ToastContainer />
      <form onSubmit={handleSubmit} className="space-y-5">
        {type === "signup" && (
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-[12px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: "rgba(11,31,42,0.65)" }}
            >
              Full Name
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Jane Doe"
              value={formData.name}
              onChange={handleChange}
              className="h-12 rounded-xl text-[14px] transition-colors focus-visible:ring-2 focus-visible:ring-offset-0"
              style={{
                backgroundColor: "#FBF8F3",
                borderColor: "rgba(11,31,42,0.1)",
                color: "#0B1F2A",
              }}
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <Label
            htmlFor="email"
            className="text-[12px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: "rgba(11,31,42,0.65)" }}
          >
            Email Address
          </Label>
          <Input
            ref={emailPasskeyAnchorRef}
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            autoComplete={type === "signin" ? "username webauthn" : "email"}
            className="h-12 rounded-xl text-[14px] transition-colors focus-visible:ring-2 focus-visible:ring-offset-0"
            style={{
              backgroundColor: "#FBF8F3",
              borderColor: "rgba(11,31,42,0.1)",
              color: "#0B1F2A",
            }}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className="text-[12px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: "rgba(11,31,42,0.65)" }}
            >
              Password
            </Label>
            {type === "signin" && (
              <a
                href="#"
                className="text-[11px] font-semibold transition-colors"
                style={{ color: "#D97757" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "#B85F44")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "#D97757")
                }
              >
                Forgot password?
              </a>
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              className="h-12 rounded-xl pr-12 text-[14px] transition-colors focus-visible:ring-2 focus-visible:ring-offset-0"
              style={{
                backgroundColor: "#FBF8F3",
                borderColor: "rgba(11,31,42,0.1)",
                color: "#0B1F2A",
              }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-colors"
              style={{ color: "rgba(11,31,42,0.5)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "#0B1F2A")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "rgba(11,31,42,0.5)")
              }
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {type === "signup" && (
            <div className="space-y-1 pt-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(11,31,42,0.08)]">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(passwordStrength.score / 5) * 100}%`,
                    backgroundColor: passwordStrength.color,
                  }}
                />
              </div>
              <p className="text-[12px]" style={{ color: "rgba(11,31,42,0.55)" }}>
                Password strength: <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
              </p>
            </div>
          )}
        </div>

        {type === "signin" && pendingVerificationEmail && (
          <div
            className="rounded-xl border px-3.5 py-3 text-[13px]"
            style={{ borderColor: "rgba(217,119,87,0.35)", background: "rgba(217,119,87,0.08)", color: "#0B1F2A" }}
          >
            You haven&apos;t verified your email yet. Verify from your inbox to unlock sign-in.
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendingVerification}
              className="ml-2 font-semibold underline underline-offset-2 disabled:opacity-60"
              style={{ color: "#D97757" }}
            >
              {resendingVerification ? "Resending..." : "Resend verification link"}
            </button>
          </div>
        )}

        {type === "signup" && (
          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-[12px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: "rgba(11,31,42,0.65)" }}
            >
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="h-12 rounded-xl pr-12 text-[14px] transition-colors focus-visible:ring-2 focus-visible:ring-offset-0"
                style={{
                  backgroundColor: "#FBF8F3",
                  borderColor: "rgba(11,31,42,0.1)",
                  color: "#0B1F2A",
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-colors"
                style={{ color: "rgba(11,31,42,0.5)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "#0B1F2A")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(11,31,42,0.5)")
                }
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        )}

        {type === "signup" && (
          <div className="space-y-3 pt-1">
            {/* Terms & Privacy acceptance */}
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border accent-[#D97757]"
                required
              />
              <span className="text-[13px] leading-snug" style={{ color: "rgba(11,31,42,0.7)" }}>
                I have read and agree to the{" "}
                <Link
                  href="/privacy-policy"
                  target="_blank"
                  className="font-semibold text-[#D97757] hover:underline"
                >
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link
                  href="/terms-of-service"
                  target="_blank"
                  className="font-semibold text-[#D97757] hover:underline"
                >
                  Terms of Service
                </Link>
                . <span className="text-[#D97757]">*</span>
              </span>
            </label>

            {/* Marketing opt-in */}
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border accent-[#D97757]"
              />
              <span className="text-[13px] leading-snug" style={{ color: "rgba(11,31,42,0.7)" }}>
                Send me weekly travel stories, destination guides, and Velosta updates. (Optional)
              </span>
            </label>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="group mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-70"
          style={{
            backgroundColor: "#D97757",
            boxShadow:
              "0 14px 32px -10px rgba(217,119,87,0.55), 0 4px 10px -4px rgba(217,119,87,0.25)",
          }}
        >
          {loading
            ? "Please wait..."
            : type === "signin"
            ? "Sign In"
            : "Create Account"}
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

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div
              className="w-full border-t"
              style={{ borderColor: "rgba(11,31,42,0.12)" }}
            />
          </div>
          <div className="relative flex justify-center">
            <span
              className="bg-white px-3 text-[10.5px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "rgba(11,31,42,0.5)" }}
            >
              Or continue with
            </span>
          </div>
        </div>

        {/* GOOGLE LOGIN */}
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap
            theme="outline"
            size="large"
            shape="pill"
          />
        </div>

        {/* PASSKEY LOGIN — only on sign-in, only if browser supports WebAuthn */}
        {type === "signin" && typeof window !== "undefined" && (window as any).PublicKeyCredential && (
          <PasskeySignInButton nextPath={nextPath} webauthnFieldRef={emailPasskeyAnchorRef} />
        )}

        <p
          className="mt-2 text-center text-[13px]"
          style={{ color: "rgba(11,31,42,0.55)" }}
        >
          {type === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <a
                href="/sign-up"
                className="font-semibold transition-colors"
                style={{ color: "#D97757" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "#B85F44")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "#D97757")
                }
              >
                Sign up
              </a>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <a
                href="/sign-in"
                className="font-semibold transition-colors"
                style={{ color: "#D97757" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "#B85F44")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "#D97757")
                }
              >
                Sign in
              </a>
            </>
          )}
        </p>
      </form>
    </>
  );
}
