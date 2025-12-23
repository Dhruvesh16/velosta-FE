"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Calendar,
  Users,
  Plus,
  Receipt,
  Sparkles,
} from "lucide-react";

interface Trip {
  id: string;
  name: string;
  description?: string;
  destination?: string;
  currency: string;
  totalBudget?: number;
  totalSpent?: number;
  startDate?: string;
  endDate?: string;
  coverImage?: string;
  members: {
    id: string;
    name: string;
    avatarColor: string;
    role: string;
    userId?: string;
  }[];
  _count: {
    expenses: number;
  };
  createdBy: {
    id: string;
    name: string;
    picture?: string;
  };
}

interface TripsListProps {
  trips: Trip[];
  isLoading: boolean;
  onCreateClick: () => void;
}

export function TripsList({ trips, isLoading, onCreateClick }: TripsListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-3xl bg-white border border-black/5 overflow-hidden">
            <Skeleton className="h-36 w-full" />
            <div className="p-5">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-[var(--color-brand)]/10 flex items-center justify-center">
            <Receipt className="h-9 w-9 text-[var(--color-brand)]" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--color-brand)] flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-[var(--color-navy)] mb-2">
          No trips yet
        </h3>
        <p className="text-[var(--color-navy)]/60 text-center max-w-sm mb-6">
          Create your first expense trip to start tracking and splitting expenses
          with your travel companions.
        </p>
        <Button
          onClick={onCreateClick}
          className="h-11 px-6 rounded-full text-[var(--color-brand-contrast)] font-semibold"
          style={{
            background: "linear-gradient(180deg, var(--color-brand-start), var(--color-brand))",
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Your First Trip
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-[var(--color-navy)]">Your Trips</h2>
        <span className="text-sm text-[var(--color-navy)]/50">
          {trips.length} {trips.length === 1 ? "trip" : "trips"}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>
    </div>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const budgetPercentage = trip.totalBudget
    ? Math.min(((trip.totalSpent || 0) / trip.totalBudget) * 100, 100)
    : 0;

  const isOverBudget =
    trip.totalBudget && (trip.totalSpent || 0) > trip.totalBudget;

  const getTripStatus = () => {
    if (!trip.startDate || !trip.endDate) return "planning";
    const now = new Date();
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    if (now < start) return "upcoming";
    if (now > end) return "completed";
    return "active";
  };

  const status = getTripStatus();
  const statusConfig = {
    planning: { label: "Planning", bg: "bg-muted", text: "text-muted-foreground" },
    upcoming: { label: "Upcoming", bg: "bg-blue-50", text: "text-blue-600" },
    active: { label: "Active", bg: "bg-emerald-50", text: "text-emerald-600" },
    completed: { label: "Completed", bg: "bg-muted", text: "text-muted-foreground" },
  };

  return (
    <Link href={`/expense-tracker/${trip.id}`}>
      <article className="group h-full rounded-3xl bg-white border border-black/5 overflow-hidden hover:shadow-lg hover:border-black/10 transition-all duration-200 cursor-pointer">
        {/* Cover */}
        <div className="relative h-36 bg-gradient-to-br from-[var(--color-navy)] to-[var(--color-navy)]/80 overflow-hidden">
          {trip.coverImage ? (
            <img
              src={trip.coverImage}
              alt={trip.name}
              className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <MapPin className="h-10 w-10 text-white/20" />
            </div>
          )}
          
          {/* Status Badge */}
          <div className="absolute top-3 right-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[status].bg} ${statusConfig[status].text}`}>
              {status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
              {statusConfig[status].label}
            </span>
          </div>

          {/* Member Avatars */}
          <div className="absolute bottom-3 left-3 flex -space-x-2">
            {trip.members.slice(0, 3).map((member) => (
              <Avatar
                key={member.id}
                className="w-7 h-7 border-2 border-white"
              >
                <AvatarFallback
                  style={{ backgroundColor: member.avatarColor }}
                  className="text-white text-[10px] font-medium"
                >
                  {member.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {trip.members.length > 3 && (
              <div className="w-7 h-7 rounded-full bg-[var(--color-navy)] border-2 border-white flex items-center justify-center text-white text-[10px] font-medium">
                +{trip.members.length - 3}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-semibold text-[var(--color-navy)] line-clamp-1 group-hover:text-[var(--color-brand)] transition-colors">
            {trip.name}
          </h3>
          
          {trip.destination && (
            <p className="flex items-center gap-1 text-sm text-[var(--color-navy)]/50 mt-1">
              <MapPin className="h-3.5 w-3.5" />
              {trip.destination}
            </p>
          )}

          {/* Date Range */}
          {trip.startDate && trip.endDate && (
            <p className="flex items-center gap-1.5 text-xs text-[var(--color-navy)]/50 mt-2">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(trip.startDate), "MMM d")} - {format(new Date(trip.endDate), "MMM d, yyyy")}
            </p>
          )}

          {/* Spending */}
          <div className="mt-4 pt-4 border-t border-black/5">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-[var(--color-navy)]/60">Spent</span>
              <span className={`font-semibold ${isOverBudget ? "text-red-500" : "text-[var(--color-navy)]"}`}>
                ₹{(trip.totalSpent || 0).toLocaleString("en-IN")}
                {trip.totalBudget && (
                  <span className="text-[var(--color-navy)]/40 font-normal">
                    {" "}/ ₹{trip.totalBudget.toLocaleString("en-IN")}
                  </span>
                )}
              </span>
            </div>
            {trip.totalBudget && (
              <Progress
                value={budgetPercentage}
                className={`h-1.5 bg-muted ${
                  isOverBudget ? "[&>div]:bg-red-500" : "[&>div]:bg-[var(--color-brand)]"
                }`}
              />
            )}
          </div>

          {/* Footer Stats */}
          <div className="flex items-center gap-4 mt-4 text-xs text-[var(--color-navy)]/50">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {trip.members.length} members
            </span>
            <span className="flex items-center gap-1">
              <Receipt className="h-3.5 w-3.5" />
              {trip._count.expenses} expenses
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
