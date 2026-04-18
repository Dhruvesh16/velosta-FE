"use client";

/**
 * AmbientBirds — cinematic, distant-bird atmosphere.
 *
 * Each bird is an independent motion element with:
 *  - randomized size (tiny, variable for depth)
 *  - randomized opacity, blur, vertical lane
 *  - randomized speed, delay, multi-keyframe organic path
 *  - subtle fade-in / fade-out at edges
 *  - one optional loose flock of 2 birds drifting near the lead
 *
 * Pure SVG + Framer Motion. Respects prefers-reduced-motion.
 * Deterministic via seed → identical SSR and CSR output (no hydration flicker).
 */

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

type Bird = {
  id: number;
  top: number;
  scale: number;
  opacity: number;
  blur: number;
  duration: number;
  delay: number;
  repeatDelay: number;
  drift: number;
  driftPhase: number;
  stroke: number;
  rotate: number;
  wingSpread: number;
};

type Props = {
  className?: string;
  color?: string;
  count?: number;
  seed?: number;
};

/** Seeded RNG (mulberry32) — identical server + client output. */
function makeRng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function generateBirds(count: number, seed: number): Bird[] {
  const rng = makeRng(seed);
  const birds: Bird[] = [];
  const lanes: number[] = [];

  // Staggered entry timings so birds appear one after another.
  const staggerOffsets = [0, 5, 11, 18, 25];

  for (let i = 0; i < count; i++) {
    // Eye-level band: 25–45% of screen.
    let top = 0;
    for (let tries = 0; tries < 10; tries++) {
      top = 25 + rng() * 20;
      if (lanes.every((l) => Math.abs(l - top) > 6)) break;
    }
    lanes.push(top);

    // First bird: slightly more visible to catch the eye.
    // Remaining birds: subtle, so they recede into the background.
    const isLead = i === 0;
    const depth = rng();

    const scale = isLead
      ? 0.95 + depth * 0.15           // 0.95–1.10
      : 0.7 + depth * 0.25;           // 0.70–0.95
    const opacity = isLead
      ? 0.5                           // lead bird
      : 0.32 + depth * 0.1;           // 0.32–0.42
    const blur = isLead
      ? 0.2 + depth * 0.2             // 0.2–0.4 px
      : 0.4 + depth * 0.5;            // 0.4–0.9 px

    birds.push({
      id: i,
      top,
      scale,
      opacity,
      blur,
      duration: 38 + rng() * 16,      // 38–54s (slow, but perceivable)
      delay: staggerOffsets[i] ?? rng() * 30,
      repeatDelay: 8 + rng() * 8,
      drift: 4 + rng() * 3,           // ±5 px gentle vertical wander
      driftPhase: rng() * Math.PI * 2,
      stroke: 1.4 + rng() * 0.4,
      rotate: (rng() - 0.5) * 4,      // ±2°
      wingSpread: 0.9 + rng() * 0.2,
    });
  }

  return birds;
}

function BirdGlyph({
  color,
  stroke,
  wingSpread,
}: {
  color: string;
  stroke: number;
  wingSpread: number;
}) {
  // Curve control points vary slightly so no two birds look identical.
  const c1 = 8 * wingSpread;
  const c2 = 32 - 8 * wingSpread;
  return (
    <svg
      viewBox="0 0 40 14"
      width="36"
      height="13"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={`M2 9 Q ${c1} 1, 20 9 Q ${c2} 1, 38 9`} />
    </svg>
  );
}

export default function AmbientBirds({
  className = "",
  color = "rgba(45,60,80,0.95)",
  count = 3,
  seed = 7,
}: Props) {
  const reduced = useReducedMotion();
  const birds = useMemo(() => generateBirds(count, seed), [count, seed]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {birds.map((b) => {
        // Organic vertical path via 6 phase-offset keyframes (not pure sine).
        const yKeyframes = [
          0,
          Math.sin(b.driftPhase) * b.drift,
          Math.sin(b.driftPhase + 1.3) * b.drift * 0.6,
          Math.sin(b.driftPhase + 2.6) * b.drift * 0.8,
          Math.sin(b.driftPhase + 4.1) * b.drift * 0.4,
          0,
        ];

        // Fade in after entry, fade out before exit.
        const opacityKeyframes = [
          0,
          b.opacity,
          b.opacity,
          b.opacity,
          b.opacity,
          0,
        ];

        return (
          <motion.div
            key={b.id}
            className="absolute"
            style={{
              top: `${b.top}%`,
              left: 0,
              filter: `blur(${b.blur}px)`,
              willChange: "transform, opacity",
            }}
            initial={{ x: "-8vw", y: 0, opacity: 0 }}
            animate={
              reduced
                ? { x: "35vw", y: 0, opacity: b.opacity * 0.6 }
                : {
                    x: ["-8vw", "112vw"],
                    y: yKeyframes,
                    opacity: opacityKeyframes,
                  }
            }
            transition={
              reduced
                ? { duration: 0 }
                : {
                    x: {
                      duration: b.duration,
                      delay: b.delay,
                      repeat: Infinity,
                      ease: "linear",
                      repeatDelay: b.repeatDelay,
                    },
                    y: {
                      duration: b.duration,
                      delay: b.delay,
                      repeat: Infinity,
                      ease: "easeInOut",
                      repeatDelay: b.repeatDelay,
                      times: [0, 0.2, 0.4, 0.6, 0.8, 1],
                    },
                    opacity: {
                      duration: b.duration,
                      delay: b.delay,
                      repeat: Infinity,
                      ease: "linear",
                      repeatDelay: b.repeatDelay,
                      times: [0, 0.08, 0.3, 0.7, 0.92, 1],
                    },
                  }
            }
          >
            <div
              style={{
                transform: `scale(${b.scale}) rotate(${b.rotate}deg)`,
                transformOrigin: "center",
              }}
            >
              <BirdGlyph
                color={color}
                stroke={b.stroke}
                wingSpread={b.wingSpread}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
