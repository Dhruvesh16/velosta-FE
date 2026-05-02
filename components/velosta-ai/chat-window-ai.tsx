"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/app/utils/context";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { generatePlannerResponse } from "@/lib/services/planner-service";
import { buildTravelProfilePrompt } from "@/lib/services/travel-profile-prompt";
import { ApiError } from "@/lib/api";
import SignInGate from "@/components/velosta-ai/sign-in-gate";
import { ItineraryPDFExport } from "./itinerary-pdf-export";
import { usePlannerStore } from "@/lib/stores/planner-store";
import {
  useUIStore,
  type PlannerChatMessage as Message,
  type PlannerChatTripData as TripData,
} from "@/lib/stores/ui-store";

interface ChatWindowProps {
  onItinerary?: (itinerary: any, tripData: TripData) => void;
  /** Smaller footer when embedded (e.g. map tab sheet). */
  hideSessionHint?: boolean;
}

function extractRequestedBudget(text: string): number | null {
  const lower = text.toLowerCase();
  const re = /(?:₹|rs\.?\s*)?\s*(\d+(?:\.\d+)?)\s*(k|thousand|lakh|lac)?\b/g;
  let match: RegExpExecArray | null = null;
  let best: number | null = null;
  while ((match = re.exec(lower)) !== null) {
    const base = Number(match[1]);
    if (!Number.isFinite(base) || base <= 0) continue;
    const unit = match[2];
    const value =
      unit === "k" || unit === "thousand"
        ? base * 1000
        : unit === "lakh" || unit === "lac"
          ? base * 100000
          : base;
    if (value >= 1000) best = Math.round(value);
  }
  return best;
}

function extractRequestedDays(text: string): number | null {
  const lower = text.toLowerCase();
  const dayMatch = lower.match(/\b(\d+)\s*(?:day|days)\b/);
  if (dayMatch) {
    const n = Number(dayMatch[1]);
    if (Number.isFinite(n) && n >= 1 && n <= 30) return n;
  }
  const weekMatch = lower.match(/\b(\d+)\s*(?:week|weeks)\b/);
  if (weekMatch) {
    const n = Number(weekMatch[1]) * 7;
    if (Number.isFinite(n) && n >= 1 && n <= 30) return n;
  }
  return null;
}

function buildStrictPlanIntentPrompt(rawIntent: string): string {
  const cleaned = rawIntent.trim().replace(/\s+/g, " ");
  if (!cleaned) return rawIntent;

  const hasDayHint =
    /\b\d+\s*-\s*day\b/i.test(cleaned) ||
    /\b\d+\s*day(s)?\b/i.test(cleaned) ||
    /\bweek(end|s)?\b/i.test(cleaned) ||
    /\b\d+\s*week(s)?\b/i.test(cleaned);

  const daysLine = hasDayHint
    ? "Use the duration from my request exactly."
    : "If my request doesn't specify duration, plan for 5 days by default.";
  const daysMatch = cleaned.match(/\b(\d+)\s*day(?:s)?\b/i);
  const requestedDays = daysMatch ? Number(daysMatch[1]) : null;
  const rowsLine =
    requestedDays !== null && requestedDays >= 15
      ? "For 15+ day plans, keep each day concise (3-4 activities/day) so all days are included."
      : "Return a full day-by-day plan with 4-6 activities per day.";

  return [
    cleaned,
    "",
    "Generate a complete trip itinerary now (not a clarifying reply).",
    daysLine,
    rowsLine,
    "Use real, specific place names (attractions, restaurants, and stays), not generic placeholders.",
  ].join("\n");
}

