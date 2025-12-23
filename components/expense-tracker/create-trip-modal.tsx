"use client";

import { useState } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  MapPin,
  Wallet,
  Loader2,
} from "lucide-react";
import { DateRange } from "react-day-picker";

interface CreateTripModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTripCreated: (trip: any) => void;
}

const currencies = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
];

export function CreateTripModal({
  open,
  onOpenChange,
  onTripCreated,
}: CreateTripModalProps) {
  const { accessToken } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [destination, setDestination] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [totalBudget, setTotalBudget] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const resetForm = () => {
    setName("");
    setDescription("");
    setDestination("");
    setCurrency("INR");
    setTotalBudget("");
    setDateRange(undefined);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter a trip name");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/expenses/trips`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
            destination: destination.trim() || undefined,
            currency,
            totalBudget: totalBudget ? parseFloat(totalBudget) : undefined,
            startDate: dateRange?.from?.toISOString(),
            endDate: dateRange?.to?.toISOString(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create trip");
      }

      onTripCreated(data.data);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold text-[var(--color-navy)]">
            Create New Trip
          </DialogTitle>
          <DialogDescription className="text-[var(--color-navy)]/60">
            Set up your trip details and start tracking expenses.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          {/* Trip Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[var(--color-navy)]/80">
              Trip Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Goa Beach Trip 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl border-black/10"
            />
          </div>

          {/* Destination & Currency Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[var(--color-navy)]/80">Destination</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-navy)]/40" />
                <Input
                  placeholder="e.g., Goa, India"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="h-11 pl-9 rounded-xl border-black/10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--color-navy)]/80">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-11 rounded-xl border-black/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code} className="rounded-lg">
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{c.symbol}</span>
                        <span>{c.code}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-2">
            <Label className="text-[var(--color-navy)]/80">Total Budget (Optional)</Label>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-navy)]/40" />
              <Input
                type="number"
                placeholder="Enter total trip budget"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                className="h-11 pl-9 rounded-xl border-black/10"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-[var(--color-navy)]/80">Trip Dates (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-11 justify-start text-left font-normal rounded-xl border-black/10",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Select trip dates</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-[var(--color-navy)]/80">Description (Optional)</Label>
            <Textarea
              placeholder="Add any notes about your trip..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none rounded-xl border-black/10"
            />
          </div>

          <DialogFooter className="pt-4 gap-2">
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
              className="rounded-full text-[var(--color-brand-contrast)] font-medium"
              style={{
                background: "linear-gradient(180deg, var(--color-brand-start), var(--color-brand))",
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Trip"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
