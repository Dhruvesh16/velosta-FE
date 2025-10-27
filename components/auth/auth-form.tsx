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

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface AuthFormProps {
  type: "signin" | "signup";
}

export function AuthForm({ type }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });

  const [loading, setLoading] = useState(false);
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
          ? "http://localhost:3001/api/auth/signup"
          : "http://localhost:3001/api/auth/signin";

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

      toast.success(data.message || "Authentication successful", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "colored",
      });

      router.push("/"); // redirect
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Request failed", {
        position: "top-right",
        autoClose: 3000,
        theme: "colored",
      });
    } finally {
      setLoading(false);
    }
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

        {/* Social login */}
        <div className="space-y-3">
          <SocialButton
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            }
            label="Google"
            onClick={() => console.log("Google sign-in clicked")}
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