function ItineraryCard({ data, tripData }: { data: any; tripData: TripData }) {
  if (!data?.itineraryTable) return null;

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F5EFE6]/60 border border-[#D97757]/30">
        <MapPin size={18} className="text-[#B85F44] mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-[#0B1F2A] text-base">{data.destination}</p>
          <p className="text-[#B85F44] text-xs mt-0.5">
            {data.duration} &nbsp;·&nbsp; {data.totalBudget || data.totalEstimatedCost}
          </p>
          {data.summary && (
            <p className="text-gray-700 text-xs mt-2 leading-relaxed">{data.summary}</p>
          )}
        </div>
      </div>

      {Array.isArray(data.itineraryTable) &&
        data.itineraryTable.map((day: any, i: number) => (
          <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#D97757] to-[#B85F44]">
              <div>
                <span className="text-white font-bold text-sm">Day {day.day || i + 1}</span>
                {day.theme && <span className="text-[#F5EFE6] text-xs ml-2">— {day.theme}</span>}
              </div>
              {day.dailyCost && (
                <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                  {day.dailyCost}
                </span>
              )}
            </div>

            <div className="bg-white divide-y divide-gray-50">
              {Array.isArray(day.rows) &&
                day.rows.map((row: any, j: number) => (
                  <div key={j} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="text-xs text-[#B85F44] font-medium w-16 shrink-0 pt-0.5">
                        {row.time || "—"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm">{row.activity}</p>
                        {row.description && (
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                            {row.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}

      <div className="flex justify-center pt-1">
        <ItineraryPDFExport itineraryData={data} tripData={tripData as any} />
      </div>
    </div>
  );
}

export function ChatWindow({ onItinerary, hideSessionHint = false }: ChatWindowProps = {}) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSignInGate, setShowSignInGate] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { accessToken, user } = useUser();
  const { selectedDestination, generatedItinerary, setGeneratedItinerary, duration, budgetAmount, travelProfile } =
    useOnboardingStore();
  const { itineraryData: plannerItineraryData, tripData: plannerTripData } = usePlannerStore();
  const {
    plannerChatMessages: messages,
    plannerChatConversationHistory: conversationHistory,
    plannerChatCurrentItinerary: currentItinerary,
    plannerChatTripData: tripData,
    setPlannerChatMessages,
    appendPlannerChatMessage,
    setPlannerChatConversationHistory,
    setPlannerChatCurrentItinerary,
    setPlannerChatTripData,
  } = useUIStore();
  const autoSentRef = useRef(false);
  const autoIntentSentRef = useRef(false);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      const name = user?.name ? user.name.split(" ")[0] : null;
      const greeting = selectedDestination
        ? name
          ? `Hey ${name}! Great choice — ${selectedDestination} is amazing!`
          : `Great choice — ${selectedDestination} is amazing!`
        : name
          ? `Hey ${name}! I'm Velosta AI — your spatial travel planner. Tell me where you want to go, your rough budget, and how many days you have. I'll build the perfect itinerary for you.`
          : `Hey! I'm Velosta AI — your spatial travel planner. Tell me where you want to go, your rough budget, and how many days you have. I'll build the perfect itinerary for you.`;

      setPlannerChatMessages([{ id: "greeting", role: "assistant", content: greeting }]);
    }
  }, [user?.name, selectedDestination, messages.length, setPlannerChatMessages]);

  // Keep chat context in sync with planner store so modification prompts
  // always have itinerary state (prevents "please share budget/duration again").
  useEffect(() => {
    if (!plannerItineraryData) return;
    setPlannerChatCurrentItinerary(plannerItineraryData);
    if (plannerTripData.destination || plannerTripData.budget) {
      setPlannerChatTripData({
        destination: plannerTripData.destination,
        budget: plannerTripData.budget,
      });
    }
  }, [
    plannerItineraryData,
    plannerTripData.destination,
    plannerTripData.budget,
    setPlannerChatCurrentItinerary,
    setPlannerChatTripData,
  ]);

  useEffect(() => {
    if (autoSentRef.current || !generatedItinerary || !selectedDestination) return;
    autoSentRef.current = true;
    const data = generatedItinerary;
    setPlannerChatCurrentItinerary(data);
    const extractedTripData: TripData = {
      destination: data.destination,
      budget: data.totalEstimatedCost || data.totalBudget,
    };
    setPlannerChatTripData(extractedTripData);
    onItinerary?.(data, extractedTripData);
    appendPlannerChatMessage({
      id: `a-itin-${Date.now()}`,
      role: "assistant",
      content: data.summary || `Here's your ${data.destination} itinerary!`,
      isItinerary: true,
      itineraryData: data,
    });
    setGeneratedItinerary(null);
  }, [
    generatedItinerary,
    selectedDestination,
    onItinerary,
    setGeneratedItinerary,
    appendPlannerChatMessage,
    setPlannerChatCurrentItinerary,
    setPlannerChatTripData,
  ]);

  const sendText = useCallback(
    async (text: string) => {
      if (!text || isLoading) return;
      if (!accessToken) {
        setShowSignInGate(true);
        return;
      }

      appendPlannerChatMessage({ id: `u-${Date.now()}`, role: "user", content: text });
      setInput("");
      setIsLoading(true);

      const updatedHistory = [
        ...conversationHistory,
        { role: "user" as const, content: text },
      ];
      setPlannerChatConversationHistory(updatedHistory);

      const budgetFromChat = tripData.budget
        ? Number(String(tripData.budget).replace(/[^0-9.]/g, ""))
        : null;
      const budgetFromText = extractRequestedBudget(text);
      const desiredBudget =
        (Number.isFinite(budgetFromText) && (budgetFromText as number) > 0
          ? (budgetFromText as number)
          : Number.isFinite(budgetFromChat) && (budgetFromChat as number) > 0
          ? (budgetFromChat as number)
          : budgetAmount) || undefined;
      const daysFromText = extractRequestedDays(text);
      const desiredDays =
        Number.isFinite(daysFromText) && (daysFromText as number) > 0
          ? (daysFromText as number)
          : Array.isArray((currentItinerary as any)?.itineraryTable) &&
        (currentItinerary as any).itineraryTable.length > 0
          ? (currentItinerary as any).itineraryTable.length
          : duration;
      const travelProfileContext = buildTravelProfilePrompt(travelProfile);

      try {
        const data = await generatePlannerResponse({
          userSaid: text,
          conversationHistory: updatedHistory,
          currentItinerary: currentItinerary,
          isModificationRequest: !!currentItinerary,
          destinationHint: selectedDestination ?? undefined,
          desiredDays,
          desiredBudget,
          travelProfileContext,
        });

        if (data.isTextResponse) {
          const assistantText = data.message;
          appendPlannerChatMessage({
            id: `a-${Date.now()}`,
            role: "assistant",
            content: assistantText,
          });
          setPlannerChatConversationHistory([
            ...updatedHistory,
            { role: "assistant", content: assistantText },
          ]);
        } else if (data.itineraryTable) {
          setPlannerChatCurrentItinerary(data);
          const extractedTripData: TripData = {
            destination: data.destination,
            budget: data.totalEstimatedCost || data.totalBudget,
          };
          setPlannerChatTripData(extractedTripData);
          onItinerary?.(data, extractedTripData);
          appendPlannerChatMessage({
            id: `a-${Date.now()}`,
            role: "assistant",
            content: data.summary || "Here's your itinerary!",
            isItinerary: true,
            itineraryData: data,
          });
          setPlannerChatConversationHistory([
            ...updatedHistory,
            { role: "assistant", content: data.summary || "Generated itinerary update." },
          ]);
        }
      } catch (err: any) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Unable to generate itinerary. Please try again.";
        appendPlannerChatMessage({
          id: `a-err-${Date.now()}`,
          role: "assistant",
          content: message,
        });
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [
      isLoading,
      accessToken,
      conversationHistory,
      currentItinerary,
      selectedDestination,
      onItinerary,
      appendPlannerChatMessage,
      setPlannerChatConversationHistory,
      setPlannerChatCurrentItinerary,
      setPlannerChatTripData,
      duration,
      budgetAmount,
      travelProfile,
      tripData.budget,
    ]
  );

  useEffect(() => {
    if (autoIntentSentRef.current) return;
    if (messages.length !== 1) return;
    if (!accessToken) return;
    try {
      const intent = window.sessionStorage.getItem("velosta:planIntent");
      if (!intent) return;
      autoIntentSentRef.current = true;
      window.sessionStorage.removeItem("velosta:planIntent");
      const strictPrompt = buildStrictPlanIntentPrompt(intent);
      window.setTimeout(() => sendText(strictPrompt), 600);
    } catch {
      // sessionStorage unavailable
    }
  }, [messages.length, accessToken, sendText]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text) return;
      await sendText(text);
    },
    [input, sendText]
  );

  return (
    <section className="flex flex-col h-full bg-[#FBF8F3] min-h-0">
      <SignInGate
        open={showSignInGate}
        onClose={() => setShowSignInGate(false)}
        next="/velosta-ai"
        title="Sign in to keep planning"
        message="Velosta AI saved your draft itinerary — sign in to refine it in real time."
      />

      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              {m.role === "assistant" && (
                <div className="w-7 h-7 rounded-full shrink-0 mr-2 mt-0.5 flex items-center justify-center bg-gradient-to-br from-[#E89378] to-[#B85F44] shadow-sm">
                  <Sparkles size={13} className="text-white" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                  m.role === "user"
                    ? "bg-[#D97757] text-white rounded-tr-sm"
                    : m.isItinerary
                      ? "bg-white border border-[#D97757]/20 text-gray-900 rounded-tl-sm w-full"
                      : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"
                )}
              >
                {m.isItinerary && m.itineraryData ? (
                  <ItineraryCard data={m.itineraryData} tripData={tripData} />
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
            <div className="w-7 h-7 rounded-full shrink-0 mr-2 flex items-center justify-center bg-gradient-to-br from-[#E89378] to-[#B85F44]">
              <Sparkles size={13} className="text-white" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#E89378] animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="shrink-0 border-t border-[#0B1F2A]/8 bg-[#FBF8F3] px-4 py-3 pb-[max(12px,calc(0.75rem+env(safe-area-inset-bottom,0px)))]">
        {!hideSessionHint && (
          <p className="text-[10px] text-[#0B1F2A]/45 text-center mb-2 tracking-wide">
            History stays in this session when you switch tabs.
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Tell me where you want to go..."
            className="flex-1 min-w-0 min-h-[48px] bg-white/95 border border-[#0B1F2A]/10 rounded-full px-4 py-3 text-[15px] text-[#0B1F2A] placeholder-[#0B1F2A]/35 outline-none focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/15 transition-all"
            disabled={isLoading}
            aria-label="Chat with Velosta AI"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="shrink-0 w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-gradient-to-br from-[#D97757] to-[#B85F44] hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all active:scale-95 shadow-[0_4px_14px_-4px_rgba(217,119,87,0.55)]"
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </section>
  );
}

