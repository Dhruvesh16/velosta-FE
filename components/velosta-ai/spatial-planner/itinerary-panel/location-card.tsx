"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Star, MapPin, Clock } from "lucide-react";
import { useMapStore } from "@/lib/stores/map-store";
import { usePlannerStore } from "@/lib/stores/planner-store";
import { fetchPlaceDetails, formatPlaceType, type PlaceDetails } from "@/lib/services/google-places";
import type { ActivityRow } from "@/lib/types/planner.types";

interface LocationCardProps {
  row: ActivityRow;
  dayIndex: number;
  /** 1-based stop number; (stopNumber - 1) is the activity index in the day's `rows` */
  stopNumber: number;
  dayColor: string;
  destination?: string;
  isActive?: boolean;
}

/** Haversine in metres */
function distanceMeters(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number]
): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function LocationCard({
  row,
  dayIndex,
  stopNumber,
  dayColor,
  destination,
  isActive = false,
}: LocationCardProps) {
  const { setActiveMarker, flyTo, updateMarkerCoords } = useMapStore();
  const patchActivity = usePlannerStore((s) => s.patchActivity);
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [imgError, setImgError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anchor = row.coordinates ?? [0, 0];
    fetchPlaceDetails(row.activity, anchor, destination).then((d) => {
      if (!d) return;
      setDetails(d);

      // ── Location accuracy upgrade ────────────────────────────────────
      // Google Places returns precise POI coordinates. We snap the marker +
      // row coord ONLY if the Google pick is a meaningful refinement.
      //
      // Hard rules:
      //   1. Skip snap entirely for GENERIC activity names ("Breakfast at
      //      Hotel", "Lunch at a Scenic Spot", "Return to Hotel"…). These
      //      have no specific POI and Google will pick a random business
      //      in/around the bias point, often the wrong city.
      //   2. Δ ≤ 50 m   → no snap (already accurate, avoids jitter)
      //   3. Δ ≤ 8 km   → snap (genuine refinement within the destination)
      //   4. Δ > 8 km   → reject (wrong-namesake / wrong-city match)
      const isGenericName = (s: string) => {
        const t = s.toLowerCase().trim();
        const generics = [
          /^(breakfast|lunch|dinner|brunch|snack|meal)\b/,
          /\b(at )?hotel\s*$/,
          /\bscenic\s+spot\b/,
          /^return to\b/,
          /^check[- ]?(in|out)\b/,
          /^free time\b/,
          /^rest\b/,
          /^transfer\b/,
          /^arrive\b/,
          /^depart\b/,
        ];
        return generics.some((re) => re.test(t)) || t.length < 6;
      };

      if (isGenericName(row.activity)) {
        // Don't relocate the marker — keep the planner's coord (or the
        // day/destination centroid if absent). This stops "Return to Hotel"
        // from teleporting to Goa.
        return;
      }

      if (d.location && row.coordinates) {
        const delta = distanceMeters(row.coordinates, d.location);
        if (delta > 50 && delta < 8_000) {
          updateMarkerCoords(row.id, d.location);
          patchActivity(dayIndex, stopNumber - 1, { coordinates: d.location });
        }
      } else if (d.location && !row.coordinates) {
        // No prior coord at all — accept Google's pick (best we have).
        updateMarkerCoords(row.id, d.location);
        patchActivity(dayIndex, stopNumber - 1, { coordinates: d.location });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.activity, row.id, destination]);

  const photoUrl = details?.photos?.[0];
  const rating = details?.rating;
  const reviewCount = details?.userRatingsTotal;
  const category = formatPlaceType(details?.types);
  const isMealActivity = /\b(breakfast|lunch|dinner|brunch|cafe|café|eatery|restaurant|food)\b/i.test(
    row.activity
  );
  const pricingLabel =
    isMealActivity || row.pricing === "—" ? null : row.pricing;

  function handleClick() {
    setActiveMarker(row.id);
    const target = details?.location ?? row.coordinates;
    if (target) flyTo(target, 17, 55);
  }

  return (
    <motion.div
      ref={cardRef}
      data-location-id={row.id}
      onClick={handleClick}
      className={`group relative flex gap-3 p-2.5 pr-3 rounded-xl cursor-pointer transition-all duration-200 border overflow-hidden ${
        isActive
          ? "bg-white border-[#0B1F2A]/12 shadow-[0_8px_24px_-12px_rgba(11,31,42,0.18)]"
          : "bg-white/70 border-[#0B1F2A]/8 hover:bg-white hover:border-[#D97757]/30"
      }`}
      style={
        isActive
          ? { boxShadow: `0 0 0 1px ${dayColor}55, 0 10px 28px -14px ${dayColor}55` }
          : undefined
      }
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.995 }}
    >
      {/* Left meridian — gilded vertical accent that ties cards into a sequence */}
      <span
        aria-hidden
        className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
        style={{
          background: `linear-gradient(180deg, ${dayColor} 0%, ${dayColor}55 100%)`,
          opacity: isActive ? 1 : 0.4,
        }}
      />

      {/* Thumbnail */}
      <div className="relative w-[68px] h-[68px] rounded-lg overflow-hidden shrink-0 bg-[#F5EFE6] ml-1.5">
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
            style={{ background: `linear-gradient(135deg, ${dayColor}1F 0%, #FBF8F3 100%)` }}
          >
            <MapPin size={18} style={{ color: dayColor }} strokeWidth={1.6} />
          </div>
        )}
        {/* Stop number — engraved compass coin */}
        <div
          className="absolute top-1 left-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[9.5px] font-semibold text-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] tabular-nums"
          style={{ background: `linear-gradient(135deg, ${dayColor} 0%, ${dayColor}CC 100%)` }}
        >
          {stopNumber}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div className="min-w-0">
          {row.time && (
            <div className="flex items-center gap-1 mb-1">
              <Clock size={9.5} className="text-[#0B1F2A]/40" strokeWidth={2} />
              <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#0B1F2A]/55">
                {row.time}
              </span>
            </div>
          )}
          <h4 className="font-serif text-[13.5px] leading-[1.25] font-semibold text-[#0B1F2A] truncate">
            {row.activity}
          </h4>
        </div>

        <div className="flex items-center gap-2 mt-1.5 text-[10.5px]">
          {rating && (
            <span className="flex items-center gap-1">
              <Star size={10} className="text-[#D97757] fill-[#D97757]" />
              <span className="font-semibold text-[#0B1F2A]/75 tabular-nums">{rating}</span>
              {reviewCount ? (
                <span className="text-[#0B1F2A]/40 tabular-nums">
                  ({reviewCount > 999 ? `${(reviewCount / 1000).toFixed(1)}k` : reviewCount})
                </span>
              ) : null}
            </span>
          )}
          {rating && category !== "Place" && <span className="text-[#0B1F2A]/20">·</span>}
          {category !== "Place" && (
            <span className="text-[#0B1F2A]/55 truncate">{category}</span>
          )}
          {pricingLabel && (
            <>
              <span className="text-[#0B1F2A]/20">·</span>
              <span className="font-semibold text-[#2F6F73] tabular-nums">{pricingLabel}</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
