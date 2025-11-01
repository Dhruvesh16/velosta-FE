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
    <section aria-labelledby="promo-title" className="w-full py-8">
      <div className="mx-auto max-w-[1120px] px-6 md:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand)]/90 text-white shadow-lg">
          {/* Decorative contour lines */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_70%_40%,rgba(255,255,255,0.1),rgba(0,0,0,0.05)_45%)]"
          />
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left content */}
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <h3
                id="promo-title"
                className="text-white font-bold tracking-[-0.02em] text-3xl md:text-4xl leading-tight"
              >
                Download Our App
              </h3>
              <p className="mt-4 text-white/95 text-base md:text-lg leading-relaxed">
                Access <strong>Velosta-AI</strong>, join the{" "}
                <strong>HowNotToTravel</strong> community, and stay connected.
                Plus, our <strong>Trip Budget Tracker</strong> is launching
                soon!
              </p>

              {/* <form onSubmit={onSubmit} className="mt-8">
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
                    placeholder="Enter your email"
                    aria-invalid={!emailValid && email.length > 0}
                    className="flex-1 h-11 rounded-lg px-4 text-sm text-black outline-none bg-white placeholder:text-black/50 focus:ring-2 focus:ring-white/30 transition"
                  />
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="h-11 px-6 rounded-lg bg-white text-[var(--color-brand)] font-semibold hover:bg-white/95 transition disabled:opacity-70"
                    aria-live="polite"
                  >
                    {status === "sending" ? "Sending..." : "Get App"}
                  </button>
                </div>
                <p className="mt-3 text-sm text-white/80">
                  {status === "success" &&
                    "✓ Magic link sent! Check your email."}
                  {status === "error" &&
                    "Please enter a valid email and try again."}
                </p>
              </form> */}
              <button
                type="submit"
                disabled={status === "sending"}
                className="h-11 px-6 w-1/2 mt-4 rounded-lg bg-white text-[var(--color-brand)] font-semibold hover:bg-white/95 transition disabled:opacity-70"
                aria-live="polite"
              >
                Comming Soon....
              </button>
            </div>

            {/* Right mockup image */}
            <div className="relative min-h-[260px] md:min-h-[380px]">
              <Image
                src="/images/app-phones.jpg"
                alt="Mobile app mockups"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain object-right md:object-center"
                priority
              />
              {/* Decorative accent */}
              <div
                aria-hidden
                className="absolute -right-12 bottom-0 h-32 w-32 rounded-full bg-white/10 blur-3xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
