"use client";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export default function SignUpPage() {
  return (
    <AuthCard
      mode="signup"
      title="Join Velosta"
      subtitle="Create your account and start shaping journeys worth remembering."
    >
      <AuthForm type="signup" />
    </AuthCard>
  );
}
