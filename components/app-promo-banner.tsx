"use client";

import type React from "react";

import { useState } from "react";
import Image from "next/image";

export default function AppPromoBanner() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid) {
      setStatus("error");
      return;
    }
    try {
      setStatus("sending");
      const res = await fetch("/api/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section aria-labelledby="promo-title" className="w-full py-6">
      <div className="mx-auto max-w-[1120px] px-6 md:px-8">
        <div className="relative overflow-hidden rounded-[16px] bg-[var(--color-brand)] text-white">
          {/* Decorative contour lines */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_70%_40%,rgba(255,255,255,0.08),rgba(0,0,0,0)_45%)]"
          />
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left content */}
            <div className="p-8 md:p-12">
              <h3
                id="promo-title"
                className="text-white font-semibold tracking-[-0.02em] text-2xl md:text-[28px] leading-tight"
              >
                Get 5% off your 1st app booking
              </h3>
              <p className="mt-2 text-white/90 text-sm">
                Booking’s better on the app. Use promo code{" "}
                <strong>“TourBooking”</strong> to save!
              </p>

              <form onSubmit={onSubmit} className="mt-6">
                <label htmlFor="promo-email" className="sr-only">
                  Email
                </label>
                <div className="flex gap-3 max-w-[420px]">
                  <input
                    id="promo-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    aria-invalid={!emailValid && email.length > 0}
                    className="flex-1 h-10 rounded-[10px] px-3 text-[14px] text-[var(--foreground)] outline-none bg-white text-black placeholder:text-black/60"
                  />
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="h-10 px-5 rounded-[10px] bg-white/95 text-[var(--color-navy)] font-medium hover:bg-white transition disabled:opacity-70"
                    aria-live="polite"
                  >
                    {status === "sending" ? "Sending..." : "Send"}
                  </button>
                </div>
                <p className="mt-2 text-[12px]">
                  {status === "success" && "Magic link sent! Check your email."}
                  {status === "error" &&
                    "Please enter a valid email and try again."}
                </p>
              </form>
            </div>

            {/* Right mockup image */}
            <div className="relative min-h-[260px] md:min-h-[340px]">
              <Image
                src="/images/app-phones.jpg"
                alt="Mobile app mockups"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain object-right md:object-center translate-y-2 md:translate-y-0"
                priority
              />
              {/* Decorative hand/leaf shape */}
              <div
                aria-hidden
                className="absolute -right-10 bottom-0 h-24 w-24 rounded-[32px] bg-white/15 blur-[2px]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
