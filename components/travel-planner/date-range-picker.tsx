"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  onSelect: (startDate: string, endDate: string) => void;
  onClose: () => void;
}

export function DateRangePicker({ onSelect, onClose }: DateRangePickerProps) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const handleDateClick = (day: number) => {
    const selectedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    selectedDate.setHours(0, 0, 0, 0);

    // 🚫 Prevent selecting past dates
    if (selectedDate < today) return;

    if (!startDate) {
      setStartDate(selectedDate);
    } else if (!endDate) {
      if (selectedDate > startDate) {
        setEndDate(selectedDate);
      } else {
        setStartDate(selectedDate);
        setEndDate(null);
      }
    } else {
      setStartDate(selectedDate);
      setEndDate(null);
    }
  };

  const handleConfirm = () => {
    if (startDate && endDate) {
      const start = startDate.toISOString().split("T")[0];
      const end = endDate.toISOString().split("T")[0];
      onSelect(start, end);
      onClose();
    }
  };

  const isDateInRange = (day: number) => {
    if (!startDate || !endDate) return false;
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    return date >= startDate && date <= endDate;
  };

  const isDateSelected = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    return (
      (startDate && date.toDateString() === startDate.toDateString()) ||
      (endDate && date.toDateString() === endDate.toDateString())
    );
  };

  const getDayCount = () => {
    if (!startDate || !endDate) return null;
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive of both days
  };

  const dayCount = getDayCount();

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const monthName = currentMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card className="w-full max-w-md bg-white border-[#DA880F]/20 shadow-lg">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#DA880F]">Select Dates</h3>
          <Calendar className="w-5 h-5 text-[#DA880F]" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            // 🚫 Prevent going to past months
            onClick={() =>
              setCurrentMonth((prev) => {
                const newMonth = new Date(
                  prev.getFullYear(),
                  prev.getMonth() - 1
                );
                return newMonth <
                  new Date(today.getFullYear(), today.getMonth(), 1)
                  ? prev
                  : newMonth;
              })
            }
            className="text-[#DA880F] hover:bg-[#DA880F]/10"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <span className="font-semibold text-gray-800">{monthName}</span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() + 1
                )
              )
            }
            className="text-[#DA880F] hover:bg-[#DA880F]/10"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-gray-600"
            >
              {day}
            </div>
          ))}
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const date = new Date(
              currentMonth.getFullYear(),
              currentMonth.getMonth(),
              day
            );
            const isPast = date < today;

            return (
              <button
                key={day}
                onClick={() => handleDateClick(day)}
                disabled={isPast}
                className={cn(
                  "p-2 text-sm rounded-lg transition-colors",
                  isPast
                    ? "text-gray-400 cursor-not-allowed"
                    : isDateSelected(day)
                    ? "bg-[#DA880F] text-white font-semibold"
                    : isDateInRange(day)
                    ? "bg-[#DA880F]/20 text-gray-800"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                {day}
              </button>
            );
          })}
        </div>

        <div className="space-y-2 text-sm">
          {startDate && (
            <p className="text-gray-700">
              <span className="font-semibold text-[#DA880F]">From:</span>{" "}
              {startDate.toDateString()}
            </p>
          )}
          {endDate && (
            <p className="text-gray-700">
              <span className="font-semibold text-[#DA880F]">To:</span>{" "}
              {endDate.toDateString()}
              {dayCount && (
                <span className="ml-2 text-[#DA880F]/80 font-medium">
                  • {dayCount} {dayCount > 1 ? "days" : "day"}
                </span>
              )}
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-[#DA880F]/30 text-[#DA880F] hover:bg-[#DA880F]/5 bg-transparent"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!startDate || !endDate}
            className="flex-1 bg-[#DA880F] hover:bg-[#c9770b] text-white"
          >
            Confirm
          </Button>
        </div>
      </div>
    </Card>
  );
}
