"use client";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export default function SignInPage() {
  return (
    <AuthCard
      mode="signin"
      title="Welcome back"
      subtitle="Sign in to continue planning journeys that feel unmistakably yours."
    >
      <AuthForm type="signin" />
    </AuthCard>
  );
}
