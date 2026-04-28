"use client";

import { AuthCard } from "@/components/auth/auth-card";
import { OtpForm } from "@/components/auth/otp-form";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function VerifyOtpContent() {
  const searchParams = useSearchParams();
  const method = searchParams?.get("method") || "email_otp";
  const hasPasskey = searchParams?.get("hasPasskey") === "1";
  const isTotp = method === "totp";

  const title = isTotp ? "Enter your code" : "Check your inbox";
  const subtitle = isTotp
    ? hasPasskey
      ? "Enter the code from your authenticator app, or sign in with your passkey."
      : "Enter the code from your authenticator app to complete sign in."
    : "We sent a 6-digit code to your email. Enter it below to complete sign in.";

  return (
    <AuthCard mode="signin" title={title} subtitle={subtitle}>
      <OtpForm />
    </AuthCard>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpContent />
    </Suspense>
  );
}
