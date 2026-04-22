"use client";

import type React from "react";
import { useState } from "react";
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

interface AuthFormProps {
  type: "signin" | "signup";
}

export function AuthForm({ type }: AuthFormProps) {
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

  const { user, setUser, setAccessToken } = useUser();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    if (!/[A-Z]/.test(password))
      toast.error("Password must contain an uppercase letter");
    if (!/[a-z]/.test(password))
      toast.error("Password must contain a lowercase letter");
    if (!/[0-9]/.test(password)) toast.error("Password must contain a number");
    if (!/[\W_]/.test(password))
      toast.error("Password must contain a special character");

    if (type === "signup" && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }

    if (type === "signup" && !name.trim()) {
      toast.error("Full name is required");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      const bundle =
        type === "signup"
          ? await authApi.signup({
              name: formData.name,
              email: formData.email,
              password: formData.password,
            })
          : await authApi.login({
              email: formData.email,
              password: formData.password,
            });

      persistSession(bundle);
      setAccessToken(bundle.access_token);
      setUser(bundle.user);

      toast.success(
        type === "signup" ? "Welcome to Velosta" : "Signed in successfully"
      );
      router.push(nextPath);
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
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
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
        </div>

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
