"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/app/utils/context";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { TripHeader } from "@/components/expense-tracker/trip-header";
import { ExpensesList } from "@/components/expense-tracker/expenses-list";
import { BalancesSidebar } from "@/components/expense-tracker/balances-sidebar";
import { AddExpenseModal } from "@/components/expense-tracker/add-expense-modal";
import { SettlementModal } from "@/components/expense-tracker/settlement-modal";
import { TripSettingsModal } from "@/components/expense-tracker/trip-settings-modal";
import { MembersModal } from "@/components/expense-tracker/members-modal";
import { AnalyticsSheet } from "@/components/expense-tracker/analytics-sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Receipt,
  ArrowRightLeft,
  ChevronLeft,
} from "lucide-react";

export default function TripDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.tripId as string;
  const { user, accessToken, loading } = useUser();

  const [trip, setTrip] = useState<any>(null);
  const [balances, setBalances] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("expenses");

  // Modal states
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  useEffect(() => {
    if (!loading && !accessToken) {
      router.push(`/sign-in?redirect=/expense-tracker/${tripId}`);
    }
  }, [loading, accessToken, router, tripId]);

  const fetchTrip = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/expenses/trips/${tripId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          router.push("/expense-tracker");
          return;
        }
        throw new Error(data.error);
      }

      setTrip(data.data);
    } catch (error) {
      console.error("Error fetching trip:", error);
    }
  }, [accessToken, tripId, router]);

  const fetchBalances = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/expenses/trips/${tripId}/balances`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const data = await response.json();

      if (data.success) {
        setBalances(data.data);
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  }, [accessToken, tripId]);

  const fetchAnalytics = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/expenses/trips/${tripId}/analytics`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  }, [accessToken, tripId]);

  useEffect(() => {
    if (accessToken) {
      setIsLoading(true);
      Promise.all([fetchTrip(), fetchBalances(), fetchAnalytics()]).finally(
        () => setIsLoading(false)
      );
    }
  }, [accessToken, fetchTrip, fetchBalances, fetchAnalytics]);

  const refreshData = () => {
    fetchTrip();
    fetchBalances();
    fetchAnalytics();
  };

  const handleExpenseAdded = () => {
    refreshData();
    setAddExpenseOpen(false);
    setEditingExpense(null);
  };

  const handleSettlementRecorded = () => {
    refreshData();
    setSettlementOpen(false);
  };

  const handleTripUpdated = (updatedTrip: any) => {
    setTrip(updatedTrip);
    setSettingsOpen(false);
  };

  const handleMembersUpdated = () => {
    refreshData();
  };

  const handleEditExpense = (expense: any) => {
    setEditingExpense(expense);
    setAddExpenseOpen(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/expenses/trips/${tripId}/expenses/${expenseId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        refreshData();
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  if (loading || !accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-muted border-t-[var(--color-brand)] animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoading || !trip) {
    return (
      <main className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex-1 pt-28 pb-12">
          <div className="mx-auto max-w-6xl px-6 space-y-6">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-48 w-full rounded-3xl" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // Find current user's member record
  const currentMember = trip.members.find(
    (m: any) => m.userId === user?.id || m.user?.id === user?.id
  );
  const isOwner = currentMember?.role === "OWNER";
  const isAdmin = currentMember?.role === "ADMIN" || isOwner;

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Navbar />
      
      {/* Content */}
      <div className="flex-1 pt-24 sm:pt-28 pb-8 sm:pb-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Back Link */}
          <Link 
            href="/expense-tracker"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[var(--color-navy)]/60 hover:text-[var(--color-navy)] mb-4 sm:mb-6 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Back to trips
          </Link>

          {/* Trip Header */}
          <TripHeader
            trip={trip}
            analytics={analytics}
            isOwner={isOwner}
            onSettingsClick={() => setSettingsOpen(true)}
            onMembersClick={() => setMembersOpen(true)}
            onAnalyticsClick={() => setAnalyticsOpen(true)}
          />

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            {/* Expenses Section */}
            <div className="lg:col-span-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 mb-5">
                  <TabsList className="bg-muted/50 p-1 rounded-full w-full sm:w-auto">
                    <TabsTrigger 
                      value="expenses" 
                      className="gap-1.5 sm:gap-2 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 sm:px-4 text-xs sm:text-sm flex-1 sm:flex-initial"
                    >
                      <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden xs:inline">Expenses</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="settlements" 
                      className="gap-1.5 sm:gap-2 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 sm:px-4 text-xs sm:text-sm flex-1 sm:flex-initial"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden xs:inline">Settlements</span>
                    </TabsTrigger>
                  </TabsList>
                  <Button
                    onClick={() => {
                      setEditingExpense(null);
                      setAddExpenseOpen(true);
                    }}
                    className="h-10 px-4 sm:px-5 rounded-full text-[var(--color-brand-contrast)] font-semibold text-sm shadow-sm hover:shadow-md transition-shadow w-full sm:w-auto"
                    style={{
                      background: "linear-gradient(180deg, var(--color-brand-start), var(--color-brand))",
                    }}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Expense
                  </Button>
                </div>

                <TabsContent value="expenses" className="mt-0">
                  <ExpensesList
                    expenses={trip.expenses}
                    members={trip.members}
                    categories={trip.categories}
                    currency={trip.currency}
                    onEdit={handleEditExpense}
                    onDelete={handleDeleteExpense}
                    currentUserId={user?.id}
                  />
                </TabsContent>

                <TabsContent value="settlements" className="mt-0">
                  <SettlementsList
                    settlements={trip.settlements}
                    currency={trip.currency}
                    onRecordSettlement={() => setSettlementOpen(true)}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Balances Sidebar */}
            <div>
              <BalancesSidebar
                balances={balances}
                currency={trip.currency}
                onSettleClick={() => setSettlementOpen(true)}
              />
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Modals */}
      <AddExpenseModal
        open={addExpenseOpen}
        onOpenChange={(open) => {
          setAddExpenseOpen(open);
          if (!open) setEditingExpense(null);
        }}
        tripId={tripId}
        members={trip.members}
        categories={trip.categories}
        currency={trip.currency}
        expense={editingExpense}
        onExpenseAdded={handleExpenseAdded}
      />

      <SettlementModal
        open={settlementOpen}
        onOpenChange={setSettlementOpen}
        tripId={tripId}
        members={trip.members}
        debts={balances?.debts || []}
        currency={trip.currency}
        onSettlementRecorded={handleSettlementRecorded}
      />

      <TripSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        trip={trip}
        isOwner={isOwner}
        onTripUpdated={handleTripUpdated}
      />

      <MembersModal
        open={membersOpen}
        onOpenChange={setMembersOpen}
        tripId={tripId}
        members={trip.members}
        inviteCode={trip.inviteCode}
        isAdmin={isAdmin}
        isOwner={isOwner}
        currentUserId={user?.id}
        onMembersUpdated={handleMembersUpdated}
      />

      <AnalyticsSheet
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
        analytics={analytics}
        trip={trip}
      />
    </main>
  );
}

// Settlements List Component
function SettlementsList({
  settlements,
  currency,
  onRecordSettlement,
}: {
  settlements: any[];
  currency: string;
  onRecordSettlement: () => void;
}) {
  const formatCurrency = (amount: number) => {
    const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency;
    return `${symbol}${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  };

  if (settlements.length === 0) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white p-8 sm:p-12 text-center">
        <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4 sm:mb-5">
          <ArrowRightLeft className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-600" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-[var(--color-navy)] mb-2">
          No settlements yet
        </h3>
        <p className="text-[var(--color-navy)]/60 text-xs sm:text-sm mb-5 sm:mb-6 px-4">
          When members pay each other back, record it here to keep balances updated.
        </p>
        <Button
          onClick={onRecordSettlement}
          className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 sm:px-6 text-sm"
        >
          Record Payment
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {settlements.map((settlement) => (
        <div
          key={settlement.id}
          className="rounded-2xl border border-black/5 bg-white p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium"
                style={{ backgroundColor: settlement.fromMember.avatarColor }}
              >
                {settlement.fromMember.name.charAt(0)}
              </div>
              <span className="text-[var(--color-navy)]/50 text-xs sm:text-sm">→</span>
              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium"
                style={{ backgroundColor: settlement.toMember.avatarColor }}
              >
                {settlement.toMember.name.charAt(0)}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[var(--color-navy)] text-xs sm:text-sm truncate">
                {settlement.fromMember.name} paid {settlement.toMember.name}
              </p>
              {settlement.notes && (
                <p className="text-[10px] sm:text-xs text-[var(--color-navy)]/50 truncate">{settlement.notes}</p>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0 w-full sm:w-auto flex sm:block items-center justify-between sm:justify-end">
            <p className="font-semibold text-[var(--color-brand)] text-sm sm:text-base">
              {formatCurrency(settlement.amount)}
            </p>
            <p className="text-[10px] sm:text-xs text-[var(--color-navy)]/40">
              {new Date(settlement.settledAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
