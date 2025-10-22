"use client";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import Navbar from "@/components/navbar";

export default function SignUpPage() {
  const handleSubmit = (data: Record<string, string>) => {
    console.log("Sign up attempt:", data);
    // Backend logic would go here
  };

  return (
    <div>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12 mt-14">
        <AuthCard
          title="Join Velosta"
          subtitle="Create your account to start planning trips"
        >
          <AuthForm type="signup" onSubmit={handleSubmit} />
        </AuthCard>
      </div>
    </div>
  );
}
