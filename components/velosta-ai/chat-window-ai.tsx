"use client";

import type React from "react";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUser } from "@/app/utils/context";
import { DateRangePicker } from "../../components/travel-planner/date-range-picker";
import { TravelTypeSelector } from "../../components/travel-planner/travel-type-selector";
import { TravelerCounter } from "../../components/travel-planner/traveler-counter";
import { TravelVibeSelector } from "../../components/travel-planner/travel-vibe-selector";
import { MustVisitInput } from "../../components/travel-planner/must-visit-input";
import { PreferencesSection } from "../../components/travel-planner/preferences-section";
import { ItineraryPDFExport } from "./itinerary-pdf-export";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
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
  accommodation?: string;
  specialRequests?: string;
}

export function ChatWindow() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<"guided" | "free">("guided");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [tripData, setTripData] = useState<TripData>({});
  const [currentItinerary, setCurrentItinerary] = useState<any>(null);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const listRef = useRef<HTMLDivElement>(null);
  const { accessToken, user } = useUser();

  const questions = [
    { key: "destination", text: "Where would you like to go?" },
    { key: "travelType", text: "Who's traveling with you?", type: "selector" },
    {
      key: "dateRange",
      text: "When are you planning to travel?",
      type: "calendar",
    },
    { key: "travelers", text: "How many travelers?", type: "counter" },
    { key: "budget", text: "What's your expected budget for the trip?" },
    { key: "travelVibe", text: "What's your travel vibe?", type: "vibe" },
    {
      key: "mustVisitPlaces",
      text: "Are there any must-visit places on your list?",
      type: "places",
    },
    {
      key: "preferences",
      text: "Let's set your preferences",
      type: "preferences",
    },
  ];

  // Auto-scroll
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Initialize greeting
  useEffect(() => {
    if (user?.name && messages.length === 0) {
      setMessages([
        {
          id: "assistant-start",
          role: "assistant",
          content: `Hey ${user.name}! I'm Velosta AI. Let's plan your trip.\n\n${questions[0].text}`,
        },
      ]);
    }
  }, [user?.name]);

  function safeParseJSON(str: string) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  function isProbablyJson(str: string) {
    const trimmed = str.trim();
    return (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    );
  }

  // Submit message
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

    setConversationHistory((prev) => [
      ...prev,
      { role: "user", content: text },
    ]);

    if (phase === "guided") {
      const current = questions[questionIndex];
      const updatedTripData = { ...tripData, [current.key]: text };
      setTripData(updatedTripData);

      if (questionIndex < questions.length - 1) {
        const next = questions[questionIndex + 1];
        setQuestionIndex((i) => i + 1);
        setTimeout(() => {
          const assistantMsg = next.text;
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: assistantMsg,
            },
          ]);
          setConversationHistory((prev) => [
            ...prev,
            { role: "assistant", content: assistantMsg },
          ]);
          setIsLoading(false);
        }, 300);
      } else {
        const generatingMsg = "Perfect! Generating your itinerary now...";
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: generatingMsg,
          },
        ]);
        setConversationHistory((prev) => [
          ...prev,
          { role: "assistant", content: generatingMsg },
        ]);
        await generateItinerary(updatedTripData);
        setPhase("free");
        setIsLoading(false);
      }
      return;
    }

    // Free-form chat
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/velosta-ai/ai-planner`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            userSaid: text,
            context: tripData,
            currentItinerary: currentItinerary,
            conversationHistory: conversationHistory,
            isModificationRequest: true,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process message");

      if (data.isTextResponse) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: data.message,
          },
        ]);
        setConversationHistory((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ]);
      } else {
        if (data.itineraryTable) {
          setCurrentItinerary(data);
        }

        const assistantResponse = JSON.stringify(data, null, 2);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: assistantResponse,
          },
        ]);
        setConversationHistory((prev) => [
          ...prev,
          { role: "assistant", content: assistantResponse },
        ]);

        if (data.modificationsApplied && data.modificationsApplied.length > 0) {
          setTimeout(() => {
            const modsMsg = `Applied changes:\n${data.modificationsApplied
              .map((m: string) => `• ${m}`)
              .join("\n")}`;
            setMessages((prev) => [
              ...prev,
              {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: modsMsg,
              },
            ]);
          }, 500);
        }
      }
    } catch (err) {
      console.error("Error:", err);
      const errorMsg = "Something went wrong. Try again later.";
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: errorMsg,
        },
      ]);
      setConversationHistory((prev) => [
        ...prev,
        { role: "assistant", content: errorMsg },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function generateItinerary(finalData: TripData) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/velosta-ai/ai-planner`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            ...finalData,
            conversationHistory: conversationHistory,
            isInitialGeneration: true,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to generate itinerary");

      setCurrentItinerary(data);

      const itineraryResponse = JSON.stringify(data, null, 2);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: itineraryResponse,
        },
      ]);
      setConversationHistory((prev) => [
        ...prev,
        { role: "assistant", content: itineraryResponse },
      ]);
    } catch (err) {
      console.error("Itinerary error:", err);
      const errorMsg = "Failed to generate itinerary. Please retry.";
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: errorMsg,
        },
      ]);
      setConversationHistory((prev) => [
        ...prev,
        { role: "assistant", content: errorMsg },
      ]);
    }
  }

  // === MOBILE-OPTIMIZED RENDER: EXPENSE SUMMARY ===
  function renderExpenseSummary(expenseSummary: any) {
    if (!expenseSummary || typeof expenseSummary !== "object") return null;

    const {
      perPersonBreakdown,
      totalPerPerson,
      totalForGroup,
      costSavingTips,
    } = expenseSummary;

    return (
      <div className="mt-6 md:mt-8 border-2 border-[#DA880F] rounded-xl p-4 md:p-6 bg-gradient-to-br from-[#FFF6EE] to-white text-xs md:text-sm">
        <h2 className="text-lg md:text-2xl font-bold text-[#DA880F] mb-4 md:mb-6 flex items-center gap-2">
          Complete Expense Summary
        </h2>

        {perPersonBreakdown && (
          <div className="space-y-3 mb-4 md:mb-6">
            <h3 className="text-sm md:text-lg font-semibold text-gray-800 mb-2 md:mb-3">
              Per Person Breakdown:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {Object.entries(perPersonBreakdown).map(
                ([category, data]: any) => (
                  <div
                    key={category}
                    className="bg-white border border-[#DA880F]/20 rounded-lg p-3 md:p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-semibold text-[#DA880F] capitalize text-xs md:text-sm">
                        {category === "miscellaneous"
                          ? "Misc. Expenses"
                          : category}
                      </h4>
                      <span className="font-bold text-gray-800 text-xs md:text-base">
                        {data.amount}
                      </span>
                    </div>
                    {Array.isArray(data.details) && data.details.length > 0 && (
                      <ul className="text-xs text-gray-600 space-y-1 mt-2 pl-3">
                        {data.details.map((detail: string, i: number) => (
                          <li key={i} className="list-disc text-xs">
                            {detail}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
          {totalPerPerson && (
            <div className="bg-[#DA880F]/10 border-2 border-[#DA880F] rounded-lg p-3 md:p-4 text-center">
              <p className="text-xs text-gray-600 mb-1">Total Per Person</p>
              <p className="text-lg md:text-2xl font-bold text-[#DA880F]">
                {totalPerPerson}
              </p>
            </div>
          )}
          {totalForGroup && (
            <div className="bg-[#DA880F] text-white rounded-lg p-3 md:p-4 text-center">
              <p className="text-xs opacity-90 mb-1">Total for Group</p>
              <p className="text-lg md:text-2xl font-bold">{totalForGroup}</p>
            </div>
          )}
        </div>

        {Array.isArray(costSavingTips) && costSavingTips.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 md:p-4">
            <h4 className="font-semibold text-green-800 mb-2 text-xs md:text-sm flex items-center gap-2">
              Cost Saving Tips
            </h4>
            <ul className="space-y-1.5 text-xs md:text-sm text-green-700">
              {costSavingTips.map((tip: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5 text-xs">
                    Checkmark
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // === MOBILE-OPTIMIZED RENDER: ITINERARY TABLE ===
  function renderItineraryTable(data: any) {
    if (!data || typeof data !== "object") {
      return <p className="text-gray-600">Invalid itinerary data</p>;
    }

    return (
      <div className="space-y-6 text-sm md:text-base">
        {data.summary && (
          <p className="leading-relaxed text-gray-800">
            <span className="font-semibold text-[#DA880F]">Summary:</span>{" "}
            {data.summary}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700">
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

        {data.budgetBreakdown && (
          <div className="bg-[#FFF6EE] border border-[#DA880F]/20 rounded-lg p-4">
            <h3 className="text-base md:text-lg font-semibold text-[#DA880F] mb-3">
              Budget Overview:
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
              {Object.entries(data.budgetBreakdown).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-700 capitalize">{key}:</span>
                  <span className="font-semibold text-[#DA880F]">
                    {value as string}
                  </span>
                </div>
              ))}
            </div>
            {data.totalBudget && (
              <div className="mt-3 pt-3 border-t border-[#DA880F]/20 flex justify-between font-bold text-sm md:text-base">
                <span className="text-gray-800">Total Budget:</span>
                <span className="text-[#DA880F]">{data.totalBudget}</span>
              </div>
            )}
          </div>
        )}

        {Array.isArray(data.itineraryTable) &&
          data.itineraryTable.length > 0 && (
            <div className="space-y-6">
              {data.itineraryTable.map((day: any, index: number) => (
                <div
                  key={day.day || index}
                  className="border border-[#DA880F]/20 bg-[#FFF6EE] rounded-xl p-4 md:p-5"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                    <h4 className="font-semibold text-[#DA880F] text-base md:text-lg">
                      Day {day.day || index + 1}
                      {day.theme ? `: ${day.theme}` : ""}
                    </h4>
                    {day.dailyCost && (
                      <span className="bg-[#DA880F] text-white px-2.5 py-1 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap">
                        {day.dailyCost}
                      </span>
                    )}
                  </div>

                  {/* Mobile: Stacked Cards */}
                  <div className="block md:hidden">
                    {Array.isArray(day.rows) &&
                      day.rows.map((row: any, i: number) => (
                        <div
                          key={i}
                          className="bg-white rounded-lg p-3 mb-2 border border-[#DA880F]/10"
                        >
                          {row.time && (
                            <p className="text-xs font-medium text-[#DA880F]">
                              {row.time}
                            </p>
                          )}
                          {row.activity && (
                            <p className="font-semibold text-gray-800 mt-1">
                              {row.activity}
                            </p>
                          )}
                          {row.description && (
                            <p className="text-xs text-gray-600 mt-1">
                              {row.description}
                            </p>
                          )}
                          <div className="flex justify-between mt-2 text-xs">
                            {row.distance && (
                              <span className="text-gray-500">
                                {row.distance}
                              </span>
                            )}
                            {row.pricing && (
                              <span className="font-semibold text-[#DA880F]">
                                {row.pricing}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Desktop: Scrollable Table */}
                  <div className="hidden md:block overflow-x-auto -mx-1">
                    <div className="min-w-[640px] md:min-w-0">
                      <table className="w-full text-xs md:text-sm border-collapse">
                        <thead className="bg-[#DA880F]/10 text-[#DA880F] sticky top-0 z-10">
                          <tr>
                            <th className="border px-3 py-2 text-left font-medium">
                              Time
                            </th>
                            <th className="border px-3 py-2 text-left font-medium">
                              Activity
                            </th>
                            <th className="border px-3 py-2 text-left font-medium">
                              Description
                            </th>
                            <th className="border px-3 py-2 text-left font-medium">
                              Distance
                            </th>
                            <th className="border px-3 py-2 text-left font-medium">
                              Pricing
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(day.rows) &&
                            day.rows.map((row: any, i: number) => (
                              <tr
                                key={i}
                                className="border-t hover:bg-[#DA880F]/5"
                              >
                                <td className="border px-3 py-2 font-medium">
                                  {row.time || "-"}
                                </td>
                                <td className="border px-3 py-2 font-medium">
                                  {row.activity || "-"}
                                </td>
                                <td className="border px-3 py-2 text-gray-700">
                                  {row.description || "-"}
                                </td>
                                <td className="border px-3 py-2 text-gray-600">
                                  {row.distance || "-"}
                                </td>
                                <td className="border px-3 py-2 font-semibold text-[#DA880F]">
                                  {row.pricing || "-"}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {day.meals && (
                    <div className="mt-4 space-y-1 text-xs md:text-sm">
                      {day.meals.breakfast && (
                        <p>
                          <b className="text-[#DA880F]">Breakfast:</b>{" "}
                          {day.meals.breakfast}
                        </p>
                      )}
                      {day.meals.lunch && (
                        <p>
                          <b className="text-[#DA880F]">Lunch:</b>{" "}
                          {day.meals.lunch}
                        </p>
                      )}
                      {day.meals.dinner && (
                        <p>
                          <b className="text-[#DA880F]">Dinner:</b>{" "}
                          {day.meals.dinner}
                        </p>
                      )}
                    </div>
                  )}

                  {day.accommodation && (
                    <p className="mt-3 text-xs md:text-sm">
                      <b className="text-[#DA880F]">Stay:</b>{" "}
                      {day.accommodation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

        {data.expenseSummary && renderExpenseSummary(data.expenseSummary)}

        {Array.isArray(data.localTips) && data.localTips.length > 0 && (
          <div className="text-xs md:text-sm">
            <h3 className="text-base md:text-lg font-semibold text-[#DA880F] mb-2">
              Local Tips:
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              {data.localTips.map((tip: string, i: number) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {data.totalEstimatedCost && (
          <div className="bg-gradient-to-r from-[#DA880F] to-[#c9770b] text-white rounded-xl p-5 md:p-6 text-center">
            <p className="text-xs md:text-sm opacity-90 mb-1">
              Total Estimated Trip Cost
            </p>
            <p className="text-xl md:text-3xl font-bold">
              {data.totalEstimatedCost}
            </p>
          </div>
        )}

        <div className="flex justify-center mt-6">
          <ItineraryPDFExport itineraryData={data} tripData={tripData} />
        </div>
      </div>
    );
  }

  // === RENDER QUESTION COMPONENTS ===
  function renderQuestionComponent() {
    const current = questions[questionIndex];
    if (!current || phase !== "guided") return null;

    const nextStep = () => {
      if (questionIndex < questions.length - 1) {
        const next = questions[questionIndex + 1];
        setQuestionIndex((i) => i + 1);
        const assistantMsg = next.text;
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: assistantMsg,
          },
        ]);
        setConversationHistory((prev) => [
          ...prev,
          { role: "assistant", content: assistantMsg },
        ]);
      }
    };

    switch (current.type) {
      case "selector":
        return (
          <TravelTypeSelector
            onSelect={(type) => {
              const updatedData = { ...tripData, travelType: type };
              setTripData(updatedData);
              setMessages((prev) => [
                ...prev,
                { id: `user-${Date.now()}`, role: "user", content: type },
              ]);
              setConversationHistory((prev) => [
                ...prev,
                { role: "user", content: type },
              ]);
              nextStep();
            }}
          />
        );

      case "calendar":
        return (
          <DateRangePicker
            onSelect={(start, end) => {
              const updatedData = { ...tripData, dateRange: { start, end } };
              setTripData(updatedData);
              const content = `${start} to ${end}`;
              setMessages((prev) => [
                ...prev,
                {
                  id: `user-${Date.now()}`,
                  role: "user",
                  content,
                },
              ]);
              setConversationHistory((prev) => [
                ...prev,
                { role: "user", content },
              ]);
              nextStep();
            }}
            onClose={() => {}}
          />
        );

      case "counter":
        return (
          <div className="mb-4">
            <TravelerCounter
              onUpdate={(adults, children) =>
                setTripData((prev) => ({
                  ...prev,
                  travelers: { adults, children },
                }))
              }
            />
            <Button
              onClick={() => {
                const { adults = 1, children = 0 } = tripData.travelers || {};
                const content = `${adults} adult${
                  adults > 1 ? "s" : ""
                }, ${children} child${children !== 1 ? "ren" : ""}`;
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `user-${Date.now()}`,
                    role: "user",
                    content,
                  },
                ]);
                setConversationHistory((prev) => [
                  ...prev,
                  { role: "user", content },
                ]);
                nextStep();
              }}
              className="mt-4 w-full bg-[#DA880F] hover:bg-[#c9770b] text-white"
            >
              Continue
            </Button>
          </div>
        );

      case "vibe":
        return (
          <div className="mb-4">
            <TravelVibeSelector
              onSelect={(vibes) =>
                setTripData((prev) => ({ ...prev, travelVibe: vibes }))
              }
            />
            <Button
              onClick={() => {
                const content =
                  tripData.travelVibe && tripData.travelVibe.length > 0
                    ? tripData.travelVibe.join(", ")
                    : "Not specified";
                setMessages((prev) => [
                  ...prev,
                  { id: `user-${Date.now()}`, role: "user", content },
                ]);
                setConversationHistory((prev) => [
                  ...prev,
                  { role: "user", content },
                ]);
                nextStep();
              }}
              className="mt-4 w-full bg-[#DA880F] hover:bg-[#c9770b] text-white"
            >
              Continue
            </Button>
          </div>
        );

      case "places":
        return (
          <div className="mb-4">
            <MustVisitInput
              onUpdate={(places) =>
                setTripData((prev) => ({ ...prev, mustVisitPlaces: places }))
              }
            />
            <Button
              onClick={() => {
                const content =
                  tripData.mustVisitPlaces &&
                  tripData.mustVisitPlaces.length > 0
                    ? tripData.mustVisitPlaces.join(", ")
                    : "No specific places";
                setMessages((prev) => [
                  ...prev,
                  { id: `user-${Date.now()}`, role: "user", content },
                ]);
                setConversationHistory((prev) => [
                  ...prev,
                  { role: "user", content },
                ]);
                nextStep();
              }}
              className="mt-4 w-full bg-[#DA880F] hover:bg-[#c9770b] text-white"
            >
              Continue
            </Button>
          </div>
        );

      case "preferences":
        return (
          <div className="mb-4">
            <PreferencesSection
              onUpdate={(prefs) =>
                setTripData((prev) => ({ ...prev, preferences: prefs }))
              }
            />
            <Button
              onClick={async () => {
                const content = "Preferences set";
                const generatingMsg =
                  "Perfect! Generating your itinerary now...";
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `user-${Date.now()}`,
                    role: "user",
                    content,
                  },
                  {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    content: generatingMsg,
                  },
                ]);
                setConversationHistory((prev) => [
                  ...prev,
                  { role: "user", content },
                  { role: "assistant", content: generatingMsg },
                ]);

                setIsLoading(true);
                await generateItinerary(tripData);
                setPhase("free");
                setIsLoading(false);
              }}
              className="mt-4 w-full bg-[#DA880F] hover:bg-[#c9770b] text-white"
              disabled={isLoading}
            >
              {isLoading ? "Generating..." : "Generate Itinerary"}
            </Button>
          </div>
        );

      default:
        return null;
    }
  }

  // === MAIN RENDER ===
  return (
    <section className="flex min-h-[100svh] flex-col bg-[#FFF9F3] pt-[calc(5rem+env(safe-area-inset-top,0px))]">
      <div
        ref={listRef}
  className="flex-1 overflow-y-auto px-3 md:px-6 pb-28 md:pb-32 pt-4 md:pt-6 space-y-3 md:space-y-4 text-sm"
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
                "max-w-full sm:max-w-2xl lg:max-w-3xl rounded-2xl px-4 md:px-5 py-3 md:py-4 text-xs md:text-sm shadow-sm whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-[#DA880F]/90 text-white"
                  : "bg-white border border-[#DA880F]/30 text-gray-900"
              )}
            >
              {m.role === "assistant" && isProbablyJson(m.content)
                ? renderItineraryTable(safeParseJSON(m.content) || {})
                : m.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-white border rounded-2xl px-4 py-3 text-sm shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#DA880F] rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-[#DA880F] rounded-full animate-bounce [animation-delay:0.15s]" />
                <div className="w-2 h-2 bg-[#DA880F] rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}

        {phase === "guided" && renderQuestionComponent()}
      </div>

      {/* Input Field */}
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-[#FFF9F3] via-[#FFF9F3] to-transparent pt-2 px-2 md:px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] backdrop-blur-md"
      >
        <p className="text-xs text-black text-center mb-2">
          Chat history is not saved — please export as PDF before leaving.
        </p>

        <div className="mx-auto w-full max-w-2xl px-2 md:px-0">
          <div className="rounded-full border border-[#DA880F]/30 bg-white flex items-center gap-2 px-3 py-1.5 shadow-sm">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={
                phase === "guided"
                  ? "Type your answer..."
                  : "Ask anything about your trip or request changes..."
              }
              className="w-full border-none focus:ring-0 focus:outline-none bg-transparent text-sm leading-tight placeholder-gray-400"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-full bg-[#DA880F] hover:bg-[#c9770b] text-white px-4 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? "..." : "Send"}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
