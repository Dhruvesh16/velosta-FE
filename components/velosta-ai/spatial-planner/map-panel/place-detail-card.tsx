"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, ChevronRight, Star, Phone,
  Globe, MapPin, Sparkles, ExternalLink,
} from "lucide-react";
import {
  fetchPlaceDetails,
  formatPlaceType,
  type PlaceDetails,
} from "@/lib/services/google-places";
import type { MapMarker } from "@/lib/types/planner.types";
import type { ItineraryDay } from "@/lib/types/planner.types";

interface PlaceDetailCardProps {
  marker: MapMarker | null;
  day?: ItineraryDay;
  /** AI-generated description for this activity */
  aiDescription?: string;
  destination?: string;
  /** Total stops on this day */
  totalStops: number;
  /** Current stop index (0-based) */
  currentStopIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function PlaceDetailCard({
  marker,
  day,
  aiDescription,
  destination,
  totalStops,
  currentStopIndex,
  onClose,
  onPrev,
  onNext,
}: PlaceDetailCardProps) {
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Fetch place details when marker changes
  useEffect(() => {
    if (!marker) {
      setDetails(null);
      return;
    }
    setLoading(true);
    setPhotoIndex(0);
    fetchPlaceDetails(marker.label, marker.coordinates, destination)
      .then((d) => setDetails(d))
      .finally(() => setLoading(false));
  }, [marker?.id, marker?.label, marker?.coordinates, destination]);

  const nextPhoto = useCallback(() => {
    if (!details?.photos.length) return;
    setPhotoIndex((i) => (i + 1) % details.photos.length);
  }, [details?.photos.length]);

  const prevPhoto = useCallback(() => {
    if (!details?.photos.length) return;
    setPhotoIndex((i) => (i - 1 + details.photos.length) % details.photos.length);
  }, [details?.photos.length]);

  if (!marker) return null;

  const activityRow = day?.rows.find((r) => r.id === marker.id);
  const description = aiDescription || activityRow?.description || "";
  const pricing = marker.pricing || activityRow?.pricing;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={marker.id}
        className="absolute top-3 right-3 z-30 w-[320px] max-h-[calc(100%-24px)] overflow-hidden"
        initial={{ opacity: 0, x: 40, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 40, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[calc(100vh-100px)]">
          {/* Photo section */}
          <div className="relative w-full h-44 bg-gray-100 shrink-0">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-[#D97757] rounded-full animate-spin" />
              </div>
            ) : details?.photos.length ? (
              <>
                <img
                  src={details.photos[photoIndex]}
                  alt={marker.label}
                  className="w-full h-full object-cover"
                />
                {/* Photo dots */}
                {details.photos.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {details.photos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPhotoIndex(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          i === photoIndex ? "bg-white w-3" : "bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                )}
                {/* Photo nav arrows */}
                {details.photos.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#F5EFE6]/60 to-[#FBF8F3]">
                <MapPin size={28} className="text-[#E89378] mb-1" />
                <span className="text-[10px] text-gray-400">No photos available</span>
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-3">
            {/* Day + time badge */}
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="font-medium">Day {marker.dayIndex + 1}</span>
              {marker.time && (
                <>
                  <span>·</span>
                  <span>{marker.time}</span>
                </>
              )}
              {pricing && (
                <>
                  <span>·</span>
                  <span className="text-[#B85F44] font-semibold">{pricing}</span>
                </>
              )}
            </div>

            {/* Name */}
            <h3 className="text-gray-900 font-bold text-base leading-snug">
              {details?.name ?? marker.label}
            </h3>

            {/* Rating + Type */}
            {details && (
              <div className="flex items-center gap-2 flex-wrap">
                {details.rating && (
                  <span className="flex items-center gap-1 text-xs">
                    <span className="font-semibold text-gray-800">{details.rating}</span>
                    <Star size={11} className="text-[#E89378] fill-[#E89378]" />
                    {details.userRatingsTotal && (
                      <span className="text-gray-400">
                        ({details.userRatingsTotal.toLocaleString()})
                      </span>
                    )}
                  </span>
                )}
                {details.rating && <span className="text-gray-300">·</span>}
                <span className="text-xs text-gray-500">
                  {formatPlaceType(details.types)}
                </span>
              </div>
            )}

            {/* AI Notes */}
            {description && (
              <div className="bg-[#F5EFE6]/60/70 border border-[#D97757]/20 rounded-xl px-3.5 py-2.5">
                <p className="text-[10px] font-semibold text-[#B85F44] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Sparkles size={10} />
                  Notes from Velosta AI
                </p>
                <p className="text-gray-700 text-xs leading-relaxed">
                  {description}
                </p>
              </div>
            )}

            {/* Contact details */}
            {details && (details.phone || details.website) && (
              <div className="space-y-2 pt-1">
                {details.phone && (
                  <a
                    href={`tel:${details.phone}`}
                    className="flex items-center gap-2.5 text-xs text-gray-600 hover:text-[#B85F44] transition-colors"
                  >
                    <Phone size={12} className="text-gray-400 shrink-0" />
                    {details.phone}
                  </a>
                )}
                {details.website && (
                  <a
                    href={details.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-xs text-gray-600 hover:text-[#B85F44] transition-colors group"
                  >
                    <Globe size={12} className="text-gray-400 shrink-0" />
                    <span className="truncate">
                      {new URL(details.website).hostname}
                    </span>
                    <ExternalLink size={9} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Bottom nav */}
          <div className="shrink-0 border-t border-gray-100 px-4 py-2.5 flex items-center justify-between bg-gray-50/50">
            <button
              onClick={onPrev}
              disabled={currentStopIndex <= 0}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            <span className="text-xs text-gray-400 font-medium tabular-nums">
              {currentStopIndex + 1} of {totalStops}
            </span>
            <button
              onClick={onNext}
              disabled={currentStopIndex >= totalStops - 1}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} className="text-gray-600" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
