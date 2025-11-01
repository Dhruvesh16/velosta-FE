"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { Zap, Wind, Sparkles, Mountain } from "lucide-react"
import { cn } from "@/lib/utils"

interface TravelVibeSelectorProps {
  onSelect: (vibes: string[]) => void
}

const vibes = [
  { id: "party", label: "Party", icon: Zap, color: "text-red-500" },
  { id: "chill", label: "Chill", icon: Wind, color: "text-blue-500" },
  { id: "spiritual", label: "Spiritual", icon: Sparkles, color: "text-purple-500" },
  { id: "adventure", label: "Adventure", icon: Mountain, color: "text-green-500" },
]

export function TravelVibeSelector({ onSelect }: TravelVibeSelectorProps) {
  const [selected, setSelected] = React.useState<string[]>([])

  const handleToggle = (id: string) => {
    const newSelected = selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]
    setSelected(newSelected)
    onSelect(newSelected)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">What's your travel vibe?</p>
      <div className="grid grid-cols-2 gap-3">
        {vibes.map(({ id, label, icon: Icon, color }) => (
          <Card
            key={id}
            onClick={() => handleToggle(id)}
            className={cn(
              "p-4 cursor-pointer transition-all border-2",
              selected.includes(id)
                ? "border-[#DA880F] bg-[#DA880F]/10"
                : "border-[#DA880F]/20 hover:border-[#DA880F]/50",
            )}
          >
            <div className="flex flex-col items-center gap-2">
              <Icon className={cn("w-6 h-6", color)} />
              <p className="font-semibold text-sm text-gray-800">{label}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
