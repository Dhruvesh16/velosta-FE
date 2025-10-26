"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Search,
  Building2,
  Landmark,
  Building,
  Church,
  Palmtree,
  ChevronDown,
} from "lucide-react";

const popularCities = [
  { name: "Mumbai", icon: Building2 },
  { name: "Delhi-NCR", icon: Landmark },
  { name: "Bengaluru", icon: Building },
  { name: "Hyderabad", icon: Building2 },
  { name: "Ahmedabad", icon: Church },
  { name: "Chandigarh", icon: Building },
  { name: "Chennai", icon: Landmark },
  { name: "Pune", icon: Building2 },
  { name: "Kochi", icon: Palmtree },
];

const otherCities = [
  "Aalo",
  "Acharapakkam",
  "Adoni",
  "Ahilyanagar (Ahmednagar)",
  "Akaltara",
  "Akol",
  "Alathur",
  "Abohar",
  "Addanki",
  "Agar Malwa",
  "Ahmedgarh",
  "Akbarpur",
  "Alakode",
  "Alibaug",
  "Abu Road",
  "Adilabad",
  "Agartala",
  "Ahore",
  "Akividu",
  "Alangudi",
  "Aligarh",
  "Achampet",
  "Adimali",
  "Agripalli",
  "Aizawi",
  "Akuj",
  "Alangulam",
  "Alipurduar",
  "Achampet (AP)",
  "Adipur",
  "Agra",
  "Ajmer",
  "Akola",
  "Alappuzha",
  "Allagadda",
];

interface DestinationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DestinationsModal({
  open,
  onOpenChange,
}: DestinationsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllCities, setShowAllCities] = useState(false);

  const filteredCities = otherCities.filter((city) =>
    city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPopular = popularCities.filter((city) =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto p-0 border-0 rounded-2xl bg-white">
        <div className="p-8">
          {/* Search Input */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search for your city"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-lg border border-gray-200 text-base bg-white text-gray-900 placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Detect Location */}
          <button className="flex items-center gap-2 mb-8 font-medium transition-colors hover:opacity-80">
            <MapPin
              className="w-5 h-5"
              style={{ color: "var(--color-brand)" }}
            />
            <span style={{ color: "var(--color-brand)" }}>
              Detect my location
            </span>
          </button>

          {/* Popular Cities */}
          {filteredPopular.length > 0 && (
            <div className="mb-10">
              <h3
                className="text-base font-semibold mb-6"
                style={{ color: "#1a1a1a" }}
              >
                Popular Cities
              </h3>
              <div className="grid grid-cols-5 gap-6">
                {filteredPopular.map((city) => {
                  const IconComponent = city.icon;
                  return (
                    <button
                      key={city.name}
                      onClick={() => onOpenChange(false)}
                      className="flex flex-col items-center gap-3 hover:opacity-70 transition-opacity"
                    >
                      <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                        <IconComponent className="w-8 h-8 text-gray-700" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 text-center">
                        {city.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Other Cities */}
          <div>
            <h3
              className="text-base font-semibold mb-6"
              style={{ color: "#1a1a1a" }}
            >
              Other Cities
            </h3>
            <div
              className={`grid grid-cols-5 gap-x-8 gap-y-3 ${
                !showAllCities ? "max-h-48 overflow-hidden" : ""
              }`}
            >
              {filteredCities.map((city) => (
                <button
                  key={city}
                  onClick={() => onOpenChange(false)}
                  className="text-left text-sm text-gray-600 hover:text-gray-900 hover:font-medium transition-colors"
                >
                  {city}
                </button>
              ))}
            </div>

            {/* Hide/Show All Cities */}
            {!searchQuery && (
              <button
                onClick={() => setShowAllCities(!showAllCities)}
                className="mt-6 flex items-center justify-center gap-1 font-medium mx-auto transition-colors hover:opacity-80"
                style={{ color: "var(--color-brand)" }}
              >
                {showAllCities ? "Hide" : "Show"} all cities
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    showAllCities ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
