"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useUser } from "@/app/utils/context";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatWindow() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<"guided" | "free">("guided");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [tripData, setTripData] = useState<any>({});
  const listRef = useRef<HTMLDivElement>(null);
  const { accessToken } = useUser();

  // Guided flow questions
  const questions = [
    { key: "destination", text: "Where would you like to go?" },
    { key: "days", text: "How many days do you plan to travel?" },
    {
      key: "travelStyle",
      text: "What’s your travel style — budget, moderate, or luxury?",
    },
    {
      key: "interests",
      text: "What are your interests? (e.g., food, culture, nature, sightseeing)",
    },
    {
      key: "startDate",
      text: "When would you like to start your trip? (YYYY-MM-DD)",
    },
    { key: "travelers", text: "How many travelers are going?" },
    {
      key: "accommodation",
      text: "Preferred accommodation type? (hotel, homestay, etc.)",
    },
    {
      key: "specialRequests",
      text: "Any special requests? (e.g., include nearby villages)",
    },
  ];

  // Auto-scroll
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Handle send
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Guided flow
    if (phase === "guided") {
      const current = questions[questionIndex];
      setTripData((prev: any) => ({ ...prev, [current.key]: text }));

      if (questionIndex < questions.length - 1) {
        const next = questions[questionIndex + 1];
        setQuestionIndex((i) => i + 1);
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: next.text,
            },
          ]);
          setIsLoading(false);
        }, 500);
      } else {
        // Generate itinerary
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: "Perfect! Generating your itinerary now...",
          },
        ]);
        await generateItinerary({ ...tripData, [current.key]: text });
        setPhase("free");
        setIsLoading(false);
      }
      return;
    }

    // Free chat
    try {
      const res = await fetch(
        "http://localhost:3001/api/velosta-ai/ai-planner",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ userSaid: text, context: tripData }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process message");

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: JSON.stringify(data, null, 2),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "Something went wrong. Please try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function generateItinerary(finalData: any) {
    try {
      const res = await fetch(
        "http://localhost:3001/api/velosta-ai/ai-planner",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(finalData),
        }
      );

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to generate itinerary");

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: JSON.stringify(data, null, 2),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "Failed to generate itinerary. Please retry.",
        },
      ]);
    }
  }

  // --- JSON rendering helpers ---
  function isProbablyJson(str: string) {
    try {
      const parsed = JSON.parse(str);
      return typeof parsed === "object";
    } catch {
      return false;
    }
  }

  function renderItinerary(data: any) {
    return (
      <div className="space-y-6">
        {data.summary && (
          <p className="text-base leading-relaxed text-gray-800">
            <span className="font-semibold text-[#DA880F]">Summary:</span>{" "}
            {data.summary}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
          {data.destination && (
            <p>
              <b className="text-[#DA880F]">Destination:</b> {data.destination}
            </p>
          )}
          {data.duration && (
            <p>
              <b className="text-[#DA880F]">Duration:</b> {data.duration}
            </p>
          )}
        </div>

        {data.itinerary && Array.isArray(data.itinerary) && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-[#DA880F]">Itinerary:</h3>
            {data.itinerary.map((day: any) => (
              <div
                key={day.day}
                className="border border-[#DA880F]/20 bg-[#DA880F]/5 rounded-xl p-4 space-y-3"
              >
                <h4 className="font-semibold text-[#DA880F]">
                  Day {day.day}: {day.theme}
                </h4>

                {day.activities?.length > 0 && (
                  <div className="space-y-2">
                    {day.activities.map((act: any, i: number) => (
                      <div
                        key={i}
                        className="pl-2 border-l-2 border-[#DA880F]/40 space-y-0.5"
                      >
                        <p className="text-sm font-medium text-gray-800">
                          🕒 {act.time} —{" "}
                          <span className="font-semibold">{act.title}</span>
                        </p>
                        <p className="text-gray-600 text-sm">
                          {act.description}
                        </p>
                        <p className="text-gray-500 text-xs italic">
                          📍 {act.location}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {day.meals && (
                  <div className="bg-white/80 p-2 rounded-md text-sm border border-[#DA880F]/10">
                    <p>
                      <b className="text-[#DA880F]">🍳 Breakfast:</b>{" "}
                      {day.meals.breakfast}
                    </p>
                    <p>
                      <b className="text-[#DA880F]">🥗 Lunch:</b>{" "}
                      {day.meals.lunch}
                    </p>
                    <p>
                      <b className="text-[#DA880F]">🍲 Dinner:</b>{" "}
                      {day.meals.dinner}
                    </p>
                  </div>
                )}

                {day.accommodation && (
                  <p className="text-sm text-gray-700">
                    🏡 <b className="text-[#DA880F]">Stay:</b>{" "}
                    {day.accommodation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {data.localTips && (
          <div>
            <h3 className="text-lg font-semibold text-[#DA880F] mb-2">
              Local Tips:
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
              {data.localTips.map((tip: string, i: number) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  useEffect(() => {
    setMessages([
      {
        id: "assistant-start",
        role: "assistant",
        content: `Hey there 👋! I'm Velosta AI. Let's plan your trip.\n\n${questions[0].text}`,
      },
    ]);
  }, []);

  return (
    <section className="flex h-screen flex-col bg-[#FFF9F3]">
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-[#fff9f3] mt-24"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex mb-3",
              m.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-3xl rounded-2xl px-5 py-4 text-sm shadow-sm whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-[#DA880F]/90 text-white"
                  : "bg-white border border-[#DA880F]/30 text-gray-900"
              )}
            >
              {m.role === "assistant" && isProbablyJson(m.content)
                ? renderItinerary(JSON.parse(m.content))
                : m.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-white border rounded-2xl px-4 py-3 text-sm shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#DA880F] rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-[#DA880F] rounded-full animate-bounce"
                  style={{ animationDelay: "0.15s" }}
                />
                <div
                  className="w-2 h-2 bg-[#DA880F] rounded-full animate-bounce"
                  style={{ animationDelay: "0.3s" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-[#FFF9F3] via-[#FFF9F3] to-transparent pt-3 pb-5 px-4 backdrop-blur-md"
      >
        <div className="mx-auto w-full max-w-3xl">
          <div className="rounded-full border border-[#DA880F]/30 bg-white flex items-end gap-3 px-4 py-2 shadow-md">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                phase === "guided"
                  ? "Type your answer..."
                  : "Ask anything about your trip..."
              }
              className="min-h-10 max-h-40 border-0 px-0 focus-visible:ring-0 resize-none text-sm"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              disabled={isLoading || input.trim().length === 0}
              className="rounded-full bg-[#DA880F] hover:bg-[#c9770b] text-white px-6 transition-colors"
            >
              {isLoading ? "..." : "Send"}
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-gray-500">
            Velosta AI may produce inaccurate info — please verify details
            before booking.
          </p>
        </div>
      </form>
    </section>
  );
}
