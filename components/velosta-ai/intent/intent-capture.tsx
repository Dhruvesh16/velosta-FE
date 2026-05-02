"use client";

/**
 * IntentCapture — Editorial full-page intent form for Velosta AI.
 *
 * Replaces the modal-on-map "Start Your Journey" experience with a
 * landing-page-consistent split layout:
 *   • Left aside: editorial photograph + Playfair italic narrative + value props
 *   • Right: refined form (budget · trip dates · travelers · interests · origin)
 *
 * Reads/writes onboarding store. Advances flow to "explore" on submit.
 */

import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Playfair_Display } from "next/font/google";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
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
import {
  clampTripDatesForOpenMeteoForecast,
  fetchTripWindowForecast,
  summarizeTripWindowForecast,
} from "@/lib/services/trip-window-forecast";
import { buildBudgetRealityMessage } from "@/lib/services/budget-feasibility";
import { useNarrowViewport } from "@/lib/hooks/use-narrow-viewport";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
} from "date-fns";

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
  { id: "food", label: "Food" },
  { id: "nightlife", label: "Nightlife" },
  { id: "photography", label: "Photography" },
  { id: "wellness", label: "Wellness" },
];

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80&auto=format&fit=crop";

export default function IntentCapture() {
  const {
    setFlowStep,
    setUserLocation,
    duration,
    tripStartDate,
    tripEndDate,
    setTripDates,
    setBudgetAmount: setStoreBudget,
    setBudgetMode: setStoreBudgetMode,
    setTravelerType: setStoreTravelerType,
    setTravelerCount: setStoreTravelerCount,
    setInterests: setStoreInterests,
    setCustomDestination,
  } = useOnboardingStore();

  const narrowViewport = useNarrowViewport();

  /* ── Form state ───────────────────────────────── */
  const [budget, setBudget] = useState(5000);
  const [budgetText, setBudgetText] = useState("5,000");
  const [budgetMode, setBudgetMode] = useState<"per_person" | "total">("per_person");
  const [travelerType, setTravelerType] = useState("solo");
  const [travelerCount, setTravelerCount] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [forecastLine, setForecastLine] = useState<string | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [forecastHorizonNote, setForecastHorizonNote] = useState<string | null>(null);
  const [tripDatesOpen, setTripDatesOpen] = useState(false);
  // Origin ("Starting from")
  const [locationText, setLocationText] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string;
    coordinates: [number, number];
  } | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Destination ("Where to?")
  const [destText, setDestText] = useState("");
  const [selectedDest, setSelectedDest] = useState<PlaceSuggestion | null>(null);
  const [destSuggestions, setDestSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const destWrapperRef = useRef<HTMLDivElement>(null);

  /* ── Outside click closes suggestion popovers ───────────────────────── */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        inputWrapperRef.current &&
        !inputWrapperRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
      if (
        destWrapperRef.current &&
        !destWrapperRef.current.contains(e.target as Node)
      ) {
        setShowDestSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ── Auto-sync traveler count when type changes ─────────────────────── */
  useEffect(() => {
    if (travelerType === "solo") setTravelerCount(1);
    else if (travelerType === "couple") setTravelerCount((c) => (c < 2 ? 2 : c));
    else setTravelerCount((c) => (c < 2 ? 3 : c));
  }, [travelerType]);

  /* ── Default trip window when store has no dates (e.g. legacy persist) ─ */
  useLayoutEffect(() => {
    const st = useOnboardingStore.getState();
    if (st.tripStartDate && st.tripEndDate) return;
    const from = startOfDay(new Date());
    const to = addDays(from, 2);
    st.setTripDates(format(from, "yyyy-MM-dd"), format(to, "yyyy-MM-dd"));
  }, [setTripDates]);

  const selectedRange: DateRange = useMemo(() => {
    if (tripStartDate && tripEndDate) {
      return { from: parseISO(tripStartDate), to: parseISO(tripEndDate) };
    }
    const from = startOfDay(new Date());
    return { from, to: addDays(from, 2) };
  }, [tripStartDate, tripEndDate]);

  const handleTripRangeSelect = useCallback(
    (range: DateRange | undefined, autoClose: boolean) => {
      if (!range?.from) return;
      startTransition(() => {
        const rawTo = range.to ?? range.from;
        let from = startOfDay(range.from);
        let to = startOfDay(rawTo);
        if (to < from) [from, to] = [to, from];
        const span = differenceInCalendarDays(to, from) + 1;
        if (span > 30) {
          to = addDays(from, 29);
        }
        setTripDates(format(from, "yyyy-MM-dd"), format(to, "yyyy-MM-dd"));
        if (autoClose && range.to) setTripDatesOpen(false);
      });
    },
    [setTripDates]
  );

  const tripDateChipLabel = useMemo(
    () =>
      tripStartDate && tripEndDate
        ? `${format(parseISO(tripStartDate), "EEE, d MMM")} · ${format(parseISO(tripEndDate), "EEE, d MMM yyyy")}`
        : null,
    [tripStartDate, tripEndDate]
  );

  const tripRangeCalendar = useMemo(
    () => (
      <Calendar
        mode="range"
        captionLayout={narrowViewport ? "dropdown" : "label"}
        startMonth={new Date(new Date().getFullYear(), 0)}
        endMonth={new Date(new Date().getFullYear() + 2, 11)}
        numberOfMonths={narrowViewport ? 1 : 2}
        selected={selectedRange}
        onSelect={(r) => handleTripRangeSelect(r, true)}
        disabled={{ before: startOfDay(new Date()) }}
        defaultMonth={selectedRange.from}
        className={cn(
          "rounded-xl border-0 bg-transparent p-0 shadow-none touch-manipulation",
          narrowViewport
            ? "[--cell-size:clamp(2.75rem,12vw,3rem)]"
            : "[--cell-size:2.5rem] sm:[--cell-size:2.625rem]"
        )}
      />
    ),
    [handleTripRangeSelect, narrowViewport, selectedRange]
  );

  const forecastCoords = selectedDest?.coordinates ?? selectedPlace?.coordinates;

  const deferredTripStart = useDeferredValue(tripStartDate);
  const deferredTripEnd = useDeferredValue(tripEndDate);

  useEffect(() => {
    if (!forecastCoords || !deferredTripStart || !deferredTripEnd) {
      setForecastLine(null);
      setForecastError(null);
      setForecastHorizonNote(null);
      setForecastLoading(false);
      return;
    }
    const clamped = clampTripDatesForOpenMeteoForecast(
      deferredTripStart,
      deferredTripEnd
    );
    if (!clamped) {
      setForecastLine(null);
      setForecastHorizonNote(null);
      setForecastError(
        "Weather preview only covers roughly the next 16 days — choose earlier trip dates."
      );
      setForecastLoading(false);
      return;
    }
    const horizonNote =
      deferredTripEnd > clamped.end
        ? `Open-Meteo outlook is capped at about 16 days; summary uses through ${format(
            parseISO(clamped.end),
            "MMM d"
          )}.`
        : null;

    const [lng, lat] = forecastCoords;
    let cancelled = false;
    setForecastLoading(true);
    setForecastError(null);
    setForecastHorizonNote(null);
    fetchTripWindowForecast(lat, lng, deferredTripStart, deferredTripEnd)
      .then((rows) => {
        if (cancelled) return;
        if (!rows?.length) {
          setForecastLine(null);
          setForecastHorizonNote(null);
          setForecastError("Weather preview unavailable for this window.");
          return;
        }
        setForecastLine(summarizeTripWindowForecast(rows));
        setForecastHorizonNote(horizonNote);
      })
      .catch(() => {
        if (!cancelled) {
          setForecastLine(null);
          setForecastHorizonNote(null);
          setForecastError("Could not load weather for these dates.");
        }
      })
      .finally(() => {
        if (!cancelled) setForecastLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [forecastCoords, deferredTripStart, deferredTripEnd]);

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
    // Allow digits and commas only — block letters/symbols at input time
    const filtered = text.replace(/[^0-9,]/g, "");
    setBudgetText(filtered);
    const num = parseInt(filtered.replace(/[^0-9]/g, ""), 10);
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

  /* ── Destination autocomplete ───────────────────────────────────── */
  const handleDestChange = useCallback((value: string) => {
    setDestText(value);
    setSelectedDest(null);
    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);
    if (value.trim().length < 2) {
      setDestSuggestions([]);
      setShowDestSuggestions(false);
      return;
    }
    destDebounceRef.current = setTimeout(async () => {
      const results = await searchPlaces(value);
      setDestSuggestions(results);
      setShowDestSuggestions(results.length > 0);
    }, 300);
  }, []);

  const handleSelectDestSuggestion = useCallback((s: PlaceSuggestion) => {
    setDestText(s.name);
    setSelectedDest(s);
    setDestSuggestions([]);
    setShowDestSuggestions(false);
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

    const tripWindowLabel =
      tripStartDate && tripEndDate
        ? `${format(parseISO(tripStartDate), "d MMM")} – ${format(parseISO(tripEndDate), "d MMM yyyy")} · ${duration} ${duration === 1 ? "day" : "days"}`
        : `${duration} ${duration === 1 ? "day" : "days"}`;

    const customTier: BudgetTier = {
      id: "custom",
      label: "Custom Budget",
      range: `₹${budget.toLocaleString("en-IN")}`,
      min: Math.max(0, budget - 1000),
      max: budget,
      emoji: "🎯",
      tagline: "Your budget",
      examples: [],
      duration: tripWindowLabel,
    };
    useOnboardingStore.setState({ selectedTier: customTier });

    if (destination) setUserLocation(destination);
    // Normalize to per-person before persisting (planner expects per-person semantics).
    const perPerson = budgetMode === "total" && travelerCount > 0
      ? Math.round(budget / travelerCount)
      : budget;
    const selectedDestinationName =
      selectedDest?.name ?? destination?.name ?? locationText.trim();
    if (selectedDestinationName) {
      const budgetReality = buildBudgetRealityMessage({
        destination: selectedDestinationName,
        days: duration,
        currentBudgetPerPerson: perPerson,
      });
      if (budgetReality) {
        setError(budgetReality.message);
        setSubmitting(false);
        return;
      }
    }
    setStoreBudget(perPerson);
    setStoreBudgetMode(budgetMode);
    setStoreTravelerType(travelerType);
    setStoreTravelerCount(travelerCount);
    setStoreInterests(selectedInterests);

    // Store custom destination if picked — explore-map will auto-build for it
    if (selectedDest) {
      setCustomDestination({
        name: selectedDest.name,
        fullName: selectedDest.fullName,
        coordinates: selectedDest.coordinates,
      });
    } else {
      setCustomDestination(null);
    }

    setFlowStep("explore");
  }, [
    selectedPlace,
    locationText,
    selectedDest,
    budget,
    duration,
    tripStartDate,
    tripEndDate,
    travelerType,
    travelerCount,
    selectedInterests,
    budgetMode,
    setUserLocation,
    setStoreBudget,
    setStoreBudgetMode,
    setStoreTravelerType,
    setStoreTravelerCount,
    setStoreInterests,
    setCustomDestination,
    setFlowStep,
  ]);

  const isReady = duration > 0 && budget >= 1000;

  const perPersonBudget =
    budgetMode === "total" && travelerCount > 0
      ? Math.round(budget / travelerCount)
      : budget;
  const dailyBudgetGuide =
    duration > 0 ? Math.round(perPersonBudget / duration) : 0;

  const tripSketchDates =
    tripStartDate && tripEndDate
      ? `${format(parseISO(tripStartDate), "MMM d")} – ${format(parseISO(tripEndDate), "MMM d")}`
      : `${duration} ${duration === 1 ? "day" : "days"}`;

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
              destinations that fit, and map a route that flows.
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
                  Your trip sketch
                </p>
                <p
                  className={`${playfair.className} mt-0.5 text-[15px]`}
                  style={{ color: C.navy, fontWeight: 500 }}
                >
                  ₹{budgetText} · {tripSketchDates} ·{" "}
                  {TRAVELER_TYPES.find((t) => t.id === travelerType)?.label ?? "Travelers"}
                  {selectedInterests.length > 0
                    ? ` · ${selectedInterests
                        .map((id) => INTERESTS.find((x) => x.id === id)?.label ?? id)
                        .slice(0, 3)
                        .join(", ")}`
                    : ""}
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
              hint="Slide or type; we adapt."
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
                  className="absolute inset-x-0 top-1/2 z-10 h-8 w-full -translate-y-1/2 cursor-ew-resize opacity-0"
                  style={{ touchAction: "pan-y" }}
                  aria-label={`Budget slider (${sliderMin.toLocaleString("en-IN")}–${sliderMax.toLocaleString("en-IN")}). Type for higher values.`}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full"
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

            {/* ── Trip dates (range) ─────────────────────────── */}
            <Field
              label="When are you going?"
              hint={
                narrowViewport
                  ? "Open the date picker, tap start date then end date. Max 30 days — we use these for weather and planning."
                  : "Open below, choose start then end (max 30 days). Dates power weather hints and pacing."
              }
            >
              {narrowViewport ? (
                <>
                  <button
                    type="button"
                    onClick={() => setTripDatesOpen(true)}
                    className={cn(
                      "flex w-full touch-manipulation items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3.5 text-left shadow-sm outline-none transition-[box-shadow,border-color]",
                      "min-h-[52px] hover:border-[rgba(217,119,87,0.28)] focus-visible:border-[rgba(217,119,87,0.45)] focus-visible:ring-[3px] focus-visible:ring-[rgba(217,119,87,0.15)]"
                    )}
                    style={{ borderColor: "rgba(11,31,42,0.12)" }}
                    aria-expanded={tripDatesOpen}
                    aria-haspopup="dialog"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: "rgba(47,111,115,0.09)" }}
                        aria-hidden
                      >
                        <CalendarDays className="size-[22px] text-[#2F6F73]" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0">
                        <span
                          className="block text-[10px] font-semibold uppercase tracking-[0.16em]"
                          style={{ color: "rgba(11,31,42,0.45)" }}
                        >
                          Travel dates
                        </span>
                        <span className="block truncate font-serif text-[15px] font-semibold leading-snug text-[#0B1F2A]">
                          {tripDateChipLabel ?? "Tap to choose dates"}
                        </span>
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-[18px] shrink-0 text-[#0B1F2A]/35 transition-transform duration-200",
                        tripDatesOpen && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </button>
                  <Dialog open={tripDatesOpen} onOpenChange={setTripDatesOpen}>
                    <DialogContent
                      showCloseButton
                      className={cn(
                        "gap-0 overflow-hidden border-x-0 border-b-0 p-0 sm:max-w-lg",
                        "fixed top-auto right-0 bottom-0 left-0 max-h-[min(88dvh,560px)] w-full max-w-none translate-x-0 translate-y-0 rounded-t-3xl rounded-b-none sm:rounded-t-3xl",
                        "shadow-[0_-16px_48px_-20px_rgba(11,31,42,0.28)]"
                      )}
                    >
                      <DialogHeader className="border-b border-[#0B1F2A]/8 px-5 py-4 text-left">
                        <DialogTitle className="font-serif text-lg text-[#0B1F2A]">
                          Choose your dates
                        </DialogTitle>
                        <DialogDescription className="text-[12px] text-[#0B1F2A]/55">
                          Tap the first day and the last day. Long trips stay within 30 days.
                        </DialogDescription>
                      </DialogHeader>
                      <div
                        className="flex max-h-[min(68dvh,440px)] justify-center overflow-y-auto overscroll-contain px-2 py-3 pb-[max(12px,calc(env(safe-area-inset-bottom,0px)+12px))]"
                      >
                        {tripRangeCalendar}
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <Popover open={tripDatesOpen} onOpenChange={setTripDatesOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full touch-manipulation items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3.5 text-left shadow-sm outline-none transition-[box-shadow,border-color]",
                        "min-h-[52px] hover:border-[rgba(217,119,87,0.28)] focus-visible:border-[rgba(217,119,87,0.45)] focus-visible:ring-[3px] focus-visible:ring-[rgba(217,119,87,0.15)]"
                      )}
                      style={{ borderColor: "rgba(11,31,42,0.12)" }}
                      aria-expanded={tripDatesOpen}
                      aria-haspopup="dialog"
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <span
                          className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                          style={{ background: "rgba(47,111,115,0.09)" }}
                          aria-hidden
                        >
                          <CalendarDays className="size-[22px] text-[#2F6F73]" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0">
                          <span
                            className="block text-[10px] font-semibold uppercase tracking-[0.16em]"
                            style={{ color: "rgba(11,31,42,0.45)" }}
                          >
                            Travel dates
                          </span>
                          <span className="block truncate font-serif text-[15px] font-semibold leading-snug text-[#0B1F2A]">
                            {tripDateChipLabel ?? "Choose dates"}
                          </span>
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-[18px] shrink-0 text-[#0B1F2A]/35 transition-transform duration-200",
                          tripDatesOpen && "rotate-180"
                        )}
                        aria-hidden
                      />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    sideOffset={8}
                    collisionPadding={16}
                    className="z-[60] w-auto max-w-[min(100vw-1.5rem,720px)] rounded-2xl border border-[#0B1F2A]/10 bg-[#FFFCF8] p-2 shadow-xl"
                  >
                    <p className="mb-1.5 px-2 text-[11px] font-medium text-[#0B1F2A]/50">
                      Select start, then end — max 30 days
                    </p>
                    <div className="flex justify-center">{tripRangeCalendar}</div>
                  </PopoverContent>
                </Popover>
              )}
              <p
                className="mt-2 text-center text-[12px] font-medium"
                style={{ color: C.teal }}
              >
                {tripStartDate && tripEndDate
                  ? `${format(parseISO(tripStartDate), "EEE, d MMM")} → ${format(parseISO(tripEndDate), "EEE, d MMM yyyy")} · ${duration} calendar ${duration === 1 ? "day" : "days"}`
                  : null}
              </p>
              <div
                className="mt-4 space-y-2 rounded-2xl border px-4 py-3"
                style={{
                  borderColor: "rgba(11,31,42,0.1)",
                  backgroundColor: "rgba(47,111,115,0.04)",
                }}
              >
                {!forecastCoords ? (
                  <p className="text-[12px] leading-relaxed" style={{ color: "rgba(11,31,42,0.6)" }}>
                    Add a destination or starting point to preview weather for your
                    dates.
                  </p>
                ) : forecastLoading ? (
                  <p className="flex items-center justify-center gap-2 text-[12px]" style={{ color: C.teal }}>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Loading weather for this window…
                  </p>
                ) : forecastError ? (
                  <p className="text-[12px]" style={{ color: C.coralDark }}>
                    {forecastError}
                  </p>
                ) : forecastLine ? (
                  <>
                    <p className="text-[12px] leading-relaxed" style={{ color: "rgba(11,31,42,0.75)" }}>
                      <span className="font-semibold" style={{ color: C.navy }}>
                        Weather:{" "}
                      </span>
                      {forecastLine}
                    </p>
                    {forecastHorizonNote ? (
                      <p className="text-[11px] leading-relaxed" style={{ color: "rgba(11,31,42,0.5)" }}>
                        {forecastHorizonNote}
                      </p>
                    ) : null}
                  </>
                ) : null}
                {duration > 0 && (
                  <p className="text-[12px] leading-relaxed" style={{ color: "rgba(11,31,42,0.65)" }}>
                    <span className="font-semibold" style={{ color: C.navy }}>
                      Budget guide:{" "}
                    </span>
                    With your numbers, about{" "}
                    <span className="font-semibold" style={{ color: C.coral }}>
                      ₹{dailyBudgetGuide.toLocaleString("en-IN")}
                    </span>{" "}
                    per person per day over this trip (stays and transport move with
                    dates; this is a planning anchor from your budget).
                  </p>
                )}
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

              {/* How many people — stepper (hidden for solo) */}
              {travelerType !== "solo" && (
                <div className="mt-3 flex items-center gap-3">
                  <span
                    className="text-[12px] font-medium"
                    style={{ color: "rgba(11,31,42,0.6)" }}
                  >
                    How many people?
                  </span>
                  <div
                    className="flex items-center gap-0 rounded-full overflow-hidden"
                    style={{
                      border: "1px solid rgba(11,31,42,0.12)",
                      backgroundColor: C.sandLight,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setTravelerCount((c) =>
                          Math.max(travelerType === "couple" ? 2 : 2, c - 1)
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center text-[16px] font-semibold transition-colors hover:bg-black/5"
                      style={{ color: C.navy }}
                      aria-label="Decrease"
                    >
                      −
                    </button>
                    <span
                      className="min-w-[28px] text-center text-[13px] font-semibold tabular-nums"
                      style={{ color: C.navy }}
                    >
                      {travelerCount}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setTravelerCount((c) => Math.min(20, c + 1))
                      }
                      className="flex h-8 w-8 items-center justify-center text-[16px] font-semibold transition-colors hover:bg-black/5"
                      style={{ color: C.navy }}
                      aria-label="Increase"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
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

            {/* ── Destination (optional) ────────────────────── */}
            <Field label="Where do you want to go?" hint="Optional · skips discovery">
              <div ref={destWrapperRef} className="relative">
                <div className="relative">
                  <MapPin
                    size={15}
                    strokeWidth={1.8}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: selectedDest ? C.coral : "rgba(11,31,42,0.45)" }}
                  />
                  <input
                    type="text"
                    placeholder="e.g. Goa, Manali, Udaipur…"
                    value={destText}
                    onChange={(e) => handleDestChange(e.target.value)}
                    className="h-11 w-full rounded-xl pl-9 pr-3 text-[13.5px] outline-none transition-colors focus:border-[color:var(--color-brand)]"
                    style={{
                      backgroundColor: C.sandLight,
                      border: `1px solid ${selectedDest ? C.coral : "rgba(11,31,42,0.1)"}`,
                      color: C.navy,
                    }}
                  />
                  {selectedDest && (
                    <button
                      type="button"
                      onClick={() => { setDestText(""); setSelectedDest(null); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
                      aria-label="Clear destination"
                    >
                      ×
                    </button>
                  )}
                </div>
                {showDestSuggestions && destSuggestions.length > 0 && (
                  <div
                    className="absolute left-0 right-0 top-full z-[60] mt-2 max-h-64 overflow-y-auto rounded-xl"
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid rgba(11,31,42,0.08)",
                      boxShadow: "0 18px 32px -12px rgba(11,31,42,0.16)",
                    }}
                  >
                    {destSuggestions.map((s, i) => (
                      <button
                        key={`${s.name}-${i}`}
                        type="button"
                        onClick={() => handleSelectDestSuggestion(s)}
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
                          style={{ color: C.coral }}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{s.name}</span>
                          {s.fullName !== s.name && (
                            <span className="text-[11px] opacity-50">{s.fullName}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
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
                    className="absolute left-0 right-0 top-full z-[60] mt-2 max-h-64 overflow-y-auto rounded-xl"
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
