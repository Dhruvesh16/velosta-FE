"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import {
  Plus,
  Users,
  Receipt,
  Trash2,
  ArrowRight,
  Wallet,
  Check,
  X,
  Mail,
  Sparkles,
} from "lucide-react";
import { useUser } from "@/app/utils/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import Navbar from "@/components/navbar";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

/* ──────────────────────────────────────────────────────────── */
/* Types                                                        */
/* ──────────────────────────────────────────────────────────── */
type Member = {
  id: string;
  name: string;
  email: string;
};

type Expense = {
  id: string;
  payerId: string;
  amount: number;
  description: string;
  createdAt: string;
};

type Trip = {
  id: string;
  name: string;
  members: Member[];
  expenses: Expense[];
  createdAt: string;
};

const STORAGE_KEY = "velosta-cost-splitter-v1";

/* ──────────────────────────────────────────────────────────── */
/* Persistence                                                  */
/* ──────────────────────────────────────────────────────────── */
function loadTrips(): Trip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTrips(trips: Trip[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  } catch {
    /* quota / private mode — silently ignore */
  }
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

/* ──────────────────────────────────────────────────────────── */
/* Settlement algorithm — minimal transfers                     */
/* ──────────────────────────────────────────────────────────── */
type Settlement = { from: string; to: string; amount: number };

function computeBalances(trip: Trip): Record<string, number> {
  const n = trip.members.length;
  if (n === 0) return {};
  const total = trip.expenses.reduce((s, e) => s + e.amount, 0);
  const equalShare = total / n;
  const balances: Record<string, number> = {};
  trip.members.forEach((m) => (balances[m.id] = -equalShare));
  trip.expenses.forEach((e) => {
    balances[e.payerId] = (balances[e.payerId] ?? 0) + e.amount;
  });
  // Round to 2 decimals
  Object.keys(balances).forEach((k) => {
    balances[k] = Math.round(balances[k] * 100) / 100;
  });
  return balances;
}

function computeSettlements(trip: Trip): Settlement[] {
  const balances = computeBalances(trip);
  const creditors: { id: string; amt: number }[] = [];
  const debtors: { id: string; amt: number }[] = [];
  Object.entries(balances).forEach(([id, amt]) => {
    if (amt > 0.01) creditors.push({ id, amt });
    else if (amt < -0.01) debtors.push({ id, amt: -amt });
  });
  creditors.sort((a, b) => b.amt - a.amt);
  debtors.sort((a, b) => b.amt - a.amt);

  const result: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    result.push({ from: debtors[i].id, to: creditors[j].id, amount: Math.round(pay * 100) / 100 });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt < 0.01) i++;
    if (creditors[j].amt < 0.01) j++;
  }
  return result;
}

