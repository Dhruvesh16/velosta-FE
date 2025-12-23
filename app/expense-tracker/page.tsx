"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/utils/context";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { TripsList } from "@/components/expense-tracker/trips-list";
import { CreateTripModal } from "@/components/expense-tracker/create-trip-modal";
import { JoinTripModal } from "@/components/expense-tracker/join-trip-modal";
import { Button } from "@/components/ui/button";
import { Plus, Users, Wallet, Receipt } from "lucide-react";

export default function ExpenseTrackerPage() {
  const router = useRouter();
  const { user, accessToken, loading } = useUser();
  const [trips, setTrips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && !accessToken) {
      router.push("/sign-in?redirect=/expense-tracker");
    }
  }, [loading, accessToken, router]);

  useEffect(() => {
    if (accessToken) {
      fetchTrips();
    }
  }, [accessToken]);

  const fetchTrips = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/expenses/trips`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setTrips(data.data);
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTripCreated = (trip: any) => {
    setTrips((prev) => [trip, ...prev]);
    setCreateModalOpen(false);
  };

  const handleTripJoined = () => {
    fetchTrips();
    setJoinModalOpen(false);
  };

  if (loading || !accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-muted border-t-[var(--color-brand)] animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalTrips = trips.length;
  const totalSpent = trips.reduce((sum, t) => sum + (t.totalSpent || 0), 0);
  const activeTrips = trips.filter(
    (t) => new Date(t.endDate) >= new Date() || !t.endDate
  ).length;

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 bg-[var(--color-cream)]">
        <div className="mx-auto max-w-6xl px-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <p className="text-sm text-[var(--color-navy)]/60 mb-2">
                Track & split expenses
              </p>
              <h1 className="text-3xl md:text-4xl font-semibold text-[var(--color-navy)]">
                Expense Tracker
              </h1>
              <p className="mt-3 text-[var(--color-navy)]/70 max-w-md">
                Split expenses with your travel companions. No more awkward 
                conversations about who owes what.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setJoinModalOpen(true)}
                variant="outline"
                className="h-10 px-5 rounded-full border-[var(--color-navy)]/20 text-[var(--color-navy)] hover:bg-[var(--color-navy)]/5"
              >
                <Users className="mr-2 h-4 w-4" />
                Join Trip
              </Button>
              <Button
                onClick={() => setCreateModalOpen(true)}
                className="h-10 px-5 rounded-full text-[var(--color-brand-contrast)] font-semibold"
                style={{
                  background: "linear-gradient(180deg, var(--color-brand-start), var(--color-brand))",
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Trip
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={<Receipt className="h-5 w-5" />}
              label="Total Trips"
              value={totalTrips.toString()}
            />
            <StatCard
              icon={<Wallet className="h-5 w-5" />}
              label="Total Spent"
              value={`₹${totalSpent.toLocaleString("en-IN")}`}
            />
            <StatCard
              icon={<Users className="h-5 w-5" />}
              label="Active Trips"
              value={activeTrips.toString()}
            />
          </div>
        </div>
      </section>

      {/* Trips List Section */}
      <section className="flex-1 py-12 bg-background">
        <div className="mx-auto max-w-6xl px-6">
          <TripsList
            trips={trips}
            isLoading={isLoading}
            onCreateClick={() => setCreateModalOpen(true)}
          />
        </div>
      </section>

      <Footer />

      {/* Modals */}
      <CreateTripModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onTripCreated={handleTripCreated}
      />
      <JoinTripModal
        open={joinModalOpen}
        onOpenChange={setJoinModalOpen}
        onTripJoined={handleTripJoined}
      />
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm border border-black/5">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-brand)]/10 text-[var(--color-brand)]">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-[var(--color-navy)]">{value}</p>
        <p className="text-sm text-[var(--color-navy)]/60">{label}</p>
      </div>
    </div>
  );
}
