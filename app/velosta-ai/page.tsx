"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { usePlannerStore } from "@/lib/stores/planner-store";
import ProtectedRoute from "../utils/protected-routes";
import CloudLandingScene from "@/components/velosta-ai/onboarding/cloud-landing";
import BudgetSelection from "@/components/velosta-ai/onboarding/budget-selection";
import TripInputs from "@/components/velosta-ai/onboarding/trip-inputs";
import SpatialPlannerShell from "@/components/velosta-ai/spatial-planner/spatial-planner-shell";

// Map-heavy components — no SSR
const ExploreMapView = dynamic(
  () => import("@/components/velosta-ai/onboarding/explore-map"),
  { ssr: false }
);

const TRANSITION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.35 },
};

export default function PlanPage() {
  const { flowStep, selectedTier, selectedDestination } = useOnboardingStore();
  const { setTripData } = usePlannerStore();

  // Pre-seed trip data when entering planner — must be in useEffect, not render body
  useEffect(() => {
    if (flowStep === "planner" && selectedDestination) {
      setTripData({
        destination: selectedDestination,
        budget: selectedTier ? selectedTier.range : undefined,
      });
    }
  }, [flowStep, selectedDestination, selectedTier, setTripData]);

  return (
    <ProtectedRoute>
      <AnimatePresence mode="wait">
        {flowStep === "landing" && (
          <motion.div key="landing" {...TRANSITION}>
            <CloudLandingScene />
          </motion.div>
        )}

        {flowStep === "budget" && (
          <motion.div key="budget" {...TRANSITION}>
            <BudgetSelection />
          </motion.div>
        )}

        {flowStep === "trip-inputs" && (
          <motion.div key="trip-inputs" {...TRANSITION}>
            <TripInputs />
          </motion.div>
        )}

        {flowStep === "explore" && (
          <motion.div key="explore" {...TRANSITION}>
            <ExploreMapView />
          </motion.div>
        )}

        {flowStep === "planner" && (
          <motion.div key="planner" {...TRANSITION}>
            <SpatialPlannerShell />
          </motion.div>
        )}
      </AnimatePresence>
    </ProtectedRoute>
  );
}
