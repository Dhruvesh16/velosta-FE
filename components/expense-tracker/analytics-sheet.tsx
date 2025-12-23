"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Receipt,
  Utensils,
  Car,
  Bed,
  Ticket,
  ShoppingBag,
  Mountain,
  Fuel,
  HelpCircle,
} from "lucide-react";

interface AnalyticsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analytics: any;
  trip: any;
}

const categoryIcons: Record<string, React.ReactNode> = {
  utensils: <Utensils className="h-4 w-4" />,
  car: <Car className="h-4 w-4" />,
  bed: <Bed className="h-4 w-4" />,
  ticket: <Ticket className="h-4 w-4" />,
  "shopping-bag": <ShoppingBag className="h-4 w-4" />,
  mountain: <Mountain className="h-4 w-4" />,
  fuel: <Fuel className="h-4 w-4" />,
  receipt: <Receipt className="h-4 w-4" />,
  "help-circle": <HelpCircle className="h-4 w-4" />,
};

export function AnalyticsSheet({
  open,
  onOpenChange,
  analytics,
  trip,
}: AnalyticsSheetProps) {
  const getCurrencySymbol = () => {
    const symbols: Record<string, string> = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£",
    };
    return symbols[trip?.currency] || trip?.currency || "₹";
  };

  const formatCurrency = (amount: number | undefined | null) => {
    const safeAmount = amount ?? 0;
    return `${getCurrencySymbol()}${safeAmount.toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;
  };

  if (!analytics) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md rounded-l-3xl border-l-0 p-0">
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-muted border-t-[var(--color-brand)] rounded-full animate-spin" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const totalExpenses = analytics.totalExpenses || 0;
  // Map backend field names to frontend expectations
  const categoryBreakdown = (analytics.categoryBreakdown || []).map((c: any) => ({
    ...c,
    amount: c.spent || 0,
    categoryId: c.id,
  }));
  const memberContributions = (analytics.memberBreakdown || []).map((m: any) => ({
    ...m,
    paid: m.totalPaid || 0,
    memberId: m.id,
  }));
  const dailySpending = (analytics.dailyBreakdown || []).map((d: any) => ({
    ...d,
    amount: d.amount || 0,
  }));

  // Find max for charts (with safe defaults)
  const maxCategory = categoryBreakdown.length > 0 
    ? Math.max(...categoryBreakdown.map((c: any) => c.amount || 0), 1)
    : 1;
  const maxMember = memberContributions.length > 0
    ? Math.max(...memberContributions.map((m: any) => m.paid || 0), 1)
    : 1;
  const maxDaily = dailySpending.length > 0
    ? Math.max(...dailySpending.map((d: any) => d.amount || 0), 1)
    : 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md rounded-l-3xl border-l-0 p-0 overflow-hidden">
        <SheetHeader className="p-6 pb-4 border-b border-black/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-brand)]/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-[var(--color-brand)]" />
            </div>
            <div>
              <SheetTitle className="text-xl font-semibold text-[var(--color-navy)]">
                Analytics
              </SheetTitle>
              <SheetDescription className="text-[var(--color-navy)]/60">
                Expense breakdown for {trip?.name}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="p-6 space-y-8">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Total Spent"
                value={formatCurrency(totalExpenses)}
                icon={<Receipt className="h-4 w-4" />}
              />
              <StatCard
                label="Avg. Expense"
                value={formatCurrency(analytics.averageExpense || 0)}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <StatCard
                label="Expenses"
                value={(analytics.expenseCount || 0).toString()}
                icon={<Receipt className="h-4 w-4" />}
              />
              <StatCard
                label="Per Person"
                value={formatCurrency(analytics.perPersonAverage || 0)}
                icon={<TrendingUp className="h-4 w-4" />}
              />
            </div>

            {/* Budget Progress */}
            {trip?.totalBudget && (
              <div className="space-y-3">
                <h3 className="font-medium text-[var(--color-navy)] text-sm">Budget Utilization</h3>
                <div className="p-4 bg-muted/30 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-navy)]/60">Spent</span>
                    <span className="font-medium text-[var(--color-navy)]">
                      {formatCurrency(totalExpenses)} / {formatCurrency(trip.totalBudget)}
                    </span>
                  </div>
                  <Progress
                    value={Math.min((totalExpenses / trip.totalBudget) * 100, 100)}
                    className={`h-2 ${
                      totalExpenses > trip.totalBudget
                        ? "[&>div]:bg-red-500"
                        : "[&>div]:bg-[var(--color-brand)]"
                    }`}
                  />
                  <div className="flex items-center justify-between text-xs text-[var(--color-navy)]/50">
                    <span>
                      {Math.round((totalExpenses / trip.totalBudget) * 100)}% used
                    </span>
                    <span>
                      {formatCurrency(Math.max(trip.totalBudget - totalExpenses, 0))} remaining
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Category Breakdown */}
            {categoryBreakdown.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-[var(--color-navy)] text-sm">By Category</h3>
                <div className="space-y-2">
                  {categoryBreakdown.map((cat: any) => (
                    <div
                      key={cat.categoryId || "uncategorized"}
                      className="p-3 bg-white rounded-xl border border-black/5"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: cat.color ? `${cat.color}15` : "#f4f4f5",
                            color: cat.color || "#71717a",
                          }}
                        >
                          {categoryIcons[cat.icon] || <Receipt className="h-4 w-4" />}
                        </div>
                        <span className="flex-1 font-medium text-sm text-[var(--color-navy)]">
                          {cat.name || "Uncategorized"}
                        </span>
                        <span className="font-semibold text-[var(--color-navy)]">
                          {formatCurrency(cat.amount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={maxCategory > 0 ? (cat.amount / maxCategory) * 100 : 0}
                          className="h-1.5 flex-1"
                          style={{
                            "--progress-color": cat.color || "var(--color-brand)",
                          } as any}
                        />
                        <span className="text-xs text-[var(--color-navy)]/50 w-12 text-right">
                          {cat.count || 0} exp
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member Contributions */}
            {memberContributions.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-[var(--color-navy)] text-sm">By Member</h3>
                <div className="space-y-2">
                  {memberContributions.map((member: any) => (
                    <div
                      key={member.memberId}
                      className="p-3 bg-white rounded-xl border border-black/5"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback
                            style={{ backgroundColor: member.avatarColor }}
                            className="text-white text-xs font-medium"
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 font-medium text-sm text-[var(--color-navy)]">
                          {member.name}
                        </span>
                        <span className="font-semibold text-[var(--color-navy)]">
                          {formatCurrency(member.paid)}
                        </span>
                      </div>
                      <Progress
                        value={maxMember > 0 ? (member.paid / maxMember) * 100 : 0}
                        className="h-1.5 [&>div]:bg-[var(--color-brand)]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Spending */}
            {dailySpending.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-[var(--color-navy)] text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[var(--color-navy)]/40" />
                  Daily Spending
                </h3>
                <div className="p-4 bg-white rounded-2xl border border-black/5">
                  {/* Simple bar chart */}
                  <div className="flex items-end gap-1 h-24 mb-3">
                    {dailySpending.slice(-14).map((day: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div
                          className="w-full bg-[var(--color-brand)]/20 rounded-t transition-all hover:bg-[var(--color-brand)]/40"
                          style={{
                            height: `${maxDaily > 0 ? (day.amount / maxDaily) * 100 : 0}%`,
                            minHeight: (day.amount || 0) > 0 ? "4px" : "0",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-[var(--color-navy)]/40">
                    <span>
                      {dailySpending.length > 0
                        ? new Date(dailySpending[Math.max(0, dailySpending.length - 14)].date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
                        : "-"}
                    </span>
                    <span>
                      {dailySpending.length > 0
                        ? new Date(dailySpending[dailySpending.length - 1].date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {totalExpenses === 0 && (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-[var(--color-navy)]/40" />
                </div>
                <h4 className="font-medium text-[var(--color-navy)] mb-2">
                  No data yet
                </h4>
                <p className="text-sm text-[var(--color-navy)]/50 max-w-xs">
                  Add expenses to see analytics and spending breakdowns.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-white rounded-2xl border border-black/5">
      <div className="flex items-center gap-2 text-[var(--color-navy)]/50 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-lg font-semibold text-[var(--color-navy)]">{value}</p>
    </div>
  );
}
