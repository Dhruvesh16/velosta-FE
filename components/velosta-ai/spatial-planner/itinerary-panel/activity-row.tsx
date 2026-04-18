"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { GripVertical, X, Clock, MapPin, DollarSign } from "lucide-react";
import { useMapStore } from "@/lib/stores/map-store";
import { usePlannerStore } from "@/lib/stores/planner-store";
import type { ActivityRow as ActivityRowType } from "@/lib/types/planner.types";

interface ActivityRowProps {
  row: ActivityRowType;
  dayIndex: number;
  activityIndex: number;
}

export default function ActivityRowItem({
  row,
  dayIndex,
  activityIndex,
}: ActivityRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const { setActiveMarker, flyTo } = useMapStore();
  const { removeActivity } = usePlannerStore();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : ("auto" as const),
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      className="group flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-[#F5EFE6]/60 transition-colors"
      onClick={() => {
        setActiveMarker(row.id);
        if (row.coordinates) {
          flyTo(row.coordinates, 15, 50);
        }
      }}
      role="listitem"
    >
      {/* Drag handle */}
      <button
        className="sp-drag-handle mt-0.5 shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-40 hover:!opacity-70 transition-opacity"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} className="text-gray-400" />
      </button>

      {/* Time chip */}
      {row.time && (
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <Clock size={10} className="text-[#E89378]" />
          <span className="text-[10px] font-medium tabular-nums text-[#B85F44]">
            {row.time}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-gray-800 text-xs font-medium leading-tight truncate">
          {row.activity}
        </p>
        {row.description && (
          <p className="text-[10px] mt-0.5 line-clamp-2 leading-relaxed text-gray-500">
            {row.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {row.distance && (
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <MapPin size={9} />
              {row.distance}
            </span>
          )}
          {row.pricing && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#B85F44] bg-[#F5EFE6]/60 px-1.5 py-0.5 rounded-full border border-[#D97757]/20">
              <DollarSign size={9} />
              {row.pricing}
            </span>
          )}
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          removeActivity(dayIndex, activityIndex);
        }}
        className="shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-50 hover:!opacity-100 hover:bg-red-50 transition-all"
        aria-label={`Remove ${row.activity}`}
      >
        <X size={12} className="text-red-400" />
      </button>
    </motion.div>
  );
}
