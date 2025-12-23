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
import { format, isToday, isYesterday, isTomorrow } from "date-fns";
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
  ChevronDown,
  ChevronUp,
  Sparkles,
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
  
  // Split state
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  
  // UI state
  const [showAdvancedSplit, setShowAdvancedSplit] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
      
      // Show advanced options if not equal split
      setShowAdvancedSplit(expense.splitType !== "EQUAL");
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
    setSplitType("EQUAL");
    setCustomSplits({});
    setShowAdvancedSplit(false);
    setShowDatePicker(false);
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
      setError("Please enter what you spent on");
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
  const isDateToday = isToday(date);
  const isDateYesterday = isYesterday(date);
  const isDateTomorrow = isTomorrow(date);
  
  const getDateLabel = () => {
    if (isDateToday) return "Today";
    if (isDateYesterday) return "Yesterday";
    if (isDateTomorrow) return "Tomorrow";
    return format(date, "MMM d, yyyy");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[520px] max-h-[90vh] rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
          <DialogTitle className="text-lg sm:text-xl font-semibold text-[var(--color-navy)]">
            {isEditing ? "Edit Expense" : "Add Expense"}
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--color-navy)]/60">
            {isEditing ? "Update expense details" : "Quickly add what you spent"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[calc(90vh-180px)] sm:max-h-[calc(90vh-200px)]">
            <div className="px-4 sm:px-6 pb-20 sm:pb-24 space-y-4 sm:space-y-5">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
                  {error}
                </div>
              )}

              {/* Main Fields - Description & Amount */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[var(--color-navy)]/70">
                    What did you spend on?
                  </Label>
                  <Input
                    placeholder="e.g., Dinner at restaurant"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-12 text-base rounded-xl border-black/10 focus:border-[var(--color-brand)]/50"
                    autoFocus
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[var(--color-navy)]/70">
                    How much?
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-[var(--color-navy)]">
                      {getCurrencySymbol()}
                    </span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-12 pl-10 text-lg font-semibold rounded-xl border-black/10 focus:border-[var(--color-brand)]/50"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Info Row - Paid By, Date, Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-2">
                {/* Paid By */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-[var(--color-navy)]/60">Paid by</Label>
                  <Select value={paidById} onValueChange={setPaidById}>
                    <SelectTrigger className="h-10 rounded-lg border-black/10 text-sm">
                      <SelectValue />
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

                {/* Date - Simplified */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-[var(--color-navy)]/60">Date</Label>
                  {!showDatePicker && !isDateToday ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDatePicker(true)}
                      className="h-10 w-full justify-start text-sm rounded-lg border-black/10"
                    >
                      {getDateLabel()}
                    </Button>
                  ) : (
                    <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 w-full justify-start text-sm rounded-lg border-black/10"
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {getDateLabel()}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(d) => {
                            if (d) {
                              setDate(d);
                              setShowDatePicker(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {/* Category - Optional Quick Pick */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-[var(--color-navy)]/60">Category</Label>
                  <Select 
                    value={categoryId || undefined} 
                    onValueChange={(v) => {
                      // Handle clearing: if value is "__none__", set to empty string
                      setCategoryId(v === "__none__" ? "" : v);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-lg border-black/10 text-sm">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl z-[100]">
                      {categoryId && (
                        <SelectItem value="__none__" className="rounded-lg text-[var(--color-navy)]/50">
                          <span className="text-sm">No category</span>
                        </SelectItem>
                      )}
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="rounded-lg">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center"
                              style={{
                                backgroundColor: `${cat.color}15`,
                                color: cat.color,
                              }}
                            >
                              {categoryIcons[cat.icon] || <Receipt className="h-2.5 w-2.5" />}
                            </div>
                            <span className="text-sm">{cat.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Split Section - Simplified */}
              <div className="space-y-3 pt-2 border-t border-black/5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-[var(--color-navy)]/70">
                    Split between
                  </Label>
                  {selectedMembers.length < members.length && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={selectAllMembers}
                      className="h-7 text-xs rounded-full text-[var(--color-brand)] hover:text-[var(--color-brand)]"
                    >
                      Select all
                    </Button>
                  )}
                </div>

                {/* Simple Equal Split View (Default) */}
                {!showAdvancedSplit && splitType === "EQUAL" && (
                  <>
                    <div className="space-y-2">
                      {members.map((member) => {
                        const isSelected = selectedMembers.includes(member.id);
                        const preview = splitPreview.find((s) => s.memberId === member.id);

                        return (
                          <div
                            key={member.id}
                            className={cn(
                              "flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer",
                              isSelected
                                ? "bg-[var(--color-brand)]/5 border-[var(--color-brand)]/30"
                                : "bg-muted/30 border-transparent hover:bg-muted/50"
                            )}
                            onClick={() => toggleMember(member.id)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleMember(member.id)}
                              className="pointer-events-none"
                            />
                            <Avatar className="w-7 h-7">
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
                            {isSelected && amount && (
                              <span className="text-sm font-semibold text-[var(--color-brand)]">
                                {getCurrencySymbol()}{(preview?.amount || 0).toFixed(0)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Split Summary */}
                    {amount && parseFloat(amount) > 0 && selectedMembers.length > 0 && (
                      <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-center justify-between">
                        <span className="text-sm text-[var(--color-navy)]/70">
                          {selectedMembers.length} {selectedMembers.length === 1 ? "person" : "people"} × {getCurrencySymbol()}{(parseFloat(amount) / selectedMembers.length).toFixed(0)}
                        </span>
                        <span className="font-semibold text-emerald-600">
                          {getCurrencySymbol()}{splitTotal.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* Advanced Split Toggle */}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowAdvancedSplit(true);
                        setSplitType("EXACT");
                      }}
                      className="w-full h-9 text-xs rounded-lg text-[var(--color-navy)]/60 hover:text-[var(--color-navy)] hover:bg-muted/50"
                    >
                      <Sparkles className="h-3 w-3 mr-1.5" />
                      Custom split amounts
                      <ChevronDown className="h-3 w-3 ml-auto" />
                    </Button>
                  </>
                )}

                {/* Advanced Split View */}
                {showAdvancedSplit && (
                  <>
                    <Tabs value={splitType} onValueChange={(v) => setSplitType(v as any)}>
                      <TabsList className="grid grid-cols-4 w-full rounded-lg bg-muted/50 p-1 h-9">
                        <TabsTrigger value="EQUAL" className="text-xs rounded-md data-[state=active]:bg-white">
                          Equal
                        </TabsTrigger>
                        <TabsTrigger value="EXACT" className="text-xs rounded-md data-[state=active]:bg-white">
                          Exact
                        </TabsTrigger>
                        <TabsTrigger value="PERCENTAGE" className="text-xs rounded-md data-[state=active]:bg-white">
                          %
                        </TabsTrigger>
                        <TabsTrigger value="SHARES" className="text-xs rounded-md data-[state=active]:bg-white">
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
                                "flex items-center gap-3 p-2.5 rounded-lg border transition-colors",
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
                                <span className="text-sm font-medium text-[var(--color-brand)] min-w-[50px] text-right">
                                  {getCurrencySymbol()}{(preview?.amount || 0).toFixed(0)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Split Summary */}
                      {amount && parseFloat(amount) > 0 && (
                        <div className={cn(
                          "mt-3 p-3 rounded-lg flex items-center justify-between",
                          Math.abs(splitTotal - parseFloat(amount)) > 0.01
                            ? "bg-red-50 border border-red-100"
                            : "bg-emerald-50/50 border border-emerald-100"
                        )}>
                          <span className="text-sm text-[var(--color-navy)]/70">Total</span>
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

                    {/* Collapse Advanced */}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowAdvancedSplit(false);
                        setSplitType("EQUAL");
                      }}
                      className="w-full h-9 text-xs rounded-lg text-[var(--color-navy)]/60 hover:text-[var(--color-navy)] hover:bg-muted/50"
                    >
                      <ChevronUp className="h-3 w-3 mr-1.5" />
                      Use equal split
                    </Button>
                  </>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-3 sm:p-4 border-t border-black/5 gap-2 bg-background relative z-10 flex-col sm:flex-row">
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
              disabled={isLoading}
              className="rounded-full text-[var(--color-brand-contrast)] font-medium px-6 relative z-10 w-full sm:w-auto order-1 sm:order-2"
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
                "Update"
              ) : (
                "Add Expense"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
