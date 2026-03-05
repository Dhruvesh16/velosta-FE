"use client";
import { useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ChatWindow } from "@/components/velosta-ai/chat-window-ai";
import { usePlannerStore } from "@/lib/stores/planner-store";
import { useMapStore } from "@/lib/stores/map-store";
import {
  geocodeDestination,
  enrichItineraryWithCoordinates,
  itineraryToMarkers,
} from "@/lib/services/geocoding";
import type { ItineraryData, TripData } from "@/lib/types/planner.types";

export default function ChatPanel() {
  const { setItineraryData } = usePlannerStore();
  const { setMarkers, flyTo } = useMapStore();

  // When itinerary data lands, geocode and sync with map
  const handleItinerary = useCallback(
    async (rawData: unknown, rawTripData: TripData) => {
      const data = rawData as ItineraryData;

      // 1. Normalize itinerary into store (may have LLM coords)
      setItineraryData(data, rawTripData);

      // 2. Geocode the destination city itself for map centering
      const destCoords = await geocodeDestination(data.destination);
      console.log("[handleItinerary] destCoords:", destCoords, "for", data.destination);
      if (destCoords) {
        flyTo(destCoords, 12, 0);
      }

      // 3. Enrich activities with validated coordinates
      const currentItinerary = usePlannerStore.getState().itinerary;
      const enriched = await enrichItineraryWithCoordinates(
        currentItinerary,
        data.destination
      );

      // 4. Log what we got for debugging
      const markerCount = enriched.flatMap(d => d.rows).filter(r => r.coordinates).length;
      console.log("[handleItinerary] enriched itinerary:", {
        days: enriched.length,
        markersWithCoords: markerCount,
        coords: enriched.flatMap(d => d.rows)
          .filter(r => r.coordinates)
          .map(r => ({ name: r.activity, coords: r.coordinates })),
      });

      // 5. Update store with enriched data
      usePlannerStore.setState((_s) => ({
        itinerary: enriched,
        spentBudget: enriched.reduce((sum, d) => {
          const m = (d.dailyCost ?? "")
            .replace(/[₹$€£,\s]/g, "")
            .match(/[\d.]+/);
          return sum + (m ? parseFloat(m[0]) : 0);
        }, 0),
      }));

      // 6. Convert to markers and set on map
      const newMarkers = itineraryToMarkers(enriched);
      console.log("[handleItinerary] setting markers:", newMarkers.length);
      setMarkers(newMarkers);
    },
    [setItineraryData, flyTo, setMarkers]
  );

  return (
    <motion.div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: "#FFF9F3" }}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {/* Panel header */}
      <div
        className="px-4 py-3 border-b border-amber-100 flex items-center gap-3 shrink-0 bg-white"
      >
        {/* Velosta AI logo mark */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm"
          style={{
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          }}
        >
          <Sparkles size={14} className="text-white" />
        </div>

        <div className="min-w-0">
          <p className="text-gray-800 text-xs font-semibold leading-tight">
            Velosta AI
          </p>
          <p className="text-[10px] leading-tight text-gray-400">
            Spatial Travel Planner
          </p>
        </div>

        {/* Online indicator */}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "#16A34A" }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ background: "#16A34A" }}
            />
          </span>
          <span className="text-[9px] font-medium text-gray-400">
            Active
          </span>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden relative">
        <ChatWindow onItinerary={handleItinerary} />
      </div>
    </motion.div>
  );
}
