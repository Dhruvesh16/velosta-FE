"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authApi, ApiError } from "@/lib/api";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Missing verification token. Please request a new verification email.");
        return;
      }
      try {
        const result = await authApi.verifyEmail(token);
        setStatus("success");
        setMessage(result.message || "Email verified successfully.");
      } catch (err: any) {
        setStatus("error");
        setMessage(
          err instanceof ApiError
            ? err.message
            : "This verification link is invalid or expired. Please request a new one.",
        );
      }
    };
    run();
  }, [token]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FBF8F3] px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center" style={{ borderColor: "rgba(11,31,42,0.1)" }}>
        <h1 className="text-2xl font-semibold text-[#0B1F2A]">Verify your email</h1>
        <p className="mt-3 text-sm text-[rgba(11,31,42,0.65)]">{message}</p>

        {status === "loading" && (
          <div className="mx-auto mt-5 h-6 w-6 animate-spin rounded-full border-2 border-[#D97757] border-t-transparent" />
        )}

        {status === "success" && (
          <Link
            href="/sign-in"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold text-white"
            style={{ background: "#D97757" }}
          >
            Continue to sign in
          </Link>
        )}

        {status === "error" && (
          <Link
            href="/sign-in"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full border px-6 text-sm font-semibold text-[#0B1F2A]"
            style={{ borderColor: "rgba(11,31,42,0.16)" }}
          >
            Back to sign in
          </Link>
        )}
      </div>
    </main>
  );
}

