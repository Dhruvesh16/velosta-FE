"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "./context";

export default function ProtectedRoute({ children }) {
  const { user, accessToken, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Wait for context to finish loading
    if (!loading && !accessToken) {
      router.replace("/sign-in"); // redirect if not logged in
    }
  }, [accessToken, loading, router]);

  // Optionally, show nothing or a loader while checking
  if (loading || !accessToken) return null;

  return children;
}
