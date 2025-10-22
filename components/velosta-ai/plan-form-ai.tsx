"use client";

import type React from "react";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PlanForm() {
  const [destination, setDestination] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [interests, setInterests] = useState("");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, start, end, interests, budget }),
      });
      if (!res.ok) throw new Error("Failed to generate plan");
      const data = await res.json();
      setResult(data.plan);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-(--color-navy)">
            Destination
          </label>
          <Input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Rome, Tokyo, Bali..."
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-(--color-navy)">
            Start date
          </label>
          <Input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-(--color-navy)">
            End date
          </label>
          <Input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-(--color-navy)">
            Budget (optional)
          </label>
          <Input
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="e.g., $1500"
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-(--color-navy)">
            Interests
          </label>
          <Textarea
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="Museums, food tours, beaches, nightlife..."
            rows={3}
          />
        </div>
        <div className="md:col-span-2 flex items-center gap-3">
          <Button
            type="submit"
            disabled={loading}
            className={cn("rounded-full px-6 text-(--color-brand-contrast)")}
            style={{
              backgroundImage:
                "linear-gradient(90deg, var(--color-brand-start) 0%, var(--color-brand) 100%)",
            }}
          >
            {loading ? "Planning..." : "Generate Itinerary"}
          </Button>
          <span className="text-xs text-muted-foreground">Powered by AI</span>
        </div>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-6 rounded-xl border bg-background p-4">
          <h2 className="mb-2 text-lg font-semibold text-(--color-navy)">
            Suggested plan
          </h2>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}
