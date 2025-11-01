"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Bus, Utensils, Home, Compass, Sparkles } from "lucide-react"

interface PreferencesSectionProps {
  onUpdate: (preferences: Record<string, string[]>) => void
}

const preferenceCategories = {
  transport: {
    icon: Bus,
    label: "Transport",
    options: ["Flight", "Train", "Car Rental", "Bus", "Local Transport"],
  },
  experiences: {
    icon: Compass,
    label: "Experiences",
    options: ["Museums", "Hiking", "Water Sports", "Local Markets", "Nightlife"],
  },
  food: {
    icon: Utensils,
    label: "Food",
    options: ["Street Food", "Fine Dining", "Local Cuisine", "Vegetarian", "Cafes"],
  },
  stay: {
    icon: Home,
    label: "Stay",
    options: ["Hotel", "Hostel", "Airbnb", "Resort", "Homestay"],
  },
  vibe: {
    icon: Sparkles,
    label: "Overall Vibe",
    options: ["Luxury", "Budget", "Eco-Friendly", "Cultural", "Modern"],
  },
}

export function PreferencesSection({ onUpdate }: PreferencesSectionProps) {
  const [preferences, setPreferences] = React.useState<Record<string, string[]>>({
    transport: [],
    experiences: [],
    food: [],
    stay: [],
    vibe: [],
  })

  const handleToggle = (category: string, option: string) => {
    const updated = { ...preferences }
    const current = updated[category] || []
    updated[category] = current.includes(option) ? current.filter((o) => o !== option) : [...current, option]
    setPreferences(updated)
    onUpdate(updated)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-gray-700">Your Preferences</p>
      {Object.entries(preferenceCategories).map(([key, { icon: Icon, label, options }]) => (
        <Card key={key} className="p-4 bg-white border-[#DA880F]/20">
          <div className="flex items-center gap-2 mb-3">
            <Icon className="w-5 h-5 text-[#DA880F]" />
            <h4 className="font-semibold text-gray-800">{label}</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {options.map((option) => (
              <label key={option} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={preferences[key]?.includes(option) || false}
                  onCheckedChange={() => handleToggle(key, option)}
                  className="border-[#DA880F]/30 text-[#DA880F]"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
