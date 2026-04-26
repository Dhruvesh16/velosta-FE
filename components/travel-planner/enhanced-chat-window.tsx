"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useUser } from "@/app/utils/context"
import { DateRangePicker } from "./date-range-picker"
import { TravelTypeSelector } from "./travel-type-selector"
import { TravelerCounter } from "./traveler-counter"
import { TravelVibeSelector } from "./travel-vibe-selector"
import { MustVisitInput } from "./must-visit-input"
import { PreferencesSection } from "./preferences-section"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface TripData {
  destination?: string
  travelType?: string
  dateRange?: { start: string; end: string }
  travelers?: { adults: number; children: number }
  budget?: string
  travelVibe?: string[]
  mustVisitPlaces?: string[]
  preferences?: Record<string, string[]>
  accommodation?: string
  specialRequests?: string
}

export function EnhancedChatWindow() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [phase, setPhase] = useState<"guided" | "free">("guided")
  const [questionIndex, setQuestionIndex] = useState(0)
  const [tripData, setTripData] = useState<TripData>({})
  const [showDatePicker, setShowDatePicker] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const { accessToken } = useUser()

  const questions = [
    { key: "destination", text: "Where would you like to go?" },
    { key: "travelType", text: "Who's traveling with you?", type: "selector" },
    { key: "dateRange", text: "When are you planning to travel?", type: "calendar" },
    { key: "travelers", text: "How many travelers?", type: "counter" },
    { key: "budget", text: "What's your expected budget for the trip?" },
    { key: "travelVibe", text: "What's your travel vibe?", type: "vibe" },
    { key: "mustVisitPlaces", text: "Are there any must-visit places on your list?", type: "places" },
    { key: "preferences", text: "Let's set your preferences", type: "preferences" },
    { key: "accommodation", text: "Preferred accommodation type? (hotel, homestay, etc.)" },
    { key: "specialRequests", text: "Any special requests? (e.g., include nearby villages)" },
  ]

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    if (phase === "guided") {
      const current = questions[questionIndex]
      setTripData((prev: any) => ({ ...prev, [current.key]: text }))

      if (questionIndex < questions.length - 1) {
        const next = questions[questionIndex + 1]
        setQuestionIndex((i) => i + 1)
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: next.text,
            },
          ])
          setIsLoading(false)
        }, 500)
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: "Perfect! Generating your itinerary now...",
          },
        ])
        await generateItinerary({ ...tripData, [current.key]: text })
        setPhase("free")
        setIsLoading(false)
      }
      return
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/velosta-ai/ai-planner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userSaid: text, context: tripData }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to process message")
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: JSON.stringify(data, null, 2),
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "Something went wrong. Please try again later.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  async function generateItinerary(finalData: any) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/velosta-ai/ai-planner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(finalData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate itinerary")
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: JSON.stringify(data, null, 2),
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "Failed to generate itinerary. Please retry.",
        },
      ])
    }
  }

  function isProbablyJson(str: string) {
    try {
      JSON.parse(str)
      return true
    } catch {
      return false
    }
  }

  function renderItineraryTable(data: any) {
    return (
      <div className="space-y-6">
        <p className="text-base leading-relaxed text-gray-800">
          <span className="font-semibold text-[#DA880F]">Summary:</span> {data.summary}
        </p>

        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
          <p>
            <b className="text-[#DA880F]">Destination:</b> {data.destination}
          </p>
          <p>
            <b className="text-[#DA880F]">Duration:</b> {data.duration}
          </p>
        </div>

        {Array.isArray(data.itineraryTable) && (
          <div className="space-y-8">
            {data.itineraryTable.map((day: any) => (
              <div key={day.day} className="border border-[#DA880F]/20 bg-[#FFF6EE] rounded-xl p-5">
                <h4 className="font-semibold text-[#DA880F] text-lg mb-3">
                  Day {day.day}: {day.theme}
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-[#DA880F]/10 text-[#DA880F]">
                      <tr>
                        <th className="border px-3 py-2 text-left">Time</th>
                        <th className="border px-3 py-2 text-left">Activity</th>
                        <th className="border px-3 py-2 text-left">Description</th>
                        <th className="border px-3 py-2 text-left">Location</th>
                        <th className="border px-3 py-2 text-left">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {day.rows.map((row: any, i: number) => (
                        <tr key={i} className="border-t">
                          <td className="border px-3 py-2">{row.time}</td>
                          <td className="border px-3 py-2 font-medium">{row.activity}</td>
                          <td className="border px-3 py-2">{row.description}</td>
                          <td className="border px-3 py-2">{row.location}</td>
                          <td className="border px-3 py-2 capitalize">{row.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-sm space-y-1">
                  <p>
                    <b className="text-[#DA880F]">🍳 Breakfast:</b> {day.meals.breakfast}
                  </p>
                  <p>
                    <b className="text-[#DA880F]">🥗 Lunch:</b> {day.meals.lunch}
                  </p>
                  <p>
                    <b className="text-[#DA880F]">🍲 Dinner:</b> {day.meals.dinner}
                  </p>
                  <p>
                    <b className="text-[#DA880F]">🏡 Stay:</b> {day.accommodation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {data.localTips && (
          <div>
            <h3 className="text-lg font-semibold text-[#DA880F] mb-2">Local Tips:</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
              {data.localTips.map((tip: string, i: number) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  function renderQuestionComponent() {
    const current = questions[questionIndex]

    if (current.type === "selector") {
      return (
        <div className="mb-4">
          <TravelTypeSelector
            onSelect={(type) => {
              setTripData((prev) => ({ ...prev, travelType: type }))
              setTimeout(() => {
                const userMsg: Message = {
                  id: `user-${Date.now()}`,
                  role: "user",
                  content: type,
                }
                setMessages((prev) => [...prev, userMsg])

                if (questionIndex < questions.length - 1) {
                  const next = questions[questionIndex + 1]
                  setQuestionIndex((i) => i + 1)
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `assistant-${Date.now()}`,
                      role: "assistant",
                      content: next.text,
                    },
                  ])
                }
              }, 300)
            }}
          />
        </div>
      )
    }

    if (current.type === "calendar") {
      return (
        <div className="mb-4 flex justify-center">
          <DateRangePicker
            onSelect={(start, end) => {
              setTripData((prev) => ({
                ...prev,
                dateRange: { start, end },
              }))
              const userMsg: Message = {
                id: `user-${Date.now()}`,
                role: "user",
                content: `${start} to ${end}`,
              }
              setMessages((prev) => [...prev, userMsg])

              if (questionIndex < questions.length - 1) {
                const next = questions[questionIndex + 1]
                setQuestionIndex((i) => i + 1)
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    content: next.text,
                  },
                ])
              }
            }}
            onClose={() => setShowDatePicker(false)}
          />
        </div>
      )
    }

    if (current.type === "counter") {
      return (
        <div className="mb-4">
          <TravelerCounter
            onUpdate={(adults, children) => {
              setTripData((prev) => ({
                ...prev,
                travelers: { adults, children },
              }))
            }}
          />
          <Button
            onClick={() => {
              const userMsg: Message = {
                id: `user-${Date.now()}`,
                role: "user",
                content: `${tripData.travelers?.adults || 1} adults, ${tripData.travelers?.children || 0} children`,
              }
              setMessages((prev) => [...prev, userMsg])

              if (questionIndex < questions.length - 1) {
                const next = questions[questionIndex + 1]
                setQuestionIndex((i) => i + 1)
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    content: next.text,
                  },
                ])
              }
            }}
            className="mt-4 w-full bg-[#DA880F] hover:bg-[#c9770b] text-white"
          >
            Continue
          </Button>
        </div>
      )
    }

    if (current.type === "vibe") {
      return (
        <div className="mb-4">
          <TravelVibeSelector
            onSelect={(vibes) => {
              setTripData((prev) => ({ ...prev, travelVibe: vibes }))
            }}
          />
          <Button
            onClick={() => {
              const userMsg: Message = {
                id: `user-${Date.now()}`,
                role: "user",
                content: tripData.travelVibe?.join(", ") || "Not specified",
              }
              setMessages((prev) => [...prev, userMsg])

              if (questionIndex < questions.length - 1) {
                const next = questions[questionIndex + 1]
                setQuestionIndex((i) => i + 1)
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    content: next.text,
                  },
                ])
              }
            }}
            className="mt-4 w-full bg-[#DA880F] hover:bg-[#c9770b] text-white"
          >
            Continue
          </Button>
        </div>
      )
    }

    if (current.type === "places") {
      return (
        <div className="mb-4">
          <MustVisitInput
            onUpdate={(places) => {
              setTripData((prev) => ({ ...prev, mustVisitPlaces: places }))
            }}
          />
          <Button
            onClick={() => {
              const userMsg: Message = {
                id: `user-${Date.now()}`,
                role: "user",
                content: tripData.mustVisitPlaces?.join(", ") || "No specific places",
              }
              setMessages((prev) => [...prev, userMsg])

              if (questionIndex < questions.length - 1) {
                const next = questions[questionIndex + 1]
                setQuestionIndex((i) => i + 1)
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    content: next.text,
                  },
                ])
              }
            }}
            className="mt-4 w-full bg-[#DA880F] hover:bg-[#c9770b] text-white"
          >
            Continue
          </Button>
        </div>
      )
    }

    if (current.type === "preferences") {
      return (
        <div className="mb-4">
          <PreferencesSection
            onUpdate={(prefs) => {
              setTripData((prev) => ({ ...prev, preferences: prefs }))
            }}
          />
          <Button
            onClick={() => {
              const userMsg: Message = {
                id: `user-${Date.now()}`,
                role: "user",
                content: "Preferences set",
              }
              setMessages((prev) => [...prev, userMsg])

              if (questionIndex < questions.length - 1) {
                const next = questions[questionIndex + 1]
                setQuestionIndex((i) => i + 1)
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    content: next.text,
                  },
                ])
              }
            }}
            className="mt-4 w-full bg-[#DA880F] hover:bg-[#c9770b] text-white"
          >
            Continue
          </Button>
        </div>
      )
    }

    return null
  }

  useEffect(() => {
    setMessages([
      {
        id: "assistant-start",
        role: "assistant",
        content: `Hey there 👋! I'm Velosta AI. Let's plan your trip.\n\n${questions[0].text}`,
      },
    ])
  }, [])

  return (
    <section className="flex h-screen flex-col bg-[#FFF9F3]">
      <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-[#FFF9F3] mt-24">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex mb-3", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-3xl rounded-2xl px-5 py-4 text-sm shadow-sm whitespace-pre-wrap",
                m.role === "user" ? "bg-[#DA880F]/90 text-white" : "bg-white border border-[#DA880F]/30 text-gray-900",
              )}
            >
              {m.role === "assistant" && isProbablyJson(m.content)
                ? renderItineraryTable(JSON.parse(m.content))
                : m.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-white border rounded-2xl px-4 py-3 text-sm shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#DA880F] rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-[#DA880F] rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                <div className="w-2 h-2 bg-[#DA880F] rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
              </div>
            </div>
          </div>
        )}

        {phase === "guided" && renderQuestionComponent()}
      </div>

      {/* Input box */}
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-[#FFF9F3] via-[#FFF9F3] to-transparent pt-3 pb-5 px-4 backdrop-blur-md"
      >
        <div className="mx-auto w-full max-w-3xl">
          <div className="rounded-full border border-[#DA880F]/30 bg-white flex items-end gap-3 px-4 py-2 shadow-md">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={phase === "guided" ? "Type your answer..." : "Ask anything about your trip..."}
              className="min-h-10 max-h-40 border-0 px-0 focus-visible:ring-0 resize-none text-sm"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
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
            Velosta AI may produce inaccurate info. Please verify details before booking.
          </p>
        </div>
      </form>
    </section>
  )
}
