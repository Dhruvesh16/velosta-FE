"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/app/utils/context";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { ItineraryPDFExport } from "./itinerary-pdf-export";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isItinerary?: boolean;
  itineraryData?: any;
}

interface TripData {
  destination?: string;
  travelType?: string;
  dateRange?: { start: string; end: string };
  travelers?: { adults: number; children: number };
  budget?: string;
  travelVibe?: string[];
  mustVisitPlaces?: string[];
  preferences?: Record<string, string[]>;
}

interface ChatWindowProps {
  onItinerary?: (itinerary: any, tripData: TripData) => void;
}

// ─── Itinerary Card Renderer ──────────────────────────────────────────────────
function ItineraryCard({
  data,
  tripData,
}: {
  data: any;
  tripData: TripData;
}) {
  if (!data?.itineraryTable) return null;

  return (
    <div className="space-y-4 text-sm">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
        <MapPin size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-amber-800 text-base">
            {data.destination}
          </p>
          <p className="text-amber-700 text-xs mt-0.5">
            {data.duration} &nbsp;·&nbsp; {data.totalBudget || data.totalEstimatedCost}
          </p>
          {data.summary && (
            <p className="text-gray-700 text-xs mt-2 leading-relaxed">
              {data.summary}
            </p>
          )}
        </div>
      </div>

      {/* Budget breakdown */}
      {data.budgetBreakdown && (
        <div className="rounded-xl border border-amber-100 overflow-hidden">
          <div className="bg-amber-50 px-4 py-2 border-b border-amber-100">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
              Budget Breakdown
            </p>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            {Object.entries(data.budgetBreakdown).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs bg-white rounded-lg px-3 py-2 border border-gray-100">
                <span className="text-gray-500 capitalize">{k}</span>
                <span className="font-semibold text-amber-700">{v as string}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day cards */}
      {Array.isArray(data.itineraryTable) && data.itineraryTable.map((day: any, i: number) => (
        <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
          {/* Day header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600">
            <div>
              <span className="text-white font-bold text-sm">Day {day.day || i + 1}</span>
              {day.theme && (
                <span className="text-amber-100 text-xs ml-2">— {day.theme}</span>
              )}
            </div>
            {day.dailyCost && (
              <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                {day.dailyCost}
              </span>
            )}
          </div>

          {/* Activities */}
          <div className="bg-white divide-y divide-gray-50">
            {Array.isArray(day.rows) && day.rows.map((row: any, j: number) => (
              <div key={j} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="text-xs text-amber-600 font-medium w-16 shrink-0 pt-0.5">
                    {row.time || "—"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">{row.activity}</p>
                    {row.description && (
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{row.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {row.distance && (
                        <span className="text-xs text-gray-400">{row.distance}</span>
                      )}
                      {row.pricing && (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          {row.pricing}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Meals & Stay */}
          {(day.meals || day.accommodation) && (
            <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 space-y-1.5">
              {day.meals?.breakfast && (
                <p className="text-xs text-gray-600">
                  <span className="font-medium text-amber-600">🍳 Breakfast:</span> {day.meals.breakfast}
                </p>
              )}
              {day.meals?.lunch && (
                <p className="text-xs text-gray-600">
                  <span className="font-medium text-amber-600">🥗 Lunch:</span> {day.meals.lunch}
                </p>
              )}
              {day.meals?.dinner && (
                <p className="text-xs text-gray-600">
                  <span className="font-medium text-amber-600">🍽️ Dinner:</span> {day.meals.dinner}
                </p>
              )}
              {day.accommodation && (
                <p className="text-xs text-gray-600 pt-1 border-t border-gray-200">
                  <span className="font-medium text-amber-600">🏨 Stay:</span> {day.accommodation}
                </p>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Cost saving tips */}
      {data.expenseSummary?.costSavingTips?.length > 0 && (
        <div className="rounded-xl border border-green-100 bg-green-50 p-4">
          <p className="text-xs font-semibold text-green-700 mb-2 uppercase tracking-wide">
            💡 Cost Saving Tips
          </p>
          <ul className="space-y-1">
            {data.expenseSummary.costSavingTips.map((tip: string, i: number) => (
              <li key={i} className="text-xs text-green-700 flex items-start gap-1.5">
                <span className="mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Total cost banner */}
      {data.totalEstimatedCost && (
        <div className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 p-4 text-center">
          <p className="text-amber-100 text-xs mb-1">Total Estimated Cost</p>
          <p className="text-white text-2xl font-bold">{data.totalEstimatedCost}</p>
        </div>
      )}

      {/* Local tips */}
      {Array.isArray(data.localTips) && data.localTips.length > 0 && (
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
            Local Tips
          </p>
          <ul className="space-y-1.5">
            {data.localTips.map((tip: string, i: number) => (
              <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                <span className="text-amber-500 mt-0.5">✦</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* PDF Export */}
      <div className="flex justify-center pt-1">
        <ItineraryPDFExport itineraryData={data} tripData={tripData} />
      </div>
    </div>
  );
}

// ─── Fallback Itinerary Generator ─────────────────────────────────────────────
// Produces a static itinerary when the API fails, so the user never stays stuck.
function generateFallbackItinerary(destination: string, budget?: string, days: number = 3) {
  const dayPlans = [];
  for (let d = 1; d <= days; d++) {
    const rows = [];
    if (d === 1) {
      rows.push(
        { time: "08:00 AM", activity: `Travel to ${destination}`, description: "Depart from your city. Enjoy the journey!", distance: "—", pricing: "Included in transport" },
        { time: "02:00 PM", activity: "Check-in to hotel / homestay", description: "Freshen up and rest after the journey", distance: "—", pricing: "See accommodation" },
        { time: "05:00 PM", activity: "Explore local area", description: `Evening walk around ${destination}. Visit local markets, cafes, and streets.`, distance: "Nearby", pricing: "Free" },
        { time: "08:00 PM", activity: "Dinner at local restaurant", description: "Try local cuisine at a popular spot", distance: "Nearby", pricing: "₹300–₹500" }
      );
    } else if (d === days) {
      rows.push(
        { time: "08:00 AM", activity: "Breakfast & checkout", description: "Pack up and check out from accommodation", distance: "—", pricing: "Included" },
        { time: "10:00 AM", activity: "Visit final attraction", description: `Visit a popular landmark or temple in ${destination} before leaving`, distance: "5–10 km", pricing: "₹50–₹200" },
        { time: "01:00 PM", activity: "Lunch & souvenir shopping", description: "Grab lunch and pick up souvenirs", distance: "Nearby", pricing: "₹300–₹500" },
        { time: "03:00 PM", activity: "Return journey", description: "Head back home with great memories!", distance: "—", pricing: "Included in transport" }
      );
    } else {
      rows.push(
        { time: "08:00 AM", activity: "Breakfast at hotel", description: "Start the day with a hearty breakfast", distance: "—", pricing: "₹200–₹300" },
        { time: "10:00 AM", activity: `Day ${d} sightseeing`, description: `Explore popular attractions and scenic spots in ${destination}`, distance: "10–20 km", pricing: "₹200–₹500" },
        { time: "01:00 PM", activity: "Lunch", description: "Try a different local restaurant", distance: "Nearby", pricing: "₹300–₹400" },
        { time: "03:00 PM", activity: "Afternoon activity", description: "Adventure sport, nature walk, or cultural experience", distance: "5–15 km", pricing: "₹500–₹1,000" },
        { time: "07:00 PM", activity: "Dinner & evening relaxation", description: "Wind down with dinner and a relaxed evening", distance: "Nearby", pricing: "₹300–₹500" }
      );
    }

    dayPlans.push({
      day: d,
      theme: d === 1 ? "Arrival & First Impressions" : d === days ? "Last Day & Return" : `Day ${d} — Explore & Discover`,
      rows,
      dailyCost: `₹${Math.round((parseInt(budget?.replace(/[^\d]/g, "") || "8000") / days) * 0.9)}`
    });
  }

  return {
    type: "itinerary",
    destination,
    duration: `${days} days`,
    totalBudget: budget || "₹8,000",
    totalEstimatedCost: budget || "₹8,000",
    summary: `Here's a ${days}-day trip plan for ${destination}. This is a suggested itinerary — you can customize it by chatting with me!`,
    itineraryTable: dayPlans,
    localTips: [
      "Book accommodation in advance during peak season",
      "Carry cash — not all places accept cards",
      "Try street food for authentic flavors at lower costs"
    ],
    isFallback: true,
  };
}

// ─── Main ChatWindow ──────────────────────────────────────────────────────────
export function ChatWindow({ onItinerary }: ChatWindowProps = {}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [currentItinerary, setCurrentItinerary] = useState<any>(null);
  const [tripData, setTripData] = useState<TripData>({});
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { accessToken, user } = useUser();
  const { selectedDestination, selectedTier, duration, userLocation, generatedItinerary, setGeneratedItinerary } = useOnboardingStore();
  const autoSentRef = useRef(false);

  // Auto-scroll to bottom
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Initial greeting — adapts based on whether a destination was pre-selected
  useEffect(() => {
    if (messages.length === 0) {
      const name = user?.name ? user.name.split(" ")[0] : null;

      let greeting: string;
      if (selectedDestination) {
        greeting = name
          ? `Hey ${name}! Great choice — ${selectedDestination} is amazing!`
          : `Great choice — ${selectedDestination} is amazing!`;
      } else {
        greeting = name
          ? `Hey ${name}! I'm Velosta AI — your spatial travel planner. Tell me where you want to go, your rough budget, and how many days you have. I'll build the perfect itinerary for you.`
          : `Hey! I'm Velosta AI — your spatial travel planner. Tell me where you want to go, your rough budget, and how many days you have. I'll build the perfect itinerary for you.`;
      }

      setMessages([{ id: "greeting", role: "assistant", content: greeting }]);
    }
  }, [user?.name, selectedDestination]);

  // ── Pick up pre-generated itinerary from explore-map ─────────────────────
  // The API call already happened in explore-map.tsx before transitioning here.
  // We just need to display it and sync with the map.
  useEffect(() => {
    if (autoSentRef.current || !generatedItinerary || !selectedDestination) return;
    autoSentRef.current = true;

    const data = generatedItinerary;
    console.log(data, "hola - ChatWindow received pre-generated itinerary");

    // Show the itinerary in chat
    setCurrentItinerary(data);
    const extractedTripData: TripData = {
      destination: data.destination,
      budget: data.totalEstimatedCost || data.totalBudget,
    };
    setTripData(extractedTripData);
    onItinerary?.(data, extractedTripData);

    const itineraryMsg: Message = {
      id: `a-itin-${Date.now()}`,
      role: "assistant",
      content: data.summary || `Here's your ${data.destination} itinerary!`,
      isItinerary: true,
      itineraryData: data,
    };
    setMessages((prev) => [...prev, itineraryMsg]);
    setConversationHistory((prev) => [
      ...prev,
      { role: "assistant", content: `[Generated itinerary for ${data.destination}]` },
    ]);

    // Clear from onboarding store so it doesn't re-trigger
    setGeneratedItinerary(null);
  }, [generatedItinerary, selectedDestination, onItinerary, setGeneratedItinerary]);

  // Send message handler
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || isLoading) return;

      const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      const updatedHistory = [...conversationHistory, { role: "user", content: text }];
      setConversationHistory(updatedHistory);

      // Timeout protection — abort if API takes > 45 seconds
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_URL}/api/velosta-ai/ai-planner`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            signal: controller.signal,
            body: JSON.stringify({
              userSaid: text,
              conversationHistory: updatedHistory,
              currentItinerary: currentItinerary,
              isModificationRequest: !!currentItinerary,
            }),
          }
        );

        const data = await res.json();
        console.log(data, "hola");
        if (!res.ok) throw new Error(data.error || "Request failed");

        if (data.isTextResponse) {
          // Plain chat reply
          const assistantMsg: Message = {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: data.message,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setConversationHistory((prev) => [
            ...prev,
            { role: "assistant", content: data.message },
          ]);
        } else if (data.itineraryTable) {
          // Itinerary generated/updated — sync with map + itinerary panel
          setCurrentItinerary(data);

          // Extract trip context from itinerary data for PDF export
          const extractedTripData: TripData = {
            destination: data.destination,
            budget: data.totalEstimatedCost || data.totalBudget,
          };
          setTripData(extractedTripData);

          // Fire callback to sync map + itinerary panel
          onItinerary?.(data, extractedTripData);

          const assistantMsg: Message = {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: data.summary || "Here's your itinerary!",
            isItinerary: true,
            itineraryData: data,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setConversationHistory((prev) => [
            ...prev,
            { role: "assistant", content: `[Generated itinerary for ${data.destination}]` },
          ]);

          // Show modifications notice if any
          if (data.modificationsApplied?.length > 0) {
            setTimeout(() => {
              const modsMsg: Message = {
                id: `a-mods-${Date.now()}`,
                role: "assistant",
                content: `Changes applied:\n${data.modificationsApplied.map((m: string) => `• ${m}`).join("\n")}`,
              };
              setMessages((prev) => [...prev, modsMsg]);
            }, 400);
          }
        } else {
          // Fallback: unexpected response shape
          const fallbackText = data.message || data.summary || "I received your request but couldn't process it. Could you try rephrasing?";
          setMessages((prev) => [
            ...prev,
            { id: `a-fallback-${Date.now()}`, role: "assistant", content: fallbackText },
          ]);
        }
      } catch (err: any) {
        console.error("Chat error:", err);
        const isTimeout = err?.name === "AbortError";
        setMessages((prev) => [
          ...prev,
          {
            id: `a-err-${Date.now()}`,
            role: "assistant",
            content: isTimeout
              ? "The request took too long. Please try sending your message again."
              : err?.message?.includes("429") || err?.message?.includes("rate")
              ? "I'm hitting a rate limit right now. Please wait a few seconds and try again."
              : "Unable to generate itinerary. Please try again.",
          },
        ]);
      } finally {
        clearTimeout(timeout);
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [input, isLoading, conversationHistory, currentItinerary, accessToken, onItinerary]
  );

  return (
    <section className="flex flex-col h-full bg-[#FFF9F3]">
      {/* Message list */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(218,136,15,0.2) transparent" }}
      >
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              {/* Avatar for assistant */}
              {m.role === "assistant" && (
                <div className="w-7 h-7 rounded-full shrink-0 mr-2 mt-0.5 flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm">
                  <Sparkles size={13} className="text-white" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                  m.role === "user"
                    ? "bg-amber-500 text-white rounded-tr-sm"
                    : m.isItinerary
                    ? "bg-white border border-amber-100 text-gray-900 rounded-tl-sm w-full"
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

        {/* Typing indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="w-7 h-7 rounded-full shrink-0 mr-2 flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600">
              <Sparkles size={13} className="text-white" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-amber-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-amber-100 bg-[#FFF9F3] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <p className="text-[10px] text-gray-400 text-center mb-2">
          Chat history is not saved — export as PDF before leaving.
        </p>
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
            className="flex-1 min-w-0 bg-white border border-amber-200 rounded-full px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            disabled={isLoading}
            aria-label="Chat with Velosta AI"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="shrink-0 w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </section>
  );
}
