"use client";

/**
 * IntentCapture — Editorial full-page intent form for Velosta AI.
 *
 * Replaces the modal-on-map "Start Your Journey" experience with a
 * landing-page-consistent split layout:
 *   • Left aside: editorial photograph + Playfair italic narrative + value props
 *   • Right: refined form (budget · duration · travelers · interests · origin)
 *
 * Reads/writes onboarding store. Advances flow to "explore" on submit.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Playfair_Display } from "next/font/google";
import {
  ArrowRight,
  LocateFixed,
  Loader2,
  MapPin,
  User,
  Heart,
  Users,
  Home,
  Sparkles,
} from "lucide-react";
import {
  useOnboardingStore,
  type BudgetTier,
} from "@/lib/stores/onboarding-store";
import {
  geocodeDestination,
  searchPlaces,
  type PlaceSuggestion,
} from "@/lib/services/geocoding";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

/* ── Coastal Luxury palette ────────────────────────────────────────── */
const C = {
  navy: "#0B1F2A",
  sand: "#F5EFE6",
  sandLight: "#FBF8F3",
  teal: "#2F6F73",
  tealLight: "#3A8589",
  coral: "#D97757",
  coralDark: "#B85F44",
  mist: "#D9E2E1",
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const TRAVELER_TYPES = [
  { id: "solo", label: "Solo", Icon: User },
  { id: "couple", label: "Couple", Icon: Heart },
  { id: "friends", label: "Friends", Icon: Users },
  { id: "family", label: "Family", Icon: Home },
] as const;

const INTERESTS = [
  { id: "nature", label: "Nature" },
  { id: "culture", label: "Culture" },
  { id: "adventure", label: "Adventure" },
  { id: "relaxation", label: "Slow travel" },
  { id: "food", label: "Food & wine" },
  { id: "nightlife", label: "Nightlife" },
  { id: "photography", label: "Photography" },
  { id: "wellness", label: "Wellness" },
];

const DURATION_OPTIONS = [2, 3, 5, 7, 10, 14];

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80&auto=format&fit=crop";

export default function IntentCapture() {
  const {
    setFlowStep,
    setUserLocation,
    setDuration: setStoreDuration,
    setBudgetAmount: setStoreBudget,
    setBudgetMode: setStoreBudgetMode,
    setTravelerType: setStoreTravelerType,
    setTravelerCount: setStoreTravelerCount,
    setInterests: setStoreInterests,
  } = useOnboardingStore();

  /* ── Form state ───────────────────────────────── */
  const [budget, setBudget] = useState(5000);
  const [budgetText, setBudgetText] = useState("5,000");
  const [budgetMode, setBudgetMode] = useState<"per_person" | "total">("per_person");
  const [travelerType, setTravelerType] = useState("solo");
  const [travelerCount, setTravelerCount] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [duration, setDuration] = useState(3);
  const [locationText, setLocationText] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string;
    coordinates: [number, number];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);

  /* ── Outside click closes suggestion popover ─────────────────────── */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        inputWrapperRef.current &&
        !inputWrapperRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ── Budget helpers ─────────────────────────────────────────────── */
  // Slider is capped at 50k for ergonomic dragging — beyond that the slider
  // would lose precision. Typed input is allowed all the way up to a hard
  // ceiling so high-budget travellers can still enter their value.
  const sliderMin = 1000;
  const sliderMax = 50000;
  const typedMin = 500;
  const typedMax = 10_000_000; // ₹1 Cr — sane upper bound
  const sliderPct =
    ((Math.min(budget, sliderMax) - sliderMin) / (sliderMax - sliderMin)) * 100;
  // When the typed value exceeds the slider cap, the thumb pins to the right.
  const budgetExceedsSlider = budget > sliderMax;

  const handleSliderChange = (val: number) => {
    setBudget(val);
    setBudgetText(val.toLocaleString("en-IN"));
  };

  const handleBudgetTextChange = (text: string) => {
    setBudgetText(text);
    const num = parseInt(text.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(num) && num >= typedMin && num <= typedMax) setBudget(num);
  };

  const handleBudgetBlur = () => {
    // Clamp to typed bounds on blur (handles paste of 9999999999 etc.).
    const clamped = Math.min(typedMax, Math.max(typedMin, budget));
    if (clamped !== budget) setBudget(clamped);
    setBudgetText(clamped.toLocaleString("en-IN"));
  };

  /* ── Origin: my-location + autocomplete ─────────────────────────── */
  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported in this browser.");
      return;
    }
    setIsLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { longitude, latitude } = pos.coords;
        try {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&limit=1`
          );
          const data = await res.json();
          const placeName = data.features?.[0]?.place_name ?? "My Location";
          const shortName = placeName
            .split(",")
            .slice(0, 2)
            .join(",")
            .trim();
          setLocationText(shortName);
          setSelectedPlace({
            name: shortName,
            coordinates: [longitude, latitude],
          });
        } catch {
          setLocationText("My Location");
          setSelectedPlace({
            name: "My Location",
            coordinates: [longitude, latitude],
          });
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setError("Could not get your location. Please allow location access.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleLocationChange = useCallback((value: string) => {
    setLocationText(value);
    setSelectedPlace(null);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await searchPlaces(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300);
  }, []);

  const handleSelectSuggestion = useCallback((s: PlaceSuggestion) => {
    setLocationText(s.name);
    setSelectedPlace({ name: s.name, coordinates: s.coordinates });
    setSuggestions([]);
    setShowSuggestions(false);
    setError(null);
  }, []);

  /* ── Interests ──────────────────────────────────────────────────── */
  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  /* ── Submit ─────────────────────────────────────────────────────── */
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    let destination = selectedPlace;
    if (!destination && locationText.trim()) {
      const coords = await geocodeDestination(locationText.trim());
      if (coords) {
        destination = { name: locationText.trim(), coordinates: coords };
      }
    }

    const customTier: BudgetTier = {
      id: "custom",
      label: "Custom Budget",
      range: `₹${budget.toLocaleString("en-IN")}`,
      min: Math.max(0, budget - 1000),
      max: budget,
      emoji: "🎯",
      tagline: "Your budget",
      examples: [],
      duration: `${duration} days`,
    };
    useOnboardingStore.setState({ selectedTier: customTier });

    if (destination) setUserLocation(destination);
    setStoreDuration(duration);
    // Normalize to per-person before persisting (planner expects per-person semantics).
    const perPerson = budgetMode === "total" && travelerCount > 0
      ? Math.round(budget / travelerCount)
      : budget;
    setStoreBudget(perPerson);
    setStoreBudgetMode(budgetMode);
    setStoreTravelerType(travelerType);
    setStoreTravelerCount(travelerCount);
    setStoreInterests(selectedInterests);
    setFlowStep("explore");
  }, [
    selectedPlace,
    locationText,
    budget,
    duration,
    travelerType,
    travelerCount,
    selectedInterests,
    budgetMode,
    setUserLocation,
    setStoreDuration,
    setStoreBudget,
    setStoreBudgetMode,
    setStoreTravelerType,
    setStoreTravelerCount,
    setStoreInterests,
    setFlowStep,
  ]);

  const isReady = duration > 0 && budget >= 1000;

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{ backgroundColor: C.sandLight }}
    >
      {/* Soft ambient washes */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 12% 22%, rgba(47,111,115,0.08) 0%, rgba(47,111,115,0) 60%), radial-gradient(50% 40% at 92% 88%, rgba(217,119,87,0.07) 0%, rgba(217,119,87,0) 60%)",
        }}
      />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1280px] grid-cols-1 gap-12 px-6 pt-10 pb-32 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-20 lg:px-12 lg:pt-28">
        {/* ── LEFT — Editorial aside ──────────────────────────────── */}
        <motion.aside
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="hidden flex-col justify-between lg:flex"
        >
          <div>
            {/* Eyebrow pill */}
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5"
              style={{
                borderColor: "rgba(47,111,115,0.22)",
                backgroundColor: "rgba(47,111,115,0.06)",
              }}
            >
              <Sparkles size={12} style={{ color: C.coral }} strokeWidth={2.2} />
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                style={{ color: C.teal }}
              >
                Step 01 · Intent
              </span>
            </div>

            {/* Headline */}
            <h1
              className={`${playfair.className} mt-6 tracking-tight`}
              style={{
                color: C.navy,
                fontSize: "clamp(2.25rem, 3.6vw, 3.75rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                fontWeight: 500,
              }}
            >
              Tell us the{" "}
              <span
                className="italic"
                style={{ color: C.coral, fontWeight: 600 }}
              >
                shape
              </span>{" "}
              of your trip.
            </h1>

            <p
              className="mt-5 max-w-[440px] text-[15px] leading-[1.7]"
              style={{ color: "rgba(11,31,42,0.65)" }}
            >
              Budget, pace, the feeling you&apos;re chasing. We&apos;ll match it to
              destinations that fit — and map a route that flows.
            </p>
          </div>

          {/* Editorial photo composition */}
          <div className="relative mt-12 aspect-[4/5] w-full max-w-[420px]">
            {/* Dashed orbit accent */}
            <svg
              aria-hidden
              className="absolute -inset-8 h-[calc(100%+4rem)] w-[calc(100%+4rem)]"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <ellipse
                cx="50"
                cy="50"
                rx="48"
                ry="48"
                fill="none"
                stroke={C.teal}
                strokeWidth="0.15"
                strokeDasharray="0.6 0.9"
                opacity="0.45"
              />
            </svg>
            {/* Coral dot */}
            <span
              aria-hidden
              className="absolute -left-3 top-10 h-3 w-3 rounded-full"
              style={{ backgroundColor: C.coral }}
            />
            {/* Teal dot */}
            <span
              aria-hidden
              className="absolute -right-2 bottom-16 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: C.teal }}
            />
            <div
              className="relative h-full w-full overflow-hidden rounded-[28px]"
              style={{
                boxShadow:
                  "0 30px 60px -20px rgba(11,31,42,0.18), 0 8px 20px -8px rgba(11,31,42,0.1)",
              }}
            >
              <Image
                src={HERO_IMAGE}
                alt="Traveler on the road"
                fill
                sizes="(min-width: 1024px) 420px, 0px"
                className="object-cover"
                priority
              />
              {/* Bottom narrative chip */}
              <div
                className="absolute bottom-4 left-4 right-4 rounded-2xl px-4 py-3"
                style={{
                  backgroundColor: "rgba(251,248,243,0.92)",
                  backdropFilter: "blur(14px)",
                  border: "1px solid rgba(11,31,42,0.06)",
                }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.24em]"
                  style={{ color: C.teal }}
                >
                  Today&apos;s match
                </p>
                <p
                  className={`${playfair.className} mt-0.5 text-[15px]`}
                  style={{ color: C.navy, fontWeight: 500 }}
                >
                  <span className="italic">Coastal Goa</span> · 4 nights · ₹6.5k
                </p>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* ── RIGHT — Form ─────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.9,
            delay: 0.1,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="relative w-full"
        >
          {/* Soft echo behind card */}
          <div
            aria-hidden
            className="absolute -inset-3 rounded-[32px]"
            style={{
              backgroundColor: "rgba(245,239,230,0.6)",
              filter: "blur(24px)",
            }}
          />

          <div
            className="relative rounded-[28px] px-7 py-9 md:px-10 md:py-11"
            style={{
              backgroundColor: "#FFFFFF",
              boxShadow:
                "0 30px 60px -20px rgba(11,31,42,0.12), 0 8px 20px -8px rgba(11,31,42,0.08)",
              border: "1px solid rgba(11,31,42,0.06)",
            }}
          >
            {/* Mobile-only headline */}
            <div className="mb-7 lg:hidden">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                style={{ color: C.teal }}
              >
                Step 01 · Intent
              </p>
              <h2
                className={`${playfair.className} mt-2 text-[28px]`}
                style={{ color: C.navy, fontWeight: 500, lineHeight: 1.1 }}
              >
                Shape your{" "}
                <span className="italic" style={{ color: C.coral }}>
                  trip
                </span>
              </h2>
            </div>

            {/* ── Budget ─────────────────────────────────────── */}
            <Field
              label={budgetMode === "per_person" ? "Budget per person" : "Total trip budget"}
              hint="Slide or type — we adapt."
            >
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                {/*
                  Auto-sizing currency display.
                  - Font scales down (42 → 36 → 32 px) as the number gets longer
                    so values like "₹50,000" or "₹1,00,000" never clip.
                  - The <input> width is driven by `ch` units against the
                    actual character count + a small caret allowance, so the
                    field hugs the value instead of using a fixed width.
                */}
                {(() => {
                  const len = budgetText.length;
                  // Tiered type scale — keeps ₹ + 5 digits flush, shrinks for 6+.
                  const fontPx = len <= 5 ? 42 : len <= 7 ? 36 : 32;
                  // 1ch ≈ width of "0"; +1 for caret breathing room.
                  const inputCh = Math.max(4, len + 1);
                  return (
                    <div className="flex items-baseline gap-1 min-w-0">
                      <span
                        className={`${playfair.className} leading-none`}
                        style={{ color: C.navy, fontWeight: 500, fontSize: `${fontPx}px` }}
                      >
                        ₹
                      </span>
                      <input
                        value={budgetText}
                        onChange={(e) => handleBudgetTextChange(e.target.value)}
                        onBlur={handleBudgetBlur}
                        inputMode="numeric"
                        aria-label={budgetMode === "per_person" ? "Budget per person" : "Total trip budget"}
                        className={`${playfair.className} bg-transparent font-medium outline-none tabular-nums`}
                        style={{
                          color: C.navy,
                          letterSpacing: "-0.02em",
                          fontSize: `${fontPx}px`,
                          // `ch` keeps width in sync with content; cap so a
                          // pasted huge number doesn't push the toggle off.
                          width: `${inputCh}ch`,
                          maxWidth: "100%",
                          minWidth: "4ch",
                        }}
                      />
                    </div>
                  );
                })()}
                {/* Segmented toggle: per person ⇄ total */}
                <div
                  role="tablist"
                  aria-label="Budget mode"
                  className="inline-flex shrink-0 items-center self-start rounded-full p-0.5 sm:mb-1 sm:self-end"
                  style={{
                    backgroundColor: "rgba(11,31,42,0.06)",
                    border: "1px solid rgba(11,31,42,0.08)",
                  }}
                >
                  {([
                    { id: "per_person", label: "Per person" },
                    { id: "total", label: "Total" },
                  ] as const).map((opt) => {
                    const active = budgetMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setBudgetMode(opt.id)}
                        className="rounded-full px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] transition-all"
                        style={{
                          backgroundColor: active ? "#FFFFFF" : "transparent",
                          color: active ? C.navy : "rgba(11,31,42,0.55)",
                          boxShadow: active
                            ? "0 1px 3px rgba(11,31,42,0.10), 0 0 0 1px rgba(11,31,42,0.06)"
                            : "none",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Derived equivalent — only meaningful when there's >1 traveller */}
              {travelerCount > 1 && (
                <p
                  className="mt-1 text-[11px]"
                  style={{ color: "rgba(11,31,42,0.5)" }}
                >
                  {budgetMode === "per_person" ? (
                    <>
                      ≈{" "}
                      <span className="font-semibold" style={{ color: C.navy }}>
                        ₹{(budget * travelerCount).toLocaleString("en-IN")}
                      </span>{" "}
                      total for {travelerCount} travellers
                    </>
                  ) : (
                    <>
                      ≈{" "}
                      <span className="font-semibold" style={{ color: C.navy }}>
                        ₹{Math.round(budget / Math.max(1, travelerCount)).toLocaleString("en-IN")}
                      </span>{" "}
                      per person
                    </>
                  )}
                </p>
              )}
              <div className="relative mt-5 h-1.5 rounded-full" style={{ backgroundColor: C.mist }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${sliderPct}%`,
                    background: `linear-gradient(90deg, ${C.tealLight}, ${C.coral})`,
                  }}
                />
                <input
                  type="range"
                  min={sliderMin}
                  max={sliderMax}
                  step={500}
                  value={Math.min(budget, sliderMax)}
                  onChange={(e) => handleSliderChange(Number(e.target.value))}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label={`Budget slider (${sliderMin.toLocaleString("en-IN")}–${sliderMax.toLocaleString("en-IN")}). Type for higher values.`}
                />
                <div
                  aria-hidden
                  className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full"
                  style={{
                    left: `calc(${sliderPct}% - 10px)`,
                    backgroundColor: C.coral,
                    border: "3px solid #FFFFFF",
                    boxShadow: "0 4px 14px -2px rgba(217,119,87,0.45)",
                  }}
                />
              </div>
              <div
                className="mt-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.18em]"
                style={{ color: "rgba(11,31,42,0.4)" }}
              >
                <span>₹1k</span>
                {budgetExceedsSlider ? (
                  <span style={{ color: C.coral }}>
                    Typed · ₹{budget.toLocaleString("en-IN")}
                  </span>
                ) : (
                  <span>₹50k · type for more</span>
                )}
              </div>
            </Field>

            {/* ── Duration ───────────────────────────────────── */}
            <Field label="How many days?">
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((d) => {
                  const active = duration === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className="rounded-full px-4 py-2 text-[13px] font-medium transition-all"
                      style={{
                        backgroundColor: active ? C.navy : "transparent",
                        color: active ? C.sandLight : C.navy,
                        border: `1px solid ${
                          active ? C.navy : "rgba(11,31,42,0.14)"
                        }`,
                      }}
                    >
                      {d} {d === 1 ? "day" : "days"}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* ── Travelers ──────────────────────────────────── */}
            <Field label="Who's going?">
              <div className="grid grid-cols-4 gap-2">
                {TRAVELER_TYPES.map(({ id, label, Icon }) => {
                  const active = travelerType === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTravelerType(id)}
                      className="group flex flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 transition-all"
                      style={{
                        backgroundColor: active
                          ? "rgba(47,111,115,0.08)"
                          : "transparent",
                        border: `1px solid ${
                          active ? C.teal : "rgba(11,31,42,0.1)"
                        }`,
                      }}
                    >
                      <Icon
                        size={18}
                        strokeWidth={1.6}
                        style={{ color: active ? C.teal : C.navy }}
                      />
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: active ? C.teal : C.navy }}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* ── Interests ──────────────────────────────────── */}
            <Field label="What excites you?" hint="Optional · pick a few">
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(({ id, label }) => {
                  const active = selectedInterests.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleInterest(id)}
                      className="rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all"
                      style={{
                        backgroundColor: active ? C.coral : "transparent",
                        color: active ? "#FFFFFF" : C.navy,
                        border: `1px solid ${
                          active ? C.coral : "rgba(11,31,42,0.12)"
                        }`,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* ── Origin (optional) ─────────────────────────── */}
            <Field label="Starting from" hint="Optional">
              <div ref={inputWrapperRef} className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin
                      size={15}
                      strokeWidth={1.8}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: "rgba(11,31,42,0.45)" }}
                    />
                    <input
                      type="text"
                      placeholder="e.g. Mumbai, Bengaluru…"
                      value={locationText}
                      onChange={(e) => handleLocationChange(e.target.value)}
                      className="h-11 w-full rounded-xl pl-9 pr-3 text-[13.5px] outline-none transition-colors focus:border-[color:var(--color-brand)]"
                      style={{
                        backgroundColor: C.sandLight,
                        border: "1px solid rgba(11,31,42,0.1)",
                        color: C.navy,
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleMyLocation}
                    disabled={isLocating}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-xl px-3.5 text-[12px] font-semibold transition-colors disabled:opacity-60"
                    style={{
                      backgroundColor: "transparent",
                      color: C.teal,
                      border: `1px solid ${C.teal}`,
                    }}
                  >
                    {isLocating ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <LocateFixed size={14} strokeWidth={1.8} />
                    )}
                    {isLocating ? "Locating" : "Use mine"}
                  </button>
                </div>

                {/* Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-xl"
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid rgba(11,31,42,0.08)",
                      boxShadow: "0 18px 32px -12px rgba(11,31,42,0.16)",
                    }}
                  >
                    {suggestions.map((s, i) => (
                      <button
                        key={`${s.name}-${i}`}
                        type="button"
                        onClick={() => handleSelectSuggestion(s)}
                        className="flex w-full items-start gap-2.5 border-b px-4 py-2.5 text-left text-[13px] transition-colors last:border-b-0 hover:bg-[#FBF8F3]"
                        style={{
                          borderColor: "rgba(11,31,42,0.05)",
                          color: C.navy,
                        }}
                      >
                        <MapPin
                          size={13}
                          strokeWidth={1.8}
                          className="mt-0.5 shrink-0"
                          style={{ color: C.teal }}
                        />
                        <span>{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {error && (
                <p className="mt-2 text-[11.5px]" style={{ color: C.coralDark }}>
                  {error}
                </p>
              )}
            </Field>

            {/* ── Submit ─────────────────────────────────────── */}
            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setFlowStep("landing")}
                className="text-[12.5px] font-semibold transition-colors"
                style={{ color: "rgba(11,31,42,0.55)" }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isReady || submitting}
                className="group inline-flex h-12 items-center gap-2.5 rounded-full px-7 text-[13.5px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60"
                style={{
                  backgroundColor: C.coral,
                  boxShadow:
                    "0 16px 36px -12px rgba(217,119,87,0.55), 0 4px 10px -4px rgba(217,119,87,0.3)",
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Mapping
                  </>
                ) : (
                  <>
                    Find destinations
                    <ArrowRight
                      size={15}
                      strokeWidth={2.2}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </div>

            {/* Footer microcopy */}
            <p
              className="mt-4 text-center text-[10.5px] font-medium uppercase tracking-[0.24em]"
              style={{ color: "rgba(11,31,42,0.4)" }}
            >
              ~ 90 seconds · No credit card · Auto-saves
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

/* ── Field — labelled wrapper for form rows ───────────────────────── */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-7 last:mb-0">
      <div className="mb-3 flex items-baseline justify-between">
        <label
          className="text-[11px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: "rgba(11,31,42,0.7)" }}
        >
          {label}
        </label>
        {hint && (
          <span
            className="text-[11px]"
            style={{ color: "rgba(11,31,42,0.4)" }}
          >
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
