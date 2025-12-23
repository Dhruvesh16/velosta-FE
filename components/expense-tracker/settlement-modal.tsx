"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/app/utils/context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, ArrowRight, CheckCircle2, Wallet } from "lucide-react";

interface SettlementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  members: any[];
  debts: {
    from: { memberId: string; name: string; avatarColor: string };
    to: { memberId: string; name: string; avatarColor: string };
    amount: number;
  }[];
  currency: string;
  onSettlementRecorded: () => void;
}

export function SettlementModal({
  open,
  onOpenChange,
  tripId,
  members,
  debts,
  currency,
  onSettlementRecorded,
}: SettlementModalProps) {
  const { accessToken } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [fromMemberId, setFromMemberId] = useState<string>("");
  const [toMemberId, setToMemberId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedDebt, setSelectedDebt] = useState<number | null>(null);

  const getCurrencySymbol = () => {
    const symbols: Record<string, string> = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£",
    };
    return symbols[currency] || currency;
  };

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFromMemberId("");
      setToMemberId("");
      setAmount("");
      setNotes("");
      setSelectedDebt(null);
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  const handleSelectDebt = (index: number) => {
    const debt = debts[index];
    setSelectedDebt(index);
    setFromMemberId(debt.from.memberId);
    setToMemberId(debt.to.memberId);
    setAmount(debt.amount.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fromMemberId || !toMemberId) {
      setError("Please select both members");
      return;
    }

    if (fromMemberId === toMemberId) {
      setError("Please select different members");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/expenses/trips/${tripId}/settlements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            fromMemberId,
            toMemberId,
            amount: parseFloat(amount),
            notes: notes.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to record settlement");
      }

      setSuccess(true);
      setTimeout(() => {
        onSettlementRecorded();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl">
          <div className="py-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-navy)] mb-2">
              Settlement Recorded!
            </h3>
            <p className="text-[var(--color-navy)]/60 text-sm">
              The payment has been recorded successfully.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[480px] rounded-3xl">
        <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-semibold text-[var(--color-navy)]">
                Record Payment
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-[var(--color-navy)]/60">
                Mark a payment as settled between members
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-5">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          {/* Quick Select from Suggested Debts - More Prominent */}
          {debts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-[var(--color-navy)]/70">
                  Quick Select
                </Label>
                <span className="text-xs text-[var(--color-navy)]/50">
                  {debts.length} {debts.length === 1 ? "payment" : "payments"} pending
                </span>
              </div>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2 pr-2">
                  {debts.map((debt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectDebt(idx)}
                      className={`w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-3.5 rounded-xl border-2 transition-all ${
                        selectedDebt === idx
                          ? "border-emerald-500 bg-emerald-50 shadow-sm"
                          : "border-black/5 hover:border-emerald-200 hover:bg-emerald-50/50 bg-white"
                      }`}
                    >
                      <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0">
                        <AvatarFallback
                          style={{ backgroundColor: debt.from.avatarColor }}
                          className="text-white text-[10px] sm:text-xs font-semibold"
                        >
                          {debt.from.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-[var(--color-navy)] truncate">
                          {debt.from.name}
                        </p>
                        <p className="text-[10px] sm:text-xs text-[var(--color-navy)]/50 truncate">
                          pays {debt.to.name}
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--color-navy)]/30 flex-shrink-0 hidden sm:block" />
                      <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0">
                        <AvatarFallback
                          style={{ backgroundColor: debt.to.avatarColor }}
                          className="text-white text-[10px] sm:text-xs font-semibold"
                        >
                          {debt.to.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`font-bold text-sm sm:text-base min-w-[60px] sm:min-w-[70px] text-right flex-shrink-0 ${
                        selectedDebt === idx ? "text-emerald-600" : "text-[var(--color-brand)]"
                      }`}>
                        {getCurrencySymbol()}{debt.amount.toFixed(0)}
                      </span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Manual Entry - Only show if no debts or if user wants to customize */}
          {(debts.length === 0 || selectedDebt === null || 
            (selectedDebt !== null && (parseFloat(amount) !== debts[selectedDebt]?.amount || fromMemberId !== debts[selectedDebt]?.from.memberId || toMemberId !== debts[selectedDebt]?.to.memberId))) && (
            <>
              {debts.length > 0 && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-black/5" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-3 text-[var(--color-navy)]/40">
                      Or enter manually
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm text-[var(--color-navy)]/70">From</Label>
                    <Select value={fromMemberId} onValueChange={setFromMemberId}>
                      <SelectTrigger className="h-10 rounded-lg border-black/10 text-sm">
                        <SelectValue placeholder="Who pays" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id} className="rounded-lg">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-4 h-4">
                                <AvatarFallback
                                  style={{ backgroundColor: member.avatarColor }}
                                  className="text-white text-[8px]"
                                >
                                  {member.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{member.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm text-[var(--color-navy)]/70">To</Label>
                    <Select value={toMemberId} onValueChange={setToMemberId}>
                      <SelectTrigger className="h-10 rounded-lg border-black/10 text-sm">
                        <SelectValue placeholder="Who receives" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id} className="rounded-lg">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-4 h-4">
                                <AvatarFallback
                                  style={{ backgroundColor: member.avatarColor }}
                                  className="text-white text-[8px]"
                                >
                                  {member.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{member.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm text-[var(--color-navy)]/70">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-[var(--color-navy)]">
                      {getCurrencySymbol()}
                    </span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-11 pl-8 text-lg font-semibold rounded-lg border-black/10"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm text-[var(--color-navy)]/70">
                    Notes <span className="text-[var(--color-navy)]/40 font-normal">(Optional)</span>
                  </Label>
                  <Textarea
                    placeholder="e.g., Paid via UPI"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="resize-none rounded-lg border-black/10"
                  />
                </div>
              </div>
            </>
          )}

          <DialogFooter className="pt-2 gap-2 flex-col sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="rounded-full w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !fromMemberId || !toMemberId || !amount}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 w-full sm:w-auto order-1 sm:order-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Payment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
