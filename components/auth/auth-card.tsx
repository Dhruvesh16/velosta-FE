"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import { Sparkles, MapPin, Star } from "lucide-react";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/* ── Velosta palette (mirrors landing page) ── */
const c = {
  navy: "#0B1F2A",
  sand: "#F5EFE6",
  sandLight: "#FBF8F3",
  teal: "#2F6F73",
  tealLight: "#3A8589",
  coral: "#D97757",
};

interface AuthCardProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  mode?: "signin" | "signup";
}

export function AuthCard({ children, title, subtitle, mode = "signin" }: AuthCardProps) {
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{ backgroundColor: c.sandLight }}
    >
      {/* ── Decorative background washes ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(47,111,115,0.12) 0%, rgba(47,111,115,0) 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-0 h-[460px] w-[460px] rounded-full"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(217,119,87,0.1) 0%, rgba(217,119,87,0) 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* ── Minimal top bar ── */}
      <div className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <Link
          href="/"
          className={`${playfair.className} text-[24px] tracking-tight`}
          style={{ color: c.navy }}
        >
          Velosta
        </Link>
        <Link
          href="/"
          className="text-[13px] font-medium transition-colors"
          style={{ color: "rgba(11,31,42,0.55)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = c.navy)}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "rgba(11,31,42,0.55)")
          }
        >
          ← Back to Velosta
        </Link>
      </div>

      {/* ── Split layout ── */}
      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 pb-16 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:px-8 lg:pb-24 lg:pt-12">
        {/* ── LEFT — Editorial brand story (hidden on mobile) ── */}
        <aside className="relative hidden lg:block">
          {/* Eyebrow */}
          <div
            className="mb-7 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5"
            style={{
              borderColor: "rgba(47,111,115,0.22)",
              backgroundColor: "rgba(47,111,115,0.06)",
            }}
          >
            <Sparkles className="h-3 w-3" style={{ color: c.teal }} />
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: c.teal }}
            >
              {mode === "signup"
                ? "Begin your journey"
                : "Welcome back, traveler"}
            </span>
          </div>

          {/* Headline */}
          <h2
            className={`${playfair.className} text-[clamp(2.2rem,4.2vw,3.5rem)] leading-[1.02] tracking-[-0.02em]`}
            style={{ color: c.navy }}
          >
            {mode === "signup" ? (
              <>
                Plan it,{" "}
                <span style={{ fontStyle: "italic", color: c.teal }}>
                  split it,
                </span>{" "}
                live it.
              </>
            ) : (
              <>
                Your next journey,{" "}
                <span style={{ fontStyle: "italic", color: c.teal }}>
                  already shaping.
                </span>
              </>
            )}
          </h2>

          <p
            className="mt-6 max-w-md text-[15px] leading-[1.8]"
            style={{ color: "rgba(11,31,42,0.6)" }}
          >
            {mode === "signup"
              ? "Create an account to save trips, split costs across travelers, and unlock itineraries written by people who actually went."
              : "Sign in to pick up where you left off — your itineraries, saved cities, and shared trips are waiting."}
          </p>

          {/* Editorial photo composition */}
          <div className="relative mt-10 h-[440px] max-w-[460px]">
            {/* Dashed orbit */}
            <svg
              aria-hidden
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              width="460"
              height="460"
              viewBox="0 0 460 460"
            >
              <circle
                cx="230"
                cy="230"
                r="216"
                fill="none"
                stroke={c.teal}
                strokeWidth="1"
                strokeDasharray="2 8"
                opacity="0.28"
              />
            </svg>

            {/* Accent dots */}
            <span
              aria-hidden
              className="absolute left-[10%] top-[6%] h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: c.coral }}
            />
            <span
              aria-hidden
              className="absolute bottom-[12%] right-[8%] h-2 w-2 rounded-full"
              style={{ backgroundColor: c.teal }}
            />

            {/* Circular portrait */}
            <div
              className="absolute left-1/2 top-1/2 aspect-square w-[360px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full"
              style={{
                boxShadow:
                  "0 30px 60px -25px rgba(11,31,42,0.28), 0 10px 20px -8px rgba(11,31,42,0.1)",
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=85"
                alt="A calm coastal morning"
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>

            {/* Floating location pill */}
            <div
              className="absolute right-[2%] top-[10%] flex items-center gap-2.5 rounded-full bg-white px-4 py-2.5"
              style={{
                boxShadow:
                  "0 18px 40px -16px rgba(11,31,42,0.2), 0 4px 10px -4px rgba(11,31,42,0.06)",
              }}
            >
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(217,119,87,0.14)" }}
              >
                <MapPin className="h-3 w-3" style={{ color: c.coral }} />
              </span>
              <span
                className="text-[12px] font-semibold tracking-tight"
                style={{ color: c.navy }}
              >
                Santorini · Greece
              </span>
            </div>

            {/* Trust chip */}
            <div
              className="absolute bottom-[4%] left-[-4%] flex items-center gap-3 rounded-2xl bg-white p-3 pr-5"
              style={{
                boxShadow:
                  "0 18px 40px -16px rgba(11,31,42,0.22), 0 4px 10px -4px rgba(11,31,42,0.06)",
              }}
            >
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: "rgba(217,119,87,0.12)" }}
              >
                <Star
                  className="h-4 w-4 fill-current"
                  style={{ color: c.coral }}
                />
              </span>
              <div>
                <p
                  className={`${playfair.className} text-[17px] leading-none tracking-tight`}
                  style={{ color: c.navy }}
                >
                  4.9 / 5
                </p>
                <p
                  className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: "rgba(11,31,42,0.5)" }}
                >
                  12k+ travelers
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── RIGHT — Form card ── */}
        <div className="relative mx-auto w-full max-w-md">
          {/* Soft echo behind the card */}
          <div
            aria-hidden
            className="absolute inset-0 translate-x-3 translate-y-3 rounded-[28px]"
            style={{
              background:
                "linear-gradient(135deg, rgba(47,111,115,0.06) 0%, rgba(217,119,87,0.05) 100%)",
            }}
          />

          <div
            className="relative rounded-[24px] bg-white p-8 sm:p-10"
            style={{
              border: "1px solid rgba(11,31,42,0.06)",
              boxShadow:
                "0 30px 60px -30px rgba(11,31,42,0.18), 0 8px 20px -8px rgba(11,31,42,0.06)",
            }}
          >
            {/* Mobile-only eyebrow */}
            <div className="mb-5 flex items-center gap-2 lg:hidden">
              <span
                className="h-px w-7"
                style={{ backgroundColor: "rgba(47,111,115,0.4)" }}
              />
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: c.teal }}
              >
                {mode === "signup" ? "Create account" : "Welcome back"}
              </p>
            </div>

            <h1
              className={`${playfair.className} text-[clamp(1.9rem,4vw,2.4rem)] leading-[1.08] tracking-[-0.015em]`}
              style={{ color: c.navy }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className="mt-3 text-[14px] leading-[1.65]"
                style={{ color: "rgba(11,31,42,0.56)" }}
              >
                {subtitle}
              </p>
            )}

            <div className="mt-8">{children}</div>
          </div>

          {/* Legal microcopy */}
          <p
            className="mt-6 text-center text-[11px] leading-relaxed"
            style={{ color: "rgba(11,31,42,0.45)" }}
          >
            By continuing, you agree to Velosta&apos;s{" "}
            <a
              href="#"
              className="underline underline-offset-2 transition-colors"
              style={{ color: "rgba(11,31,42,0.65)" }}
            >
              Terms
            </a>{" "}
            &{" "}
            <a
              href="#"
              className="underline underline-offset-2 transition-colors"
              style={{ color: "rgba(11,31,42,0.65)" }}
            >
              Privacy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
