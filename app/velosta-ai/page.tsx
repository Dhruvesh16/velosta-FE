"use client";

import Footer from "@/components/footer";
import Navbar from "@/components/navbar";
import VelostaBotInterface from "@/components/velosta-ai/velosta-ai-interface";
import ProtectedRoute from "../utils/protected-routes";

function PlanPage() {
  return (
    <ProtectedRoute>
      <Navbar className={"md:ml-64 "} />

      <main className="min-h-screen w-full">
        <VelostaBotInterface />
      </main>
    </ProtectedRoute>
  );
}

export default PlanPage;