/* ──────────────────────────────────────────────────────────── */
/* Page                                                         */
/* ──────────────────────────────────────────────────────────── */
export default function CostSplitterPage() {
  const router = useRouter();
  const { accessToken, loading } = useUser();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [newTripOpen, setNewTripOpen] = useState(false);

  // Auth gate
  useEffect(() => {
    if (!loading && !accessToken) {
      router.push("/sign-in?redirect=/cost-splitter");
    }
  }, [loading, accessToken, router]);

  // Hydrate from localStorage once
  useEffect(() => {
    const t = loadTrips();
    setTrips(t);
    if (t.length > 0) setActiveId(t[0].id);
    setHydrated(true);
  }, []);

  // Persist on every change after hydration
  useEffect(() => {
    if (hydrated) saveTrips(trips);
  }, [trips, hydrated]);

  const activeTrip = useMemo(
    () => trips.find((t) => t.id === activeId) ?? null,
    [trips, activeId]
  );

  const updateTrip = (id: string, updater: (t: Trip) => Trip) => {
    setTrips((prev) => prev.map((t) => (t.id === id ? updater(t) : t)));
  };

  const handleCreateTrip = (name: string) => {
    const trip: Trip = {
      id: uid(),
      name: name.trim(),
      members: [],
      expenses: [],
      createdAt: new Date().toISOString(),
    };
    setTrips((prev) => [trip, ...prev]);
    setActiveId(trip.id);
    setNewTripOpen(false);
  };

  const handleDeleteTrip = (id: string) => {
    setTrips((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      return next;
    });
  };

  if (loading || !accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-cream)" }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-9 h-9 rounded-full border-2 animate-spin"
            style={{ borderColor: "var(--color-mist)", borderTopColor: "var(--color-brand)" }}
          />
          <p className="text-sm" style={{ color: "rgba(11,31,42,0.6)" }}>
            Loading…
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--color-cream)" }}>
      <Navbar />

      {/* ── Hero ── */}
      <section className="pt-32 pb-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div className="max-w-2xl">
              <p
                className="text-xs uppercase tracking-[0.18em] mb-3 font-medium"
                style={{ color: "var(--color-teal)" }}
              >
                Expense Tracker
              </p>
              <h1
                className={`${playfair.className} text-[44px] md:text-[56px] leading-[1.05] tracking-tight`}
                style={{ color: "var(--color-navy)" }}
              >
                Settle the trip,
                <br />
                <span style={{ color: "var(--color-brand)" }}>not the friendship.</span>
              </h1>
              <p className="mt-5 text-[15px] leading-relaxed" style={{ color: "rgba(11,31,42,0.65)" }}>
                Add a trip, invite the people you traveled with, log who paid for what,
                and we&rsquo;ll figure out the simplest way to settle up.
              </p>
            </div>
            <Button
              onClick={() => setNewTripOpen(true)}
              className="h-11 px-6 rounded-full text-[14px] font-semibold gap-2"
              style={{
                background: "var(--color-navy)",
                color: "var(--color-cream)",
              }}
            >
              <Plus className="h-4 w-4" />
              New trip
            </Button>
          </div>
        </div>
      </section>

      {/* ── Body ── */}
      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-6">
          {trips.length === 0 ? (
            <EmptyTrips onCreate={() => setNewTripOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
              <TripsSidebar
                trips={trips}
                activeId={activeId}
                onSelect={setActiveId}
                onDelete={handleDeleteTrip}
              />
              {activeTrip ? (
                <TripWorkspace
                  trip={activeTrip}
                  onUpdate={(u) => updateTrip(activeTrip.id, u)}
                />
              ) : (
                <div
                  className="rounded-2xl p-10 text-center"
                  style={{ background: "white", border: "1px solid var(--color-mist)" }}
                >
                  <p style={{ color: "rgba(11,31,42,0.6)" }}>Select a trip to begin.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <NewTripDialog open={newTripOpen} onOpenChange={setNewTripOpen} onCreate={handleCreateTrip} />
    </main>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* Pill nav (matches main site)                                 */
/* ──────────────────────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────── */
/* Empty state                                                  */
/* ──────────────────────────────────────────────────────────── */
function EmptyTrips({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className="rounded-3xl p-12 md:p-16 text-center"
      style={{
        background:
          "linear-gradient(135deg, var(--color-sand) 0%, var(--color-cream) 60%, #e8eeee 100%)",
        border: "1px solid var(--color-mist)",
      }}
    >
      <div
        className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-5"
        style={{ background: "rgba(47,111,115,0.12)", color: "var(--color-teal)" }}
      >
        <Wallet className="h-6 w-6" />
      </div>
      <h2 className={`${playfair.className} text-[28px] md:text-[32px]`} style={{ color: "var(--color-navy)" }}>
        Start your first trip
      </h2>
      <p className="mt-3 text-[14px] max-w-md mx-auto" style={{ color: "rgba(11,31,42,0.6)" }}>
        Name the trip, add the people coming along, and log expenses as they happen.
        We&rsquo;ll do the math.
      </p>
      <Button
        onClick={onCreate}
        className="mt-7 h-11 px-6 rounded-full font-semibold gap-2"
        style={{ background: "var(--color-navy)", color: "var(--color-cream)" }}
      >
        <Plus className="h-4 w-4" />
        Create a trip
      </Button>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* Trips sidebar                                                */
/* ──────────────────────────────────────────────────────────── */
function TripsSidebar({
  trips,
  activeId,
  onSelect,
  onDelete,
}: {
  trips: Trip[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <aside
      className="rounded-2xl p-3 self-start lg:sticky lg:top-24"
      style={{ background: "white", border: "1px solid var(--color-mist)" }}
    >
      <p
        className="px-3 pt-2 pb-3 text-[11px] uppercase tracking-[0.14em] font-semibold"
        style={{ color: "rgba(11,31,42,0.5)" }}
      >
        Your trips · {trips.length}
      </p>
      <ul className="space-y-1">
        {trips.map((t) => {
          const total = t.expenses.reduce((s, e) => s + e.amount, 0);
          const isActive = t.id === activeId;
          return (
            <li key={t.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect(t.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(t.id)}
                className="group w-full flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
                style={{
                  background: isActive ? "var(--color-sand)" : "transparent",
                }}
              >
                <div
                  className="mt-1 h-2 w-2 rounded-full shrink-0"
                  style={{ background: isActive ? "var(--color-brand)" : "var(--color-mist)" }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[14px] font-semibold truncate"
                    style={{ color: "var(--color-navy)" }}
                  >
                    {t.name}
                  </p>
                  <p className="text-[12px]" style={{ color: "rgba(11,31,42,0.55)" }}>
                    {t.members.length} {t.members.length === 1 ? "person" : "people"} · ₹
                    {total.toLocaleString("en-IN")}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete "${t.name}"? This cannot be undone.`)) {
                      onDelete(t.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-white"
                  aria-label="Delete trip"
                >
                  <Trash2 className="h-3.5 w-3.5" style={{ color: "rgba(11,31,42,0.5)" }} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* Trip workspace — members + expenses + balances               */
/* ──────────────────────────────────────────────────────────── */
function TripWorkspace({
  trip,
  onUpdate,
}: {
  trip: Trip;
  onUpdate: (updater: (t: Trip) => Trip) => void;
}) {
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);

  const totalSpent = trip.expenses.reduce((s, e) => s + e.amount, 0);
  const settlements = useMemo(() => computeSettlements(trip), [trip]);
  const balances = useMemo(() => computeBalances(trip), [trip]);

  const addMember = (name: string, email: string) => {
    onUpdate((t) => ({
      ...t,
      members: [...t.members, { id: uid(), name: name.trim(), email: email.trim() }],
    }));
    setAddMemberOpen(false);
  };

  const removeMember = (memberId: string) => {
    if (trip.expenses.some((e) => e.payerId === memberId)) {
      window.alert("This person has logged expenses. Delete those expenses first.");
      return;
    }
    onUpdate((t) => ({ ...t, members: t.members.filter((m) => m.id !== memberId) }));
  };

  const addExpense = (payerId: string, amount: number, description: string) => {
    onUpdate((t) => ({
      ...t,
      expenses: [
        {
          id: uid(),
          payerId,
          amount,
          description: description.trim(),
          createdAt: new Date().toISOString(),
        },
        ...t.expenses,
      ],
    }));
    setAddExpenseOpen(false);
  };

  const removeExpense = (id: string) => {
    onUpdate((t) => ({ ...t, expenses: t.expenses.filter((e) => e.id !== id) }));
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* Trip header card */}
      <div
        className="rounded-2xl p-6 md:p-8"
        style={{ background: "white", border: "1px solid var(--color-mist)" }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p
              className="text-[11px] uppercase tracking-[0.16em] font-semibold mb-2"
              style={{ color: "var(--color-teal)" }}
            >
              Trip
            </p>
            <h2
              className={`${playfair.className} text-[32px] md:text-[36px] leading-tight`}
              style={{ color: "var(--color-navy)" }}
            >
              {trip.name}
            </h2>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "rgba(11,31,42,0.5)" }}>
              Total spent
            </p>
            <p
              className={`${playfair.className} text-[34px] leading-none mt-1`}
              style={{ color: "var(--color-navy)" }}
            >
              ₹{totalSpent.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-3 gap-4 pt-6" style={{ borderTop: "1px solid var(--color-mist)" }}>
          <Stat label="People" value={trip.members.length.toString()} icon={<Users className="h-3.5 w-3.5" />} />
          <Stat label="Expenses" value={trip.expenses.length.toString()} icon={<Receipt className="h-3.5 w-3.5" />} />
          <Stat
            label="Per person"
            value={
              trip.members.length > 0
                ? `₹${(totalSpent / trip.members.length).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                : "—"
            }
            icon={<Wallet className="h-3.5 w-3.5" />}
          />
        </div>
      </div>

      {/* People */}
      <Card
        title="People on the trip"
        subtitle="Add everyone splitting expenses on this trip."
        action={
          <Button
            onClick={() => setAddMemberOpen(true)}
            className="h-9 px-4 rounded-full text-[13px] font-semibold gap-1.5"
            style={{ background: "var(--color-navy)", color: "var(--color-cream)" }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add person
          </Button>
        }
      >
        {trip.members.length === 0 ? (
          <InlineEmpty
            icon={<Users className="h-5 w-5" />}
            text="No one added yet. Add at least two people to start splitting."
          />
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {trip.members.map((m) => (
              <li
                key={m.id}
                className="group flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "var(--color-cream)", border: "1px solid var(--color-mist)" }}
              >
                <Avatar name={m.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold truncate" style={{ color: "var(--color-navy)" }}>
                    {m.name}
                  </p>
                  <p className="text-[12px] truncate" style={{ color: "rgba(11,31,42,0.55)" }}>
                    {m.email || "—"}
                  </p>
                </div>
                <button
                  onClick={() => removeMember(m.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-white"
                  aria-label={`Remove ${m.name}`}
                >
                  <X className="h-3.5 w-3.5" style={{ color: "rgba(11,31,42,0.5)" }} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Expenses */}
      <Card
        title="Expenses"
        subtitle="Each expense is split equally across everyone on the trip."
        action={
          <Button
            onClick={() => setAddExpenseOpen(true)}
            disabled={trip.members.length < 2}
            className="h-9 px-4 rounded-full text-[13px] font-semibold gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "var(--color-brand)", color: "var(--color-cream)" }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add expense
          </Button>
        }
      >
        {trip.expenses.length === 0 ? (
          <InlineEmpty
            icon={<Receipt className="h-5 w-5" />}
            text={
              trip.members.length < 2
                ? "Add at least two people before logging expenses."
                : "No expenses yet. Log the first one to get started."
            }
          />
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--color-mist)" }}>
            {trip.expenses.map((e) => {
              const payer = trip.members.find((m) => m.id === e.payerId);
              return (
                <li key={e.id} className="group flex items-center gap-4 py-3.5 first:pt-1 last:pb-1">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "rgba(47,111,115,0.10)", color: "var(--color-teal)" }}
                  >
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold truncate" style={{ color: "var(--color-navy)" }}>
                      {e.description || "Untitled expense"}
                    </p>
                    <p className="text-[12px] truncate" style={{ color: "rgba(11,31,42,0.55)" }}>
                      Paid by{" "}
                      <span style={{ color: "var(--color-navy)", fontWeight: 500 }}>
                        {payer?.name ?? "Unknown"}
                      </span>
                      {" · "}
                      {new Date(e.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <p
                    className="text-[15px] font-semibold tabular-nums"
                    style={{ color: "var(--color-navy)" }}
                  >
                    ₹{e.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </p>
                  <button
                    onClick={() => removeExpense(e.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-[var(--color-sand)]"
                    aria-label="Delete expense"
                  >
                    <Trash2 className="h-3.5 w-3.5" style={{ color: "rgba(11,31,42,0.5)" }} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Balances & settlements */}
      {trip.members.length >= 2 && trip.expenses.length > 0 && (
        <Card
          title="Who owes whom"
          subtitle="The fewest payments needed to settle everyone up."
          icon={<Sparkles className="h-3.5 w-3.5" />}
        >
          {/* Per-person balance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
            {trip.members.map((m) => {
              const bal = balances[m.id] ?? 0;
              const isOwed = bal > 0.01;
              const owes = bal < -0.01;
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "var(--color-cream)", border: "1px solid var(--color-mist)" }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={m.name} small />
                    <span className="text-[13px] font-semibold truncate" style={{ color: "var(--color-navy)" }}>
                      {m.name}
                    </span>
                  </div>
                  <span
                    className="text-[13px] font-semibold tabular-nums shrink-0"
                    style={{
                      color: isOwed ? "var(--color-teal)" : owes ? "var(--color-brand-dark)" : "rgba(11,31,42,0.5)",
                    }}
                  >
                    {isOwed && "+"}
                    {owes && "−"}₹{Math.abs(bal).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
          </div>

          {settlements.length === 0 ? (
            <div
              className="flex items-center gap-3 p-4 rounded-xl"
              style={{ background: "rgba(47,111,115,0.08)", color: "var(--color-teal)" }}
            >
              <Check className="h-4 w-4" />
              <span className="text-[13px] font-medium">All settled up — nothing to transfer.</span>
            </div>
          ) : (
            <ul className="space-y-2">
              {settlements.map((s, i) => {
                const from = trip.members.find((m) => m.id === s.from);
                const to = trip.members.find((m) => m.id === s.to);
                return (
                  <li
                    key={i}
                    className="flex items-center gap-3 p-3.5 rounded-xl"
                    style={{ background: "var(--color-sand)" }}
                  >
                    <Avatar name={from?.name ?? "?"} small />
                    <span className="text-[13px] font-semibold" style={{ color: "var(--color-navy)" }}>
                      {from?.name}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" style={{ color: "var(--color-brand)" }} />
                    <Avatar name={to?.name ?? "?"} small />
                    <span className="text-[13px] font-semibold flex-1" style={{ color: "var(--color-navy)" }}>
                      {to?.name}
                    </span>
                    <span
                      className="text-[14px] font-semibold tabular-nums"
                      style={{ color: "var(--color-navy)" }}
                    >
                      ₹{s.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {/* Modals */}
      <AddMemberDialog
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        existingEmails={trip.members.map((m) => m.email.toLowerCase()).filter(Boolean)}
        onAdd={addMember}
      />
      <AddExpenseDialog
        open={addExpenseOpen}
        onOpenChange={setAddExpenseOpen}
        members={trip.members}
        onAdd={addExpense}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* Small UI primitives                                          */
/* ──────────────────────────────────────────────────────────── */
function Card({
  title,
  subtitle,
  action,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl p-5 md:p-6"
      style={{ background: "white", border: "1px solid var(--color-mist)" }}
    >
      <header className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            {icon && <span style={{ color: "var(--color-teal)" }}>{icon}</span>}
            <h3 className="text-[16px] font-semibold" style={{ color: "var(--color-navy)" }}>
              {title}
            </h3>
          </div>
          {subtitle && (
            <p className="text-[13px] mt-1" style={{ color: "rgba(11,31,42,0.55)" }}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em]" style={{ color: "rgba(11,31,42,0.5)" }}>
        {icon}
        {label}
      </div>
      <p className="mt-1 text-[20px] font-semibold tabular-nums" style={{ color: "var(--color-navy)" }}>
        {value}
      </p>
    </div>
  );
}

function InlineEmpty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div
      className="flex flex-col items-center text-center py-8 rounded-xl"
      style={{ background: "var(--color-cream)", border: "1px dashed var(--color-mist)" }}
    >
      <div
        className="h-10 w-10 rounded-full flex items-center justify-center mb-3"
        style={{ background: "white", color: "rgba(11,31,42,0.5)" }}
      >
        {icon}
      </div>
      <p className="text-[13px] max-w-sm" style={{ color: "rgba(11,31,42,0.6)" }}>
        {text}
      </p>
    </div>
  );
}

function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  const initial = (name?.[0] ?? "?").toUpperCase();
  const size = small ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-[13px]";
  // Deterministic tint per name
  const palette = [
    { bg: "rgba(217,119,87,0.16)", fg: "var(--color-brand-dark)" },
    { bg: "rgba(47,111,115,0.16)", fg: "var(--color-teal)" },
    { bg: "rgba(11,31,42,0.10)", fg: "var(--color-navy)" },
  ];
  const idx =
    Array.from(name || "").reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
  const { bg, fg } = palette[idx];
  return (
    <div
      className={`${size} rounded-full flex items-center justify-center font-semibold shrink-0`}
      style={{ background: bg, color: fg }}
      aria-hidden
    >
      {initial}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* Dialogs                                                      */
/* ──────────────────────────────────────────────────────────── */
function NewTripDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  useEffect(() => {
    if (!open) setName("");
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    onCreate(name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[440px] rounded-2xl p-0 gap-0 border-0"
        style={{ background: "var(--color-cream)" }}
      >
        <form onSubmit={submit}>
          <DialogHeader className="p-6 pb-4">
            <DialogTitle
              className={`${playfair.className} text-[26px] leading-tight`}
              style={{ color: "var(--color-navy)" }}
            >
              Name your trip
            </DialogTitle>
            <DialogDescription className="text-[13px]" style={{ color: "rgba(11,31,42,0.6)" }}>
              Something memorable — a place, a date, an inside joke.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-2">
            <Label htmlFor="trip-name" className="text-[12px] font-semibold" style={{ color: "var(--color-navy)" }}>
              Trip name
            </Label>
            <Input
              id="trip-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Goa weekend, March 2026"
              className="mt-2 h-11 rounded-xl bg-white"
              style={{ borderColor: "var(--color-mist)" }}
            />
          </div>
          <DialogFooter className="p-6 pt-4 gap-2 sm:gap-2">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              variant="ghost"
              className="h-10 px-5 rounded-full text-[13px]"
              style={{ color: "var(--color-navy)" }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={name.trim().length < 2}
              className="h-10 px-5 rounded-full text-[13px] font-semibold disabled:opacity-40"
              style={{ background: "var(--color-navy)", color: "var(--color-cream)" }}
            >
              Create trip
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddMemberDialog({
  open,
  onOpenChange,
  existingEmails,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existingEmails: string[];
  onAdd: (name: string, email: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
      setError(null);
    }
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const n = name.trim();
    const em = email.trim();
    if (n.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError("Enter a valid email address.");
      return;
    }
    if (existingEmails.includes(em.toLowerCase())) {
      setError("That email is already on this trip.");
      return;
    }
    onAdd(n, em);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[440px] rounded-2xl p-0 gap-0 border-0"
        style={{ background: "var(--color-cream)" }}
      >
        <form onSubmit={submit}>
          <DialogHeader className="p-6 pb-4">
            <DialogTitle
              className={`${playfair.className} text-[24px] leading-tight`}
              style={{ color: "var(--color-navy)" }}
            >
              Add a person
            </DialogTitle>
            <DialogDescription className="text-[13px]" style={{ color: "rgba(11,31,42,0.6)" }}>
              They&rsquo;ll be included in every expense split on this trip.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-2 space-y-4">
            <div>
              <Label htmlFor="m-name" className="text-[12px] font-semibold" style={{ color: "var(--color-navy)" }}>
                Full name
              </Label>
              <Input
                id="m-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Anaya Sharma"
                className="mt-2 h-11 rounded-xl bg-white"
                style={{ borderColor: "var(--color-mist)" }}
              />
            </div>
            <div>
              <Label htmlFor="m-email" className="text-[12px] font-semibold" style={{ color: "var(--color-navy)" }}>
                Email
              </Label>
              <div className="relative mt-2">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4"
                  style={{ color: "rgba(11,31,42,0.4)" }}
                />
                <Input
                  id="m-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="anaya@example.com"
                  className="h-11 rounded-xl bg-white pl-10"
                  style={{ borderColor: "var(--color-mist)" }}
                />
              </div>
            </div>
            {error && (
              <p
                className="text-[12px] rounded-lg px-3 py-2"
                style={{
                  background: "rgba(184,95,68,0.08)",
                  color: "var(--color-brand-dark)",
                  border: "1px solid rgba(184,95,68,0.20)",
                }}
              >
                {error}
              </p>
            )}
          </div>
          <DialogFooter className="p-6 pt-4 gap-2 sm:gap-2">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              variant="ghost"
              className="h-10 px-5 rounded-full text-[13px]"
              style={{ color: "var(--color-navy)" }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-10 px-5 rounded-full text-[13px] font-semibold"
              style={{ background: "var(--color-navy)", color: "var(--color-cream)" }}
            >
              Add person
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddExpenseDialog({
  open,
  onOpenChange,
  members,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: Member[];
  onAdd: (payerId: string, amount: number, description: string) => void;
}) {
  const [payerId, setPayerId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPayerId(members[0]?.id ?? "");
      setAmount("");
      setDescription("");
      setError(null);
    }
  }, [open, members]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = Number(amount);
    if (!payerId) {
      setError("Pick who paid.");
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a positive amount.");
      return;
    }
    if (description.trim().length < 2) {
      setError("Add a short description (e.g. ‘Dinner at Olive’).");
      return;
    }
    onAdd(payerId, Math.round(amt * 100) / 100, description);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px] rounded-2xl p-0 gap-0 border-0"
        style={{ background: "var(--color-cream)" }}
      >
        <form onSubmit={submit}>
          <DialogHeader className="p-6 pb-4">
            <DialogTitle
              className={`${playfair.className} text-[24px] leading-tight`}
              style={{ color: "var(--color-navy)" }}
            >
              Log an expense
            </DialogTitle>
            <DialogDescription className="text-[13px]" style={{ color: "rgba(11,31,42,0.6)" }}>
              Pick who paid and how much. We&rsquo;ll split it evenly across everyone.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-2 space-y-4">
            {/* Payer selector */}
            <div>
              <Label className="text-[12px] font-semibold" style={{ color: "var(--color-navy)" }}>
                Paid by
              </Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {members.map((m) => {
                  const active = m.id === payerId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayerId(m.id)}
                      className="inline-flex items-center gap-2 px-3 h-9 rounded-full text-[12.5px] font-semibold transition-all"
                      style={{
                        background: active ? "var(--color-navy)" : "white",
                        color: active ? "var(--color-cream)" : "var(--color-navy)",
                        border: `1px solid ${active ? "var(--color-navy)" : "var(--color-mist)"}`,
                      }}
                    >
                      <Avatar name={m.name} small />
                      <span className="truncate max-w-[110px]">{m.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount */}
            <div>
              <Label htmlFor="e-amount" className="text-[12px] font-semibold" style={{ color: "var(--color-navy)" }}>
                Amount (₹)
              </Label>
              <Input
                id="e-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="mt-2 h-11 rounded-xl bg-white tabular-nums"
                style={{ borderColor: "var(--color-mist)" }}
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="e-desc" className="text-[12px] font-semibold" style={{ color: "var(--color-navy)" }}>
                What was it for?
              </Label>
              <Input
                id="e-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dinner, cab, hotel deposit…"
                className="mt-2 h-11 rounded-xl bg-white"
                style={{ borderColor: "var(--color-mist)" }}
              />
            </div>

            {error && (
              <p
                className="text-[12px] rounded-lg px-3 py-2"
                style={{
                  background: "rgba(184,95,68,0.08)",
                  color: "var(--color-brand-dark)",
                  border: "1px solid rgba(184,95,68,0.20)",
                }}
              >
                {error}
              </p>
            )}
          </div>
          <DialogFooter className="p-6 pt-4 gap-2 sm:gap-2">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              variant="ghost"
              className="h-10 px-5 rounded-full text-[13px]"
              style={{ color: "var(--color-navy)" }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-10 px-5 rounded-full text-[13px] font-semibold"
              style={{ background: "var(--color-brand)", color: "var(--color-cream)" }}
            >
              Log expense
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
