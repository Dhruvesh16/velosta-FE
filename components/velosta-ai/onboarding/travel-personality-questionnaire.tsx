"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Playfair_Display } from "next/font/google";
import { Sparkles, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import { useUser } from "@/app/utils/context";
import {
  useOnboardingStore,
  type TravelProfileAnswers,
} from "@/lib/stores/onboarding-store";
import {
  markTravelProfilePendingSync,
  syncTravelProfileToServer,
} from "@/lib/services/travel-profile-sync";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["500", "600"] });

type QuestionKey = keyof TravelProfileAnswers;

const QUESTIONS: Array<{
  key: QuestionKey;
  title: string;
  options: Array<{ id: TravelProfileAnswers[QuestionKey]; label: string }>;
}> = [
  {
    key: "climatePreference",
    title: "Do you prefer cool or warm destinations?",
    options: [
      { id: "cool_breezy", label: "Cool & breezy ❄️🍃" },
      { id: "warm_sunny", label: "Warm & sunny ☀️🏖️" },
      { id: "doesnt_matter", label: "Doesn't matter 🌍" },
    ],
  },
  {
    key: "pacePreference",
    title: "Do you like a packed itinerary or prefer slow, relaxed travel?",
    options: [
      { id: "packed", label: "Packed ⚡🗺️" },
      { id: "slow_relaxed", label: "Slow & relaxed 😌🍵" },
      { id: "both", label: "Both 🎯" },
    ],
  },
  {
    key: "randomPlaceComfort",
    title: "Do you ever walk into a random place with no reviews?",
    options: [
      { id: "yes", label: "Yea 🚶‍♂️✨" },
      { id: "depends", label: "Depends 🤔" },
      { id: "not_really", label: "Not really 🧭" },
    ],
  },
  {
    key: "placeEnergy",
    title: "What kind of places get you more excited?",
    options: [
      { id: "adventurous", label: "Adventurous 🧗🌄" },
      { id: "chill_calm", label: "Chill & calm 🌿🌊" },
      { id: "doesnt_matter", label: "Doesn't matter 🎒" },
    ],
  },
  {
    key: "socialSpotFocus",
    title: "Are you someone who plans around social-media-worthy spots?",
    options: [
      { id: "absolutely", label: "Absolutely 📸🔥" },
      { id: "sometimes", label: "Sometimes for good spots 🌅" },
      { id: "not_my_thing", label: "Not really my thing 🧘" },
    ],
  },
];

const EMPTY: Partial<TravelProfileAnswers> = {};

export default function TravelPersonalityQuestionnaire() {
  const { completeTravelProfile } = useOnboardingStore();
  const { accessToken } = useUser();
  const [answers, setAnswers] = useState<Partial<TravelProfileAnswers>>(EMPTY);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const answeredCount = useMemo(
    () => QUESTIONS.filter((q) => answers[q.key]).length,
    [answers]
  );
  const done = answeredCount === QUESTIONS.length;
  const currentQuestion = QUESTIONS[currentIndex];
  const hasAnswerForCurrent = !!answers[currentQuestion.key];
  const onLastQuestion = currentIndex === QUESTIONS.length - 1;

  const goNext = () => {
    if (onLastQuestion) return;
    setDirection(1);
    setCurrentIndex((prev) => Math.min(prev + 1, QUESTIONS.length - 1));
  };

  const goBack = () => {
    if (currentIndex === 0) return;
    setDirection(-1);
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const saveProfile = async () => {
    const finalAnswers = answers as TravelProfileAnswers;
    completeTravelProfile(finalAnswers);
    if (!accessToken) {
      markTravelProfilePendingSync(finalAnswers);
      return;
    }
    const synced = await syncTravelProfileToServer(finalAnswers);
    if (!synced) {
      setSyncMsg("Saved locally. We'll auto-sync this once your session is stable.");
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#FBF8F3]">
      <div className="mx-auto max-w-3xl px-5 py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-3xl border border-[#0B1F2A]/10 bg-white/85 p-6 md:p-8 shadow-[0_20px_60px_-30px_rgba(11,31,42,0.35)]"
        >
          <div className="mb-6">
            <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#2F6F73]">
              <Sparkles size={12} className="text-[#D97757]" />
              Travel Personality
            </p>
            <h1 className={`${playfair.className} mt-2 text-[30px] leading-[1.15] text-[#0B1F2A]`}>
              Help Velosta know your style
            </h1>
            <p className="mt-2 text-sm text-[#0B1F2A]/55">
              One-time setup. We remember this and personalize every itinerary automatically.
            </p>
            <div className="mt-4 h-1.5 w-full rounded-full bg-[#0B1F2A]/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#D97757] to-[#2F6F73]"
                style={{ width: `${(answeredCount / QUESTIONS.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="min-h-[280px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.section
                key={currentQuestion.key}
                initial={{ opacity: 0, x: direction > 0 ? 42 : -42, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: direction > 0 ? -42 : 42, scale: 0.98 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl border border-[#0B1F2A]/8 p-4 md:p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2F6F73]/80">
                  Question {currentIndex + 1}
                </p>
                <h2 className="mt-1 text-[15px] font-semibold text-[#0B1F2A]">
                  {currentQuestion.title}
                </h2>
                <div className="mt-3 grid gap-2">
                  {currentQuestion.options.map((opt) => {
                    const active = answers[currentQuestion.key] === opt.id;
                    return (
                      <button
                        key={String(opt.id)}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [currentQuestion.key]: opt.id,
                          }))
                        }
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all ${
                          active
                            ? "border-[#D97757] bg-[#D97757]/10 text-[#B85F44]"
                            : "border-[#0B1F2A]/10 bg-white text-[#0B1F2A]/80 hover:border-[#D97757]/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </motion.section>
            </AnimatePresence>
          </div>

          <div className="mt-7 flex items-center justify-between">
            <p className="text-xs text-[#0B1F2A]/45">
              {answeredCount}/{QUESTIONS.length} answered
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goBack}
                disabled={currentIndex === 0}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#0B1F2A]/15 px-4 py-2.5 text-xs font-semibold text-[#0B1F2A]/70 disabled:opacity-40"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              {onLastQuestion ? (
                <button
                  type="button"
                  disabled={!done}
                  onClick={saveProfile}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #D97757, #B85F44)",
                    boxShadow: "0 14px 30px -12px rgba(217,119,87,0.5)",
                  }}
                >
                  <CheckCircle2 size={15} />
                  Save my travel style
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!hasAnswerForCurrent}
                  onClick={goNext}
                  className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #D97757, #B85F44)" }}
                >
                  Next
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
          {syncMsg && <p className="mt-3 text-xs text-[#0B1F2A]/55">{syncMsg}</p>}
        </motion.div>
      </div>
    </div>
  );
}

