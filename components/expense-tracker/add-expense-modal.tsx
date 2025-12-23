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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  Loader2,
  Receipt,
  Users,
  Percent,
  Hash,
  DollarSign,
  Utensils,
  Car,
  Bed,
  Ticket,
  ShoppingBag,
  Mountain,
  Fuel,
  HelpCircle,
} from "lucide-react";

interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  members: any[];
  categories: any[];
  currency: string;
  expense?: any;
  onExpenseAdded: () => void;
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

export function AddExpenseModal({
  open,
  onOpenChange,
  tripId,
  members,
  categories,
  currency,
  expense,
  onExpenseAdded,
}: AddExpenseModalProps) {
  const { accessToken, user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [categoryId, setCategoryId] = useState<string>("");
  const [paidById, setPaidById] = useState<string>("");
  const [splitType, setSplitType] = useState<"EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES">("EQUAL");
  const [notes, setNotes] = useState("");

  // Split state
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

  const isEditing = !!expense;

  // Initialize form with expense data when editing
  useEffect(() => {
    if (expense) {
      setDescription(expense.description);
      setAmount(expense.amount.toString());
      setDate(new Date(expense.date));
      setCategoryId(expense.categoryId || "");
      setPaidById(expense.paidById);
      setSplitType(expense.splitType);
      setNotes(expense.notes || "");

      const memberIds = expense.splits.map((s: any) => s.memberId);
      setSelectedMembers(memberIds);

      const splits: Record<string, string> = {};
      expense.splits.forEach((s: any) => {
        if (expense.splitType === "EXACT") {
          splits[s.memberId] = s.amount.toString();
        } else if (expense.splitType === "PERCENTAGE") {
          splits[s.memberId] = (s.percentage || 0).toString();
        } else if (expense.splitType === "SHARES") {
          splits[s.memberId] = (s.shares || 1).toString();
        }
      });
      setCustomSplits(splits);
    } else {
      resetForm();
    }
  }, [expense, open]);

  // Set default paid by to current user's member ID
  useEffect(() => {
    if (!expense && members.length > 0 && user) {
      const currentMember = members.find(
        (m) => m.userId === user.id || m.user?.id === user.id
      );
      if (currentMember) {
        setPaidById(currentMember.id);
      } else {
        setPaidById(members[0].id);
      }
      setSelectedMembers(members.map((m) => m.id));
    }
  }, [members, user, expense, open]);

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setDate(new Date());
    setCategoryId("");
    setNotes("");
    setSplitType("EQUAL");
    setCustomSplits({});
    setError(null);
  };

  const getCurrencySymbol = () => {
    const symbols: Record<string, string> = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£",
    };
    return symbols[currency] || currency;
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const selectAllMembers = () => {
    setSelectedMembers(members.map((m) => m.id));
  };

  const calculateSplitPreview = () => {
    const totalAmount = parseFloat(amount) || 0;
    const activeMemberIds = selectedMembers;

    if (splitType === "EQUAL") {
      const perPerson = totalAmount / activeMemberIds.length;
      return activeMemberIds.map((id) => ({
        memberId: id,
        amount: Math.round(perPerson * 100) / 100,
      }));
    }

    if (splitType === "EXACT") {
      return activeMemberIds.map((id) => ({
        memberId: id,
        amount: parseFloat(customSplits[id]) || 0,
      }));
    }

    if (splitType === "PERCENTAGE") {
      return activeMemberIds.map((id) => ({
        memberId: id,
        amount: (totalAmount * (parseFloat(customSplits[id]) || 0)) / 100,
        percentage: parseFloat(customSplits[id]) || 0,
      }));
    }

    if (splitType === "SHARES") {
      const totalShares = activeMemberIds.reduce(
        (sum, id) => sum + (parseInt(customSplits[id]) || 1),
        0
      );
      return activeMemberIds.map((id) => {
        const shares = parseInt(customSplits[id]) || 1;
        return {
          memberId: id,
          amount: (totalAmount * shares) / totalShares,
          shares,
        };
      });
    }

    return [];
  };

  const validateSplits = () => {
    const totalAmount = parseFloat(amount) || 0;

    if (splitType === "EXACT") {
      const splitTotal = selectedMembers.reduce(
        (sum, id) => sum + (parseFloat(customSplits[id]) || 0),
        0
      );
      return Math.abs(splitTotal - totalAmount) < 0.01;
    }

    if (splitType === "PERCENTAGE") {
      const percentTotal = selectedMembers.reduce(
        (sum, id) => sum + (parseFloat(customSplits[id]) || 0),
        0
      );
      return Math.abs(percentTotal - 100) < 0.01;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError("Please enter a description");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (!paidById) {
      setError("Please select who paid");
      return;
    }

    if (selectedMembers.length === 0) {
      setError("Please select at least one person to split with");
      return;
    }

    if (!validateSplits()) {
      setError(
        splitType === "EXACT"
          ? "Split amounts must equal the total"
          : "Percentages must add up to 100%"
      );
      return;
    }

    setIsLoading(true);

    const splits = selectedMembers.map((memberId) => ({
      memberId,
      amount: splitType === "EXACT" ? parseFloat(customSplits[memberId]) || 0 : undefined,
      percentage: splitType === "PERCENTAGE" ? parseFloat(customSplits[memberId]) || 0 : undefined,
      shares: splitType === "SHARES" ? parseInt(customSplits[memberId]) || 1 : undefined,
    }));

    try {
      const url = isEditing
        ? `${process.env.NEXT_PUBLIC_URL}/api/expenses/trips/${tripId}/expenses/${expense.id}`
        : `${process.env.NEXT_PUBLIC_URL}/api/expenses/trips/${tripId}/expenses`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          description: description.trim(),
          amount: parseFloat(amount),
          currency,
          date: date.toISOString(),
          categoryId: categoryId || undefined,
          paidById,
          splitType,
          splits,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save expense");
      }

      onExpenseAdded();
      resetForm();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const splitPreview = calculateSplitPreview();
  const splitTotal = splitPreview.reduce((sum, s) => sum + s.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold text-[var(--color-navy)]">
            {isEditing ? "Edit Expense" : "Add Expense"}
          </DialogTitle>
          <DialogDescription className="text-[var(--color-navy)]/60">
            {isEditing ? "Update the expense details" : "Enter the expense details and split"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[calc(90vh-200px)]">
            <div className="px-6 pb-6 space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
                  {error}
                </div>
              )}

              {/* Description & Amount Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[var(--color-navy)]/80">Description *</Label>
                  <Input
                    placeholder="e.g., Dinner"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-11 rounded-xl border-black/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[var(--color-navy)]/80">Amount *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-navy)]/50 font-medium">
                      {getCurrencySymbol()}
                    </span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-11 pl-8 rounded-xl border-black/10"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {/* Category & Date Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[var(--color-navy)]/80">Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="h-11 rounded-xl border-black/10">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="rounded-lg">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center"
                              style={{
                                backgroundColor: `${cat.color}15`,
                                color: cat.color,
                              }}
                            >
                              {categoryIcons[cat.icon] || <Receipt className="h-3 w-3" />}
                            </div>
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[var(--color-navy)]/80">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-11 justify-start text-left font-normal rounded-xl border-black/10",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => d && setDate(d)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Paid By */}
              <div className="space-y-2">
                <Label className="text-[var(--color-navy)]/80">Paid by *</Label>
                <Select value={paidById} onValueChange={setPaidById}>
                  <SelectTrigger className="h-11 rounded-xl border-black/10">
                    <SelectValue placeholder="Who paid?" />
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

              {/* Split Type */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[var(--color-navy)]/80">Split between</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAllMembers}
                    className="h-7 text-xs rounded-full"
                  >
                    Select all
                  </Button>
                </div>

                <Tabs value={splitType} onValueChange={(v) => setSplitType(v as any)}>
                  <TabsList className="grid grid-cols-4 w-full rounded-full bg-muted/50 p-1">
                    <TabsTrigger value="EQUAL" className="gap-1 text-xs rounded-full data-[state=active]:bg-white">
                      <Users className="h-3 w-3" />
                      Equal
                    </TabsTrigger>
                    <TabsTrigger value="EXACT" className="gap-1 text-xs rounded-full data-[state=active]:bg-white">
                      <DollarSign className="h-3 w-3" />
                      Exact
                    </TabsTrigger>
                    <TabsTrigger value="PERCENTAGE" className="gap-1 text-xs rounded-full data-[state=active]:bg-white">
                      <Percent className="h-3 w-3" />
                      %
                    </TabsTrigger>
                    <TabsTrigger value="SHARES" className="gap-1 text-xs rounded-full data-[state=active]:bg-white">
                      <Hash className="h-3 w-3" />
                      Shares
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-3 space-y-2">
                    {members.map((member) => {
                      const isSelected = selectedMembers.includes(member.id);
                      const preview = splitPreview.find((s) => s.memberId === member.id);

                      return (
                        <div
                          key={member.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                            isSelected
                              ? "bg-[var(--color-brand)]/5 border-[var(--color-brand)]/20"
                              : "bg-muted/30 border-transparent"
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleMember(member.id)}
                          />
                          <Avatar className="w-7 h-7">
                            <AvatarFallback
                              style={{ backgroundColor: member.avatarColor }}
                              className="text-white text-xs"
                            >
                              {member.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="flex-1 font-medium text-sm text-[var(--color-navy)]">
                            {member.name}
                          </span>

                          {isSelected && splitType !== "EQUAL" && (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={customSplits[member.id] || ""}
                                onChange={(e) =>
                                  setCustomSplits((prev) => ({
                                    ...prev,
                                    [member.id]: e.target.value,
                                  }))
                                }
                                className="w-16 h-7 text-sm text-right rounded-lg border-black/10"
                                placeholder={splitType === "SHARES" ? "1" : "0"}
                                min="0"
                                step={splitType === "SHARES" ? "1" : "0.01"}
                              />
                              <span className="text-xs text-[var(--color-navy)]/50 w-5">
                                {splitType === "PERCENTAGE" ? "%" : splitType === "SHARES" ? "×" : getCurrencySymbol()}
                              </span>
                            </div>
                          )}

                          {isSelected && (
                            <span className="text-sm font-medium text-[var(--color-navy)]/60 min-w-[50px] text-right">
                              {getCurrencySymbol()}{(preview?.amount || 0).toFixed(0)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Split Summary */}
                  {amount && parseFloat(amount) > 0 && (
                    <div className="mt-3 p-3 bg-muted/30 rounded-xl flex items-center justify-between">
                      <span className="text-sm text-[var(--color-navy)]/60">Total</span>
                      <span
                        className={cn(
                          "font-semibold",
                          Math.abs(splitTotal - parseFloat(amount)) > 0.01
                            ? "text-red-500"
                            : "text-emerald-600"
                        )}
                      >
                        {getCurrencySymbol()}{splitTotal.toFixed(2)} / {getCurrencySymbol()}{parseFloat(amount).toFixed(2)}
                      </span>
                    </div>
                  )}
                </Tabs>
              </div>

              {/* Notes */}
              {/* <div className="space-y-2">
                <Label className="text-[var(--color-navy)]/80">Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="resize-none rounded-xl border-black/10"
                />
              </div> */}
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 border-t border-black/5 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="rounded-full"
            >
              Cancel
            </Button>
            
          </DialogFooter>
          <Button
              type="submit"
              disabled={isLoading}
              className="rounded-full text-[var(--color-brand-contrast)] font-medium"
              style={{
                background: "linear-gradient(180deg, var(--color-brand-start), var(--color-brand))",
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Adding..."}
                </>
              ) : isEditing ? (
                "Update Expense"
              ) : (
                "Add Expense"
              )}
            </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
