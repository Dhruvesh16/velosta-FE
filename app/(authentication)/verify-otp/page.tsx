"use client";

import { AuthCard } from "@/components/auth/auth-card";
import { OtpForm } from "@/components/auth/otp-form";
import { Suspense } from "react";

export default function VerifyOtpPage() {
  return (
    <AuthCard
      mode="signin"
      title="Check your inbox"
      subtitle="We sent a 6-digit code to your email. Enter it below to complete sign in."
    >
      <Suspense fallback={null}>
        <OtpForm />
      </Suspense>
    </AuthCard>
  );
}
