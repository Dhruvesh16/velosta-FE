"use client";

import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertCircle, Sparkles, Calendar, Users } from "lucide-react";
import { format } from "date-fns";

interface ExpenseInsightsProps {
  expenses: any[];
  analytics: any;
  currency: string;
  totalBudget?: number;
}

export function ExpenseInsights({ expenses, analytics, currency, totalBudget }: ExpenseInsightsProps) {
  const getCurrencySymbol = () => {
    const symbols: Record<string, string> = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£",
    };
    return symbols[currency] || currency;
  };

  const formatCurrency = (amount: number) => {
    return `${getCurrencySymbol()}${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  };

  // Calculate insights
  const totalSpent = analytics?.totalExpenses || 0;
  const todayExpenses = expenses.filter((e) => {
    const expenseDate = new Date(e.date);
    const today = new Date();
    return expenseDate.toDateString() === today.toDateString();
  });
  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  const yesterdayExpenses = expenses.filter((e) => {
    const expenseDate = new Date(e.date);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return expenseDate.toDateString() === yesterday.toDateString();
  });
  const yesterdayTotal = yesterdayExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  const dailyAverage = expenses.length > 0 
    ? totalSpent / Math.max(1, Math.ceil((new Date().getTime() - new Date(expenses[0]?.date || Date.now()).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isOverBudget = totalBudget && totalSpent > totalBudget;
  const budgetPercentage = totalBudget ? (totalSpent / totalBudget) * 100 : 0;
  const isNearBudget = totalBudget && budgetPercentage > 80 && budgetPercentage <= 100;

  const insights = [];

  // Budget insights
  if (isOverBudget) {
    insights.push({
      type: "warning",
      icon: <AlertCircle className="h-4 w-4" />,
      title: "Over Budget",
      message: `You've exceeded your budget by ${formatCurrency(totalSpent - (totalBudget || 0))}`,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    });
  } else if (isNearBudget) {
    insights.push({
      type: "info",
      icon: <AlertCircle className="h-4 w-4" />,
      title: "Near Budget Limit",
      message: `You've used ${Math.round(budgetPercentage)}% of your budget`,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    });
  }

  // Spending trend
  if (todayTotal > 0 && yesterdayTotal > 0) {
    const trend = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
    if (Math.abs(trend) > 10) {
      insights.push({
        type: trend > 0 ? "increase" : "decrease",
        icon: trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />,
        title: trend > 0 ? "Spending Up" : "Spending Down",
        message: `${trend > 0 ? "+" : ""}${Math.abs(Math.round(trend))}% from yesterday`,
        color: trend > 0 ? "text-emerald-600" : "text-blue-600",
        bgColor: trend > 0 ? "bg-emerald-50" : "bg-blue-50",
        borderColor: trend > 0 ? "border-emerald-200" : "border-blue-200",
      });
    }
  }

  // Daily average insight
  if (dailyAverage > 0 && totalBudget) {
    const projectedTotal = dailyAverage * 30; // Project for 30 days
    if (projectedTotal > totalBudget * 1.2) {
      insights.push({
        type: "info",
        icon: <Calendar className="h-4 w-4" />,
        title: "Spending Pace",
        message: `At this rate, you'll exceed budget by ${formatCurrency(projectedTotal - totalBudget)}`,
        color: "text-amber-600",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
      });
    }
  }

  // High spending day
  if (todayTotal > dailyAverage * 1.5 && dailyAverage > 0) {
    insights.push({
      type: "info",
      icon: <Sparkles className="h-4 w-4" />,
      title: "High Spending Day",
      message: `Today's spending is ${Math.round((todayTotal / dailyAverage) * 100)}% above average`,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    });
  }

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--color-brand)]" />
        <h3 className="text-sm font-medium text-[var(--color-navy)]/70">Insights</h3>
      </div>
      <div className="space-y-2">
        {insights.slice(0, 3).map((insight, idx) => (
          <Card
            key={idx}
            className={`p-3 rounded-xl border ${insight.borderColor} ${insight.bgColor} transition-all hover:shadow-sm`}
          >
            <div className="flex items-start gap-3">
              <div className={`${insight.color} flex-shrink-0 mt-0.5`}>
                {insight.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-medium ${insight.color} mb-0.5`}>
                  {insight.title}
                </h4>
                <p className="text-xs text-[var(--color-navy)]/60">
                  {insight.message}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

