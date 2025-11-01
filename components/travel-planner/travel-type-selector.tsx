"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { Users, User, Users2, Heart } from "lucide-react"
import { cn } from "@/lib/utils"

interface TravelTypeSelectorProps {
  onSelect: (type: string) => void
}

const travelTypes = [
  { id: "solo", label: "Solo", icon: User, description: "Just me" },
  { id: "friends", label: "Friends", icon: Users2, description: "With buddies" },
  { id: "family", label: "Family", icon: Users, description: "With family" },
  { id: "couple", label: "Couple", icon: Heart, description: "With partner" },
]

export function TravelTypeSelector({ onSelect }: TravelTypeSelectorProps) {
  const [selected, setSelected] = React.useState<string | null>(null)

  const handleSelect = (id: string) => {
    setSelected(id)
    onSelect(id)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">Who's traveling?</p>
      <div className="grid grid-cols-2 gap-3">
        {travelTypes.map(({ id, label, icon: Icon, description }) => (
          <Card
            key={id}
            onClick={() => handleSelect(id)}
            className={cn(
              "p-4 cursor-pointer transition-all border-2",
              selected === id ? "border-[#DA880F] bg-[#DA880F]/10" : "border-[#DA880F]/20 hover:border-[#DA880F]/50",
            )}
          >
            <div className="flex flex-col items-center gap-2">
              <Icon className={cn("w-6 h-6", selected === id ? "text-[#DA880F]" : "text-gray-600")} />
              <div className="text-center">
                <p className="font-semibold text-sm text-gray-800">{label}</p>
                <p className="text-xs text-gray-500">{description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
