"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Playfair_Display } from "next/font/google";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const playfair = Playfair_Display({ subsets: ["latin"] });

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/admin/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        setError(
          json?.error?.message || "Invalid credentials. Please try again."
        );
        return;
      }

      // Admin login now returns an OTP challenge — redirect to OTP verification
      const otpToken = json?.data?.otpToken ?? json?.otpToken;
      if (otpToken) {
        const params = new URLSearchParams({ token: otpToken, next: "/admin/reports" });
        router.replace(`/verify-otp?${params.toString()}`);
        return;
      }

      setError("Authentication failed. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: "var(--color-cream)" }}
    >
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center mb-10">
          <Link
            href="/"
            className={`${playfair.className} text-[32px] tracking-tight leading-none`}
            style={{ color: "var(--color-navy)" }}
          >
            Velosta
          </Link>
          <span
            className="mt-2 text-[10px] uppercase tracking-[0.24em] font-medium"
            style={{ color: "var(--color-teal)" }}
          >
            Administration
          </span>
        </div>

        <div
          className="rounded-2xl border bg-white px-7 py-8"
          style={{
            borderColor: "rgba(11,31,42,0.08)",
            boxShadow:
              "0 1px 2px rgba(11,31,42,0.04), 0 8px 24px -12px rgba(11,31,42,0.08)",
          }}
        >
          <div className="mb-6">
            <h1
              className={`${playfair.className} text-[22px] leading-tight`}
              style={{ color: "var(--color-navy)" }}
            >
              Sign in to continue
            </h1>
            <p
              className="text-[13px] mt-1.5"
              style={{ color: "rgba(11,31,42,0.55)" }}
            >
              Restricted to authorised content moderators.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-[12px] font-medium tracking-wide"
                style={{ color: "rgba(11,31,42,0.7)" }}
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@velosta.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 bg-white border-[rgba(11,31,42,0.12)] focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-0"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-[12px] font-medium tracking-wide"
                style={{ color: "rgba(11,31,42,0.7)" }}
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11 pr-11 bg-white border-[rgba(11,31,42,0.12)] focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-100"
                  style={{ color: "rgba(11,31,42,0.45)" }}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="text-[13px] rounded-md px-3 py-2.5 border"
                style={{
                  backgroundColor: "rgba(217,119,87,0.06)",
                  borderColor: "rgba(217,119,87,0.22)",
                  color: "var(--color-brand-dark)",
                }}
                role="alert"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-full font-medium tracking-wide transition-colors disabled:opacity-60"
              style={{
                backgroundColor: "var(--color-navy)",
                color: "var(--color-cream)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#142A36")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--color-navy)")
              }
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>

        <p
          className="text-[11px] text-center mt-6 tracking-wide"
          style={{ color: "rgba(11,31,42,0.4)" }}
        >
          Not an admin?{" "}
          <Link
            href="/sign-in"
            className="underline underline-offset-2 hover:text-[color:var(--color-navy)] transition-colors"
          >
            Return to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
