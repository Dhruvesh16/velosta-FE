"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Playfair_Display } from "next/font/google";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { authApi } from "@/lib/api";
import { useUser } from "@/app/utils/context";
import {
  useOnboardingStore,
  type TravelProfileAnswers,
} from "@/lib/stores/onboarding-store";

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

  const answeredCount = useMemo(
    () => QUESTIONS.filter((q) => answers[q.key]).length,
    [answers]
  );
  const done = answeredCount === QUESTIONS.length;

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

          <div className="space-y-6">
            {QUESTIONS.map((q, idx) => (
              <section key={q.key} className="rounded-2xl border border-[#0B1F2A]/8 p-4 md:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2F6F73]/80">
                  Question {idx + 1}
                </p>
                <h2 className="mt-1 text-[15px] font-semibold text-[#0B1F2A]">{q.title}</h2>
                <div className="mt-3 grid gap-2">
                  {q.options.map((opt) => {
                    const active = answers[q.key] === opt.id;
                    return (
                      <button
                        key={String(opt.id)}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [q.key]: opt.id }))
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
              </section>
            ))}
          </div>

          <div className="mt-7 flex items-center justify-between">
            <p className="text-xs text-[#0B1F2A]/45">
              {answeredCount}/{QUESTIONS.length} answered
            </p>
            <button
              type="button"
              disabled={!done}
              onClick={async () => {
                const finalAnswers = answers as TravelProfileAnswers;
                completeTravelProfile(finalAnswers);
                if (accessToken) {
                  try {
                    await authApi.updateProfile({
                      travel_preferences: finalAnswers,
                    });
                  } catch {
                    // Non-blocking; local state is already saved.
                  }
                }
              }}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #D97757, #B85F44)",
                boxShadow: "0 14px 30px -12px rgba(217,119,87,0.5)",
              }}
            >
              <CheckCircle2 size={15} />
              Save my travel style
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

