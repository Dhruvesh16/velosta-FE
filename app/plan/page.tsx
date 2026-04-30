"use client";

/**
 * /plan — Conversational Intro
 * ─────────────────────────────────────────────────────────────────
 * Sits between the homepage "Plan My Trip" CTA and the full Velosta AI
 * spatial planner at /velosta-ai. Greets the user by name, captures an
 * optional free-form intent, and warms them into the planner experience.
 *
 * Design language: Velosta Gilded Meridian — sand surfaces, navy text,
 * coral signature accent, subtle ambient glow. Fully responsive.
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Playfair_Display, Dancing_Script } from "next/font/google";
import { Sparkles, ArrowRight, Compass, X } from "lucide-react";
import { useUser } from "@/app/utils/context";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["500", "600", "700"] });
const dancing = Dancing_Script({ subsets: ["latin"], weight: ["500", "600"] });

const C = {
  navy: "#0B1F2A",
  sand: "#F5EFE6",
  sandLight: "#FBF8F3",
  teal: "#2F6F73",
  coral: "#D97757",
  coralStart: "#E89378",
  coralDark: "#B85F44",
  mist: "#D9E2E1",
};

export default function PlanIntroPage() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useUser();
  const { setPlanningMode } = useOnboardingStore();

  const firstName = useMemo(() => {
    if (!user?.name) return null;
    return user.name.trim().split(/\s+/)[0];
  }, [user]);

  const greeting = useMemo(() => buildGreeting(firstName), [firstName]);

  // Typewriter effect for AI bubble — feels like a real conversation
  const [typed, setTyped] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => {
    let i = 0;
    const id = window.setInterval(() => {
      i += 2;
      setTyped(greeting.slice(0, i));
      if (i >= greeting.length) {
        window.clearInterval(id);
        // small breath, then reveal the input row
        window.setTimeout(() => setShowInput(true), 220);
      }
    }, 22);
    return () => window.clearInterval(id);
  }, [greeting]);

  const goToPlanner = (mode: "ai" | "manual") => {
    if (submitting || authLoading) return;

    // Gate: must be signed in
    if (!accessToken) {
      setShowSignIn(true);
      return;
    }

    setPlanningMode(mode);
    setSubmitting(true);
    window.setTimeout(() => router.push("/velosta-ai"), 180);
  };

  return (
    <main
      className="relative min-h-dscreen w-full overflow-hidden flex flex-col"
      style={{
        background:
          "linear-gradient(180deg, #FBF8F3 0%, #F5EFE6 55%, #EFEAE0 100%)",
        color: C.navy,
      }}
    >
      {/* ── Ambient washes — subtle Velosta atmosphere ──────────────────── */}
      <AmbientField />

      {/* ── Top bar: brand + Skip ───────────────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-5 sm:px-8 lg:px-12 pt-6 sm:pt-8">
        <Link
          href="/"
          className={`${playfair.className} text-[22px] tracking-tight font-semibold`}
          style={{ color: C.navy }}
        >
          velosta
        </Link>

        <Link
          href="/velosta-ai"
          className="text-[12px] sm:text-[13px] font-medium tracking-wide transition-colors duration-200"
          style={{ color: "rgba(11,31,42,0.55)" }}
        >
          Skip intro <span aria-hidden="true">→</span>
        </Link>
      </header>

      {/* ── Conversation stage ──────────────────────────────────────────── */}
      <section className="relative z-10 flex-1 flex items-center justify-center px-5 sm:px-8 lg:px-12 py-10 sm:py-14">
        <div className="w-full max-w-2xl">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-2 mb-6 sm:mb-8"
          >
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-full"
              style={{ background: "rgba(217,119,87,0.12)" }}
            >
              <Sparkles className="h-3 w-3" style={{ color: C.coral }} />
            </span>
            <span
              className="text-[10.5px] sm:text-[11px] font-semibold uppercase tracking-[0.28em]"
              style={{ color: C.teal }}
            >
              Velosta AI
            </span>
          </motion.div>

          {/* AI bubble */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
            className="flex items-start gap-3 sm:gap-4"
          >
            {/* Avatar */}
            <div
              className="shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center shadow-sm"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-brand-start, #E89378), var(--color-brand, #D97757))",
              }}
              aria-hidden="true"
            >
              <Compass className="h-5 w-5 text-white" strokeWidth={2.2} />
            </div>

            {/* Bubble */}
            <div className="flex-1 min-w-0">
              <p
                className="text-[10.5px] font-medium tracking-[0.18em] uppercase mb-2"
                style={{ color: "rgba(11,31,42,0.45)" }}
              >
                Your guide
              </p>
              <div
                className="relative rounded-2xl rounded-tl-sm px-5 py-4 sm:px-6 sm:py-5 shadow-[0_8px_24px_-12px_rgba(11,31,42,0.18)]"
                style={{
                  background: "rgba(255,255,255,0.78)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(217,119,87,0.18)",
                }}
              >
                <p
                  className={`${playfair.className} text-[clamp(1.5rem,4.6vw,2.25rem)] leading-[1.18] tracking-tight`}
                  style={{ color: C.navy }}
                >
                  {typed}
                  {typed.length < greeting.length && (
                    <span
                      className="inline-block w-[2px] h-[0.9em] ml-1 align-middle"
                      style={{
                        background: C.coral,
                        animation: "velosta-caret 1s steps(1) infinite",
                      }}
                    />
                  )}
                </p>
                <p
                  className={`${dancing.className} mt-3 sm:mt-4 text-[15px] sm:text-[17px]`}
                  style={{ color: "rgba(11,31,42,0.5)" }}
                >
                  Tell me a little, or jump straight in — I&apos;ll handle the rest.
                </p>
              </div>
            </div>
          </motion.div>

          {/* User input row + CTA */}
          <AnimatePresence>
            {showInput && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="mt-7 sm:mt-9 ml-0 sm:ml-[calc(2.75rem+1rem)]"
              >
                {/* Primary CTAs */}
                <div className="flex flex-col items-center gap-3">
                  <motion.button
                    type="button"
                    onClick={() => goToPlanner("ai")}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={submitting}
                    className="group inline-flex items-center justify-center gap-2.5 rounded-full px-7 sm:px-9 py-3.5 sm:py-4 text-[14px] sm:text-[15px] font-semibold disabled:opacity-70"
                    style={{
                      background: C.navy,
                      color: "#fff",
                      boxShadow: "0 14px 32px -10px rgba(11,31,42,0.4)",
                    }}
                  >
                    <Sparkles className="h-4 w-4" />
                    Start your journey with Velosta AI
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => goToPlanner("manual")}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={submitting}
                    className="group inline-flex items-center justify-center gap-2.5 rounded-full px-7 sm:px-9 py-3.5 sm:py-4 text-[14px] sm:text-[15px] font-semibold disabled:opacity-70 border"
                    style={{
                      background: "rgba(255,255,255,0.82)",
                      color: C.navy,
                      borderColor: "rgba(47,111,115,0.35)",
                      boxShadow: "0 12px 28px -12px rgba(11,31,42,0.22)",
                    }}
                  >
                    Build your own customised itinerary with the help of Velosta AI
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </motion.button>
                </div>

                {/* Trust line */}
                <p
                  className="mt-5 text-[12px] sm:text-[12.5px] leading-relaxed max-w-md"
                  style={{ color: "rgba(11,31,42,0.55)" }}
                >
                  No card. No sign-up walls. Just an AI travel partner that builds a
                  complete, personalised itinerary in under 90 seconds.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Local keyframes for the typewriter caret */}
      <style jsx global>{`
        @keyframes velosta-caret {
          0%, 50% { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }
      `}</style>

      {/* ── Sign-in gate modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showSignIn && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(11,31,42,0.55)", backdropFilter: "blur(6px)" }}
              onClick={() => setShowSignIn(false)}
            />

            {/* Card */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, y: 32, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="fixed z-50 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 bottom-8 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-sm rounded-3xl px-7 py-8"
              style={{
                background: "rgba(251,248,243,0.98)",
                border: "1px solid rgba(217,119,87,0.18)",
                boxShadow: "0 32px 64px -16px rgba(11,31,42,0.35)",
              }}
            >
              {/* Close */}
              <button
                onClick={() => setShowSignIn(false)}
                aria-label="Close"
                className="absolute top-4 right-4 h-7 w-7 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "rgba(11,31,42,0.06)", color: C.navy }}
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* Icon */}
              <div
                className="mx-auto mb-5 h-12 w-12 rounded-full flex items-center justify-center shadow-md"
                style={{
                  background: "linear-gradient(135deg, #E89378, #D97757)",
                }}
              >
                <Compass className="h-6 w-6 text-white" strokeWidth={2} />
              </div>

              {/* Copy */}
              <h2
                className={`${playfair.className} text-center text-[1.35rem] leading-snug tracking-tight mb-2`}
                style={{ color: C.navy }}
              >
                Sign in to start planning
              </h2>
              <p
                className="text-center text-[13px] leading-relaxed mb-7"
                style={{ color: "rgba(11,31,42,0.55)" }}
              >
                Your itinerary is queued and ready — sign in to generate it instantly.
              </p>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <Link
                  href={`/sign-in?next=/plan`}
                  className="w-full inline-flex items-center justify-center rounded-full px-6 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{
                    background: `linear-gradient(135deg, ${C.coralStart}, ${C.coral})`,
                    boxShadow: "0 8px 20px -8px rgba(217,119,87,0.55)",
                  }}
                >
                  Sign In
                </Link>
                <Link
                  href={`/sign-up?next=/plan`}
                  className="w-full inline-flex items-center justify-center rounded-full px-6 py-3 text-[14px] font-semibold transition-colors"
                  style={{
                    background: "rgba(11,31,42,0.06)",
                    color: C.navy,
                  }}
                >
                  Create an account
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────── */

function buildGreeting(firstName: string | null): string {
  const hour = new Date().getHours();
  const partOfDay =
    hour < 5 ? "Up late" :
    hour < 12 ? "Good morning" :
    hour < 17 ? "Good afternoon" :
    hour < 21 ? "Good evening" :
    "Up late";

  const name = firstName ? `, ${firstName}` : " there";
  return `${partOfDay}${name} — where shall we wander next?`;
}

/**
 * Soft ambient gradient orbs that sit behind the conversation, giving the
 * page an atmospheric quality without competing for attention.
 */
function AmbientField() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full blur-3xl opacity-50"
        style={{
          background:
            "radial-gradient(circle at center, rgba(217,119,87,0.30), transparent 65%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-20 h-[460px] w-[460px] rounded-full blur-3xl opacity-50"
        style={{
          background:
            "radial-gradient(circle at center, rgba(47,111,115,0.22), transparent 65%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 h-[260px] w-[260px] rounded-full blur-3xl opacity-30"
        style={{
          background:
            "radial-gradient(circle at center, rgba(232,147,120,0.35), transparent 70%)",
        }}
      />
    </>
  );
}
