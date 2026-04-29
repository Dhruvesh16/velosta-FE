"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";

type ItineraryStatus = {
  runId?: string;
  status?: "generating" | "ready" | "failed";
  destination?: string;
  updatedAt?: number;
};

export default function ItineraryReadyBanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runId = searchParams.get("runId") || "";
  const fromPlanner = searchParams.get("fromPlanner") === "1";
  const [isReady, setIsReady] = useState(false);
  const [destination, setDestination] = useState("");

  const subtitle = useMemo(() => {
    if (destination) {
      return `Your ${destination} plan is polished and waiting.`;
    }
    return "Your journey blueprint is polished and waiting.";
  }, [destination]);

  useEffect(() => {
    if (!fromPlanner) return;

    const check = () => {
      try {
        const raw = window.localStorage.getItem("velosta:itineraryStatus");
        if (!raw) return;
        const status = JSON.parse(raw) as ItineraryStatus;
        if (runId && status.runId && status.runId !== runId) return;
        if (status.status === "ready") {
          setDestination(status.destination || "");
          setIsReady(true);
        }
      } catch {
        // Ignore storage parse errors
      }
    };

    check();
    const intervalId = window.setInterval(check, 1400);
    const onStorage = () => check();
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("storage", onStorage);
    };
  }, [fromPlanner, runId]);

  if (!fromPlanner) return null;

  return (
    <AnimatePresence>
      {isReady && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 14 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 left-1/2 z-[100] w-[min(92vw,560px)] -translate-x-1/2 rounded-2xl border border-[#C9983A]/40 bg-white/95 px-5 py-4 shadow-[0_18px_40px_-18px_rgba(11,31,42,0.45)] backdrop-blur"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C9983A]">
            Itinerary generated
          </p>
          <p className="mt-1 text-[15px] font-semibold text-[#0B1F2A]">
            Ready to jump back to your journey map?
          </p>
          <p className="mt-1 text-[12px] text-[#0B1F2A]/65">{subtitle}</p>
          <button
            type="button"
            onClick={() => router.push("/velosta-ai")}
            className="mt-3 inline-flex rounded-full bg-[#0B1F2A] px-4 py-2 text-[12px] font-semibold text-white transition hover:opacity-90"
          >
            Open itinerary
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
