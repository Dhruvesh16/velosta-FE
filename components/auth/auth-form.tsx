"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SocialButton } from "./social-button";
import { useUser } from "@/app/utils/context";
import { Eye, EyeOff } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface AuthFormProps {
  type: "signin" | "signup";
}

export function AuthForm({ type }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      const endpoint =
        type === "signup"
          ? `${process.env.NEXT_PUBLIC_URL}/api/auth/signup`
          : `${process.env.NEXT_PUBLIC_URL}/api/auth/signin`;

      const payload =
        type === "signup"
          ? {
              name: formData.name,
              email: formData.email,
              password: formData.password,
            }
          : { email: formData.email, password: formData.password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("userData", JSON.stringify(data.user));
      setAccessToken(data.accessToken);
      setUser(data.user);

      toast.success(data.message || "Authentication successful");
      router.push("/");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 GOOGLE LOGIN HANDLERS
  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const token = credentialResponse.credential;
      console.log(token, "tokeninfe");
      // return;
      if (!token) throw new Error("No Google token found");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/auth/continue-with-google`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("userData", JSON.stringify(data.user));
      setAccessToken(data.accessToken);
      setUser(data.user);
      toast.success("Google sign-in successful");
      router.push("/");
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      toast.error(err.message || "Google Sign-In failed");
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
            <Label htmlFor="name" className="text-sm font-medium">
              Full Name
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              className="h-11 rounded-lg border-gray-200"
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email Address
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            className="h-11 rounded-lg border-gray-200"
            required
          />
        </div>

        <div className="relative space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            className="h-11 rounded-lg border-gray-200 pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 mt-2.5 -translate-y-1/2 text-black"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {type === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="h-11 rounded-lg border-gray-200"
              required
            />
          </div>
        )}

        {type === "signin" && (
          <div className="flex justify-end">
            <a
              href="#"
              className="text-xs font-medium hover:underline"
              style={{ color: "var(--color-brand)" }}
            >
              Forgot password?
            </a>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-lg font-semibold text-white"
          style={{ backgroundColor: "var(--color-brand)" }}
        >
          {loading
            ? "Please wait..."
            : type === "signin"
            ? "Sign In"
            : "Create Account"}
        </Button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">
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
          />
        </div>

        <p className="text-center text-sm text-gray-600">
          {type === "signin" ? (
            <>
              Don’t have an account?{" "}
              <a
                href="/sign-up"
                className="font-semibold hover:underline"
                style={{ color: "var(--color-brand)" }}
              >
                Sign up
              </a>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <a
                href="/sign-in"
                className="font-semibold hover:underline"
                style={{ color: "var(--color-brand)" }}
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
