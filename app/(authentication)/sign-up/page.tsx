"use client";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import Navbar from "@/components/navbar";
import GoogleOneTapLogin from "../(components-auth)/google-auth";

export default function SignUpPage() {
  return (
    <div>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12 mt-14">
        <AuthCard
          title="Join Velosta"
          subtitle="Create your account to start planning trips"
        >
          <AuthForm type="signup" />
        </AuthCard>
        {/* <GoogleOneTapLogin onLogin={handleLogin} /> */}
      </div>
    </div>
  );
}
