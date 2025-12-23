"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Wallet,
  ArrowRightLeft,
} from "lucide-react";

interface BalancesSidebarProps {
  balances: {
    balances: {
      memberId: string;
      name: string;
      avatarColor: string;
      totalPaid: number;
      totalOwed: number;
      balance: number;
    }[];
    debts: {
      from: { memberId: string; name: string; avatarColor: string };
      to: { memberId: string; name: string; avatarColor: string };
      amount: number;
    }[];
    totalExpenses: number;
    totalSettled: number;
  } | null;
  currency: string;
  onSettleClick: () => void;
}

export function BalancesSidebar({
  balances,
  currency,
  onSettleClick,
}: BalancesSidebarProps) {
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
    return `${getCurrencySymbol()}${Math.abs(amount).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  };

  if (!balances) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white p-6">
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-2 border-muted border-t-[var(--color-brand)] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const hasDebts = balances.debts.length > 0;
  const allSettled = !hasDebts && balances.totalExpenses > 0;

  return (
    <div className="space-y-4">
      {/* Who Owes Whom */}
      <div className="rounded-3xl border border-black/5 bg-white overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-black/5 bg-muted/30">
          <h3 className="font-medium text-[var(--color-navy)] text-sm flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-[var(--color-brand)]" />
            Who Owes Whom
          </h3>
          {hasDebts && (
            <Button
              onClick={onSettleClick}
              size="sm"
              className="h-8 px-3 rounded-full text-xs text-[var(--color-brand-contrast)] font-medium"
              style={{
                background: "linear-gradient(180deg, var(--color-brand-start), var(--color-brand))",
              }}
            >
              Settle Up
            </Button>
          )}
        </div>
        <div className="p-4">
          {allSettled ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <h4 className="font-medium text-[var(--color-navy)] mb-1">All settled!</h4>
              <p className="text-sm text-[var(--color-navy)]/50">
                Everyone is square.
              </p>
            </div>
          ) : !hasDebts ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Wallet className="h-6 w-6 text-[var(--color-navy)]/40" />
              </div>
              <h4 className="font-medium text-[var(--color-navy)] mb-1">
                No expenses yet
              </h4>
              <p className="text-sm text-[var(--color-navy)]/50">
                Add expenses to see balances.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {balances.debts.map((debt, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-2xl"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback
                      style={{ backgroundColor: debt.from.avatarColor }}
                      className="text-white text-xs font-medium"
                    >
                      {debt.from.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--color-navy)]/60">
                      <span className="font-medium text-[var(--color-navy)]">{debt.from.name}</span>
                      {" owes "}
                      <span className="font-medium text-[var(--color-navy)]">{debt.to.name}</span>
                    </p>
                    <p className="text-lg font-semibold text-[var(--color-brand)]">
                      {formatCurrency(debt.amount)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--color-navy)]/30 flex-shrink-0" />
                  <Avatar className="w-8 h-8">
                    <AvatarFallback
                      style={{ backgroundColor: debt.to.avatarColor }}
                      className="text-white text-xs font-medium"
                    >
                      {debt.to.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Individual Balances */}
      <div className="rounded-3xl border border-black/5 bg-white overflow-hidden">
        <div className="p-4 border-b border-black/5">
          <h3 className="font-medium text-[var(--color-navy)] text-sm">Balances</h3>
        </div>
        <ScrollArea className="max-h-[280px]">
          <div className="p-4 space-y-1">
            {balances.balances.map((balance) => (
              <div
                key={balance.memberId}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors"
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback
                    style={{ backgroundColor: balance.avatarColor }}
                    className="text-white text-xs font-medium"
                  >
                    {balance.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--color-navy)] text-sm truncate">
                    {balance.name}
                  </p>
                  <p className="text-xs text-[var(--color-navy)]/50">
                    Paid {formatCurrency(balance.totalPaid)} · Share {formatCurrency(balance.totalOwed)}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 text-sm font-medium ${
                      balance.balance > 0
                        ? "text-emerald-600"
                        : balance.balance < 0
                        ? "text-red-500"
                        : "text-[var(--color-navy)]/40"
                    }`}
                  >
                    {balance.balance > 0 && <TrendingUp className="h-3 w-3" />}
                    {balance.balance < 0 && <TrendingDown className="h-3 w-3" />}
                    {balance.balance > 0 ? "+" : ""}
                    {formatCurrency(balance.balance)}
                  </span>
                  <p className="text-xs text-[var(--color-navy)]/40">
                    {balance.balance > 0 ? "gets back" : balance.balance < 0 ? "owes" : "settled"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Summary Stats */}
      {balances.totalExpenses > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white border border-black/5 p-4">
            <p className="text-xs text-[var(--color-navy)]/50">Total Expenses</p>
            <p className="text-lg font-semibold text-[var(--color-navy)]">
              {formatCurrency(balances.totalExpenses)}
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-black/5 p-4">
            <p className="text-xs text-[var(--color-navy)]/50">Settled</p>
            <p className="text-lg font-semibold text-emerald-600">
              {formatCurrency(balances.totalSettled)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
