"use client";

import { useState } from "react";
import { useUser } from "@/app/utils/context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Users,
  UserPlus,
  Copy,
  Check,
  MoreVertical,
  Crown,
  Shield,
  Trash2,
  Link2,
} from "lucide-react";

interface MembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  members: any[];
  inviteCode: string;
  isAdmin: boolean;
  isOwner: boolean;
  currentUserId?: string;
  onMembersUpdated: () => void;
}

export function MembersModal({
  open,
  onOpenChange,
  tripId,
  members,
  inviteCode,
  isAdmin,
  isOwner,
  currentUserId,
  onMembersUpdated,
}: MembersModalProps) {
  const { accessToken } = useUser();
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [removeMember, setRemoveMember] = useState<any | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyInviteLink = async () => {
    const inviteUrl = `${window.location.origin}/expense-tracker?join=${inviteCode}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!guestName.trim()) {
      setError("Please enter a name");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/expenses/trips/${tripId}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: guestName.trim(),
            isGuest: true,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add guest");
      }

      setGuestName("");
      setIsAddingGuest(false);
      onMembersUpdated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMember) return;

    setIsRemoving(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/expenses/trips/${tripId}/members/${removeMember.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        onMembersUpdated();
      }
    } catch (error) {
      console.error("Error removing member:", error);
    } finally {
      setIsRemoving(false);
      setRemoveMember(null);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/expenses/trips/${tripId}/members/${memberId}/role`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ role: newRole }),
        }
      );
      onMembersUpdated();
    } catch (error) {
      console.error("Error changing role:", error);
    }
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "OWNER":
        return { label: "Owner", icon: <Crown className="h-3 w-3" />, color: "bg-amber-50 text-amber-700 border-amber-200" };
      case "ADMIN":
        return { label: "Admin", icon: <Shield className="h-3 w-3" />, color: "bg-blue-50 text-blue-700 border-blue-200" };
      default:
        return null;
    }
  };

  // Sort: Owner first, then admins, then others
  const sortedMembers = [...members].sort((a, b) => {
    const order = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
    return (order[a.role as keyof typeof order] || 2) - (order[b.role as keyof typeof order] || 2);
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[440px] rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--color-brand)]/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-[var(--color-brand)]" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-[var(--color-navy)]">
                  Trip Members
                </DialogTitle>
                <DialogDescription className="text-[var(--color-navy)]/60">
                  {members.length} member{members.length !== 1 ? "s" : ""} in this trip
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Invite Section */}
          <div className="px-6 pb-4">
            <div className="p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--color-navy)]">Invite Link</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyInviteLink}
                  className="h-7 text-xs rounded-full"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-emerald-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Link2 className="h-3 w-3 mr-1" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-[var(--color-navy)]/50">
                Share this link to invite others to join the trip.
              </p>
            </div>
          </div>

          {/* Members List */}
          <ScrollArea className="max-h-[300px]">
            <div className="px-6 pb-2 space-y-1">
              {sortedMembers.map((member) => {
                const isCurrentUser = member.userId === currentUserId || member.user?.id === currentUserId;
                const roleDisplay = getRoleDisplay(member.role);
                const canManage = isOwner || (isAdmin && member.role !== "OWNER");

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors"
                  >
                    <Avatar className="w-9 h-9">
                      <AvatarFallback
                        style={{ backgroundColor: member.avatarColor }}
                        className="text-white text-sm font-medium"
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--color-navy)] text-sm truncate">
                          {member.name}
                        </span>
                        {isCurrentUser && (
                          <span className="text-xs text-[var(--color-navy)]/40">(you)</span>
                        )}
                        {member.isGuest && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 rounded-full">
                            Guest
                          </Badge>
                        )}
                      </div>
                      {member.user?.email && (
                        <p className="text-xs text-[var(--color-navy)]/50 truncate">
                          {member.user.email}
                        </p>
                      )}
                    </div>
                    {roleDisplay && (
                      <Badge variant="outline" className={`text-[10px] h-5 gap-1 rounded-full ${roleDisplay.color}`}>
                        {roleDisplay.icon}
                        {roleDisplay.label}
                      </Badge>
                    )}
                    {canManage && member.role !== "OWNER" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                            <MoreVertical className="h-4 w-4 text-[var(--color-navy)]/40" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl w-40">
                          {isOwner && member.role !== "ADMIN" && (
                            <DropdownMenuItem
                              onClick={() => handleChangeRole(member.id, "ADMIN")}
                              className="rounded-lg"
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Make Admin
                            </DropdownMenuItem>
                          )}
                          {isOwner && member.role === "ADMIN" && (
                            <DropdownMenuItem
                              onClick={() => handleChangeRole(member.id, "MEMBER")}
                              className="rounded-lg"
                            >
                              Remove Admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setRemoveMember(member)}
                            className="text-red-600 focus:text-red-600 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Add Guest Section */}
          <div className="p-6 pt-4 border-t border-black/5">
            {isAddingGuest ? (
              <form onSubmit={handleAddGuest} className="space-y-3">
                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}
                <div className="space-y-2">
                  <Label className="text-[var(--color-navy)]/80 text-sm">Guest Name</Label>
                  <Input
                    placeholder="Enter guest name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="h-10 rounded-xl border-black/10"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingGuest(false);
                      setGuestName("");
                      setError(null);
                    }}
                    className="flex-1 rounded-full"
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 rounded-full text-[var(--color-brand-contrast)]"
                    style={{
                      background: "linear-gradient(180deg, var(--color-brand-start), var(--color-brand))",
                    }}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Add Guest"
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                onClick={() => setIsAddingGuest(true)}
                variant="outline"
                className="w-full rounded-full border-dashed"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Guest Member
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeMember} onOpenChange={() => setRemoveMember(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removeMember?.name} from this trip?
              {removeMember?.isGuest ? " As a guest, they cannot rejoin on their own." : " They can rejoin using the invite code."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving} className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="rounded-full bg-red-500 hover:bg-red-600"
            >
              {isRemoving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
