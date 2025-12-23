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
      <DialogContent className="sm:max-w-[480px] rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-[var(--color-navy)]">
                Record Settlement
              </DialogTitle>
              <DialogDescription className="text-[var(--color-navy)]/60">
                Record a payment between members.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          {/* Quick Select from Suggested Debts */}
          {debts.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[var(--color-navy)]/80">Suggested</Label>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {debts.map((debt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectDebt(idx)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      selectedDebt === idx
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-black/5 hover:border-black/10 hover:bg-muted/30"
                    }`}
                  >
                    <Avatar className="w-7 h-7">
                      <AvatarFallback
                        style={{ backgroundColor: debt.from.avatarColor }}
                        className="text-white text-xs font-medium"
                      >
                        {debt.from.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="text-sm text-[var(--color-navy)]">
                        <span className="font-medium">{debt.from.name}</span>
                        <span className="text-[var(--color-navy)]/50"> pays </span>
                        <span className="font-medium">{debt.to.name}</span>
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[var(--color-navy)]/30" />
                    <Avatar className="w-7 h-7">
                      <AvatarFallback
                        style={{ backgroundColor: debt.to.avatarColor }}
                        className="text-white text-xs font-medium"
                      >
                        {debt.to.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-emerald-600 min-w-[60px] text-right">
                      {getCurrencySymbol()}{debt.amount.toFixed(0)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {debts.length > 0 && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-black/5" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-[var(--color-navy)]/40">
                  Or enter manually
                </span>
              </div>
            </div>
          )}

          {/* Manual Entry */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[var(--color-navy)]/80">From</Label>
              <Select value={fromMemberId} onValueChange={setFromMemberId}>
                <SelectTrigger className="h-11 rounded-xl border-black/10">
                  <SelectValue placeholder="Who pays" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id} className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarFallback
                            style={{ backgroundColor: member.avatarColor }}
                            className="text-white text-[10px]"
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {member.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--color-navy)]/80">To</Label>
              <Select value={toMemberId} onValueChange={setToMemberId}>
                <SelectTrigger className="h-11 rounded-xl border-black/10">
                  <SelectValue placeholder="Who receives" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id} className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarFallback
                            style={{ backgroundColor: member.avatarColor }}
                            className="text-white text-[10px]"
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {member.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[var(--color-navy)]/80">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-navy)]/50 font-medium">
                {getCurrencySymbol()}
              </span>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 pl-8 text-lg font-medium rounded-xl border-black/10"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[var(--color-navy)]/80">Notes (Optional)</Label>
            <Textarea
              placeholder="e.g., Paid via UPI"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none rounded-xl border-black/10"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Settlement"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
