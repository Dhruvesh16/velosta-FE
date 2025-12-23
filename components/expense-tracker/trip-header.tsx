"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MapPin,
  Calendar,
  Settings,
  BarChart3,
  Copy,
  Check,
  Wallet,
  Users,
  Receipt,
} from "lucide-react";
import { useState } from "react";

interface TripHeaderProps {
  trip: any;
  analytics: any;
  isOwner: boolean;
  onSettingsClick: () => void;
  onMembersClick: () => void;
  onAnalyticsClick: () => void;
}

export function TripHeader({
  trip,
  analytics,
  isOwner,
  onSettingsClick,
  onMembersClick,
  onAnalyticsClick,
}: TripHeaderProps) {
  const [copied, setCopied] = useState(false);

  const copyInviteCode = async () => {
    await navigator.clipboard.writeText(trip.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalSpent = analytics?.totalExpenses || 0;
  const budgetPercentage = trip.totalBudget
    ? Math.min((totalSpent / trip.totalBudget) * 100, 100)
    : 0;
  const isOverBudget = trip.totalBudget && totalSpent > trip.totalBudget;

  const formatCurrency = (amount: number) => {
    const symbols: Record<string, string> = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£",
    };
    const symbol = symbols[trip.currency] || trip.currency;
    return `${symbol}${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  };

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
    <div className="rounded-3xl bg-[var(--color-cream)] p-6 md:p-8 border border-black/5">
      {/* Top Row */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-semibold text-[var(--color-navy)]">
              {trip.name}
            </h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[status].bg} ${statusConfig[status].text}`}>
              {status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
              {statusConfig[status].label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-navy)]/60">
            {trip.destination && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {trip.destination}
              </span>
            )}
            {trip.startDate && trip.endDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {format(new Date(trip.startDate), "MMM d")} - {format(new Date(trip.endDate), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Invite Code */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyInviteCode}
                  className="h-9 px-3 rounded-full border-[var(--color-navy)]/20 bg-white hover:bg-[var(--color-navy)]/5"
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-2 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2 text-[var(--color-navy)]/60" />
                  )}
                  <span className="font-mono text-[var(--color-navy)]">{trip.inviteCode}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copied ? "Copied!" : "Copy invite code"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="outline"
            size="icon"
            onClick={onMembersClick}
            className="h-9 w-9 rounded-full border-[var(--color-navy)]/20 bg-white hover:bg-[var(--color-navy)]/5"
          >
            <Users className="h-4 w-4 text-[var(--color-navy)]/60" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={onAnalyticsClick}
            className="h-9 w-9 rounded-full border-[var(--color-navy)]/20 bg-white hover:bg-[var(--color-navy)]/5"
          >
            <BarChart3 className="h-4 w-4 text-[var(--color-navy)]/60" />
          </Button>

          {isOwner && (
            <Button
              variant="outline"
              size="icon"
              onClick={onSettingsClick}
              className="h-9 w-9 rounded-full border-[var(--color-navy)]/20 bg-white hover:bg-[var(--color-navy)]/5"
            >
              <Settings className="h-4 w-4 text-[var(--color-navy)]/60" />
            </Button>
          )}
        </div>
      </div>

      {/* Members Row */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex -space-x-2">
          {trip.members.slice(0, 5).map((member: any) => (
            <TooltipProvider key={member.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="w-8 h-8 border-2 border-[var(--color-cream)]">
                    <AvatarFallback
                      style={{ backgroundColor: member.avatarColor }}
                      className="text-white text-xs font-medium"
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{member.name}{member.role === "OWNER" && " (Owner)"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          {trip.members.length > 5 && (
            <div className="w-8 h-8 rounded-full bg-[var(--color-navy)]/10 border-2 border-[var(--color-cream)] flex items-center justify-center text-[var(--color-navy)] text-xs font-medium">
              +{trip.members.length - 5}
            </div>
          )}
        </div>
        <button
          onClick={onMembersClick}
          className="text-sm text-[var(--color-navy)]/60 hover:text-[var(--color-navy)] transition-colors"
        >
          {trip.members.length} member{trip.members.length !== 1 ? "s" : ""}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Total Spent"
          value={formatCurrency(totalSpent)}
          subValue={trip.totalBudget ? `of ${formatCurrency(trip.totalBudget)}` : undefined}
          progress={trip.totalBudget ? budgetPercentage : undefined}
          isOverBudget={isOverBudget}
        />
        <StatCard
          icon={<Receipt className="h-4 w-4" />}
          label="Expenses"
          value={analytics?.expenseCount?.toString() || "0"}
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Per Person"
          value={formatCurrency(analytics?.perPersonAverage || 0)}
        />
        <StatCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Avg. Expense"
          value={formatCurrency(analytics?.averageExpense || 0)}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subValue,
  progress,
  isOverBudget,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  progress?: number;
  isOverBudget?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-black/5">
      <div className="flex items-center gap-2 text-[var(--color-navy)]/50 mb-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-xl font-semibold ${isOverBudget ? "text-red-500" : "text-[var(--color-navy)]"}`}>
        {value}
      </p>
      {subValue && (
        <p className="text-xs text-[var(--color-navy)]/40 mt-0.5">{subValue}</p>
      )}
      {progress !== undefined && (
        <Progress
          value={progress}
          className={`h-1 mt-2 bg-muted ${
            isOverBudget ? "[&>div]:bg-red-500" : "[&>div]:bg-[var(--color-brand)]"
          }`}
        />
      )}
    </div>
  );
}
