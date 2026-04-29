"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/app/utils/context";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { generatePlannerResponse } from "@/lib/services/planner-service";
import { ApiError } from "@/lib/api";
import SignInGate from "@/components/velosta-ai/sign-in-gate";
import { ItineraryPDFExport } from "./itinerary-pdf-export";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isItinerary?: boolean;
  itineraryData?: any;
}

interface TripData {
  destination?: string;
  budget?: string;
}

interface ChatWindowProps {
  onItinerary?: (itinerary: any, tripData: TripData) => void;
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

  return [
    cleaned,
    "",
    "Generate a complete trip itinerary now (not a clarifying reply).",
    daysLine,
    "Return a full day-by-day plan with 4-6 activities per day.",
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

export function ChatWindow({ onItinerary }: ChatWindowProps = {}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSignInGate, setShowSignInGate] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [currentItinerary, setCurrentItinerary] = useState<any>(null);
  const [tripData, setTripData] = useState<TripData>({});
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { accessToken, user } = useUser();
  const { selectedDestination, generatedItinerary, setGeneratedItinerary } = useOnboardingStore();
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

      setMessages([{ id: "greeting", role: "assistant", content: greeting }]);
    }
  }, [user?.name, selectedDestination, messages.length]);

  useEffect(() => {
    if (autoSentRef.current || !generatedItinerary || !selectedDestination) return;
    autoSentRef.current = true;
    const data = generatedItinerary;
    setCurrentItinerary(data);
    const extractedTripData: TripData = {
      destination: data.destination,
      budget: data.totalEstimatedCost || data.totalBudget,
    };
    setTripData(extractedTripData);
    onItinerary?.(data, extractedTripData);
    setMessages((prev) => [
      ...prev,
      {
        id: `a-itin-${Date.now()}`,
        role: "assistant",
        content: data.summary || `Here's your ${data.destination} itinerary!`,
        isItinerary: true,
        itineraryData: data,
      },
    ]);
    setGeneratedItinerary(null);
  }, [generatedItinerary, selectedDestination, onItinerary, setGeneratedItinerary]);

  const sendText = useCallback(
    async (text: string) => {
      if (!text || isLoading) return;
      if (!accessToken) {
        setShowSignInGate(true);
        return;
      }

      setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: text }]);
      setInput("");
      setIsLoading(true);

      const updatedHistory = [...conversationHistory, { role: "user", content: text }];
      setConversationHistory(updatedHistory);

      try {
        const data = await generatePlannerResponse({
          userSaid: text,
          conversationHistory: updatedHistory,
          currentItinerary: currentItinerary,
          isModificationRequest: !!currentItinerary,
          destinationHint: selectedDestination ?? undefined,
        });

        if (data.isTextResponse) {
          setMessages((prev) => [
            ...prev,
            { id: `a-${Date.now()}`, role: "assistant", content: data.message },
          ]);
        } else if (data.itineraryTable) {
          setCurrentItinerary(data);
          const extractedTripData: TripData = {
            destination: data.destination,
            budget: data.totalEstimatedCost || data.totalBudget,
          };
          setTripData(extractedTripData);
          onItinerary?.(data, extractedTripData);
          setMessages((prev) => [
            ...prev,
            {
              id: `a-${Date.now()}`,
              role: "assistant",
              content: data.summary || "Here's your itinerary!",
              isItinerary: true,
              itineraryData: data,
            },
          ]);
        }
      } catch (err: any) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Unable to generate itinerary. Please try again.";
        setMessages((prev) => [
          ...prev,
          { id: `a-err-${Date.now()}`, role: "assistant", content: message },
        ]);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [isLoading, accessToken, conversationHistory, currentItinerary, selectedDestination, onItinerary]
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
    <section className="flex flex-col h-full bg-[#FFF9F3]">
      <SignInGate
        open={showSignInGate}
        onClose={() => setShowSignInGate(false)}
        next="/velosta-ai"
        title="Sign in to keep planning"
        message="Velosta AI saved your draft itinerary — sign in to refine it in real time."
      />

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
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

      <div className="shrink-0 border-t border-[#D97757]/20 bg-[#FFF9F3] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
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
            className="flex-1 min-w-0 bg-white border border-[#D97757]/30 rounded-full px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/15 transition-all"
            disabled={isLoading}
            aria-label="Chat with Velosta AI"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="shrink-0 w-10 h-10 rounded-full bg-[#D97757] hover:bg-[#B85F44] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </section>
  );
}

