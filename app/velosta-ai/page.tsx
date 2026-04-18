"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { usePlannerStore } from "@/lib/stores/planner-store";
import { useMapStore } from "@/lib/stores/map-store";
import PackageSelection from "@/components/velosta-ai/onboarding/package-selection";
import TripInputs from "@/components/velosta-ai/onboarding/trip-inputs";
import SpatialPlannerShell from "@/components/velosta-ai/spatial-planner/spatial-planner-shell";
import FlowChrome, { type FlowStep } from "@/components/velosta-ai/FlowChrome";

// Mapbox-dependent components — no SSR
const CloudLandingScene = dynamic(
  () => import("@/components/velosta-ai/onboarding/cloud-landing"),
  { ssr: false }
);
const IntentCapture = dynamic(
  () => import("@/components/velosta-ai/intent/intent-capture"),
  { ssr: false }
);
const ExploreMapView = dynamic(
  () => import("@/components/velosta-ai/onboarding/explore-map"),
  { ssr: false }
);

/* Premium cinematic transition — depth + slide, not flat fade */
const EASE = [0.22, 1, 0.36, 1] as const;
const STEP_TRANSITION = {
  initial: { opacity: 0, y: 24, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -16, scale: 0.99 },
  transition: { duration: 0.75, ease: EASE },
};

export default function PlanPage() {
  const { flowStep, selectedTier, selectedDestination } = useOnboardingStore();
  const { setTripData, itineraryData } = usePlannerStore();
  const { markers } = useMapStore();

  // Pre-seed trip context (destination + budget) when entering planner.
  // NOTE: We intentionally DO NOT seed map markers from any static package.
  // Markers come exclusively from the AI-generated itinerary so the planner
  // is always real-time and never shows dummy data.
  useEffect(() => {
    if (flowStep === "planner" && selectedDestination) {
      setTripData({
        destination: selectedDestination,
        budget: selectedTier ? selectedTier.range : undefined,
      });
    }
  }, [
    flowStep,
    selectedDestination,
    selectedTier,
    setTripData,
    itineraryData,
    markers.length,
  ]);

  return (
    <>
      {/* Coastal Luxury canvas — holds every step */}
      <div
        className="relative min-h-screen w-full overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, #F5EFE6 0%, #EFEAE0 50%, #E6E4DB 100%)",
        }}
      >
        {/* Persistent chrome — brand mark + step rail + ambient washes */}
        <FlowChrome currentStep={flowStep as FlowStep} />

        {/* Step stage — premium transitions */}
        <div className="relative z-10 min-h-screen">
          <AnimatePresence mode="wait">
            {flowStep === "landing" && (
              <motion.div key="landing" {...STEP_TRANSITION} className="fixed inset-0">
                <CloudLandingScene />
              </motion.div>
            )}

            {flowStep === "budget" && (
              <motion.div key="budget" {...STEP_TRANSITION}>
                <IntentCapture />
              </motion.div>
            )}

            {flowStep === "packages" && (
              <motion.div key="packages" {...STEP_TRANSITION}>
                <PackageSelection />
              </motion.div>
            )}

            {flowStep === "trip-inputs" && (
              <motion.div key="trip-inputs" {...STEP_TRANSITION}>
                <TripInputs />
              </motion.div>
            )}

            {flowStep === "explore" && (
              <motion.div key="explore" {...STEP_TRANSITION} className="fixed inset-0">
                <ExploreMapView />
              </motion.div>
            )}

            {flowStep === "planner" && (
              <motion.div key="planner" {...STEP_TRANSITION} className="fixed inset-0">
                <SpatialPlannerShell />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
