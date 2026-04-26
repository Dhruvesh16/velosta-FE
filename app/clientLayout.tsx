"use client";

import { Suspense } from "react";
import { UserProvider } from "./utils/context";
import { Toaster } from "@/components/ui/toaster";
import { GoogleOAuthProvider } from "@react-oauth/google";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
        <UserProvider>
          {children}
          <Toaster />
        </UserProvider>
      </GoogleOAuthProvider>
    </Suspense>
  );
}
