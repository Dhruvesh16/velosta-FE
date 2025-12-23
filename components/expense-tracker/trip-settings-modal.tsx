"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/app/utils/context";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  MapPin,
  Wallet,
  Loader2,
  Settings,
  Trash2,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { DateRange } from "react-day-picker";

interface TripSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: any;
  isOwner: boolean;
  onTripUpdated: (trip: any) => void;
}

const currencies = [
  { code: "INR", symbol: "₹" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "AUD", symbol: "A$" },
  { code: "SGD", symbol: "S$" },
  { code: "THB", symbol: "฿" },
  { code: "JPY", symbol: "¥" },
];

export function TripSettingsModal({
  open,
  onOpenChange,
  trip,
  isOwner,
  onTripUpdated,
}: TripSettingsModalProps) {
  const { accessToken } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [destination, setDestination] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [totalBudget, setTotalBudget] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    if (trip && open) {
      setName(trip.name);
      setDescription(trip.description || "");
      setDestination(trip.destination || "");
      setCurrency(trip.currency);
      setTotalBudget(trip.totalBudget?.toString() || "");
      setInviteCode(trip.inviteCode);
      if (trip.startDate && trip.endDate) {
        setDateRange({
          from: new Date(trip.startDate),
          to: new Date(trip.endDate),
        });
      } else {
        setDateRange(undefined);
      }
      setError(null);
    }
  }, [trip, open]);

  const copyInviteCode = async () => {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateCode = async () => {
    setIsRegenerating(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/expenses/trips/${trip.id}/regenerate-code`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setInviteCode(data.data.inviteCode);
      }
    } catch (error) {
      console.error("Error regenerating code:", error);
    } finally {
      setIsRegenerating(false);
    }
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
        `${process.env.NEXT_PUBLIC_URL}/api/expenses/trips/${trip.id}`,
        {
          method: "PUT",
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
        throw new Error(data.error || "Failed to update trip");
      }

      onTripUpdated({ ...trip, ...data.data, inviteCode });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/expenses/trips/${trip.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        router.push("/expense-tracker");
      }
    } catch (error) {
      console.error("Error deleting trip:", error);
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Settings className="h-5 w-5 text-[var(--color-navy)]/60" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-[var(--color-navy)]">
                  Trip Settings
                </DialogTitle>
                <DialogDescription className="text-[var(--color-navy)]/60">
                  Update trip details and settings.
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

            {/* Invite Code */}
            <div className="p-4 bg-muted/30 rounded-xl space-y-2">
              <Label className="text-[var(--color-navy)]/60 text-xs">Invite Code</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-10 px-4 bg-white rounded-lg border border-black/10 flex items-center justify-center font-mono text-lg tracking-widest text-[var(--color-navy)]">
                  {inviteCode}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyInviteCode}
                  className="h-10 w-10 rounded-lg border-black/10"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                {isOwner && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleRegenerateCode}
                    disabled={isRegenerating}
                    className="h-10 w-10 rounded-lg border-black/10"
                  >
                    <RefreshCw className={cn("h-4 w-4", isRegenerating && "animate-spin")} />
                  </Button>
                )}
              </div>
            </div>

            {/* Trip Name */}
            <div className="space-y-2">
              <Label className="text-[var(--color-navy)]/80">Trip Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl border-black/10"
              />
            </div>

            {/* Destination & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[var(--color-navy)]/80">Destination</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-navy)]/40" />
                  <Input
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
                        {c.symbol} {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-2">
              <Label className="text-[var(--color-navy)]/80">Total Budget</Label>
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-navy)]/40" />
                <Input
                  type="number"
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
              <Label className="text-[var(--color-navy)]/80">Trip Dates</Label>
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
                      <span>Select dates</span>
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
              <Label className="text-[var(--color-navy)]/80">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="resize-none rounded-xl border-black/10"
              />
            </div>

            {/* Delete */}
            {isOwner && (
              <div className="pt-4 border-t border-black/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-600 text-sm">Delete Trip</p>
                    <p className="text-xs text-[var(--color-navy)]/50">
                      This will archive the trip.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirm(true)}
                    className="text-red-600 border-red-200 hover:bg-red-50 rounded-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            )}

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
                className="rounded-full text-[var(--color-brand-contrast)] font-medium"
                style={{
                  background: "linear-gradient(180deg, var(--color-brand-start), var(--color-brand))",
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive "{trip?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-full bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Trip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
