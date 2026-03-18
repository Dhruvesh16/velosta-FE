"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Star, MapPin, Clock, ChevronRight } from "lucide-react";
import { useMapStore } from "@/lib/stores/map-store";
import { fetchPlaceDetails, formatPlaceType, type PlaceDetails } from "@/lib/services/google-places";
import type { ActivityRow } from "@/lib/types/planner.types";

interface LocationCardProps {
  row: ActivityRow;
  dayIndex: number;
  stopNumber: number;
  dayColor: string;
  destination?: string;
  isActive?: boolean;
}

export default function LocationCard({
  row,
  dayIndex,
  stopNumber,
  dayColor,
  destination,
  isActive = false,
}: LocationCardProps) {
  const { setActiveMarker, flyTo } = useMapStore();
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [imgError, setImgError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!row.coordinates) return;
    fetchPlaceDetails(row.activity, row.coordinates, destination).then((d) => {
      if (d) setDetails(d);
    });
  }, [row.activity, row.coordinates, destination]);

  const photoUrl = details?.photos?.[0];
  const rating = details?.rating;
  const reviewCount = details?.userRatingsTotal;
  const category = formatPlaceType(details?.types);

  function handleClick() {
    setActiveMarker(row.id);
    if (row.coordinates) {
      flyTo(row.coordinates, 18, 60);
    }
  }

  return (
    <motion.div
      ref={cardRef}
      data-location-id={row.id}
      onClick={handleClick}
      className={`group flex gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
        isActive
          ? "bg-white border-gray-200 shadow-md"
          : "bg-white/60 border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm"
      }`}
      style={isActive ? { boxShadow: `0 0 0 2px ${dayColor}40, 0 4px 12px rgba(0,0,0,0.08)` } : undefined}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Thumbnail */}
      <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
        {photoUrl && !imgError ? (
          <img
            src={photoUrl}
            alt={row.activity}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `${dayColor}15` }}
          >
            <MapPin size={18} style={{ color: dayColor }} />
          </div>
        )}
        {/* Stop number badge */}
        <div
          className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
          style={{ background: dayColor }}
        >
          {stopNumber}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          {/* Time */}
          {row.time && (
            <div className="flex items-center gap-1 mb-0.5">
              <Clock size={10} className="text-gray-400" />
              <span className="text-[10px] font-medium text-gray-400">{row.time}</span>
            </div>
          )}
          {/* Name */}
          <h4 className="text-[13px] font-semibold text-gray-900 leading-snug truncate">
            {row.activity}
          </h4>
        </div>

        {/* Rating + category row */}
        <div className="flex items-center gap-2 mt-1">
          {rating && (
            <span className="flex items-center gap-0.5">
              <Star size={10} className="text-amber-400 fill-amber-400" />
              <span className="text-[10px] font-semibold text-gray-700">{rating}</span>
              {reviewCount && (
                <span className="text-[10px] text-gray-400">({reviewCount > 999 ? `${(reviewCount / 1000).toFixed(1)}k` : reviewCount})</span>
              )}
            </span>
          )}
          {rating && category !== "Place" && <span className="text-gray-300 text-[10px]">·</span>}
          {category !== "Place" && (
            <span className="text-[10px] text-gray-500 truncate">{category}</span>
          )}
          {row.pricing && (
            <>
              <span className="text-gray-300 text-[10px]">·</span>
              <span className="text-[10px] font-semibold text-emerald-600">{row.pricing}</span>
            </>
          )}
        </div>
      </div>

      {/* Arrow */}
      <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-60 transition-opacity">
        <ChevronRight size={14} className="text-gray-400" />
      </div>
    </motion.div>
  );
}
