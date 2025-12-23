"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Users, Ticket, CheckCircle2 } from "lucide-react";

interface JoinTripModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTripJoined: () => void;
}

export function JoinTripModal({
  open,
  onOpenChange,
  onTripJoined,
}: JoinTripModalProps) {
  const { accessToken } = useUser();
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ tripId: string; message: string } | null>(null);

  const resetForm = () => {
    setInviteCode("");
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!inviteCode.trim()) {
      setError("Please enter an invite code");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/expenses/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            inviteCode: inviteCode.trim().toUpperCase(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join trip");
      }

      setSuccess({
        tripId: data.data.id,
        message: data.message || "Successfully joined the trip!",
      });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToTrip = () => {
    if (success?.tripId) {
      onTripJoined();
      router.push(`/expense-tracker/${success.tripId}`);
      resetForm();
    }
  };

  const handleClose = () => {
    if (success) {
      onTripJoined();
    }
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px] rounded-3xl">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-[var(--color-brand)]/10 flex items-center justify-center mb-3">
            <Users className="h-5 w-5 text-[var(--color-brand)]" />
          </div>
          <DialogTitle className="text-xl font-semibold text-[var(--color-navy)]">
            Join a Trip
          </DialogTitle>
          <DialogDescription className="text-[var(--color-navy)]/60">
            Enter the invite code shared by your trip organizer.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-2">
                You're in!
              </h3>
              <p className="text-[var(--color-navy)]/60 text-sm mb-6">{success.message}</p>
              <Button
                onClick={handleGoToTrip}
                className="w-full rounded-full text-[var(--color-brand-contrast)] font-medium"
                style={{
                  background: "linear-gradient(180deg, var(--color-brand-start), var(--color-brand))",
                }}
              >
                Go to Trip
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[var(--color-navy)]/80">Invite Code</Label>
              <div className="relative">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-navy)]/40" />
                <Input
                  placeholder="ABCD1234"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase().slice(0, 8))}
                  className="h-12 pl-9 text-center text-lg font-mono tracking-widest uppercase rounded-xl border-black/10"
                  maxLength={8}
                />
              </div>
              <p className="text-xs text-[var(--color-navy)]/50 text-center">
                The code looks like: ABCD1234
              </p>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                type="submit"
                disabled={isLoading || inviteCode.length < 8}
                className="w-full rounded-full text-[var(--color-brand-contrast)] font-medium"
                style={{
                  background: "linear-gradient(180deg, var(--color-brand-start), var(--color-brand))",
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Trip"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isLoading}
                className="w-full rounded-full"
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
