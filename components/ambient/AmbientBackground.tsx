"use client";

/**
 * AmbientBackground — convenience wrapper combining WaveMesh + a soft radial
 * gradient overlay for contrast. Place behind content with `absolute inset-0`.
 */

import dynamic from "next/dynamic";

const WaveMesh = dynamic(() => import("./WaveMesh"), { ssr: false });

type Props = {
  className?: string;
  opacity?: number;
};

export default function AmbientBackground({
  className = "",
  opacity = 0.35,
}: Props) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <WaveMesh className="absolute inset-0" opacity={opacity} />
      {/* Soft contrast overlay — keeps content legible */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 70%, rgba(255,255,255,0.9) 100%)",
        }}
      />
    </div>
  );
}
