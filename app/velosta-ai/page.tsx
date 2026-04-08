"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { usePlannerStore } from "@/lib/stores/planner-store";
import { useMapStore } from "@/lib/stores/map-store";
import type { MapMarker } from "@/lib/types/planner.types";
import ProtectedRoute from "../utils/protected-routes";
import PackageSelection from "@/components/velosta-ai/onboarding/package-selection";
import TripInputs from "@/components/velosta-ai/onboarding/trip-inputs";
import SpatialPlannerShell from "@/components/velosta-ai/spatial-planner/spatial-planner-shell";

// Mapbox-dependent components — no SSR
const CloudLandingScene = dynamic(
  () => import("@/components/velosta-ai/onboarding/cloud-landing"),
  { ssr: false }
);
const BudgetSelection = dynamic(
  () => import("@/components/velosta-ai/onboarding/budget-selection"),
  { ssr: false }
);
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
  const { flowStep, selectedTier, selectedDestination, selectedPackage } = useOnboardingStore();
  const { setTripData, itineraryData } = usePlannerStore();
  const { setMarkers, flyTo, markers } = useMapStore();

  // Pre-seed trip data + map markers from package when entering planner
  useEffect(() => {
    if (flowStep === "planner" && selectedDestination) {
      setTripData({
        destination: selectedDestination,
        budget: selectedTier ? selectedTier.range : undefined,
      });

      // If we have a selected package and no AI-generated markers yet, seed map from package
      if (selectedPackage && markers.length === 0) {
        // Fly to destination
        flyTo(selectedPackage.coordinates, 13, 45);

        // Convert package points to map markers
        const pkgMarkers: MapMarker[] = selectedPackage.itineraryPoints.map((pt, idx) => ({
          id: `pkg-${idx}`,
          coordinates: pt.coordinates,
          label: pt.name,
          dayIndex: 0,
          activityIndex: idx,
          type: pt.type === "food" ? "meal" : pt.type === "stay" ? "stay" : "activity",
        }));
        setMarkers(pkgMarkers);
      }
    }
  }, [flowStep, selectedDestination, selectedTier, selectedPackage, setTripData, flyTo, setMarkers, markers.length, itineraryData]);

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

        {flowStep === "packages" && (
          <motion.div key="packages" {...TRANSITION}>
            <PackageSelection />
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
