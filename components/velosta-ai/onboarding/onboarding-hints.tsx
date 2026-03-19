"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, MapPin, GripVertical, FileDown } from "lucide-react";

const HINTS = [
  {
    id: "chat",
    icon: MessageCircle,
    title: "Chat with AI",
    description: "Tell Velosta AI where you want to go — it'll build your itinerary.",
    position: "left" as const,
  },
  {
    id: "map",
    icon: MapPin,
    title: "Interactive Map",
    description: "Your activities appear as pins. Click them to zoom in.",
    position: "center" as const,
  },
  {
    id: "drag",
    icon: GripVertical,
    title: "Drag & Drop",
    description: "Reorder days and activities by dragging. Routes update instantly.",
    position: "right" as const,
  },
  {
    id: "export",
    icon: FileDown,
    title: "Export & Share",
    description: "Download your itinerary as a PDF when you're ready.",
    position: "right" as const,
  },
];

const STORAGE_KEY = "velosta-onboarding-complete";

export default function OnboardingHints() {
  const [currentHint, setCurrentHint] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show once — check localStorage
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Delay showing hints until the planner has rendered
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleNext() {
    if (currentHint < HINTS.length - 1) {
      setCurrentHint((i) => i + 1);
    } else {
      handleDismiss();
    }
  }

  function handleDismiss() {
    setVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
  }

  if (!visible) return null;

  const hint = HINTS[currentHint];
  const Icon = hint.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] pointer-events-none">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/20 pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDismiss}
        />

        {/* Hint card */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto z-10"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          key={hint.id}
        >
          <div className="bg-white border border-amber-200 rounded-2xl shadow-xl p-5 max-w-xs w-[300px]">
            {/* Close */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss hints"
            >
              <X size={11} />
            </button>

            {/* Icon */}
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
              <Icon size={18} className="text-amber-500" />
            </div>

            {/* Content */}
            <p className="text-gray-800 font-semibold text-sm mb-1">
              {hint.title}
            </p>
            <p className="text-gray-500 text-xs leading-relaxed mb-4">
              {hint.description}
            </p>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              {/* Dots */}
              <div className="flex gap-1.5">
                {HINTS.map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full transition-colors"
                    style={{
                      background: i === currentHint ? "#D97706" : "#e5e7eb",
                    }}
                  />
                ))}
              </div>

              {/* Next/Done */}
              <button
                onClick={handleNext}
                className="text-xs font-medium px-4 py-1.5 rounded-full bg-amber-500 text-white hover:bg-amber-600 transition-colors active:scale-95"
              >
                {currentHint < HINTS.length - 1 ? "Next" : "Got it"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

