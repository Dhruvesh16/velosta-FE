"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Minus } from "lucide-react"

interface TravelerCounterProps {
  onUpdate: (adults: number, children: number) => void
}

export function TravelerCounter({ onUpdate }: TravelerCounterProps) {
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState(0)

  const handleAdultsChange = (delta: number) => {
    const newAdults = Math.max(1, adults + delta)
    setAdults(newAdults)
    onUpdate(newAdults, children)
  }

  const handleChildrenChange = (delta: number) => {
    const newChildren = Math.max(0, children + delta)
    setChildren(newChildren)
    onUpdate(adults, newChildren)
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-white border-[#DA880F]/20">
        <div className="space-y-4">
          {/* Adults Counter */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">Adults</p>
              <p className="text-xs text-gray-500">Age 13+</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAdultsChange(-1)}
                disabled={adults <= 1}
                className="border-[#DA880F]/30 text-[#DA880F] hover:bg-[#DA880F]/10"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center font-semibold text-lg text-gray-800">{adults}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAdultsChange(1)}
                className="border-[#DA880F]/30 text-[#DA880F] hover:bg-[#DA880F]/10"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Children Counter */}
          <div className="flex items-center justify-between border-t border-[#DA880F]/10 pt-4">
            <div>
              <p className="font-semibold text-gray-800">Children</p>
              <p className="text-xs text-gray-500">Age 0-12</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleChildrenChange(-1)}
                disabled={children <= 0}
                className="border-[#DA880F]/30 text-[#DA880F] hover:bg-[#DA880F]/10"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center font-semibold text-lg text-gray-800">{children}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleChildrenChange(1)}
                className="border-[#DA880F]/30 text-[#DA880F] hover:bg-[#DA880F]/10"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
      <p className="text-xs text-gray-500">Total travelers: {adults + children}</p>
    </div>
  )
}
