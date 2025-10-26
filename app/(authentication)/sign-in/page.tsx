"use client";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import Navbar from "@/components/navbar";
import GoogleOneTapLogin from "../(components-auth)/google-auth";
export default function SignInPage() {
  const handleSubmit = (data: Record<string, string>) => {
    console.log("Sign in attempt:", data);
    // Backend logic would go here
  };
  const handleLogin = (data: any) => {
    // Save JWT in localStorage or app state
    localStorage.setItem("accessToken", data.accessToken);
  };
  return (
    <div>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12 mt-14">
        <AuthCard
          title="Welcome To Velosta"
          subtitle="Sign in to your Velosta account"
        >
          <AuthForm type="signin" onSubmit={handleSubmit} />
        </AuthCard>
        {/* <GoogleOneTapLogin onLogin={handleLogin} /> */}
      </div>
    </div>
  );
}
