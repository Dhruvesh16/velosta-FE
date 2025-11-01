"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, MapPin } from "lucide-react"

interface MustVisitInputProps {
  onUpdate: (places: string[]) => void
}

export function MustVisitInput({ onUpdate }: MustVisitInputProps) {
  const [places, setPlaces] = useState<string[]>([])
  const [input, setInput] = useState("")

  const handleAdd = () => {
    if (input.trim()) {
      const newPlaces = [...places, input.trim()]
      setPlaces(newPlaces)
      setInput("")
      onUpdate(newPlaces)
    }
  }

  const handleRemove = (index: number) => {
    const newPlaces = places.filter((_, i) => i !== index)
    setPlaces(newPlaces)
    onUpdate(newPlaces)
  }

  return (
    <Card className="p-4 bg-white border-[#DA880F]/20">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#DA880F]" />
          <h4 className="font-semibold text-gray-800">Must-Visit Places</h4>
        </div>

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Add a place..."
            className="border-[#DA880F]/30 focus-visible:ring-[#DA880F]"
          />
          <Button onClick={handleAdd} className="bg-[#DA880F] hover:bg-[#c9770b] text-white">
            Add
          </Button>
        </div>

        {places.length > 0 && (
          <div className="space-y-2">
            {places.map((place, index) => (
              <div key={index} className="flex items-center justify-between bg-[#DA880F]/10 p-2 rounded-lg">
                <span className="text-sm text-gray-800">{place}</span>
                <button onClick={() => handleRemove(index)} className="text-[#DA880F] hover:text-[#c9770b]">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
