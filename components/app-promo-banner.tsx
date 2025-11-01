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
    <section aria-labelledby="promo-title" className="w-full py-10 sm:py-14">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 md:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand)]/90 text-white shadow-lg">
          {/* Background gradient accent */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_70%_40%,rgba(255,255,255,0.1),rgba(0,0,0,0.05)_45%)]"
          />

          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left content */}
            <div className="p-6 sm:p-8 md:p-12 flex flex-col justify-center items-center md:items-start text-center md:text-left">
              <h3
                id="promo-title"
                className="font-bold tracking-[-0.02em] text-2xl sm:text-3xl md:text-4xl leading-tight"
              >
                Download Our App
              </h3>
              <p className="mt-3 sm:mt-4 text-white/95 text-sm sm:text-base md:text-lg leading-relaxed max-w-md">
                Access <strong>Velosta-AI</strong>, join the{" "}
                <strong>HowNotToTravel</strong> community, and stay connected.
                Plus, our <strong>Trip Budget Tracker</strong> is launching
                soon!
              </p>

              {/* Placeholder CTA button */}
              <button
                type="button"
                disabled={status === "sending"}
                className="mt-6 sm:mt-8 h-11 w-full sm:w-2/3 md:w-1/2 rounded-lg bg-white text-[var(--color-brand)] font-semibold hover:bg-white/95 transition disabled:opacity-70"
                aria-live="polite"
              >
                Coming Soon...
              </button>
            </div>

            {/* Right mockup image */}
            <div className="relative min-h-[220px] sm:min-h-[280px] md:min-h-[380px]">
              <Image
                src="/images/app-phones.jpg"
                alt="Mobile app mockups"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain object-center md:object-right"
                priority
              />
              {/* Decorative accent */}
              <div
                aria-hidden
                className="absolute -right-10 bottom-0 h-24 w-24 sm:h-32 sm:w-32 rounded-full bg-white/10 blur-3xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
