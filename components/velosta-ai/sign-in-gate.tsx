"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface SignInGateProps {
  open: boolean;
  onClose: () => void;
  /** Where to return after sign-in. Defaults to current page. */
  next?: string;
  /** Optional override for the headline. */
  title?: string;
  /** Optional override for the body line. */
  message?: string;
}

/**
 * SignInGate
 * ──────────
 * Polished overlay shown when the user attempts an action that requires auth
 * (generating an itinerary, sending a chat modification). Stays in the
 * Coastal-Luxury palette and routes to /sign-in?next=… so we can come back.
 */
export default function SignInGate({
  open,
  onClose,
  next,
  title = "Almost there",
  message = "Please sign in until Velosta AI crafts your itinerary — we'll save your trip context and pick up right where you left off.",
}: SignInGateProps) {
  const router = useRouter();

  const goToSignIn = (path: "/sign-in" | "/sign-up") => {
    const target =
      next ??
      (typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/velosta-ai");
    router.push(`${path}?next=${encodeURIComponent(target)}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-[#0B1F2A]/45 backdrop-blur-sm"
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md rounded-3xl bg-[#FBF8F3] shadow-2xl border border-[#0B1F2A]/8 overflow-hidden"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Dismiss"
              className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full bg-white/80 hover:bg-white border border-[#0B1F2A]/8 flex items-center justify-center text-[#0B1F2A]/60 hover:text-[#0B1F2A] transition-colors"
            >
              <X size={14} />
            </button>

            {/* Soft brand wash */}
            <div
              className="absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-30 pointer-events-none"
              style={{
                background:
                  "radial-gradient(50% 50% at 50% 50%, rgba(217,119,87,0.45) 0%, rgba(217,119,87,0) 70%)",
              }}
            />

            <div className="relative px-8 pt-10 pb-8">
              {/* Mark */}
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center mb-5 shadow-sm"
                style={{
                  background:
                    "linear-gradient(180deg, #E89378 0%, #D97757 100%)",
                }}
              >
                <Sparkles size={18} className="text-white" />
              </div>

              <p className="text-[11px] tracking-[0.2em] uppercase text-[#B85F44] font-semibold mb-2">
                Velosta AI
              </p>
              <h2 className="text-[#0B1F2A] text-2xl font-semibold leading-tight mb-3">
                {title}
              </h2>
              <p className="text-[#0B1F2A]/65 text-sm leading-relaxed mb-7">
                {message}
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => goToSignIn("/sign-in")}
                  className="w-full h-11 rounded-full text-white text-sm font-semibold transition-transform active:scale-[0.98]"
                  style={{
                    background:
                      "linear-gradient(180deg, #E89378 0%, #D97757 100%)",
                    boxShadow: "0 8px 22px -10px rgba(217,119,87,0.6)",
                  }}
                >
                  Sign in to continue
                </button>
                <button
                  type="button"
                  onClick={() => goToSignIn("/sign-up")}
                  className="w-full h-11 rounded-full text-[#0B1F2A] text-sm font-semibold border border-[#0B1F2A]/12 bg-white hover:bg-[#F5EFE6]/80 transition-colors"
                >
                  Create an account
                </button>
              </div>

              <p className="text-[11px] text-[#0B1F2A]/45 text-center mt-5">
                Your trip details stay on this device until you're back.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
