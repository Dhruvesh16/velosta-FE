"use client";

/**
 * AtmosphereSection
 * ──────────────────────────────────────────────
 * Cinematic backdrop composing OceanLayer + CloudLayer + JourneyBird
 * into a single ambient scene. Pass your Philosophy content as children —
 * the atmosphere renders behind it, the content sits above at z-10.
 *
 * Layer order (back → front):
 *   1. Sky gradient         (z-0 · container bg)
 *   2. CloudLayer           (z-1 · upper band)
 *   3. OceanLayer           (z-1 · lower band)
 *   4. Sun bloom            (z-2 · horizon)
 *   5. JourneyBird          (z-3 · above horizon)
 *   6. Content (children)   (z-10)
 */

import type { ReactNode } from "react";
import OceanLayer from "./OceanLayer";
import CloudLayer from "./CloudLayer";
import JourneyBird from "./JourneyBird";

type Props = {
  children: ReactNode;
  className?: string;
  /** % of section devoted to sky (rest is ocean) */
  skyHeight?: number;
};

export default function AtmosphereSection({
  children,
  className = "",
  skyHeight = 62,
}: Props) {
  const oceanHeight = 100 - skyHeight;

  return (
    <section
      className={`relative overflow-hidden ${className}`}
      style={{
        // Warm dusk sky → horizon haze → water approaches from below
        background: `linear-gradient(180deg,
          #F5EFE6 0%,
          #EFE8DC 35%,
          #E4E6DF 62%,
          #D9E2E1 78%,
          #CBD8D6 100%)`,
      }}
    >
      {/* Sky atmosphere */}
      <CloudLayer skyHeight={skyHeight} className="z-[1]" />

      {/* Ocean body */}
      <OceanLayer height={oceanHeight} color="#0B1F2A" className="z-[1]" />

      {/* Warm horizon sun-bloom — sits on the seam */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 z-[2]"
        style={{
          top: `${skyHeight - 6}%`,
          height: "12%",
          background:
            "radial-gradient(60% 100% at 72% 50%, rgba(245,223,193,0.55) 0%, rgba(245,223,193,0) 70%)",
          filter: "blur(14px)",
        }}
      />

      {/* Journey birds — one lead, one trailing faint */}
      <div className="absolute inset-0 z-[3]">
        <JourneyBird
          duration={52}
          delay={2}
          startTop={38}
          rise={56}
          scale={1.05}
          opacity={0.55}
          color="rgba(11,31,42,0.6)"
        />
        <JourneyBird
          duration={68}
          delay={18}
          startTop={30}
          rise={28}
          scale={0.78}
          opacity={0.32}
          color="rgba(11,31,42,0.45)"
        />
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </section>
  );
}
